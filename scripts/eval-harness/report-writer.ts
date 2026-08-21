import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ChatMessage } from "./gemini-client";
import type { EvaluationRunResult } from "./evaluate-runner";
import type { AggregateRunResult } from "./aggregate-runner";
import { computeRunMetrics, aggregateMetrics, type AggregatedMetrics } from "./metrics";

export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function transcriptToMarkdown(messages: ChatMessage[]): string {
  return messages
    .map((m) => `### ${m.role === "user" ? "Alumno" : "Tutor"}\n\n${m.content}`)
    .join("\n\n---\n\n");
}

export interface SessionSummary {
  personaId: string;
  sessionLabel: string;
  aggregated: AggregatedMetrics;
}

/**
 * Escribe todos los artefactos de una sesión (transcript + N corridas de
 * evaluación + métricas) bajo <baseDir>/<personaId>/<sessionLabel>/.
 */
export function writeSessionArtifacts(params: {
  baseDir: string;
  personaId: string;
  sessionLabel: string;
  messages: ChatMessage[];
  evalResults: EvaluationRunResult[];
}): SessionSummary {
  const { baseDir, personaId, sessionLabel, messages, evalResults } = params;

  const sessionDir = join(baseDir, personaId, sessionLabel);
  ensureDir(sessionDir);

  writeFileSync(join(sessionDir, "transcript.json"), JSON.stringify(messages, null, 2), "utf-8");
  writeFileSync(join(sessionDir, "transcript.md"), transcriptToMarkdown(messages), "utf-8");

  const perRunMetrics = evalResults.map((r) => computeRunMetrics(r));

  evalResults.forEach((result, i) => {
    const n = i + 1;
    writeFileSync(
      join(sessionDir, `eval-${n}-student.md`),
      result.studentFeedback,
      "utf-8"
    );
    writeFileSync(
      join(sessionDir, `eval-${n}-professor.md`),
      result.professorSummary ?? "(no se encontró el delimitador ===RESUMEN_PROFESOR=== en esta corrida)",
      "utf-8"
    );
    writeFileSync(
      join(sessionDir, `eval-${n}-raw.txt`),
      result.raw,
      "utf-8"
    );
  });

  const aggregated = aggregateMetrics(perRunMetrics);
  writeFileSync(join(sessionDir, "metrics.json"), JSON.stringify({ perRun: perRunMetrics, aggregated }, null, 2), "utf-8");

  return { personaId, sessionLabel, aggregated };
}

/**
 * Escribe los artefactos del paso de agregado (getAggregateSummaryPrompt corrido
 * --aggregate-repeats veces sobre el mismo set de resúmenes) bajo <baseDir>/aggregate/.
 */
export function writeAggregateArtifacts(baseDir: string, results: AggregateRunResult[]): void {
  const dir = join(baseDir, "aggregate");
  ensureDir(dir);

  results.forEach((r, i) => {
    const n = i + 1;
    writeFileSync(join(dir, `aggregate-${n}-raw.txt`), r.raw, "utf-8");
    writeFileSync(join(dir, `aggregate-${n}-summary.md`), r.summary, "utf-8");
    writeFileSync(
      join(dir, `aggregate-${n}-recommendations.md`),
      r.recommendations ?? "(no se encontró el delimitador ===RECOMENDACIONES=== en esta corrida)",
      "utf-8"
    );
  });

  const delimiterRate = results.filter((r) => r.delimiterFound).length / results.length;
  const lines: string[] = [];
  lines.push(`# Resumen del paso de agregado\n`);
  lines.push(`Repeats: ${results.length}`);
  lines.push(`Delimitador \`===RECOMENDACIONES===\` encontrado: ${(delimiterRate * 100).toFixed(0)}%\n`);
  lines.push(`## Recomendaciones por repeat (para eyeballear consistencia)\n`);
  results.forEach((r, i) => {
    lines.push(`### Repeat ${i + 1}\n`);
    lines.push(`\`\`\`\n${r.recommendations ?? "(sin delimitador)"}\n\`\`\`\n`);
  });

  writeFileSync(join(dir, "aggregate-summary.md"), lines.join("\n"), "utf-8");
}

export function writeRunConfig(baseDir: string, config: unknown): void {
  ensureDir(baseDir);
  writeFileSync(join(baseDir, "run-config.json"), JSON.stringify(config, null, 2), "utf-8");
}

export function writeRunSummary(baseDir: string, summaries: SessionSummary[]): void {
  const lines: string[] = [];
  lines.push(`# Resumen de la corrida\n`);
  lines.push(
    `| Persona | Sesión | Repeats | Delimitador OK | 5 secciones (alumno) | 5 secciones (profesor) | Word count alumno (min–max, avg) |`
  );
  lines.push(`|---|---|---|---|---|---|---|`);

  for (const s of summaries) {
    const a = s.aggregated;
    lines.push(
      `| ${s.personaId} | ${s.sessionLabel} | ${a.repeats} | ${(a.delimiterFoundRate * 100).toFixed(0)}% | ${(a.allFiveSectionsFoundRate.student * 100).toFixed(0)}% | ${
        a.allFiveSectionsFoundRate.professor !== null ? (a.allFiveSectionsFoundRate.professor * 100).toFixed(0) + "%" : "—"
      } | ${a.studentWordCount.min}–${a.studentWordCount.max} (avg ${a.studentWordCount.avg}) |`
    );
  }

  lines.push(`\n## Conceptos "a reforzar" por corrida (para eyeballear consistencia)\n`);
  for (const s of summaries) {
    lines.push(`### ${s.personaId} / ${s.sessionLabel}\n`);
    s.aggregated.reinforceExcerpts.forEach((excerpt, i) => {
      lines.push(`**Repeat ${i + 1}:**\n\n\`\`\`\n${excerpt}\n\`\`\`\n`);
    });
  }

  writeFileSync(join(baseDir, "summary.md"), lines.join("\n"), "utf-8");
}
