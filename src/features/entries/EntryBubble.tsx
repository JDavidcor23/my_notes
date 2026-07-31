"use client";

import type { Entry } from "@/lib/types";
import { formatBytes, timeOfDay } from "@/lib/format";
import { NEUTRAL_COLOR } from "@/features/contexts/colors";
import { signedUrl } from "./api";

export interface ContextTag {
  id: string;
  name: string;
  color: string;
}

export function EntryBubble({
  entry,
  tags,
  selected,
  onToggle,
}: {
  entry: Entry;
  tags: ContextTag[];
  selected: boolean;
  onToggle: () => void;
}) {
  // El color identifica el GRUPO. El ✓ identifica la SELECCIÓN.
  // Dos señales distintas en dos canales distintos: si el color hiciera las
  // dos cosas, no se podría saber si un círculo lleno está seleccionado o
  // simplemente pertenece a un grupo.
  const markerColor = tags[0]?.color ?? NEUTRAL_COLOR;

  async function open(path: string) {
    try {
      const url = await signedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch {
      alert("No se pudo abrir el archivo");
    }
  }

  return (
    <li className="flex items-start gap-3">
      <div
        className={`max-w-[78%] min-w-0 rounded-2xl rounded-tl-md px-3 py-2 transition ${
          selected ? "bg-surface ring-1 ring-white/25" : "bg-surface"
        }`}
        style={tags.length > 0 ? { borderLeft: `2px solid ${markerColor}` } : undefined}
      >
        {/* El grupo se VE y además se LEE: la identidad nunca queda solo en
            el color, que es inaccesible para quien no lo distingue. */}
        {tags.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-[11px]"
                style={{ color: tag.color, backgroundColor: `${tag.color}26` }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Solo aparece si algo lo clasificó después. Al capturar va null. */}
        {entry.type && (
          <div className="mb-0.5 text-[11px] text-muted capitalize">{entry.type}</div>
        )}

        {entry.body && (
          <p className="text-[15px] leading-snug whitespace-pre-wrap text-ink">
            {entry.body}
          </p>
        )}

        {entry.attachments.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1">
            {entry.attachments.map((a) => (
              <li key={a.path}>
                <button
                  type="button"
                  onClick={() => open(a.path)}
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg bg-void px-2 py-1.5 text-left"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-accent"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="truncate text-sm text-accent">{a.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted">
                    {formatBytes(a.size)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 text-right text-[11px] text-muted">
          {timeOfDay(entry.created_at)}
        </div>
      </div>

      {/* Círculo siempre visible: sin modo selección, sin long-press. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Deseleccionar" : "Seleccionar"}
        aria-pressed={selected}
        className="mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition"
        style={{
          borderColor: markerColor,
          backgroundColor: selected ? markerColor : "transparent",
        }}
      >
        {selected && (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-black">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </li>
  );
}
