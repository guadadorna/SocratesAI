import { getCombinedEvaluationPrompt, EVALUATION_SEPARATOR } from "@/lib/prompts";
import { generateWithFallback } from "@/lib/gemini-analysis";
import type { ChatMessage } from "./gemini-client";

/**
 * Mantener sincronizado con stripPreamble() en src/app/api/evaluate/route.ts.
 */
function stripPreamble(text: string): { stripped: string; removedChars: number } {
  const idx = text.search(/^#{1,3}\s|\*\*/m);
  if (idx > 0) {
    return { stripped: text.slice(idx).trim(), removedChars: idx };
  }
  return { stripped: text, removedChars: 0 };
}

/**
 * Mantener sincronizado con la conversión de transcripcion en
 * src/app/api/evaluate/route.ts.
 */
export function messagesToTranscript(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "Estudiante" : "Tutor"}: ${m.content}`)
    .join("\n\n");
}

export interface EvaluationRunResult {
  raw: string;
  studentFeedback: string;
  professorSummary: string | null;
  delimiterFound: boolean;
  studentPreambleChars: number;
  professorPreambleChars: number;
}

/**
 * Mantener sincronizado con el parseo en POST de src/app/api/evaluate/route.ts
 * (split por EVALUATION_SEPARATOR + stripPreamble). Reproducido acá tal cual,
 * incluyendo el mismo comportamiento de fallback silencioso si falta el
 * delimitador, porque medir CUÁN SEGUIDO pasa eso es uno de los objetivos
 * de este harness.
 */
function parseEvaluationOutput(combined: string): EvaluationRunResult {
  const parts = combined.split(EVALUATION_SEPARATOR);
  const delimiterFound = parts.length === 2;

  const studentRaw = parts[0]?.trim() ?? combined;
  const { stripped: studentFeedback, removedChars: studentPreambleChars } = stripPreamble(studentRaw);

  let professorSummary: string | null = null;
  let professorPreambleChars = 0;
  if (parts[1]) {
    const professorRaw = parts[1].trim();
    const { stripped, removedChars } = stripPreamble(professorRaw);
    professorSummary = stripped;
    professorPreambleChars = removedChars;
  }

  return {
    raw: combined,
    studentFeedback,
    professorSummary,
    delimiterFound,
    studentPreambleChars,
    professorPreambleChars,
  };
}

export async function runEvaluation(params: {
  messages: ChatMessage[];
  contenidoPdf: string;
  tiempoTotalMinutos: number;
  practiceMode?: boolean;
  actualMinutes?: number | null;
  contextoAdicional?: string;
  repeats: number;
  /** Overrides de A/B testing; si no se pasan, usa los defaults de producción (ANALYSIS_MODELS). */
  models?: string[];
  temperature?: number;
  onRepeat?: (repeatIndex: number, total: number) => void;
}): Promise<EvaluationRunResult[]> {
  const {
    messages,
    contenidoPdf,
    tiempoTotalMinutos,
    practiceMode,
    actualMinutes,
    contextoAdicional,
    repeats,
    models,
    temperature,
    onRepeat,
  } = params;

  const transcripcion = messagesToTranscript(messages);
  const prompt = getCombinedEvaluationPrompt({
    transcripcion,
    contenidoPdf,
    contextoAdicional,
    tiempoTotalMinutos,
    practiceMode,
    actualMinutes,
  });

  const results: EvaluationRunResult[] = [];
  for (let i = 1; i <= repeats; i++) {
    onRepeat?.(i, repeats);
    const combined = await generateWithFallback(prompt, { models, temperature });
    results.push(parseEvaluationOutput(combined));
  }
  return results;
}
