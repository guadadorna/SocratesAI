import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

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
    const buffer = Buffer.from(arrayBuffer);

    interface TextItem {
      R?: Array<{ T?: string }>;
    }
    interface PDFPage {
      Texts?: TextItem[];
    }
    interface PDFData {
      Pages: PDFPage[];
    }

    const { text, pageCount } = await new Promise<{ text: string; pageCount: number }>((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: Error | { parserError: Error }) => {
        reject(errData instanceof Error ? errData : errData.parserError);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
        // Extract text manually from the parsed data
        let extractedText = "";
        for (const page of pdfData.Pages) {
          if (page.Texts) {
            for (const textItem of page.Texts) {
              if (textItem.R) {
                for (const run of textItem.R) {
                  if (run.T) {
                    try {
                      extractedText += decodeURIComponent(run.T) + " ";
                    } catch {
                      extractedText += run.T + " ";
                    }
                  }
                }
              }
            }
          }
          extractedText += "\n";
        }
        resolve({ text: extractedText, pageCount: pdfData.Pages.length });
      });

      pdfParser.parseBuffer(buffer);
    });

    if (pageCount > 100) {
      return NextResponse.json({ error: "El PDF no puede tener más de 100 páginas" }, { status: 400 });
    }

    // Limpiar el texto extraído
    const cleanedText = text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return NextResponse.json({
      text: cleanedText,
      pageCount,
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    return NextResponse.json({ error: "Error al procesar el PDF" }, { status: 500 });
  }
}
