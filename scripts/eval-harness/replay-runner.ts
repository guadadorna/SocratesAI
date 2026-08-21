import { readFileSync } from "node:fs";
import { runEvaluation } from "./evaluate-runner";
import { writeSessionArtifacts, type SessionSummary } from "./report-writer";
import type { HarnessConfig } from "./config";
import type { ChatMessage } from "./gemini-client";

/**
 * Shape del JSON que se copia manualmente desde localStorage (key
 * "socrates_session", ver SessionData en src/lib/session-store.ts) para
 * poder correr una sesión real jugada a mano por el pipeline de evaluación.
 */
interface ManualSessionFile {
  pdfContent: string;
  pdfName?: string;
  timeMinutes: number;
  practiceMode?: boolean;
  additionalContext?: string;
  messages: ChatMessage[];
}

export async function runReplayEvaluation(config: HarnessConfig, baseDir: string): Promise<SessionSummary> {
  if (!config.replayTranscript) {
    throw new Error("[eval-harness] runReplayEvaluation llamado sin --replay-transcript");
  }

  const raw = readFileSync(config.replayTranscript, "utf-8");
  const manual: ManualSessionFile = JSON.parse(raw);

  if (!manual.pdfContent || !manual.messages || manual.messages.length === 0) {
    throw new Error(
      "[eval-harness] El archivo de replay no tiene el shape esperado (pdfContent + messages). ¿Copiaste bien el JSON de localStorage['socrates_session']?"
    );
  }

  console.log(
    `[eval-harness] Transcript real: ${manual.pdfName ?? "(sin nombre)"} — ${manual.messages.length} mensajes`
  );

  const evalResults = await runEvaluation({
    messages: manual.messages,
    contenidoPdf: manual.pdfContent,
    tiempoTotalMinutos: manual.timeMinutes,
    practiceMode: manual.practiceMode,
    contextoAdicional: manual.additionalContext,
    repeats: config.evalRepeats,
    models: config.models ?? undefined,
    temperature: config.temperature ?? undefined,
    onRepeat: (i, total) => console.log(`  evaluación ${i}/${total}`),
  });

  const sessionLabel = (manual.pdfName ?? "sesion-real").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) || "sesion-real";

  return writeSessionArtifacts({
    baseDir,
    personaId: "manual",
    sessionLabel,
    messages: manual.messages,
    evalResults,
  });
}
