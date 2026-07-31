-- my_brain — desagrupar entradas
-- Aplicada via MCP de Supabase el 2026-07-30.
--
-- Contraparte de assign_context. Sin esto, agrupar mal es un callejón
-- sin salida: no habría forma de sacar una entrada de un contexto.
-- security invoker => la RLS sigue aplicando.

create or replace function remove_context(p_context_id uuid, p_entry_ids uuid[])
returns void
language sql
security invoker
as $$
  update entries
     set context_ids = array_remove(context_ids, p_context_id)
   where id = any(p_entry_ids)
     and context_ids @> array[p_context_id];
$$;
