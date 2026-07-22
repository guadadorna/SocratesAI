import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnedSubject } from "@/lib/subjects";
import { MateriaDetail, type SubjectStats } from "./MateriaDetail";

export default async function MateriaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/profesor/login");
  }

  const subject = await getOwnedSubject(supabase, id, userData.user.id);
  if (!subject) notFound();

  const { count: enrolledCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("subject_id", id);

  const { data: materialsData } = await supabase
    .from("materials")
    .select("id, pdf_name, created_at")
    .eq("subject_id", id)
    .order("created_at", { ascending: true });

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("gender, career, year, duration_minutes")
    .eq("subject_id", id)
    .not("professor_summary", "is", null);

  const careers: Record<string, number> = {};
  const years: Record<string, number> = {};
  const genders: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const s of sessionsData ?? []) {
    if (s.career) careers[s.career] = (careers[s.career] ?? 0) + 1;
    if (s.year) years[String(s.year)] = (years[String(s.year)] ?? 0) + 1;
    if (s.gender) genders[s.gender] = (genders[s.gender] ?? 0) + 1;
    if (s.duration_minutes != null) {
      totalDuration += s.duration_minutes;
      durationCount++;
    }
  }

  const stats: SubjectStats = {
    session_count: sessionsData?.length ?? 0,
    careers,
    years,
    genders,
    avg_duration: durationCount > 0 ? Math.round(totalDuration / durationCount) : null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
          <span className="text-sm text-gray-500">{userData.user.email}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="no-print mb-6">
          <Link href="/profesor" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Volver a mis materias
          </Link>
        </div>

        <MateriaDetail
          subject={{ id: subject.id, name: subject.name }}
          enrolledCount={enrolledCount ?? 0}
          initialMaterials={materialsData ?? []}
          initialStats={stats}
        />
      </main>
    </div>
  );
}
