import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { getTutorPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { messages, pdfContent, timeMinutes, additionalContext, isClosingPhase } =
      await request.json();

    if (!pdfContent || !timeMinutes) {
      return new Response(JSON.stringify({ error: "Faltan datos de la sesión" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    let systemPrompt = getTutorPrompt({
      tiempoTotalMinutos: timeMinutes,
      contextoAdicional: additionalContext,
      contenidoPdf: pdfContent,
    });

    // Si estamos en fase de cierre, agregar instrucción
    if (isClosingPhase) {
      systemPrompt += `\n\nIMPORTANTE: Quedan menos de 2 minutos de sesión. Comenzá a cerrar la conversación de forma natural. Hacé una síntesis breve de lo que se trabajó y pedile al estudiante que te cuente en una frase lo más importante que aprendió o se lleva de esta sesión.`;
    }

    const result = await streamText({
      model: google(model),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Error en el chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
