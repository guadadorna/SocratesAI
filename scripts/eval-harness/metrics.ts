import type { EvaluationRunResult } from "./evaluate-runner";

export interface SectionCheck {
  key: string;
  label: string;
  found: boolean;
}

// Deliberadamente basado en palabras clave (no en el formato exacto de heading/bold)
// porque una de las cosas que queremos medir es si el modelo ni siquiera mantiene
// las mismas etiquetas de sección entre corridas.
const SECTION_KEYWORDS: { key: string; label: string; pattern: RegExp }[] = [
  { key: "resumen", label: "Resumen de la sesión", pattern: /resumen de la sesi[oó]n/i },
  { key: "dominados", label: "Conceptos dominados", pattern: /dominar/i },
  { key: "a_reforzar", label: "Conceptos a reforzar", pattern: /a reforzar/i },
  { key: "preguntas_abiertas", label: "Preguntas abiertas", pattern: /preguntas abiertas/i },
  { key: "sugerencias", label: "Sugerencias de estudio", pattern: /sugerencias de estudio/i },
];

export function checkSections(text: string): SectionCheck[] {
  return SECTION_KEYWORDS.map(({ key, label, pattern }) => ({ key, label, found: pattern.test(text) }));
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Extrae las líneas bajo la sección "a reforzar", para comparar entre corridas a simple vista. */
export function extractReinforceExcerpt(text: string, maxChars = 400): string {
  const match = text.match(/a reforzar[\s\S]{0,50}?\n([\s\S]*?)(?=\n\s*\d+\.\s*\*\*|\n#{1,3}\s|$)/i);
  if (!match) return "(sección no encontrada)";
  const excerpt = match[1].trim();
  return excerpt.length > maxChars ? excerpt.slice(0, maxChars) + "…" : excerpt;
}

export interface EvaluationRunMetrics {
  delimiterFound: boolean;
  studentWordCount: number;
  professorWordCount: number | null;
  studentSections: SectionCheck[];
  professorSections: SectionCheck[] | null;
  studentPreambleChars: number;
  professorPreambleChars: number;
  reinforceExcerptStudent: string;
}

export function computeRunMetrics(result: EvaluationRunResult): EvaluationRunMetrics {
  return {
    delimiterFound: result.delimiterFound,
    studentWordCount: wordCount(result.studentFeedback),
    professorWordCount: result.professorSummary ? wordCount(result.professorSummary) : null,
    studentSections: checkSections(result.studentFeedback),
    professorSections: result.professorSummary ? checkSections(result.professorSummary) : null,
    studentPreambleChars: result.studentPreambleChars,
    professorPreambleChars: result.professorPreambleChars,
    reinforceExcerptStudent: extractReinforceExcerpt(result.studentFeedback),
  };
}

export interface AggregatedMetrics {
  repeats: number;
  delimiterFoundRate: number; // 0-1
  studentWordCount: { min: number; max: number; avg: number };
  professorWordCount: { min: number; max: number; avg: number } | null;
  allFiveSectionsFoundRate: { student: number; professor: number | null }; // 0-1
  reinforceExcerpts: string[]; // uno por repeat, para comparar lado a lado
}

function summarizeNumbers(values: number[]): { min: number; max: number; avg: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, avg: Math.round(avg * 10) / 10 };
}

export function aggregateMetrics(perRun: EvaluationRunMetrics[]): AggregatedMetrics {
  const repeats = perRun.length;
  const delimiterFoundRate = perRun.filter((r) => r.delimiterFound).length / repeats;

  const studentWordCounts = perRun.map((r) => r.studentWordCount);
  const professorWordCounts = perRun.filter((r) => r.professorWordCount !== null).map((r) => r.professorWordCount as number);

  const studentAllFive = perRun.filter((r) => r.studentSections.every((s) => s.found)).length / repeats;
  const professorRuns = perRun.filter((r) => r.professorSections !== null);
  const professorAllFive =
    professorRuns.length > 0
      ? professorRuns.filter((r) => r.professorSections!.every((s) => s.found)).length / professorRuns.length
      : null;

  return {
    repeats,
    delimiterFoundRate,
    studentWordCount: summarizeNumbers(studentWordCounts),
    professorWordCount: professorWordCounts.length > 0 ? summarizeNumbers(professorWordCounts) : null,
    allFiveSectionsFoundRate: { student: studentAllFive, professor: professorAllFive },
    reinforceExcerpts: perRun.map((r) => r.reinforceExcerptStudent),
  };
}
