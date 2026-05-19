"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface UnitStats {
  pdf_name: string;
  session_count: number;
  careers: Record<string, number>;
  years: Record<string, number>;
  genders: Record<string, number>;
  avg_duration: number | null;
}

interface Demographics {
  careers: Record<string, number>;
  years: Record<string, number>;
  genders: Record<string, number>;
  avg_duration: number | null;
}

interface AnalysisResult {
  summary: string;
  sessionCount: number;
  demographics: Demographics;
}

function PillToggle({
  label,
  count,
  selected,
  onToggle,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-teal-600 border-teal-600 text-white"
          : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
      }`}
    >
      {label}
      <span
        className={`text-xs rounded-full px-1.5 py-0.5 ${
          selected
            ? "bg-teal-500 text-teal-100"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
      <div
        className={`text-2xl font-bold ${highlight ? "text-teal-700" : "text-gray-800"}`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function toggle(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) {
    if (next.size > 1) next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function ProfesorDashboard() {
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
  };

  const handleGenerateAnalysis = async () => {
    if (!selectedUnit) return;
    setLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysis(null);

    const params = new URLSearchParams({ pdf: selectedUnit.pdf_name });

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

    try {
      const res = await fetch(`/api/summary?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconocido");
      setAnalysis(data);
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

        {/* Generate button */}
        <button
          onClick={handleGenerateAnalysis}
          disabled={loadingAnalysis}
          className={`no-print w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors mb-6 ${
            loadingAnalysis
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          {loadingAnalysis ? "Analizando sesiones..." : "Generar análisis"}
        </button>

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

            {/* Markdown content */}
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
                onClick={handleGenerateAnalysis}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                Regenerar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Units list view ────────────────────────────────────────────────────

  if (units.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 text-lg mb-2">
          Todavía no hay sesiones registradas.
        </p>
        <p className="text-gray-400 text-sm">
          Las sesiones aparecen acá cuando los alumnos completan una tutoría.
        </p>
      </div>
    );
  }

  return (
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
  );
}
