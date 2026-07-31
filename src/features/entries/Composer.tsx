"use client";

import { useEffect, useRef, useState } from "react";
import { formatBytes } from "@/lib/format";
import { MAX_FILE_BYTES } from "./api";
import { useCreateEntry } from "./hooks";

const DRAFT_KEY = "my_notes:draft";

export function Composer() {
  // El borrador se lee en el inicializador, no en un effect: leerlo después
  // del primer render dispara un render extra en cada montaje de la app.
  const [body, setBody] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem(DRAFT_KEY) ?? ""),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // `pointer: fine` = mouse, o sea computadora. Ahí Enter envía y
  // Shift+Enter hace salto de línea, como cualquier chat de escritorio.
  // En celular (`pointer: coarse`) el Enter del teclado virtual tiene que
  // hacer salto de línea: si enviara, cortaría notas a medio escribir.
  const [enterSends] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const create = useCreateEntry();

  // Abrir la app = poder escribir. Esto es lo que le gana al papel.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (body) localStorage.setItem(DRAFT_KEY, body);
    else localStorage.removeItem(DRAFT_KEY);

    // Autogrow: el input crece con el texto hasta un tope, como en un chat.
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [body]);

  const canSave = (body.trim().length > 0 || files.length > 0) && !create.isPending;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" pasa los 50 MB`);
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...picked]);
  }

  async function save() {
    if (!canSave) return;
    setError(null);
    try {
      await create.mutateAsync({ body, files });
      // Solo limpiamos DESPUÉS de que el insert salió bien.
      setBody("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      textareaRef.current?.focus();
    } catch (e) {
      // El texto y los archivos NO se limpian: nada de lo escrito se pierde.
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  return (
    <div className="shrink-0 border-t border-line bg-void px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {files.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
            >
              <span className="truncate">{f.name}</span>
              <span className="ml-3 flex shrink-0 items-center gap-3 text-muted">
                {formatBytes(f.size)}
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Quitar ${f.name}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mb-2 px-1 text-sm text-danger">{error}</p>}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar archivo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.shiftKey) return;
            // Enter que confirma un candidato del teclado (IME) no envía.
            if (e.nativeEvent.isComposing) return;

            if (enterSends || e.metaKey || e.ctrlKey) {
              e.preventDefault();
              void save();
            }
          }}
          rows={1}
          placeholder="Escribe algo"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-base leading-6 outline-none placeholder:text-muted focus:border-accent"
        />

        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          aria-label="Guardar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-black transition disabled:opacity-25"
        >
          {create.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4 12h15M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
