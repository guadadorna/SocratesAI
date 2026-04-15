import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getEvaluatorPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { messages, pdfContent, timeMinutes, additionalContext } = await request.json();

    if (!messages || !pdfContent || !timeMinutes) {
      return new Response(JSON.stringify({ error: "Faltan datos para la evaluación" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convertir mensajes a transcripción
    const transcripcion = messages
      .map((m: { role: string; content: string }) => {
        const rol = m.role === "user" ? "Estudiante" : "Tutor";
        return `${rol}: ${m.content}`;
      })
      .join("\n\n");

    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const prompt = getEvaluatorPrompt({
      transcripcion,
      contenidoPdf: pdfContent,
      contextoAdicional: additionalContext,
      tiempoTotalMinutos: timeMinutes,
    });

    const { text } = await generateText({
      model: google(model),
      prompt,
    });

    return new Response(JSON.stringify({ feedback: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return new Response(JSON.stringify({ error: "Error al generar el feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
