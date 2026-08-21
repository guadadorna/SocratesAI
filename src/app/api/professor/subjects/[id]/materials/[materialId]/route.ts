import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnedSubject } from "@/lib/subjects";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const { id, materialId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const subject = await getOwnedSubject(supabase, id, userData.user.id);
  if (!subject) return NextResponse.json({ error: "Materia no encontrada" }, { status: 404 });

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("subject_id", id);

  if (error) return NextResponse.json({ error: "Error al eliminar el material" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
