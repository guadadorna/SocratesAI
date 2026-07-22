"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import QRCode from "qrcode";
import { PillToggle, toggle } from "@/components/professor/PillToggle";
import { StatCard } from "@/components/professor/StatCard";
import { StarRating } from "@/components/professor/StarRating";
import { ProfesorChat } from "@/components/professor/ProfesorChat";
import type { AnalysisResult } from "@/components/professor/types";

interface UnitStats {
  pdf_name: string;
  session_count: number;
  careers: Record<string, number>;
  years: Record<string, number>;
  genders: Record<string, number>;
  avg_duration: number | null;
}

interface Subject {
  id: string;
  name: string;
  pdf_name: string | null;
  created_at: string;
  enrolled_count?: number;
}

function MisMaterias({ professorId }: { professorId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrSubject, setQrSubject] = useState<Subject | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/professor/subjects")
      .then((r) => r.json())
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, [professorId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    const formData = new FormData();
    formData.append("name", newName.trim());
    if (newFile) formData.append("file", newFile);
    try {
      const res = await fetch("/api/professor/subjects", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Error al crear la materia"); return; }
      setSubjects((prev) => [data, ...prev]);
      setNewName("");
      setNewFile(null);
      setShowForm(false);
    } catch {
      setCreateError("Error al crear la materia. Intentá de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/s/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const showQr = async (subject: Subject) => {
    const url = `${window.location.origin}/s/${subject.id}`;
    setQrSubject(subject);
    setQrDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1 }));
  };

  const closeQr = () => {
    setQrSubject(null);
    setQrDataUrl(null);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Mis materias</h3>
        <button
          onClick={() => { setShowForm((v) => !v); setCreateError(null); }}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          {showForm ? "Cancelar" : "+ Nueva materia"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la materia</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: EPP 2026 — Comisión Guada"
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Material (PDF) <span className="text-gray-400 font-normal">— opcional, podés cargarlo después</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                newFile ? "border-teal-400 bg-teal-50" : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {newFile ? (
                <p className="text-sm text-teal-700 font-medium">{newFile.name}</p>
              ) : (
                <p className="text-sm text-gray-500">Hacé click para seleccionar un PDF</p>
              )}
            </div>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 transition-colors"
          >
            {creating ? "Creando..." : "Crear materia"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Cargando materias...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-gray-400">
          Todavía no tenés materias. Creá una para compartir el link con tus alumnos.
        </p>
      ) : (
        <div className="space-y-2">
          {subjects.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
              <Link href={`/profesor/materias/${s.id}`} className="min-w-0 hover:opacity-70 transition-opacity">
                <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                {s.pdf_name ? (
                  <p className="text-xs text-gray-400 truncate">{s.pdf_name}</p>
                ) : (
                  <p className="text-xs text-amber-600">Sin material cargado</p>
                )}
                <p className="text-xs text-gray-400">
                  {s.enrolled_count ?? 0} alumno{s.enrolled_count === 1 ? "" : "s"} inscripto{s.enrolled_count === 1 ? "" : "s"}
                </p>
              </Link>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={() => showQr(s)}
                  disabled={!s.pdf_name}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed text-teal-700 bg-teal-50 hover:bg-teal-100"
                >
                  QR
                </button>
                <button
                  onClick={() => copyLink(s.id)}
                  disabled={!s.pdf_name}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed text-teal-700 bg-teal-50 hover:bg-teal-100"
                >
                  {copiedId === s.id ? "¡Copiado!" : "Copiar link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrSubject && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={closeQr}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-gray-900 mb-1">{qrSubject.name}</p>
            <p className="text-xs text-gray-400 mb-4 break-all">
              {`${window.location.origin}/s/${qrSubject.id}`}
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR de ${qrSubject.name}`} className="mx-auto rounded-lg" />
            ) : (
              <p className="text-sm text-gray-400">Generando QR...</p>
            )}
            <button
              onClick={closeQr}
              className="mt-4 w-full py-2 px-4 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfesorDashboard({ professorId }: { professorId: string }) {
  const [units, setUnits] = useState<UnitStats[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<UnitStats | null>(null);
  const [selectedCareers, setSelectedCareers] = useState<Set<string>>(new Set());
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set());
  const [selectedGenders, setSelectedGenders] = useState<Set<string>>(new Set());

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
    fetch("/api/professor/units")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Error al cargar materiales");
        setUnits(data);
      })
      .catch((e: Error) => setUnitsError(e.message))
      .finally(() => setLoadingUnits(false));
  }, []);

  const handleSelectUnit = (unit: UnitStats) => {
    setSelectedUnit(unit);
    setAnalysis(null);
    setAnalysisError(null);
    setSelectedCareers(new Set(Object.keys(unit.careers)));
    setSelectedYears(new Set(Object.keys(unit.years)));
    setSelectedGenders(new Set(Object.keys(unit.genders)));
    setProfRating(0);
    setProfText("");
    setProfFeedbackSubmitted(false);
    setActiveFilterLabel("");
  };

  const handleProfessorFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profRating || isSubmittingProfFeedback || !selectedUnit) return;
    setIsSubmittingProfFeedback(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "professor",
          pdfName: selectedUnit.pdf_name,
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

  useEffect(() => {
    if (selectedUnit) handleGenerateAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit]);

  const handleGenerateAnalysis = async (regenerate = false) => {
    if (!selectedUnit) return;
    setLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysis(null);
    setProfRating(0);
    setProfText("");
    setProfFeedbackSubmitted(false);

    const params = new URLSearchParams({ pdf: selectedUnit.pdf_name });
    if (regenerate) params.set("regenerate", "true");

    const allCareers = Object.keys(selectedUnit.careers);
    const allYears = Object.keys(selectedUnit.years);
    const allGenders = Object.keys(selectedUnit.genders);

    if (selectedCareers.size < allCareers.length) {
      params.set("careers", Array.from(selectedCareers).join(","));
    }
    if (selectedYears.size < allYears.length) {
      params.set("years", Array.from(selectedYears).join(","));
    }
    if (selectedGenders.size < allGenders.length) {
      params.set("genders", Array.from(selectedGenders).join(","));
    }

    // Label legible de los filtros activos (para el feedback del profesor)
    const labelParts: string[] = [];
    if (selectedCareers.size < allCareers.length)
      labelParts.push(Array.from(selectedCareers).join(", "));
    if (selectedYears.size < allYears.length)
      labelParts.push(`Años: ${Array.from(selectedYears).sort().join(", ")}`);
    if (selectedGenders.size < allGenders.length)
      labelParts.push(Array.from(selectedGenders).join(", "));
    setActiveFilterLabel(labelParts.join(" | "));

    try {
      const res = await fetch(`/api/summary?${params}`);
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

  // ── Loading / error states ──────────────────────────────────────────────

  if (loadingUnits) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <p className="text-gray-500 text-sm">Cargando materiales...</p>
        </div>
      </div>
    );
  }

  if (unitsError) {
    return (
      <div className="text-center py-24">
        <p className="text-red-600">{unitsError}</p>
      </div>
    );
  }

  // ── Unit analysis view ──────────────────────────────────────────────────

  if (selectedUnit) {
    const careers = Object.entries(selectedUnit.careers).sort(
      (a, b) => b[1] - a[1]
    );
    const years = Object.entries(selectedUnit.years).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
    const genders = Object.entries(selectedUnit.genders);
    const hasFilters =
      careers.length > 0 || years.length > 0 || genders.length > 0;

    return (
      <div>
        {/* Header */}
        <div className="no-print flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              setSelectedUnit(null);
              setAnalysis(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Volver
          </button>
          <span className="text-gray-300">|</span>
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {selectedUnit.pdf_name}
          </h2>
        </div>

        {/* Quick stats */}
        <div className="no-print grid grid-cols-3 gap-3 mb-6">
          <StatCard
            label="sesiones totales"
            value={String(selectedUnit.session_count)}
            highlight
          />
          <StatCard
            label="minutos promedio"
            value={
              selectedUnit.avg_duration != null
                ? String(selectedUnit.avg_duration)
                : "—"
            }
          />
          <StatCard
            label="carreras distintas"
            value={String(Object.keys(selectedUnit.careers).length)}
          />
        </div>

        {/* Demographic filters */}
        {hasFilters && (
          <div className="no-print bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-800 mb-0.5">
                Filtros demográficos
              </p>
              <p className="text-xs text-gray-400">
                Seleccioná un subgrupo para ver cómo les fue específicamente.
                Por defecto se incluyen todas las sesiones.
              </p>
            </div>

            {careers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Carrera
                </p>
                <div className="flex flex-wrap gap-2">
                  {careers.map(([c, n]) => (
                    <PillToggle
                      key={c}
                      label={c}
                      count={n}
                      selected={selectedCareers.has(c)}
                      onToggle={() =>
                        setSelectedCareers(toggle(selectedCareers, c))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {years.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Año
                </p>
                <div className="flex flex-wrap gap-2">
                  {years.map(([y, n]) => (
                    <PillToggle
                      key={y}
                      label={`${y}°`}
                      count={n}
                      selected={selectedYears.has(y)}
                      onToggle={() =>
                        setSelectedYears(toggle(selectedYears, y))
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {genders.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Género
                </p>
                <div className="flex flex-wrap gap-2">
                  {genders.map(([g, n]) => (
                    <PillToggle
                      key={g}
                      label={g}
                      count={n}
                      selected={selectedGenders.has(g)}
                      onToggle={() =>
                        setSelectedGenders(toggle(selectedGenders, g))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {loadingAnalysis && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <p className="text-gray-500 text-sm">
                Gemini está analizando las sesiones...
              </p>
              <p className="text-gray-400 text-xs">
                Puede tomar hasta 30 segundos
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {analysisError && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {analysisError}
          </div>
        )}

        {/* Analysis result */}
        {analysis && (
          <>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Result stats bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-4 mb-4 border-b border-gray-100 text-sm text-gray-500">
              <span>
                <span className="font-semibold text-gray-900">
                  {analysis.sessionCount}
                </span>{" "}
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

            {/* Recomendaciones (action call) — siempre visible primero */}
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

            {/* Botón ver más / ver menos */}
            <button
              onClick={() => setShowFullAnalysis((v) => !v)}
              className="no-print text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-3"
            >
              {showFullAnalysis ? "Ocultar análisis completo ↑" : "Ver análisis completo ↓"}
            </button>

            {/* Análisis completo (colapsable) */}
            {showFullAnalysis && (
              <div className="text-gray-700 leading-relaxed space-y-3">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold text-gray-900 mt-6 mb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-semibold text-gray-900 mt-5 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 text-gray-700 pl-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 text-gray-700 pl-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    hr: () => <hr className="border-gray-200 my-4" />,
                  }}
                >
                  {analysis.summary}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions */}
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

          {/* Professor feedback */}
          <div className="no-print mt-4 bg-white rounded-xl border border-gray-200 p-5">
            {profFeedbackSubmitted ? (
              <p className="text-sm text-gray-500 text-center py-1">
                ¡Gracias! Tu opinión va a ayudar a mejorar el tutor.
              </p>
            ) : (
              <form onSubmit={handleProfessorFeedback}>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  ¿El tutor identificó bien los temas principales de la unidad?
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

          <ProfesorChat
            analysisContext={analysis.summary}
            pdfName={selectedUnit.pdf_name}
          />
          </>
        )}
      </div>
    );
  }

  // ── Units list view ────────────────────────────────────────────────────

  if (units.length === 0) {
    return (
      <div>
        <MisMaterias professorId={professorId} />
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">
            Todavía no hay sesiones registradas.
          </p>
          <p className="text-gray-400 text-sm">
            Las sesiones aparecen acá cuando los alumnos completan una tutoría.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MisMaterias professorId={professorId} />
      <div className="space-y-4">
      {units.map((unit) => {
        const topCareers = Object.entries(unit.careers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4);
        const topYears = Object.entries(unit.years).sort(
          (a, b) => Number(a[0]) - Number(b[0])
        );

        return (
          <div
            key={unit.pdf_name}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {unit.pdf_name}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {unit.session_count}{" "}
                  {unit.session_count === 1 ? "sesión" : "sesiones"}
                  {unit.avg_duration != null &&
                    ` · ${unit.avg_duration} min promedio`}
                </p>

                <div className="mt-3 space-y-1.5">
                  {topCareers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topCareers.map(([career, count]) => (
                        <span
                          key={career}
                          className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5"
                        >
                          {career} ({count})
                        </span>
                      ))}
                      {Object.keys(unit.careers).length > 4 && (
                        <span className="text-xs text-gray-400 self-center">
                          +{Object.keys(unit.careers).length - 4} más
                        </span>
                      )}
                    </div>
                  )}

                  {topYears.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topYears.map(([year, count]) => (
                        <span
                          key={year}
                          className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5"
                        >
                          {year}° año ({count})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleSelectUnit(unit)}
                className="flex-shrink-0 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                Analizar →
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
