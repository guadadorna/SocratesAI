"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

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
        Hecho para aprender mejor
      </footer>
    </main>
  );
}
