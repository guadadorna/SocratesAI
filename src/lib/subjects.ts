import type { SupabaseClient } from "@supabase/supabase-js";

export interface OwnedSubject {
  id: string;
  name: string;
  professor_id: string;
}

export async function getOwnedSubject(
  supabase: SupabaseClient,
  id: string,
  userId: string
): Promise<OwnedSubject | null> {
  const { data } = await supabase
    .from("subjects")
    .select("id, name, professor_id")
    .eq("id", id)
    .single();

  if (!data || data.professor_id !== userId) return null;
  return data;
}
