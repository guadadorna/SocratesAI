import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "El archivo no puede superar 10MB" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));

    if (pdf.numPages > 100) {
      return NextResponse.json({ error: "El PDF no puede tener más de 100 páginas" }, { status: 400 });
    }

    const { text } = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });

    // Limpiar el texto extraído
    const cleanedText = text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({
      text: cleanedText,
      pageCount: pdf.numPages,
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json({ error: "Error al procesar el PDF" }, { status: 500 });
  }
}
