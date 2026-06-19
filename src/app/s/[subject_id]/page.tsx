"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { saveSession } from "@/lib/session-store";

const TIME_OPTIONS = [5, 10, 15, 20, 30];

export default function SubjectEntryPage() {
  const { subject_id } = useParams<{ subject_id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfContent, setPdfContent] = useState("");
  const [professorId, setProfessorId] = useState("");

  const [timeMinutes, setTimeMinutes] = useState(15);
  const [practiceMode, setPracticeMode] = useState(false);

  useEffect(() => {
    async function loadSubject() {
      try {
        const res = await fetch(`/api/subjects/${subject_id}`);
        if (!res.ok) {
          setError("No se encontró la materia. Verificá el link con tu profesora.");
          return;
        }
        const data = await res.json();
        if (!data.pdf_content) {
          setError("La profesora todavía no subió el material para esta materia.");
          return;
        }
        setSubjectName(data.name);
        setPdfName(data.pdf_name ?? data.name);
        setPdfContent(data.pdf_content);
        setProfessorId(data.professor_id);
      } catch {
        setError("Hubo un error al cargar la materia. Intentá de nuevo.");
      } finally {
        setLoading(false);
      }
    }
    if (subject_id) loadSubject();
  }, [subject_id]);

  const handleStart = () => {
    const sessionId = uuidv4();
    saveSession({
      id: sessionId,
      pdfContent,
      pdfName,
      timeMinutes: practiceMode ? 0 : timeMinutes,
      practiceMode: practiceMode || undefined,
      messages: [],
      professorId,
      subjectId: subject_id,
    });
    router.push(`/intake/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <p className="text-gray-500 text-sm">Cargando materia...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-700 mb-2">{error}</p>
          <p className="text-sm text-gray-400">
            Pedile a tu profesora que te vuelva a mandar el link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{subjectName}</h2>
        <p className="text-gray-600 mb-8">
          El material ya está cargado. Elegí cuánto tiempo tenés y empezá la sesión.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo disponible
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => { setTimeMinutes(minutes); setPracticeMode(false); }}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    !practiceMode && timeMinutes === minutes
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPracticeMode(true)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  practiceMode
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Sin límite
              </button>
            </div>
            {practiceMode && (
              <p className="text-xs text-gray-500 mt-2">
                Modo práctica: sin tiempo límite ni fase de cierre automática.
              </p>
            )}
          </div>

          <button
            onClick={handleStart}
            className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            Comenzar sesión
          </button>
        </div>
      </main>
    </div>
  );
}
