import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("sessions")
    .select("pdf_name, gender, career, year, duration_minutes")
    .not("professor_summary", "is", null);

  if (error) {
    console.error("[professor/units] Error:", error);
    return Response.json({ error: "Error al leer sesiones" }, { status: 500 });
  }

  const unitsMap = new Map<
    string,
    {
      pdf_name: string;
      session_count: number;
      careers: Record<string, number>;
      years: Record<string, number>;
      genders: Record<string, number>;
      total_duration: number;
      duration_count: number;
    }
  >();

  for (const s of data ?? []) {
    const key = s.pdf_name ?? "Sin nombre";
    if (!unitsMap.has(key)) {
      unitsMap.set(key, {
        pdf_name: key,
        session_count: 0,
        careers: {},
        years: {},
        genders: {},
        total_duration: 0,
        duration_count: 0,
      });
    }
    const u = unitsMap.get(key)!;
    u.session_count++;
    if (s.career) u.careers[s.career] = (u.careers[s.career] ?? 0) + 1;
    if (s.year) u.years[String(s.year)] = (u.years[String(s.year)] ?? 0) + 1;
    if (s.gender) u.genders[s.gender] = (u.genders[s.gender] ?? 0) + 1;
    if (s.duration_minutes != null) {
      u.total_duration += s.duration_minutes;
      u.duration_count++;
    }
  }

  const units = Array.from(unitsMap.values()).map(
    ({ total_duration, duration_count, ...rest }) => ({
      ...rest,
      avg_duration:
        duration_count > 0 ? Math.round(total_duration / duration_count) : null,
    })
  );

  return Response.json(units);
}
