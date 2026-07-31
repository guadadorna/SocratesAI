import { loadEnvLocal } from "./load-env";
loadEnvLocal();

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parsePdf } from "@/lib/pdf";
import { resolveConfig, estimateGeminiCalls } from "./config";
import { getPersona } from "./personas";
import { runSyntheticSession } from "./session-runner";
import { runEvaluation } from "./evaluate-runner";
import { runReplayEvaluation } from "./replay-runner";
import { runAggregateEvaluation } from "./aggregate-runner";
import {
  writeSessionArtifacts,
  writeRunSummary,
  writeRunConfig,
  writeAggregateArtifacts,
  type SessionSummary,
} from "./report-writer";

const FIXTURE_PATH = join(__dirname, "fixtures", "material-fallback.txt");

/**
 * Perfiles demográficos sintéticos para poder ejercitar la sección "Patrones por
 * perfil demográfico" de getAggregateSummaryPrompt. No configurable a propósito
 * (no hace falta más que un puñado de perfiles variados para el propósito del test).
 */
const DEMO_CYCLE: Array<{ career: string; year: number; gender: string }> = [
  { career: "Ingeniería Industrial", year: 3, gender: "Femenino" },
  { career: "Ingeniería Industrial", year: 4, gender: "Masculino" },
  { career: "Economía", year: 2, gender: "Femenino" },
  { career: "Economía", year: 3, gender: "Masculino" },
];

async function loadMaterial(pdfPath: string | null): Promise<{ text: string; source: string }> {
  if (pdfPath) {
    const buffer = readFileSync(pdfPath);
    const { text } = await parsePdf(buffer);
    return { text, source: pdfPath };
  }
  console.warn(`[eval-harness] No se pasó --pdf, usando material de respaldo (${FIXTURE_PATH}).`);
  return { text: readFileSync(FIXTURE_PATH, "utf-8"), source: FIXTURE_PATH };
}

interface ProfessorSummaryForAggregate {
  professor_summary: string;
  duration_minutes: number | null;
  mode: string | null;
  gender: string | null;
  career: string | null;
  year: number | null;
}

async function runSyntheticMode(
  config: ReturnType<typeof resolveConfig>,
  baseDir: string
): Promise<{ summaries: SessionSummary[]; pdfName: string; forAggregate: ProfessorSummaryForAggregate[] }> {
  const { text: contenidoPdf, source } = await loadMaterial(config.pdf);
  console.log(`[eval-harness] Material: ${source} (${contenidoPdf.length} caracteres)`);

  writeRunConfig(baseDir, { ...config, materialSource: source });

  const summaries: SessionSummary[] = [];
  const forAggregate: ProfessorSummaryForAggregate[] = [];
  let sessionIndex = 0;

  for (const personaId of config.personas) {
    const persona = getPersona(personaId);

    for (let s = 1; s <= config.sessionsPerPersona; s++) {
      const sessionLabel = `session-${s}`;
      console.log(`\n[eval-harness] === ${persona.label} / ${sessionLabel} ===`);

      const session = await runSyntheticSession({
        persona,
        contenidoPdf,
        tiempoTotalMinutos: config.minutes,
        practiceMode: config.practiceMode,
        turns: config.turns,
        tutorModels: config.models ?? undefined,
        tutorTemperature: config.temperature ?? undefined,
        onTurn: (i, total) => console.log(`  turno ${i}/${total}`),
      });

      const evalResults = await runEvaluation({
        messages: session.messages,
        contenidoPdf,
        tiempoTotalMinutos: config.minutes,
        practiceMode: config.practiceMode,
        repeats: config.evalRepeats,
        models: config.models ?? undefined,
        temperature: config.temperature ?? undefined,
        onRepeat: (i, total) => console.log(`  evaluación ${i}/${total}`),
      });

      const summary = writeSessionArtifacts({
        baseDir,
        personaId: persona.id,
        sessionLabel,
        messages: session.messages,
        evalResults,
      });
      summaries.push(summary);

      // Solo importa para el agregado si la producción real hubiese podido guardar el resumen
      // (es decir, si el delimitador apareció); si no, se descarta como haría el pipeline real.
      const professorSummary = evalResults[0]?.professorSummary;
      if (config.aggregate && professorSummary) {
        const demo = DEMO_CYCLE[sessionIndex % DEMO_CYCLE.length];
        forAggregate.push({
          professor_summary: professorSummary,
          duration_minutes: config.minutes,
          mode: config.practiceMode ? "practice" : null,
          gender: demo.gender,
          career: demo.career,
          year: demo.year,
        });
      }
      sessionIndex++;
    }
  }

  return { summaries, pdfName: basename(source), forAggregate };
}

async function main() {
  const config = resolveConfig(process.argv.slice(2));

  const estimate = estimateGeminiCalls(config);
  if (config.replayTranscript) {
    console.log(`[eval-harness] Modo replay: ${config.replayTranscript}`);
  } else {
    console.log(
      `[eval-harness] Config: personas=${config.personas.join(",")} sessionsPerPersona=${config.sessionsPerPersona} turns=${config.turns} evalRepeats=${config.evalRepeats}`
    );
  }
  console.log(
    `[eval-harness] Llamadas estimadas a Gemini: ~${estimate.tutorAndStudent} (conversación) + ~${estimate.evaluation} (evaluación)${
      estimate.aggregate > 0 ? ` + ~${estimate.aggregate} (agregado)` : ""
    } = ~${estimate.total} total`
  );
  if (config.temperature !== null || config.models !== null) {
    console.log(
      `[eval-harness] Override activo: temperature=${config.temperature ?? "(default de producción)"} models=${config.models?.join(",") ?? "(default de producción)"}`
    );
  }

  const baseDir = join(__dirname, "results", config.out);

  if (config.replayTranscript) {
    const summary = await runReplayEvaluation(config, baseDir);
    writeRunSummary(baseDir, [summary]);
    console.log(`\n[eval-harness] Listo. Resultados en: ${baseDir}`);
    return;
  }

  const { summaries, pdfName, forAggregate } = await runSyntheticMode(config, baseDir);
  writeRunSummary(baseDir, summaries);

  if (config.aggregate) {
    if (forAggregate.length === 0) {
      console.warn(
        "[eval-harness] --aggregate activo pero ninguna sesión generó un professor_summary válido (delimitador ausente en todas). Se omite el paso de agregado."
      );
    } else {
      console.log(
        `\n[eval-harness] === Agregado (${forAggregate.length} sesiones sintéticas, ${config.aggregateRepeats} repeats) ===`
      );
      const aggregateResults = await runAggregateEvaluation({
        sessions: forAggregate,
        pdfName,
        repeats: config.aggregateRepeats,
        models: config.models ?? undefined,
        temperature: config.temperature ?? undefined,
        onRepeat: (i, total) => console.log(`  agregado ${i}/${total}`),
      });
      writeAggregateArtifacts(baseDir, aggregateResults);
    }
  }

  console.log(`\n[eval-harness] Listo. Resultados en: ${baseDir}`);
}

main().catch((error) => {
  console.error("[eval-harness] Error fatal:", error);
  process.exit(1);
});
