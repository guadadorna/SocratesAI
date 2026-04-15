"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSession, clearSession, SessionData } from "@/lib/session-store";

export default function FeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedSession = getSession();
    if (!savedSession || savedSession.id !== sessionId) {
      router.push("/dashboard");
      return;
    }
    setSession(savedSession);

    // Generar feedback
    generateFeedback(savedSession);
  }, [sessionId, router]);

  const generateFeedback = async (sessionData: SessionData) => {
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: sessionData.messages,
          pdfContent: sessionData.pdfContent,
          timeMinutes: sessionData.timeMinutes,
          additionalContext: sessionData.additionalContext,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al generar el feedback");
      }

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (feedback) {
      await navigator.clipboard.writeText(feedback);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewSession = () => {
    clearSession();
    router.push("/dashboard");
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
          <button
            onClick={handleNewSession}
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Nueva sesión
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Feedback de la sesión
          </h2>
          <p className="text-gray-600 mb-6">
            Material: {session.pdfName} • Duración: {session.timeMinutes} minutos
          </p>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                <p className="text-gray-500">Analizando la sesión...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {feedback && (
            <div className="space-y-4">
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {feedback}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckIcon />
                      Copiado
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      Copiar feedback
                    </>
                  )}
                </button>

                <button
                  onClick={handleNewSession}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Iniciar nueva sesión
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session Summary */}
        {session.messages.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Transcripción de la sesión
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {session.messages
                .filter((m) => !m.content.includes("[El estudiante acaba de unirse"))
                .map((message, index) => (
                  <div
                    key={index}
                    className={`text-sm ${
                      message.role === "user" ? "text-teal-700" : "text-gray-600"
                    }`}
                  >
                    <span className="font-medium">
                      {message.role === "user" ? "Vos: " : "Tutor: "}
                    </span>
                    {message.content}
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
