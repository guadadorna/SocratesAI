import { google } from "@ai-sdk/google";
import { generateText } from "ai";

type Message = { role: string; content: string };

export async function sanitizeMessages(messages: Message[]): Promise<Message[]> {
  const prompt = `Sos un sanitizador de texto para proteger la privacidad.

Tu tarea: en los mensajes que te paso, reemplazá cualquier nombre propio de persona, apodo, DNI, email, teléfono u otro dato personal identificatorio con "[DATO_PERSONAL]". No cambies ningún otro contenido.

Devolvé ÚNICAMENTE un array JSON válido con el mismo formato de entrada. Sin texto adicional, sin markdown, sin explicaciones.

Mensajes:
${JSON.stringify(messages)}`;

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash-lite"),
      prompt,
    });

    // Gemini a veces envuelve la respuesta en bloques de código markdown
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sanitized = JSON.parse(clean);

    if (!Array.isArray(sanitized)) throw new Error("Respuesta inválida del sanitizador");
    return sanitized as Message[];
  } catch (error) {
    // Si falla la sanitización, loguear y devolver los originales
    // En contexto académico el riesgo es bajo; preferimos no perder la sesión
    console.error("[sanitize] Error al sanitizar mensajes:", error);
    return messages;
  }
}

// Strips campus-download suffixes from PDF filenames.
// "7. Dif in Dif_d19b4f2c630efc14e314c67a4af05c76_f69d728c1c5ad026c9e479f609adf56d.pdf"
// → "7. Dif in Dif.pdf"
export function normalizePdfName(filename: string): string {
  return filename.replace(/(_[0-9a-f]{16,})+\.pdf$/i, ".pdf");
}
