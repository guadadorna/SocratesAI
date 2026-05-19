import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { supabase } from "@/lib/supabase";
import { getAggregateSummaryPrompt } from "@/lib/prompts";

export const maxDuration = 60;

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function generateWithFallback(prompt: string): Promise<string> {
  for (const modelName of MODELS) {
    try {
      const { text } = await generateText({
        model: google(modelName),
        prompt,
      });
      return text;
    } catch (error) {
      const isLastModel = modelName === MODELS[MODELS.length - 1];
      if (isLastModel) throw error;
    }
  }
  throw new Error("Todos los modelos fallaron");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfName = searchParams.get("pdf");

    if (!pdfName) {
      return new Response(JSON.stringify({ error: "Falta el parámetro pdf" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("professor_summary, duration_minutes, mode, gender, career, year")
      .eq("pdf_name", pdfName)
      .not("professor_summary", "is", null);

    if (error) {
      console.error("[summary] Error de Supabase:", error);
      return new Response(JSON.stringify({ error: "Error al leer las sesiones" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No hay sesiones con resumen para ese material" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = getAggregateSummaryPrompt({ sessions: data, pdfName });
    const summary = await generateWithFallback(prompt);

    return new Response(
      JSON.stringify({ summary, sessionCount: data.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[summary] Error inesperado:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: `Error al generar el resumen: ${errorMessage}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
