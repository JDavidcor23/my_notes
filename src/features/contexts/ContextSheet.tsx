"use client";

import { useMemo, useState } from "react";
import type { NoteContext } from "@/lib/types";
import { NEUTRAL_COLOR, buildContextColorMap } from "./colors";
import {
  useAssignContext,
  useContexts,
  useCreateContext,
  useRemoveContext,
  useRenameContext,
} from "./hooks";

export function ContextSheet({
  entryIds,
  /** Contextos que YA tienen todas las entradas seleccionadas. */
  sharedContextIds,
  onDone,
  onClose,
}: {
  entryIds: string[];
  sharedContextIds: string[];
  onDone: () => void;
  onClose: () => void;
}) {
  const { data: contexts } = useContexts();
  const createCtx = useCreateContext();
  const renameCtx = useRenameContext();
  const assign = useAssignContext();
  const unassign = useRemoveContext();

  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Mismos colores que en las burbujas: el chip de acá y la marca de allá
  // tienen que ser reconociblemente el mismo grupo.
  const colorById = useMemo(() => buildContextColorMap(contexts ?? []), [contexts]);

  const busy = assign.isPending || unassign.isPending || createCtx.isPending;

  async function toggleContext(ctx: NoteContext) {
    setError(null);
    try {
      if (sharedContextIds.includes(ctx.id)) {
        await unassign.mutateAsync({ contextId: ctx.id, entryIds });
      } else {
        await assign.mutateAsync({ contextId: ctx.id, entryIds });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agrupar");
    }
  }

  async function createAndAssign() {
    setError(null);
    try {
      const created = await createCtx.mutateAsync(newName);
      setNewName("");
      await assign.mutateAsync({ contextId: created.id, entryIds });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el contexto");
    }
  }

  function startRename(ctx: NoteContext) {
    const name = prompt("Nuevo nombre", ctx.name);
    if (name && name.trim() && name.trim() !== ctx.name) {
      renameCtx.mutate({ id: ctx.id, name });
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">
          Agrupar {entryIds.length} entrada{entryIds.length > 1 ? "s" : ""}
        </h2>
        <p className="mb-4 text-xs text-muted">
          Tocá un contexto para agregar o quitar. Una entrada puede estar en varios.
        </p>

        {/* Chips de los contextos que ya existen: elegir en vez de tipear
            evita duplicados por typo. */}
        <div className="mb-5 flex flex-wrap gap-2">
          {contexts?.map((c) => {
            const active = sharedContextIds.includes(c.id);
            const color = colorById.get(c.id) ?? NEUTRAL_COLOR;
            return (
              <span
                key={c.id}
                className="flex items-center gap-1 rounded-full border pr-1 pl-3"
                style={{
                  borderColor: active ? color : "var(--color-line)",
                  backgroundColor: active ? `${color}26` : "transparent",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleContext(c)}
                  disabled={busy}
                  className="py-1.5 text-sm disabled:opacity-40"
                  style={{ color: active ? color : "var(--color-ink)" }}
                >
                  {active ? "✓ " : ""}
                  {c.name}
                </button>
                <button
                  type="button"
                  onClick={() => startRename(c)}
                  aria-label={`Renombrar ${c.name}`}
                  className="px-1.5 py-1 text-xs text-muted"
                >
                  ✎
                </button>
              </span>
            );
          })}
          {contexts?.length === 0 && (
            <p className="text-sm text-muted">Todavía no hay contextos.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim() && !busy) {
                e.preventDefault();
                void createAndAssign();
              }
            }}
            placeholder="Nuevo contexto"
            className="min-w-0 flex-1 rounded-xl border border-line bg-void px-4 py-2.5 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={createAndAssign}
            disabled={!newName.trim() || busy}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 font-medium text-black disabled:opacity-30"
          >
            Crear
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
