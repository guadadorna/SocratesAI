import { getTutorPrompt } from "@/lib/prompts";
import { generateChatWithFallback, type ChatMessage } from "./gemini-client";
import { generateStudentReply, JOIN_TRIGGER } from "./student";
import type { Persona } from "./personas";

/**
 * Mantener sincronizado con el texto agregado en src/app/api/chat/route.ts
 * cuando isClosingPhase && !practiceMode.
 */
const CLOSING_SUFFIX = `\n\nIMPORTANTE: Quedan menos de 2 minutos de sesión. Comenzá a cerrar la conversación de forma natural. Hacé una síntesis breve de lo que se trabajó y pedile al estudiante que te cuente en una frase lo más importante que aprendió o se lleva de esta sesión.`;

export interface SyntheticSessionResult {
  personaId: string;
  contenidoPdf: string;
  tiempoTotalMinutos: number;
  practiceMode: boolean;
  messages: ChatMessage[];
}

export async function runSyntheticSession(params: {
  persona: Persona;
  contenidoPdf: string;
  tiempoTotalMinutos: number;
  practiceMode?: boolean;
  turns: number;
  /** Overrides de A/B testing para el tutor (no afectan al alumno sintético). */
  tutorModels?: string[];
  tutorTemperature?: number;
  onTurn?: (turnIndex: number, total: number) => void;
}): Promise<SyntheticSessionResult> {
  const { persona, contenidoPdf, tiempoTotalMinutos, practiceMode = false, turns, tutorModels, tutorTemperature, onTurn } =
    params;

  const messages: ChatMessage[] = [{ role: "user", content: JOIN_TRIGGER }];

  const baseSystemPrompt = getTutorPrompt({
    tiempoTotalMinutos,
    contenidoPdf,
    practiceMode,
  });

  for (let turn = 1; turn <= turns; turn++) {
    onTurn?.(turn, turns);

    const isClosingTurn = turn === turns;
    const systemPrompt = isClosingTurn && !practiceMode ? baseSystemPrompt + CLOSING_SUFFIX : baseSystemPrompt;

    const tutorReply = await generateChatWithFallback({
      system: systemPrompt,
      messages,
      models: tutorModels,
      temperature: tutorTemperature,
    });
    messages.push({ role: "assistant", content: tutorReply });

    const studentReply = await generateStudentReply({ persona, contenidoPdf, messages });
    messages.push({ role: "user", content: studentReply });
  }

  return {
    personaId: persona.id,
    contenidoPdf,
    tiempoTotalMinutos,
    practiceMode,
    messages,
  };
}
