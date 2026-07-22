"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { PillToggle, toggle } from "@/components/professor/PillToggle";
import { StatCard } from "@/components/professor/StatCard";
import { StarRating } from "@/components/professor/StarRating";
import { ProfesorChat } from "@/components/professor/ProfesorChat";
import { ShareSubjectButtons } from "@/components/professor/ShareSubjectButtons";
import type { AnalysisResult } from "@/components/professor/types";

export interface SubjectStats {
  session_count: number;
  careers: Record<string, number>;
  years: Record<string, number>;
  genders: Record<string, number>;
  avg_duration: number | null;
}

interface SubjectInfo {
  id: string;
  name: string;
}

export interface MaterialItem {
  id: string;
  pdf_name: string;
  created_at: string;
}

function MaterialsList({
  subjectId,
  materials,
  onChange,
}: {
  subjectId: string;
  materials: MaterialItem[];
  onChange: (materials: MaterialItem[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/professor/subjects/${subjectId}/materials`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al subir el material");
        return;
      }
      onChange([...materials, data]);
      setFile(null);
    } catch {
      setError("Error al subir el material. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string) => {
    if (deletingId) return;
    setDeletingId(materialId);
    setError(null);
    try {
      const res = await fetch(`/api/professor/subjects/${subjectId}/materials/${materialId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al eliminar el material");
        return;
      }
      onChange(materials.filter((m) => m.id !== materialId));
    } catch {
      setError("Error al eliminar el material. Intentá de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <p className="text-sm font-medium text-gray-700 mb-2">Material (PDF)</p>

      {materials.length === 0 ? (
        <p className="text-xs text-amber-600 mb-3">Sin material cargado todavía</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {materials.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-gray-700 truncate">{m.pdf_name}</span>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={deletingId === m.id}
                className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 disabled:text-gray-300"
              >
                {deletingId === m.id ? "Eliminando..." : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          file ? "border-teal-400 bg-teal-50" : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {file ? (
          <p className="text-sm text-teal-700 font-medium">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">Hacé click para agregar un PDF</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
        >
          {uploading ? "Subiendo..." : "Agregar PDF"}
        </button>
      )}
    </div>
  );
}

export function MateriaDetail({
  subject,
  enrolledCount,
  initialMaterials,
  initialStats,
}: {
  subject: SubjectInfo;
  enrolledCount: number;
  initialMaterials: MaterialItem[];
  initialStats: SubjectStats;
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [stats] = useState(initialStats);

  const [selectedCareers, setSelectedCareers] = useState<Set<string>>(
    new Set(Object.keys(initialStats.careers))
  );
  const [selectedYears, setSelectedYears] = useState<Set<string>>(
    new Set(Object.keys(initialStats.years))
  );
  const [selectedGenders, setSelectedGenders] = useState<Set<string>>(
    new Set(Object.keys(initialStats.genders))
  );

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const [activeFilterLabel, setActiveFilterLabel] = useState("");
  const [profRating, setProfRating] = useState(0);
  const [profText, setProfText] = useState("");
  const [profFeedbackSubmitted, setProfFeedbackSubmitted] = useState(false);
  const [isSubmittingProfFeedback, setIsSubmittingProfFeedback] = useState(false);

  useEffect(() => {
    if (stats.session_count > 0) handleGenerateAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateAnalysis = async (regenerate = false) => {
    setLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysis(null);
    setProfRating(0);
    setProfText("");
    setProfFeedbackSubmitted(false);

    const params = new URLSearchParams();
    if (regenerate) params.set("regenerate", "true");

    const allCareers = Object.keys(stats.careers);
    const allYears = Object.keys(stats.years);
    const allGenders = Object.keys(stats.genders);

    if (selectedCareers.size < allCareers.length) {
      params.set("careers", Array.from(selectedCareers).join(","));
    }
    if (selectedYears.size < allYears.length) {
      params.set("years", Array.from(selectedYears).join(","));
    }
    if (selectedGenders.size < allGenders.length) {
      params.set("genders", Array.from(selectedGenders).join(","));
    }

    const labelParts: string[] = [];
    if (selectedCareers.size < allCareers.length)
      labelParts.push(Array.from(selectedCareers).join(", "));
    if (selectedYears.size < allYears.length)
      labelParts.push(`Años: ${Array.from(selectedYears).sort().join(", ")}`);
    if (selectedGenders.size < allGenders.length)
      labelParts.push(Array.from(selectedGenders).join(", "));
    setActiveFilterLabel(labelParts.join(" | "));

    try {
      const res = await fetch(`/api/professor/subjects/${subject.id}/summary?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setAnalysis(data);
      setShowFullAnalysis(false);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Error al generar el análisis");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleProfessorFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profRating || isSubmittingProfFeedback) return;
    setIsSubmittingProfFeedback(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "professor",
          pdfName: subject.name,
          rating: profRating,
          text: profText.trim() || null,
          filterContext: activeFilterLabel || null,
        }),
      });
    } catch (err) {
      console.error("[ProfessorFeedback] Error:", err);
    } finally {
      setIsSubmittingProfFeedback(false);
      setProfFeedbackSubmitted(true);
    }
  };

  const careersEntries = Object.entries(stats.careers).sort((a, b) => b[1] - a[1]);
  const yearsEntries = Object.entries(stats.years).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );
  const gendersEntries = Object.entries(stats.genders);
  const hasFilters = careersEntries.length > 0 || yearsEntries.length > 0 || gendersEntries.length > 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{subject.name}</h2>
          <p className="text-gray-600 mt-1">
            {enrolledCount} alumno{enrolledCount === 1 ? "" : "s"} inscripto{enrolledCount === 1 ? "" : "s"}
          </p>
        </div>
        <ShareSubjectButtons
          subjectId={subject.id}
          subjectName={subject.name}
          disabled={materials.length === 0}
        />
      </div>

      <MaterialsList subjectId={subject.id} materials={materials} onChange={setMaterials} />

      {stats.session_count === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">
            Todavía no hay sesiones registradas para esta materia.
          </p>
          <p className="text-gray-400 text-sm">
            Compartí el link o el QR de arriba con tus alumnos.
          </p>
        </div>
      ) : (
        <>
          <div className="no-print grid grid-cols-3 gap-3 mb-6">
            <StatCard label="sesiones totales" value={String(stats.session_count)} highlight />
            <StatCard
              label="minutos promedio"
              value={stats.avg_duration != null ? String(stats.avg_duration) : "—"}
            />
            <StatCard label="carreras distintas" value={String(Object.keys(stats.careers).length)} />
          </div>

          {hasFilters && (
            <div className="no-print bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-0.5">Filtros demográficos</p>
                <p className="text-xs text-gray-400">
                  Seleccioná un subgrupo para ver cómo les fue específicamente.
                  Por defecto se incluyen todas las sesiones.
                </p>
              </div>

              {careersEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Carrera</p>
                  <div className="flex flex-wrap gap-2">
                    {careersEntries.map(([c, n]) => (
                      <PillToggle
                        key={c}
                        label={c}
                        count={n}
                        selected={selectedCareers.has(c)}
                        onToggle={() => setSelectedCareers(toggle(selectedCareers, c))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {yearsEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Año</p>
                  <div className="flex flex-wrap gap-2">
                    {yearsEntries.map(([y, n]) => (
                      <PillToggle
                        key={y}
                        label={`${y}°`}
                        count={n}
                        selected={selectedYears.has(y)}
                        onToggle={() => setSelectedYears(toggle(selectedYears, y))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {gendersEntries.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Género</p>
                  <div className="flex flex-wrap gap-2">
                    {gendersEntries.map(([g, n]) => (
                      <PillToggle
                        key={g}
                        label={g}
                        count={n}
                        selected={selectedGenders.has(g)}
                        onToggle={() => setSelectedGenders(toggle(selectedGenders, g))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingAnalysis && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                <p className="text-gray-500 text-sm">Gemini está analizando las sesiones...</p>
                <p className="text-gray-400 text-xs">Puede tomar hasta 30 segundos</p>
              </div>
            </div>
          )}

          {analysisError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {analysisError}
            </div>
          )}

          {analysis && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-4 mb-4 border-b border-gray-100 text-sm text-gray-500">
                  <span>
                    <span className="font-semibold text-gray-900">{analysis.sessionCount}</span>{" "}
                    sesiones analizadas
                  </span>
                  {analysis.demographics?.avg_duration != null && (
                    <span>
                      <span className="font-semibold text-gray-900">
                        {analysis.demographics.avg_duration} min
                      </span>{" "}
                      promedio
                    </span>
                  )}
                  {Object.keys(analysis.demographics?.careers ?? {}).length > 1 && (
                    <span>
                      <span className="font-semibold text-gray-900">
                        {Object.keys(analysis.demographics.careers).length}
                      </span>{" "}
                      carreras
                    </span>
                  )}
                </div>

                {analysis.recommendations && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                      Recomendaciones para la próxima clase
                    </p>
                    <div className="text-gray-700 leading-relaxed space-y-2">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ children }) => <p className="text-gray-700 leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">{children}</ul>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        }}
                      >
                        {analysis.recommendations}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowFullAnalysis((v) => !v)}
                  className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3"
                >
                  {showFullAnalysis ? "Ocultar análisis completo ↑" : "Ver análisis completo ↓"}
                </button>

                {showFullAnalysis && (
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold text-gray-900 mt-6 mb-2">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1">{children}</h3>
                        ),
                        p: ({ children }) => <p className="text-gray-700 leading-relaxed">{children}</p>,
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1 text-gray-700 pl-2">{children}</ol>
                        ),
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        hr: () => <hr className="border-gray-200 my-4" />,
                      }}
                    >
                      {analysis.summary}
                    </ReactMarkdown>
                  </div>
                )}

                <div className="no-print flex items-center gap-3 pt-4 mt-4 border-t border-gray-100">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => handleGenerateAnalysis(true)}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Regenerar
                  </button>
                </div>
              </div>

              <div className="no-print mt-4 bg-white rounded-xl border border-gray-200 p-5">
                {profFeedbackSubmitted ? (
                  <p className="text-sm text-gray-500 text-center py-1">
                    ¡Gracias! Tu opinión va a ayudar a mejorar el tutor.
                  </p>
                ) : (
                  <form onSubmit={handleProfessorFeedback}>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      ¿El tutor identificó bien los temas principales de la materia?
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      Tu feedback le permite al tutor mejorar para próximas sesiones.
                    </p>
                    <StarRating value={profRating} onChange={setProfRating} />
                    <textarea
                      value={profText}
                      onChange={(e) => setProfText(e.target.value)}
                      placeholder="Ej: no identificó el tema de Marco Lógico, se enfocó demasiado en indicadores..."
                      rows={3}
                      className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white text-gray-900"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingProfFeedback || (!profRating && !profText.trim())}
                      className="mt-3 px-4 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 rounded-lg transition-colors"
                    >
                      {isSubmittingProfFeedback ? "Enviando..." : "Enviar"}
                    </button>
                  </form>
                )}
              </div>

              <ProfesorChat analysisContext={analysis.summary} pdfName={subject.name} />
            </>
          )}
        </>
      )}
    </div>
  );
}
