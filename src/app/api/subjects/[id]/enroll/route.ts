import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { anonStudentId } = await request.json();

  if (typeof anonStudentId !== "string" || !anonStudentId) {
    return NextResponse.json({ error: "anonStudentId inválido" }, { status: 400 });
  }

  const { error: insertError } = await supabase
    .from("enrollments")
    .insert({ subject_id: id, anon_student_id: anonStudentId });

  if (insertError) {
    await supabase
      .from("enrollments")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("subject_id", id)
      .eq("anon_student_id", anonStudentId);
  }

  return NextResponse.json({ ok: true });
}
