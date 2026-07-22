import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const maxDuration = 60;

async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  interface TextItem { R?: Array<{ T?: string }> }
  interface PDFPage { Texts?: TextItem[] }
  interface PDFData { Pages: PDFPage[] }

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (err: Error | { parserError: Error }) => {
      reject(err instanceof Error ? err : err.parserError);
    });
    pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
      let text = "";
      for (const page of pdfData.Pages) {
        if (page.Texts) {
          for (const item of page.Texts) {
            if (item.R) {
              for (const run of item.R) {
                if (run.T) {
                  try { text += decodeURIComponent(run.T) + " "; }
                  catch { text += run.T + " "; }
                }
              }
            }
          }
        }
        text += "\n";
      }
      resolve({ text: text.replace(/\s+/g, " ").trim(), pageCount: pdfData.Pages.length });
    });
    pdfParser.parseBuffer(buffer);
  });
}

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
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, pageCount } = await parsePdf(buffer);
    if (pageCount > 100) {
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
