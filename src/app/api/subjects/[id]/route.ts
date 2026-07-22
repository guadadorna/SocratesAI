import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: subject, error } = await supabase
    .from("subjects")
    .select("id, name, professor_id")
    .eq("id", id)
    .single();

  if (error || !subject) {
    return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
  }

  const { data: materials } = await supabase
    .from("materials")
    .select("pdf_name, pdf_content")
    .eq("subject_id", id)
    .order("created_at", { ascending: true });

  const pdfContent = materials && materials.length > 0
    ? materials.map((m) => `### ${m.pdf_name}\n${m.pdf_content}`).join("\n\n")
    : null;

  return NextResponse.json({ ...subject, pdf_content: pdfContent });
}
