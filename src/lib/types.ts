/**
 * El tipo NO se elige al capturar — clasificar a mano es fricción y termina
 * marcando todo igual. Se guarda como null ("sin clasificar") y queda para
 * que un proceso posterior lo derive del texto.
 */
export type EntryType = "nota" | "idea" | "error" | "comentario";

export interface Attachment {
  path: string;
  name: string;
  mime: string;
  size: number;
}

export interface Entry {
  id: string;
  created_at: string;
  type: EntryType | null;
  body: string | null;
  attachments: Attachment[];
  context_ids: string[];
  user_id: string;
}

// Se llama NoteContext y no Context para no chocar con React.Context.
export interface NoteContext {
  id: string;
  name: string;
  created_at: string;
  user_id: string;
}
