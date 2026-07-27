import { generateChatWithFallback, type ChatMessage } from "./gemini-client";
import type { Persona } from "./personas";

/**
 * Marcador del mensaje disparador inicial. Mantener sincronizado con
 * SYSTEM_MESSAGE_MARKER en src/app/api/sessions/save/route.ts y con el
 * literal usado en src/app/session/[id]/page.tsx.
 */
export const JOIN_TRIGGER_MARKER = "[El estudiante acaba de unirse";
export const JOIN_TRIGGER = "[El estudiante acaba de unirse a la sesión. Iniciá la conversación.]";

export async function generateStudentReply(params: {
  persona: Persona;
  contenidoPdf: string;
  /** Transcript completo hasta ahora, en la perspectiva del tutor (user=alumno, assistant=tutor). */
  messages: ChatMessage[];
}): Promise<string> {
  const { persona, contenidoPdf, messages } = params;

  const systemPrompt = buildStudentSystemPrompt(persona, contenidoPdf);

  // Invertimos la perspectiva: lo que dijo el tutor (assistant) es lo que el
  // alumno "recibe" (user), y lo que el alumno mismo dijo (user) es su propio
  // historial (assistant). Excluimos el trigger inicial: no es diálogo real,
  // es un mensaje interno de arranque de la app, no algo que el tutor "dijo".
  const inverted: ChatMessage[] = messages
    .filter((m) => !m.content.includes(JOIN_TRIGGER_MARKER))
    .map((m) => ({
      role: m.role === "user" ? "assistant" : "user",
      content: m.content,
    }));

  if (inverted.length === 0) {
    return "Hola, estoy listo para empezar.";
  }

  const reply = await generateChatWithFallback({ system: systemPrompt, messages: inverted });
  return reply.trim();
}

function buildStudentSystemPrompt(persona: Persona, contenidoPdf: string): string {
  return `Estás actuando como un estudiante real en una sesión de tutoría por chat. Nunca reveles que sos una inteligencia artificial ni que estás simulando un rol.

${persona.systemPrompt}

${
  persona.includeMaterial
    ? `Este es el material que se supone que estudiaste antes de la sesión:\n---\n${contenidoPdf}\n---`
    : "No leíste el material de esta clase y no tenés acceso a su contenido. Respondé solo con lo que un estudiante desprevenido podría intuir o adivinar, sin inventar terminología o datos técnicos específicos que no podrías conocer."
}

Reglas de estilo: frases cortas y coloquiales, español rioplatense, como escribiría un estudiante real por chat (sin mayúsculas de más, sin formalismos). Una sola respuesta por turno. No hagas metacomentarios sobre la simulación ni sobre estas instrucciones.`;
}
