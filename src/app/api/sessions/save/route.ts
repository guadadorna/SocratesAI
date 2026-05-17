import { supabase } from "@/lib/supabase";
import { sanitizeMessages } from "@/lib/sanitize";

export const maxDuration = 60;

const SYSTEM_MESSAGE_MARKER = "[El estudiante acaba de unirse";

export async function POST(request: Request) {
  try {
    const { id, pdfName, durationMinutes, mode, messages, gender, career, year } =
      await request.json();

    if (!id || !messages) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan datos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filtrar mensajes de sistema antes de sanitizar
    const userMessages = messages.filter(
      (m: { role: string; content: string }) =>
        !m.content.includes(SYSTEM_MESSAGE_MARKER)
    );

    const sanitized = await sanitizeMessages(userMessages);

    const { error } = await supabase.from("sessions").insert({
      id,
      pdf_name: pdfName ?? null,
      duration_minutes: durationMinutes ?? null,
      mode: mode ?? null,
      messages: sanitized,
      gender: gender ?? null,
      career: career ?? null,
      year: year ?? null,
    });

    if (error) {
      console.error("[sessions/save] Error de Supabase:", error);
      return new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sessions/save] Error inesperado:", error);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
