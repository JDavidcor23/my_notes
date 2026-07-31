import {
  infiniteQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { Entry } from "@/lib/types";
import { PAGE_SIZE, createEntry, deleteEntry, listEntriesPage } from "./api";

export const entriesKey = ["entries", "infinite"] as const;

export const entriesInfiniteOptions = infiniteQueryOptions({
  queryKey: entriesKey,
  queryFn: ({ pageParam }) => listEntriesPage(pageParam),
  initialPageParam: null as string | null,
  // Cada página viene DESC, así que la más vieja es la última del array.
  // Página incompleta = no hay más historial hacia atrás.
  getNextPageParam: (lastPage: Entry[]) =>
    lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1].created_at,
});

export function useEntries() {
  return useInfiniteQuery(entriesInfiniteOptions);
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}

export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}
