import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { getCombinedEvaluationPrompt, EVALUATION_SEPARATOR } from "@/lib/prompts";

export const maxDuration = 60;

// Removes any conversational preamble Gemini adds before the first markdown heading
function stripPreamble(text: string): string {
  const idx = text.search(/^#{1,3}\s|\*\*/m);
  return idx > 0 ? text.slice(idx).trim() : text;
}

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
    const { messages, pdfContent, timeMinutes, additionalContext, practiceMode, actualMinutes } = await request.json();

    if (!messages || !pdfContent || (!timeMinutes && !practiceMode)) {
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

    const prompt = getCombinedEvaluationPrompt({
      transcripcion,
      contenidoPdf: pdfContent,
      contextoAdicional: additionalContext,
      tiempoTotalMinutos: timeMinutes ?? 0,
      practiceMode,
      actualMinutes,
    });

    const combined = await generateWithFallback(prompt);
    const parts = combined.split(EVALUATION_SEPARATOR);
    const studentFeedback = stripPreamble(parts[0]?.trim() ?? combined);
    const professorSummary = parts[1] ? stripPreamble(parts[1].trim()) : null;

    return new Response(JSON.stringify({ feedback: studentFeedback, professorSummary }), {
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
