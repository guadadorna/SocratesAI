"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [showProfesorInput, setShowProfesorInput] = useState(false);
  const [password, setPassword] = useState("");

  const handleProfesorAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    router.push(`/profesor?key=${encodeURIComponent(password.trim())}`);
  };

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">SocratesAI</h1>
          <p className="text-xl text-gray-600 mb-8">
            Tu tutor socrático personal. Subí el material de tu clase y aprendé
            mediante preguntas que te guían a comprender, no a memorizar.
          </p>

          <div className="space-y-4 mb-12">
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <span className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold">
                1
              </span>
              <span>Subí el PDF de tu clase</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <span className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold">
                2
              </span>
              <span>Elegí cuánto tiempo tenés</span>
            </div>
            <div className="flex items-center justify-center gap-3 text-gray-700">
              <span className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold">
                3
              </span>
              <span>Conversá con tu tutor y recibí feedback</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Comenzar
          </button>
        </div>
      </div>

      <footer className="py-6 text-center text-gray-500 text-sm">
        <span>Hecho para aprender mejor</span>
        <span className="mx-3 text-gray-300">·</span>
        {!showProfesorInput ? (
          <button
            onClick={() => setShowProfesorInput(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            Soy docente
          </button>
        ) : (
          <form
            onSubmit={handleProfesorAccess}
            className="inline-flex items-center gap-2 mt-2"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoFocus
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 w-36"
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setShowProfesorInput(false); setPassword(""); }}
              className="text-gray-400 hover:text-gray-500 text-xs"
            >
              Cancelar
            </button>
          </form>
        )}
      </footer>
    </main>
  );
}
