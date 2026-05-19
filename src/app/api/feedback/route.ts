import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { type, sessionId, pdfName, rating, text, filterContext } =
      await request.json();

    if (!type || !rating) {
      return Response.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    if (type === "student") {
      if (!sessionId) {
        return Response.json({ ok: false, error: "Falta sessionId" }, { status: 400 });
      }
      const { error } = await supabase
        .from("sessions")
        .update({
          student_feedback: {
            rating,
            text: text ?? null,
            created_at: new Date().toISOString(),
          },
        })
        .eq("id", sessionId);

      if (error) {
        console.error("[feedback] Error al guardar feedback del alumno:", error);
        return Response.json({ ok: false }, { status: 500 });
      }
    } else if (type === "professor") {
      if (!pdfName) {
        return Response.json({ ok: false, error: "Falta pdfName" }, { status: 400 });
      }
      const { error } = await supabase.from("unit_feedback").insert({
        pdf_name: pdfName,
        rating,
        text: text ?? null,
        filter_context: filterContext ?? null,
      });

      if (error) {
        console.error("[feedback] Error al guardar feedback del profesor:", error);
        return Response.json({ ok: false }, { status: 500 });
      }
    } else {
      return Response.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[feedback] Error inesperado:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
