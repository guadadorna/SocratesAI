import { getAggregateSummaryPrompt } from "@/lib/prompts";
import { generateWithFallback } from "@/lib/gemini-analysis";

interface SessionForSummary {
  professor_summary: string;
  duration_minutes: number | null;
  mode: string | null;
  gender: string | null;
  career: string | null;
  year: number | null;
}

export interface AggregateRunResult {
  raw: string;
  summary: string;
  recommendations: string | null;
  delimiterFound: boolean;
}

const RECOMMENDATIONS_DELIMITER = "===RECOMENDACIONES===";

/**
 * Mantener sincronizado con el parseo de ===RECOMENDACIONES=== en
 * src/app/api/summary/route.ts (y su equivalente por subject_id).
 */
function parseAggregateOutput(raw: string): AggregateRunResult {
  const delimIdx = raw.indexOf(RECOMMENDATIONS_DELIMITER);
  const delimiterFound = delimIdx !== -1;
  const recommendations = delimiterFound ? raw.slice(delimIdx + RECOMMENDATIONS_DELIMITER.length).trim() : null;
  const summary = delimiterFound ? raw.replace(RECOMMENDATIONS_DELIMITER, "").trim() : raw;

  return { raw, summary, recommendations, delimiterFound };
}

export async function runAggregateEvaluation(params: {
  sessions: SessionForSummary[];
  pdfName: string;
  filterContext?: string;
  repeats: number;
  models?: string[];
  temperature?: number;
  onRepeat?: (repeatIndex: number, total: number) => void;
}): Promise<AggregateRunResult[]> {
  const { sessions, pdfName, filterContext, repeats, models, temperature, onRepeat } = params;

  const prompt = getAggregateSummaryPrompt({ sessions, pdfName, filterContext });

  const results: AggregateRunResult[] = [];
  for (let i = 1; i <= repeats; i++) {
    onRepeat?.(i, repeats);
    const raw = await generateWithFallback(prompt, { models, temperature });
    results.push(parseAggregateOutput(raw));
  }
  return results;
}
