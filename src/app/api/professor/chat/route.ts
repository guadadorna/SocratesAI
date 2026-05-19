import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const maxDuration = 60;

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

function getSystemPrompt(pdfName: string, analysisContext: string): string {
  return `Sos un asistente analítico de SocratesAI que ayuda a docentes a interpretar el rendimiento de sus alumnos.

Material analizado: "${pdfName}"

El siguiente es el análisis de las sesiones de tutoría que ya fue generado:
---
${analysisContext}
---

Tu rol:
- Respondé preguntas específicas basándote en este análisis
- Si te preguntan algo que no está en el análisis, decíselo claramente y ofrecé lo que sí podés responder
- Sé conciso y directo; no repitas el análisis completo si no te lo piden
- Español rioplatense, tono profesional
- No inventés datos ni conclusiones que no estén en el análisis`;
}

export async function POST(request: Request) {
  try {
    const { messages, analysisContext, pdfName } = await request.json();

    if (!messages || !analysisContext || !pdfName) {
      return new Response(JSON.stringify({ error: "Faltan datos requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = getSystemPrompt(pdfName, analysisContext);
    let lastError: Error | null = null;

    for (const modelName of MODELS) {
      try {
        const result = streamText({
          model: google(modelName),
          system: systemPrompt,
          messages,
          maxRetries: 0,
        });

        const response = result.toTextStreamResponse();
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No se pudo iniciar el stream");

        const { value, done } = await reader.read();
        if (done && !value) throw new Error("Stream vacío");

        const initialChunk = value;
        const newStream = new ReadableStream({
          async start(controller) {
            if (initialChunk) controller.enqueue(initialChunk);
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(newStream, { headers: response.headers });
      } catch (error) {
        lastError = error as Error;
        console.warn(`[professor/chat] Modelo ${modelName} falló:`, (error as Error).message);
        const isLastModel = modelName === MODELS[MODELS.length - 1];
        if (isLastModel) throw error;
      }
    }

    throw lastError || new Error("Todos los modelos fallaron");
  } catch (error) {
    console.error("[professor/chat] Error:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la pregunta" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
