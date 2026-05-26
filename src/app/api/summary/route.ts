import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { getAggregateSummaryPrompt } from "@/lib/prompts";
import { normalizePdfName } from "@/lib/sanitize";

export const maxDuration = 60;

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function generateWithFallback(prompt: string): Promise<string> {
  for (const modelName of MODELS) {
    try {
      const { text } = await generateText({
        model: google(modelName),
        prompt,
      });
      return text;
    } catch (error) {
      const isLastModel = modelName === MODELS[MODELS.length - 1];
      if (isLastModel) throw error;
    }
  }
  throw new Error("Todos los modelos fallaron");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfName = searchParams.get("pdf");
    const careersParam = searchParams.get("careers");
    const yearsParam = searchParams.get("years");
    const gendersParam = searchParams.get("genders");

    if (!pdfName) {
      return new Response(JSON.stringify({ error: "Falta el parámetro pdf" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const careers = careersParam ? careersParam.split(",").filter(Boolean) : [];
    const years = yearsParam
      ? yearsParam.split(",").map(Number).filter((n) => !isNaN(n) && n > 0)
      : [];
    const genders = gendersParam ? gendersParam.split(",").filter(Boolean) : [];

    const normalizedPdfName = normalizePdfName(pdfName);
    const baseName = normalizedPdfName.replace(/\.pdf$/i, "");

    // eslint-disable-next-line prefer-const
    let query = supabase
      .from("sessions")
      .select("professor_summary, duration_minutes, mode, gender, career, year")
      .or(`pdf_name.eq.${normalizedPdfName},pdf_name.ilike.${baseName}_%`)
      .not("professor_summary", "is", null);

    // Supabase filter builder is chainable — TypeScript infers the type correctly
    if (careers.length > 0) query = query.in("career", careers);
    if (years.length > 0) query = query.in("year", years);
    if (genders.length > 0) query = query.in("gender", genders);

    const { data, error } = await query;

    if (error) {
      console.error("[summary] Error de Supabase:", error);
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

    return new Response(
      JSON.stringify({ summary, recommendations, sessionCount: data.length, demographics }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[summary] Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: `Error al generar el resumen: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
