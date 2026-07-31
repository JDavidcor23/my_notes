"use client";

export function SelectionBar({
  count,
  onGroup,
  onDelete,
  onClear,
  busy,
}: {
  count: number;
  onGroup: () => void;
  onDelete: () => void;
  onClear: () => void;
  busy: boolean;
}) {
  if (count === 0) return null;

  return (
    <div className="shrink-0 border-t border-line bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onClear} className="text-sm text-muted">
          {count} seleccionada{count > 1 ? "s" : ""} · Limpiar
        </button>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-xl border border-line px-3 py-2 text-sm text-danger disabled:opacity-30"
          >
            {busy ? "Borrando…" : "Borrar"}
          </button>
          <button
            type="button"
            onClick={onGroup}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-30"
          >
            Agrupar
          </button>
        </div>
      </div>
    </div>
  );
}
