-- my_brain — esquema inicial
-- Aplicada via MCP de Supabase el 2026-07-30.

-- ── Contextos ────────────────────────────────────────────────
create table contexts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  user_id     uuid not null references auth.users(id) on delete cascade
);

-- ── Entradas ─────────────────────────────────────────────────
create table entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  type         text not null default 'nota'
               check (type in ('nota','idea','error','comentario')),
  body         text,
  attachments  jsonb not null default '[]'::jsonb,
  context_ids  uuid[] not null default '{}',
  user_id      uuid not null references auth.users(id) on delete cascade,

  constraint entry_not_empty check (
    coalesce(trim(body), '') <> '' or jsonb_array_length(attachments) > 0
  )
);

create index entries_context_ids_idx on entries using gin (context_ids);
create index entries_created_at_idx  on entries (created_at desc);

-- ── RLS ──────────────────────────────────────────────────────
alter table entries  enable row level security;
alter table contexts enable row level security;

create policy owner_all on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_all on contexts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Asignar un contexto a N entradas ─────────────────────────
-- security invoker => la RLS de arriba sigue aplicando.
-- El guard `not (context_ids @> ...)` evita duplicar el uuid en el array.
create or replace function assign_context(p_context_id uuid, p_entry_ids uuid[])
returns void
language sql
security invoker
as $$
  update entries
     set context_ids = array_append(context_ids, p_context_id)
   where id = any(p_entry_ids)
     and not (context_ids @> array[p_context_id]);
$$;
