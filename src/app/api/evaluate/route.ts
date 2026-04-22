import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getEvaluatorPrompt } from "@/lib/prompts";

export const maxDuration = 60;

// Modelos en orden de preferencia
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function generateWithFallback(prompt: string): Promise<string> {
  for (const modelName of MODELS) {
    try {
      console.log(`Trying model: ${modelName}`);
      const { text } = await generateText({
        model: google(modelName),
        prompt,
      });
      return text;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      console.log(`Model ${modelName} failed:`, errorMessage);
      const isLastModel = modelName === MODELS[MODELS.length - 1];
      if (isLastModel) {
        throw error;
      }
      console.log(`Trying next model...`);
    }
  }
  throw new Error("Todos los modelos fallaron");
}

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

    const prompt = getEvaluatorPrompt({
      transcripcion,
      contenidoPdf: pdfContent,
      contextoAdicional: additionalContext,
      tiempoTotalMinutos: timeMinutes,
    });

    const text = await generateWithFallback(prompt);

    return new Response(JSON.stringify({ feedback: text }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: `Error al generar el feedback: ${errorMessage}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
