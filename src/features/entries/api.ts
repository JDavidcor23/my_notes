import { supabase } from "@/lib/supabase/client";
import type { Attachment, Entry } from "@/lib/types";

export const BUCKET = "attachments";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 3600;
export const PAGE_SIZE = 10;

// Supabase Storage rechaza ciertos caracteres en las keys.
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadFiles(
  files: File[],
  userId: string,
): Promise<Attachment[]> {
  const day = new Date().toISOString().slice(0, 10);
  const uploaded: Attachment[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" pasa los 50 MB`);
    }

    // El uuid en el nombre evita colisiones al subir dos archivos
    // con el mismo nombre el mismo día.
    const path = `${userId}/${day}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) throw new Error(`No se pudo subir "${file.name}": ${error.message}`);

    uploaded.push({
      path,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  return uploaded;
}

export async function createEntry(input: {
  body: string;
  files: File[];
}): Promise<Entry> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sin sesión");

  // Los archivos suben ANTES del insert: así una entrada nunca
  // queda apuntando a rutas que no existen.
  const attachments = await uploadFiles(input.files, auth.user.id);

  // `type` va sin setear (null = sin clasificar). Clasificar a mano al
  // capturar es fricción y termina marcando todo igual.
  const { data, error } = await supabase
    .from("entries")
    .insert({
      body: input.body.trim() || null,
      attachments,
      user_id: auth.user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Entry;
}

/**
 * Una página de historial, en orden DESC (nueva → vieja).
 *
 * `cursor` es el `created_at` de la entrada más vieja ya cargada; sin cursor
 * devuelve las más recientes. Se pagina por timestamp y no por offset porque
 * el offset se corre solo cuando insertás algo mientras scrolleás.
 *
 * `created_at` es timestamptz con precisión de microsegundos y acá escribe
 * una sola persona a mano, así que un empate exacto es inalcanzable en la
 * práctica y no hace falta desempatar por id.
 */
export async function listEntriesPage(cursor: string | null): Promise<Entry[]> {
  let query = supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}

export async function deleteEntry(entry: Entry): Promise<void> {
  // Primero los archivos: si falla el delete de la fila, no quedan
  // archivos apuntados por una entrada inexistente.
  if (entry.attachments.length > 0) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(entry.attachments.map((a) => a.path));
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("entries").delete().eq("id", entry.id);
  if (error) throw new Error(error.message);
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
