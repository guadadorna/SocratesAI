import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

export async function generateWithFallback(prompt: string): Promise<string> {
  for (const modelName of MODELS) {
    try {
      const { text } = await generateText({
        model: google(modelName),
        prompt,
      });
      return text;
    } catch (error) {
      const isLastModel = modelName === MODELS[MODELS.length - 1];
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
