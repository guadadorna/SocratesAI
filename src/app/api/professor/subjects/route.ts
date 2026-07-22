import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { parsePdf, MAX_PDF_SIZE_BYTES, MAX_PDF_PAGES } from "@/lib/pdf";

export const maxDuration = 60;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, pdf_name, created_at")
    .eq("professor_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Error al leer materias" }, { status: 500 });

  const subjects = await Promise.all(
    (data ?? []).map(async (subject) => {
      const { count } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subject.id);
      return { ...subject, enrolled_count: count ?? 0 };
    })
  );

  return NextResponse.json(subjects);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const name = formData.get("name");
  const file = formData.get("file");

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }

  let pdfName: string | null = null;
  let pdfContent: string | null = null;

  if (file instanceof File) {
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
    pdfName = file.name;
    pdfContent = text;
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      professor_id: userData.user.id,
      name: name.trim(),
      pdf_name: pdfName,
      pdf_content: pdfContent,
    })
    .select("id, name, pdf_name, created_at")
    .single();

  if (error) return NextResponse.json({ error: "Error al crear la materia" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
