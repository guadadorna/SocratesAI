import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ProfesorDashboard } from "./ProfesorDashboard";

async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/profesor/login");
}

export default async function ProfesorPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/profesor/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">SocratesAI</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{data.user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
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

        <ProfesorDashboard professorId={data.user!.id} />
      </main>
    </div>
  );
}
