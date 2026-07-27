import { loadEnvLocal } from "./load-env";
loadEnvLocal();

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePdf } from "@/lib/pdf";
import { resolveConfig, estimateGeminiCalls } from "./config";
import { getPersona } from "./personas";
import { runSyntheticSession } from "./session-runner";
import { runEvaluation } from "./evaluate-runner";
import { runReplayEvaluation } from "./replay-runner";
import { writeSessionArtifacts, writeRunSummary, writeRunConfig, type SessionSummary } from "./report-writer";

const FIXTURE_PATH = join(__dirname, "fixtures", "material-fallback.txt");

async function loadMaterial(pdfPath: string | null): Promise<{ text: string; source: string }> {
  if (pdfPath) {
    const buffer = readFileSync(pdfPath);
    const { text } = await parsePdf(buffer);
    return { text, source: pdfPath };
  }
  console.warn(`[eval-harness] No se pasó --pdf, usando material de respaldo (${FIXTURE_PATH}).`);
  return { text: readFileSync(FIXTURE_PATH, "utf-8"), source: FIXTURE_PATH };
}

async function runSyntheticMode(config: ReturnType<typeof resolveConfig>, baseDir: string): Promise<SessionSummary[]> {
  const { text: contenidoPdf, source } = await loadMaterial(config.pdf);
  console.log(`[eval-harness] Material: ${source} (${contenidoPdf.length} caracteres)`);

  writeRunConfig(baseDir, { ...config, materialSource: source });

  const summaries: SessionSummary[] = [];

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
    }
  }

  return summaries;
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
    `[eval-harness] Llamadas estimadas a Gemini: ~${estimate.tutorAndStudent} (conversación) + ~${estimate.evaluation} (evaluación) = ~${estimate.total} total`
  );
  if (config.temperature !== null || config.models !== null) {
    console.log(
      `[eval-harness] Override activo: temperature=${config.temperature ?? "(default de producción)"} models=${config.models?.join(",") ?? "(default de producción)"}`
    );
  }

  const baseDir = join(__dirname, "results", config.out);

  const summaries = config.replayTranscript
    ? [await runReplayEvaluation(config, baseDir)]
    : await runSyntheticMode(config, baseDir);

  writeRunSummary(baseDir, summaries);
  console.log(`\n[eval-harness] Listo. Resultados en: ${baseDir}`);
}

main().catch((error) => {
  console.error("[eval-harness] Error fatal:", error);
  process.exit(1);
});
