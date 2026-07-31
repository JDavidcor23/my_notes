import { supabase } from "@/lib/supabase/client";
import type { NoteContext } from "@/lib/types";

export async function listContexts(): Promise<NoteContext[]> {
  const { data, error } = await supabase
    .from("contexts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as NoteContext[];
}

export async function createContext(name: string): Promise<NoteContext> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sin sesión");

  const { data, error } = await supabase
    .from("contexts")
    .insert({ name: name.trim(), user_id: auth.user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as NoteContext;
}

export async function renameContext(id: string, name: string): Promise<void> {
  // El nombre vive en una sola fila: renombrar no toca ninguna entrada.
  // Ese es el motivo por el que los contextos son uuid y no tags de texto.
  const { error } = await supabase
    .from("contexts")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * RPC porque supabase-js no expresa array_append en un update masivo.
 * La función tiene un guard que evita duplicar el uuid en el array.
 */
export async function assignContext(
  contextId: string,
  entryIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc("assign_context", {
    p_context_id: contextId,
    p_entry_ids: entryIds,
  });

  if (error) throw new Error(error.message);
}

export async function removeContext(
  contextId: string,
  entryIds: string[],
): Promise<void> {
  const { error } = await supabase.rpc("remove_context", {
    p_context_id: contextId,
    p_entry_ids: entryIds,
  });

  if (error) throw new Error(error.message);
}
