import PDFParser from "pdf2json";

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 100;

interface TextItem {
  R?: Array<{ T?: string }>;
}
interface PDFPage {
  Texts?: TextItem[];
}
interface PDFData {
  Pages: PDFPage[];
}

export async function parsePdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
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
