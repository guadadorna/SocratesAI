import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { TUTOR_MODELS, TEMPERATURES } from "@/lib/gemini-analysis";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Igual patrón de fallback que ya existe en chat/route.ts, evaluate/route.ts
 * y gemini-analysis.ts, pero para llamadas con system+messages (chat) en vez
 * de un solo `prompt` string. No existe hoy en el código de producción
 * porque generateWithFallback() solo acepta `prompt`. Default = los mismos
 * TUTOR_MODELS/temperature que usa /api/chat en producción; se puede
 * sobreescribir con --models/--temperature del harness para A/B testing.
 */
export async function generateChatWithFallback(params: {
  system: string;
  messages: ChatMessage[];
  models?: string[];
  temperature?: number;
}): Promise<string> {
  const models = params.models ?? TUTOR_MODELS;
  const temperature = params.temperature ?? TEMPERATURES.tutor;

  let lastError: unknown;
  for (const modelName of models) {
    try {
      const { text } = await generateText({
        model: google(modelName),
        system: params.system,
        messages: params.messages,
        temperature,
      });
      return text;
    } catch (error) {
      lastError = error;
      console.warn(`[eval-harness] Modelo ${modelName} falló:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Todos los modelos fallaron");
}
