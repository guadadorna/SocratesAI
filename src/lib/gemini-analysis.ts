import { google } from "@ai-sdk/google";
import { generateText } from "ai";

// Tutor: conversacional, streaming, se llama muchas veces por sesión — prioriza velocidad/costo.
export const TUTOR_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
// Evaluación y análisis agregado: se llaman una sola vez por sesión/unidad y son el feedback
// real que ven alumno y profesora — prioriza calidad, gemini-2.5-pro como modelo principal.
export const ANALYSIS_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

export const TEMPERATURES = {
  tutor: 0.4,
  analysis: 0.2,
} as const;

export async function generateWithFallback(
  prompt: string,
  options?: { models?: string[]; temperature?: number }
): Promise<string> {
  const models = options?.models ?? ANALYSIS_MODELS;
  const temperature = options?.temperature ?? TEMPERATURES.analysis;

  for (const modelName of models) {
    try {
      const { text } = await generateText({
        model: google(modelName),
        prompt,
        temperature,
      });
      return text;
    } catch (error) {
      const isLastModel = modelName === models[models.length - 1];
      if (isLastModel) throw error;
    }
  }
  throw new Error("Todos los modelos fallaron");
}

export function buildFilterKey(careers: string[], years: number[], genders: string[]): string {
  const parts: string[] = [];
  if (careers.length > 0) parts.push(`careers:${[...careers].sort().join(",")}`);
  if (years.length > 0) parts.push(`years:${[...years].sort((a, b) => a - b).join(",")}`);
  if (genders.length > 0) parts.push(`genders:${[...genders].sort().join(",")}`);
  return parts.length ? parts.join("|") : "all";
}
