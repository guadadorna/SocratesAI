"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { saveSession } from "@/lib/session-store";

const TIME_OPTIONS = [5, 10, 15, 20, 30];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [timeMinutes, setTimeMinutes] = useState<number>(15);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Solo se permiten archivos PDF");
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("El archivo no puede superar 10MB");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Seleccioná un archivo PDF");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar el PDF");
      }

      const { text, pageCount } = await response.json();

      if (pageCount > 50) {
        throw new Error("El PDF no puede tener más de 50 páginas");
      }

      const sessionId = uuidv4();

      saveSession({
        id: sessionId,
        pdfContent: text,
        pdfName: file.name,
        timeMinutes,
        additionalContext: additionalContext.trim() || undefined,
        messages: [],
      });

      router.push(`/session/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Nueva sesión de estudio
        </h2>
        <p className="text-gray-600 mb-8">
          Subí el material y configurá tu sesión con el tutor.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Material de estudio (PDF)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                file
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <p className="text-teal-700 font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">
                    Hacé click para seleccionar un PDF
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Máximo 10MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Time Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo disponible
            </label>
            <div className="flex gap-2">
              {TIME_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setTimeMinutes(minutes)}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                    timeMinutes === minutes
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contexto adicional{" "}
              <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Materia, tema específico, información complementaria..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              !file || isLoading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {isLoading ? "Procesando..." : "Comenzar sesión"}
          </button>
        </form>
      </main>
    </div>
  );
}
