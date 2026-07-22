import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAggregateSummaryPrompt } from "@/lib/prompts";
import { generateWithFallback, buildFilterKey } from "@/lib/gemini-analysis";
import { getOwnedSubject } from "@/lib/subjects";

export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serverSupabase = await createSupabaseServerClient();
    const { data: userData } = await serverSupabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subject = await getOwnedSubject(serverSupabase, id, userData.user.id);
    if (!subject) {
      return new Response(JSON.stringify({ error: "Materia no encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const careersParam = searchParams.get("careers");
    const yearsParam = searchParams.get("years");
    const gendersParam = searchParams.get("genders");
    const regenerate = searchParams.get("regenerate") === "true";

    const careers = careersParam ? careersParam.split(",").filter(Boolean) : [];
    const years = yearsParam
      ? yearsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
      : [];
    const genders = gendersParam ? gendersParam.split(",").filter(Boolean) : [];

    const filterKey = buildFilterKey(careers, years, genders);
    const pdfName = subject.pdf_name ?? subject.name;

    // Servir desde caché si existe y no se pidió regenerar
    if (!regenerate) {
      const { data: cached } = await supabase
        .from("unit_analysis")
        .select("summary, recommendations, session_count, demographics")
        .eq("subject_id", id)
        .eq("filter_key", filterKey)
        .single();
      if (cached) {
        return new Response(
          JSON.stringify({
            summary: cached.summary,
            recommendations: cached.recommendations,
            sessionCount: cached.session_count,
            demographics: cached.demographics,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // eslint-disable-next-line prefer-const
    let query = supabase
      .from("sessions")
      .select("professor_summary, duration_minutes, mode, gender, career, year")
      .eq("subject_id", id)
      .not("professor_summary", "is", null);

    if (careers.length > 0) query = query.in("career", careers);
    if (years.length > 0) query = query.in("year", years);
    if (genders.length > 0) query = query.in("gender", genders);

    const { data, error } = await query;

    if (error) {
      console.error("[professor/subjects/summary] Error de Supabase:", error);
      return new Response(JSON.stringify({ error: "Error al leer las sesiones" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay sesiones con resumen para ese filtro" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Compute demographics from filtered sessions
    const demographicsCareers: Record<string, number> = {};
    const demographicsYears: Record<string, number> = {};
    const demographicsGenders: Record<string, number> = {};
    let totalDuration = 0;
    let durationCount = 0;

    for (const s of data) {
      if (s.career) demographicsCareers[s.career] = (demographicsCareers[s.career] ?? 0) + 1;
      if (s.year) demographicsYears[String(s.year)] = (demographicsYears[String(s.year)] ?? 0) + 1;
      if (s.gender) demographicsGenders[s.gender] = (demographicsGenders[s.gender] ?? 0) + 1;
      if (s.duration_minutes != null) {
        totalDuration += s.duration_minutes;
        durationCount++;
      }
    }

    const demographics = {
      careers: demographicsCareers,
      years: demographicsYears,
      genders: demographicsGenders,
      avg_duration: durationCount > 0 ? Math.round(totalDuration / durationCount) : null,
    };

    // Build filter context for the prompt
    const filterParts: string[] = [];
    if (careers.length > 0) filterParts.push(`Carreras: ${careers.join(", ")}`);
    if (years.length > 0) filterParts.push(`Años: ${years.map((y) => `${y}°`).join(", ")}`);
    if (genders.length > 0) filterParts.push(`Géneros: ${genders.join(", ")}`);
    const filterContext = filterParts.length > 0 ? filterParts.join(" | ") : undefined;

    const prompt = getAggregateSummaryPrompt({ sessions: data, pdfName, filterContext });
    const rawSummary = await generateWithFallback(prompt);

    const DELIMITER = "===RECOMENDACIONES===";
    const delimIdx = rawSummary.indexOf(DELIMITER);
    const recommendations = delimIdx !== -1
      ? rawSummary.slice(delimIdx + DELIMITER.length).trim()
      : undefined;
    const summary = delimIdx !== -1
      ? rawSummary.replace(DELIMITER, "").trim()
      : rawSummary;

    // Guardar en caché para futuras visitas
    await supabase.from("unit_analysis").upsert(
      {
        subject_id: id,
        pdf_name: pdfName,
        filter_key: filterKey,
        summary,
        recommendations: recommendations ?? null,
        session_count: data.length,
        demographics,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "subject_id,filter_key" }
    );

    return new Response(
      JSON.stringify({ summary, recommendations, sessionCount: data.length, demographics }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[professor/subjects/summary] Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: `Error al generar el resumen: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
