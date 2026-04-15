"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Timer } from "@/components/Timer";
import { ChatWindow } from "@/components/ChatWindow";
import { getSession, saveSession, SessionData } from "@/lib/session-store";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isClosingPhase, setIsClosingPhase] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const initialMessageSent = useRef(false);

  // Cargar sesión
  useEffect(() => {
    const savedSession = getSession();
    if (!savedSession || savedSession.id !== sessionId) {
      router.push("/dashboard");
      return;
    }

    if (!savedSession.startedAt) {
      savedSession.startedAt = Date.now();
      saveSession(savedSession);
    }

    setSession(savedSession);
  }, [sessionId, router]);

  // Enviar mensaje inicial del tutor
  useEffect(() => {
    if (session && messages.length === 0 && !isLoading && !initialMessageSent.current) {
      initialMessageSent.current = true;
      sendMessage("[El estudiante acaba de unirse a la sesión. Iniciá la conversación.]", true);
    }
  }, [session, messages.length, isLoading]);

  const sendMessage = async (content: string, isSystemMessage = false) => {
    if (!session) return;

    const userMessage: Message = { role: "user", content };
    const newMessages = [...messages, userMessage];

    if (!isSystemMessage) {
      setMessages(newMessages);
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          pdfContent: session.pdfContent,
          timeMinutes: session.timeMinutes,
          additionalContext: session.additionalContext,
          isClosingPhase,
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantContent += chunk;

        const updatedMessages = isSystemMessage
          ? [{ role: "assistant" as const, content: assistantContent }]
          : [...newMessages, { role: "assistant" as const, content: assistantContent }];

        setMessages(updatedMessages);
      }

      // Guardar en sesión
      const finalMessages = isSystemMessage
        ? [{ role: "assistant" as const, content: assistantContent }]
        : [...newMessages, { role: "assistant" as const, content: assistantContent }];

      saveSession({
        ...session,
        messages: finalMessages,
      });

    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    setIsTimeUp(true);
  }, []);

  const handleClosingPhase = useCallback(() => {
    setIsClosingPhase(true);
  }, []);

  const handleEndSession = () => {
    if (session) {
      saveSession({
        ...session,
        messages,
      });
    }
    router.push(`/session/${sessionId}/feedback`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTimeUp || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    await sendMessage(message);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando sesión...</p>
      </div>
    );
  }

  const displayMessages = messages.filter(
    (m) => !(m.role === "user" && m.content.includes("[El estudiante acaba de unirse"))
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">SocratesAI</h1>
            <span className="text-sm text-gray-500 truncate max-w-[200px]">
              {session.pdfName}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Timer
              totalSeconds={session.timeMinutes * 60}
              onTimeUp={handleTimeUp}
              onClosingPhase={handleClosingPhase}
            />
            <button
              onClick={handleEndSession}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Terminar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <ChatWindow messages={displayMessages} isLoading={isLoading} />

        {isTimeUp && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 text-center">
            <p className="text-yellow-800">
              Se acabó el tiempo. Podés leer los mensajes y terminar la sesión cuando quieras.
            </p>
          </div>
        )}

        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isTimeUp ? "Tiempo agotado" : "Escribí tu respuesta..."}
              disabled={isTimeUp || isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTimeUp || isLoading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
