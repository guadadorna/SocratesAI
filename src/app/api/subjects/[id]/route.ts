import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, pdf_name, pdf_content, professor_id")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });
  }

  return NextResponse.json(data);
}
