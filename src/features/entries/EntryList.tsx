"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Entry } from "@/lib/types";
import { dayLabel, isSameDay } from "@/lib/format";
import { ContextSheet } from "@/features/contexts/ContextSheet";
import { buildContextColorMap } from "@/features/contexts/colors";
import { useContexts } from "@/features/contexts/hooks";
import { EntryBubble, type ContextTag } from "./EntryBubble";
import { SelectionBar } from "./SelectionBar";
import { useDeleteEntry, useEntries } from "./hooks";

/** Distancia al tope que dispara la carga del bloque anterior. */
const LOAD_MORE_THRESHOLD_PX = 80;

/** Inserta un separador cuando cambia el día respecto de la entrada anterior. */
function needsDaySeparator(entry: Entry, previous: Entry | undefined): boolean {
  if (!previous) return true;
  return !isSameDay(new Date(entry.created_at), new Date(previous.created_at));
}

export function EntryList() {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useEntries();
  const remove = useDeleteEntry();
  const { data: contexts } = useContexts();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const heightBeforeFetch = useRef(0);
  const topBeforeFetch = useRef(0);
  const pagesRendered = useRef(0);
  const initialized = useRef(false);
  const newestSeenId = useRef<string | null>(null);

  // Las páginas llegan DESC (nueva → vieja). Aplanadas y revertidas quedan
  // en orden cronológico, que es como se lee un chat.
  const entries = useMemo(() => (data ? data.pages.flat().reverse() : []), [data]);

  const pageCount = data?.pages.length ?? 0;
  const newestId = entries.length ? entries[entries.length - 1].id : null;

  const tagById = useMemo(() => {
    const list = contexts ?? [];
    const colors = buildContextColorMap(list);
    return new Map<string, ContextTag>(
      list.map((c) => [
        c.id,
        { id: c.id, name: c.name, color: colors.get(c.id) ?? "#8a8a8a" },
      ]),
    );
  }, [contexts]);

  /** Contextos que comparten TODAS las entradas seleccionadas. Solo esos se
   *  pueden quitar de una: quitar uno que no todas tienen sería ambiguo. */
  const sharedContextIds = useMemo(() => {
    const picked = entries.filter((e) => selected.has(e.id));
    if (picked.length === 0) return [];
    return picked
      .reduce<string[]>(
        (acc, entry) => acc.filter((id) => entry.context_ids.includes(id)),
        picked[0].context_ids,
      )
      .filter((id, i, arr) => arr.indexOf(id) === i);
  }, [entries, selected]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || entries.length === 0) return;

    // 1. Primera carga: abrir abajo, en lo último que escribiste.
    if (!initialized.current) {
      el.scrollTop = el.scrollHeight;
      initialized.current = true;
      pagesRendered.current = pageCount;
      newestSeenId.current = newestId;
      return;
    }

    // 2. Se insertó historial ARRIBA. Sin esto la vista pega un salto y
    //    perdés el mensaje que estabas leyendo: hay que compensar el alto
    //    que acaba de aparecer por encima.
    if (pageCount > pagesRendered.current) {
      el.scrollTop =
        el.scrollHeight - heightBeforeFetch.current + topBeforeFetch.current;
      pagesRendered.current = pageCount;
      return;
    }

    // 3. Entrada nueva propia: bajar a verla.
    if (newestId !== newestSeenId.current) {
      newestSeenId.current = newestId;
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length, pageCount, newestId]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    if (el.scrollTop > LOAD_MORE_THRESHOLD_PX) return;

    // Se guardan ANTES de pedir, para poder restaurar la posición después.
    heightBeforeFetch.current = el.scrollHeight;
    topBeforeFetch.current = el.scrollTop;
    void fetchNextPage();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    const targets = entries.filter((e) => selected.has(e.id));
    if (targets.length === 0) return;
    if (!confirm(`¿Borrar ${targets.length} entrada${targets.length > 1 ? "s" : ""}?`))
      return;

    for (const entry of targets) {
      await remove.mutateAsync(entry);
    }
    setSelected(new Set());
  }

  let content;

  if (isPending) {
    content = <p className="p-4 text-sm text-muted">Cargando…</p>;
  } else if (error) {
    content = <p className="p-4 text-sm text-danger">No se pudo cargar el historial.</p>;
  } else if (entries.length === 0) {
    content = (
      <p className="p-4 text-sm text-muted">Todavía no hay nada. Escribe algo.</p>
    );
  } else {
    content = (
      <ul className="flex flex-col gap-2 p-3">
        {isFetchingNextPage && (
          <li className="py-2 text-center text-xs text-muted">Cargando…</li>
        )}
        {!hasNextPage && (
          <li className="py-2 text-center text-xs text-muted">Este es el principio.</li>
        )}

        {entries.map((entry, i) => (
          <Fragment key={entry.id}>
            {needsDaySeparator(entry, entries[i - 1]) && (
              <li className="my-2 flex justify-center">
                <span className="rounded-full bg-surface px-3 py-1 text-[11px] text-muted">
                  {dayLabel(entry.created_at)}
                </span>
              </li>
            )}
            <EntryBubble
              entry={entry}
              tags={entry.context_ids
                .map((id) => tagById.get(id))
                .filter((t): t is ContextTag => Boolean(t))}
              selected={selected.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          </Fragment>
        ))}
      </ul>
    );
  }

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {content}
      </div>

      <SelectionBar
        count={selected.size}
        busy={remove.isPending}
        onGroup={() => setSheetOpen(true)}
        onDelete={deleteSelected}
        onClear={() => setSelected(new Set())}
      />

      {sheetOpen && (
        <ContextSheet
          entryIds={[...selected]}
          sharedContextIds={sharedContextIds}
          onDone={() => {
            setSheetOpen(false);
            setSelected(new Set());
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
