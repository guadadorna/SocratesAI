import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import defaultConfig from "./config.default.json";

export interface HarnessConfig {
  pdf: string | null;
  personas: string[];
  sessionsPerPersona: number;
  turns: number;
  minutes: number;
  practiceMode: boolean;
  evalRepeats: number;
  out: string;
  replayTranscript: string | null;
  /** Overrides de A/B testing (tutor + evaluación). null = usar los defaults de producción. */
  temperature: number | null;
  models: string[] | null;
}

function parseArgs(argv: string[]): Partial<HarnessConfig> {
  const raw: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      raw[key] = true;
    } else {
      raw[key] = next;
      i++;
    }
  }

  const parsed: Partial<HarnessConfig> = {};
  if (typeof raw.pdf === "string") parsed.pdf = raw.pdf;
  if (typeof raw.personas === "string") {
    parsed.personas = raw.personas.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw["sessions-per-persona"] === "string") parsed.sessionsPerPersona = Number(raw["sessions-per-persona"]);
  if (typeof raw.turns === "string") parsed.turns = Number(raw.turns);
  if (typeof raw.minutes === "string") parsed.minutes = Number(raw.minutes);
  if (raw.practice === true) parsed.practiceMode = true;
  if (typeof raw["eval-repeats"] === "string") parsed.evalRepeats = Number(raw["eval-repeats"]);
  if (typeof raw.out === "string") parsed.out = raw.out;
  if (typeof raw["replay-transcript"] === "string") parsed.replayTranscript = raw["replay-transcript"];
  if (typeof raw.temperature === "string") parsed.temperature = Number(raw.temperature);
  if (typeof raw.models === "string") parsed.models = raw.models.split(",").map((s) => s.trim()).filter(Boolean);
  return parsed;
}

function loadLocalOverrides(): Partial<HarnessConfig> {
  const path = join(__dirname, "config.local.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function resolveConfig(argv: string[]): HarnessConfig {
  const base = defaultConfig as HarnessConfig;
  const local = loadLocalOverrides();
  const cli = parseArgs(argv);

  const merged: HarnessConfig = {
    ...base,
    ...local,
    ...cli,
    out: cli.out ?? local.out ?? (base.out || `corrida-${Date.now()}`),
  };

  if (!merged.replayTranscript) {
    if (!merged.personas || merged.personas.length === 0) {
      throw new Error("[eval-harness] No se especificó ninguna persona (--personas a,b,c).");
    }
    for (const id of merged.personas) {
      // Validación real de que la persona existe se hace en run.ts (evita import circular).
      if (!id) throw new Error("[eval-harness] Persona vacía en --personas.");
    }
    if (merged.sessionsPerPersona < 1) throw new Error("[eval-harness] --sessions-per-persona debe ser >= 1.");
    if (merged.turns < 1) throw new Error("[eval-harness] --turns debe ser >= 1.");
  }
  if (merged.evalRepeats < 1) throw new Error("[eval-harness] --eval-repeats debe ser >= 1.");

  return merged;
}

export interface CallEstimate {
  tutorAndStudent: number;
  evaluation: number;
  total: number;
}

export function estimateGeminiCalls(config: HarnessConfig): CallEstimate {
  if (config.replayTranscript) {
    return { tutorAndStudent: 0, evaluation: config.evalRepeats, total: config.evalRepeats };
  }
  const sessions = config.personas.length * config.sessionsPerPersona;
  const tutorAndStudent = sessions * config.turns * 2; // 1 llamada al tutor + 1 al alumno sintético por turno
  const evaluation = sessions * config.evalRepeats;
  return { tutorAndStudent, evaluation, total: tutorAndStudent + evaluation };
}
