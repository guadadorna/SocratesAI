import { redirect } from "next/navigation";
import { ProfesorDashboard } from "./ProfesorDashboard";

export default async function ProfesorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { key } = await searchParams;
  const profesorKey = process.env.PROFESOR_KEY;

  // If PROFESOR_KEY is set in env, require a matching key param
  if (profesorKey && key !== profesorKey) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
          <span className="text-sm text-gray-500">Dashboard docente</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Análisis por unidad
          </h2>
          <p className="text-gray-600 mt-1">
            Seleccioná una unidad para ver cómo entendieron el material los
            estudiantes.
          </p>
        </div>

        <ProfesorDashboard />
      </main>
    </div>
  );
}
