"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getSession, saveSession } from "@/lib/session-store";

const CAREERS = [
  "Economía",
  "Economía Empresarial",
  "Administración de Empresas",
  "Ciencias Sociales",
  "Estudios Internacionales",
  "Ciencia Política y Gobierno",
  "Historia",
  "Tecnología Digital",
  "Diseño",
  "Arquitectura",
  "Abogacía",
  "Ingeniería Industrial",
  "Ciencias del Comportamiento",
];

const GENDERS = ["Femenino", "Masculino", "No binario", "Prefiero no decir"];

const YEARS = [1, 2, 3, 4, 5, 6];

export default function IntakePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [gender, setGender] = useState("");
  const [career, setCareer] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session || session.id !== sessionId) {
      router.push("/dashboard");
    }
  }, [sessionId, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!gender || !career || !year) {
      setError("Por favor completá todos los campos.");
      return;
    }

    const session = getSession();
    if (!session) {
      router.push("/dashboard");
      return;
    }

    saveSession({
      ...session,
      demographic: { gender, career, year: year as number },
    });

    router.push(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Antes de empezar
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Esta sesión es anónima. No se guarda tu nombre ni ningún dato personal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Género */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Seleccioná una opción</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Carrera */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carrera
              </label>
              <select
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
              >
                <option value="">Seleccioná tu carrera</option>
                {CAREERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Año de cursada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año de cursada
              </label>
              <div className="flex gap-2">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      year === y
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {y}°
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              Comenzar sesión
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
