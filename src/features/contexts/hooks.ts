import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entriesKey } from "@/features/entries/hooks";
import {
  assignContext,
  createContext,
  listContexts,
  removeContext,
  renameContext,
} from "./api";

export const contextsKey = ["contexts"] as const;

export function useContexts() {
  return useQuery({ queryKey: contextsKey, queryFn: listContexts });
}

export function useCreateContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createContext,
    onSuccess: () => qc.invalidateQueries({ queryKey: contextsKey }),
  });
}

export function useRenameContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameContext(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: contextsKey }),
  });
}

export function useAssignContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contextId, entryIds }: { contextId: string; entryIds: string[] }) =>
      assignContext(contextId, entryIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}

export function useRemoveContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contextId, entryIds }: { contextId: string; entryIds: string[] }) =>
      removeContext(contextId, entryIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}
