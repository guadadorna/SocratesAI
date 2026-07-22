import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { parsePdf, MAX_PDF_SIZE_BYTES, MAX_PDF_PAGES } from "@/lib/pdf";
import { getOwnedSubject } from "@/lib/subjects";

export const maxDuration = 60;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const subject = await getOwnedSubject(supabase, id, userData.user.id);
  if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo PDF" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { text, pageCount } = await parsePdf(buffer);
  if (pageCount > MAX_PDF_PAGES) {
    return NextResponse.json({ error: "El PDF no puede tener más de 100 páginas" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("subjects")
    .update({ pdf_name: file.name, pdf_content: text })
    .eq("id", id)
    .select("id, name, pdf_name, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Error al actualizar el material" }, { status: 500 });
  return NextResponse.json(data);
}
