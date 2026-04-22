import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { getTutorPrompt } from "@/lib/prompts";

export const maxDuration = 60;

// Modelos en orden de preferencia
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

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

    let systemPrompt = getTutorPrompt({
      tiempoTotalMinutos: timeMinutes,
      contextoAdicional: additionalContext,
      contenidoPdf: pdfContent,
    });

    // Si estamos en fase de cierre, agregar instrucción
    if (isClosingPhase) {
      systemPrompt += `\n\nIMPORTANTE: Quedan menos de 2 minutos de sesión. Comenzá a cerrar la conversación de forma natural. Hacé una síntesis breve de lo que se trabajó y pedile al estudiante que te cuente en una frase lo más importante que aprendió o se lleva de esta sesión.`;
    }

    // Intentar con modelos en orden de preferencia
    let lastError: Error | null = null;

    for (const modelName of MODELS) {
      try {
        console.log(`Trying model: ${modelName}`);
        const result = streamText({
          model: google(modelName),
          system: systemPrompt,
          messages,
          maxRetries: 0, // Desactivar reintentos internos para que el fallback funcione
        });

        // Consumir el stream para detectar errores antes de retornar
        const response = result.toTextStreamResponse();

        // Verificar que el stream empiece correctamente
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No se pudo iniciar el stream");

        // Leer el primer chunk para verificar que funciona
        const { value, done } = await reader.read();

        if (done && !value) {
          throw new Error("Stream vacío");
        }

        // Crear un nuevo stream que incluya el primer chunk ya leído
        const initialChunk = value;
        const newStream = new ReadableStream({
          async start(controller) {
            // Enviar el chunk que ya leímos
            if (initialChunk) {
              controller.enqueue(initialChunk);
            }
            // Continuar con el resto del stream
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

        return new Response(newStream, {
          headers: response.headers,
        });
      } catch (error) {
        lastError = error as Error;
        console.log(`Model ${modelName} failed:`, (error as Error).message);
        const isLastModel = modelName === MODELS[MODELS.length - 1];
        if (isLastModel) {
          throw error;
        }
        console.log(`Trying next model...`);
        // Continuar con el siguiente modelo
      }
    }

    throw lastError || new Error("Todos los modelos fallaron");
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Error en el chat" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
