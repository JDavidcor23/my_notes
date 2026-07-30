# my_brain — Plan de implementación

> **Para workers agénticos:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Spec:** `docs/superpowers/specs/2026-07-30-captura-notas-design.md`

**Goal:** Construir una PWA personal de captura — texto tipado + archivos de cualquier tipo, agrupables en contextos — sin backend propio.

**Architecture:** Next.js App Router 100% cliente. El navegador habla directo con Supabase (Postgres + Storage + Auth) bajo RLS; no hay capa de servidor propia. Estado de servidor con TanStack Query; estado local del composer y de la selección con `useState`. Código organizado por feature (`features/entries`, `features/contexts`, `features/auth`), no por capa técnica.

**Tech Stack:** Next.js (App Router, TypeScript) · Tailwind CSS v4 · `@supabase/supabase-js` · TanStack Query v5 · Vercel · Supabase (free tier)

---

## Global Constraints

Todo lo de acá aplica a **todas** las tareas. Valores copiados textual del spec.

- **Principio rector:** si capturar toma más de 3 segundos, el papel gana. Ninguna tarea puede agregar pasos al flujo de captura.
- **Sin tests automatizados.** Cada tarea cierra con verificación manual. No crear archivos `.test.ts`, `.spec.ts`, ni configurar Vitest/Jest/Playwright.
- **Dark mode fijo.** Fondo `#000000` (negro real, no gris). **Sin toggle**, sin `prefers-color-scheme`, sin estado de tema.
- **Mobile-first.** Se diseña para el pulgar; desktop es el caso ampliado, no al revés.
- **Sin gestos ocultos.** Nada de long-press, swipe-to-action ni gestos no descubribles. Todo es un tap sobre un elemento visible.
- **Header fijo:** el texto exacto es `¿Qué haría Cristiano Ronaldo?`, siempre visible.
- **La app nunca pide, sugiere ni recuerda agrupar.** El agrupado es opcional siempre.
- **El texto escrito nunca se pierde.** Ante cualquier error, el contenido del textarea permanece.
- **Límite por archivo:** 50 MB. Se valida en el cliente **antes** de intentar subir.
- **Tipos de archivo aceptados:** todos (`accept="*/*"`).
- **Bucket privado.** Acceso solo por URL firmada con expiración de **3600 segundos**.
- **Lista:** últimas **20** entradas, orden `created_at desc`.
- **No existe edición de entradas.** Solo crear y borrar.
- **Tipos de entrada:** `nota` | `idea` | `error` | `comentario`. Default `nota`.
- **Idioma de la UI:** español.
- **Commits:** conventional commits. **Nunca** agregar `Co-Authored-By` ni atribución a IA.

---

## Estructura de archivos

```
my_brain/
├── .env.local                              # credenciales Supabase (NO se commitea)
├── .env.example                            # plantilla, sí se commitea
├── supabase/
│   └── migrations/
│       └── 0001_init.sql                   # tablas, índices, RLS, RPC, bucket
├── public/
│   ├── manifest.webmanifest
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── app/
    │   ├── layout.tsx                      # <html>, metadata, manifest, Providers
    │   ├── page.tsx                        # la única pantalla
    │   └── globals.css                     # Tailwind + tokens de color
    ├── providers.tsx                       # QueryClientProvider
    ├── lib/
    │   ├── supabase/client.ts              # cliente único del navegador
    │   ├── types.ts                        # EntryType, Attachment, Entry, NoteContext
    │   └── format.ts                       # tiempo relativo, tamaño de archivo
    ├── components/
    │   └── Header.tsx                      # el header fijo
    └── features/
        ├── auth/
        │   ├── AuthGate.tsx                # sesión o LoginScreen
        │   └── LoginScreen.tsx             # magic link
        ├── entries/
        │   ├── api.ts                      # createEntry, listEntries, deleteEntry, signedUrl
        │   ├── hooks.ts                    # useEntries, useCreateEntry, useDeleteEntry
        │   ├── Composer.tsx                # textarea + tipo + adjuntar + guardar
        │   ├── TypeChips.tsx               # selector de tipo
        │   ├── EntryList.tsx               # lista + empty state + selección
        │   └── EntryRow.tsx                # una fila
        └── contexts/
            ├── api.ts                      # listContexts, createContext, renameContext, assignContext
            ├── hooks.ts                    # useContexts, useCreateContext, useRenameContext, useAssignContext
            ├── GroupBar.tsx                # barra inferior al haber selección
            └── ContextSheet.tsx            # hoja de contextos
```

**Por qué esta división:** cada feature agrupa su API, sus hooks y sus componentes. Los archivos que cambian juntos viven juntos. Ningún archivo pasa de ~150 líneas.

---

## Task 1: Scaffold, shell oscuro y header

**Files:**
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/components/Header.tsx`
- Create: `.env.example`
- Modify: `.gitignore` (agregar `.env.local`)

**Interfaces:**
- Consumes: nada
- Produces: `<Header />` — componente sin props, renderiza el texto fijo del header

- [ ] **Step 1: Crear el proyecto**

```bash
npx create-next-app@latest my-brain-app \
  --typescript --tailwind --app --src-dir --eslint \
  --import-alias "@/*" --no-turbopack
```

Cuando termine, mover el contenido de `my-brain-app/` a la raíz del repo (`my_brain/`) y borrar la carpeta vacía. La carpeta `docs/` ya existente no se toca.

- [ ] **Step 2: Escribir `src/app/globals.css`**

```css
@import "tailwindcss";

/* Dark fijo. Sin toggle, sin prefers-color-scheme: es una app de uso
   nocturno desde el celular y el negro real ahorra batería en OLED. */
@theme {
  --color-void: #000000;
  --color-surface: #0d0d0d;
  --color-line: #262626;
  --color-ink: #f5f5f5;
  --color-muted: #8a8a8a;
  --color-accent: #22c55e;
}

html {
  background: var(--color-void);
  color-scheme: dark;
}

body {
  background: var(--color-void);
  color: var(--color-ink);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Sin flash gris al tocar, sin rebote elástico: se tiene que sentir app. */
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}
```

**Tokens de color — obligatorios en todas las tareas.** En Tailwind v4 cada token de `@theme` genera su utilidad. Usar SIEMPRE estas clases, nunca valores arbitrarios ni colores de la paleta default de Tailwind:

| Token | Clases | Uso |
|---|---|---|
| `--color-void` | `bg-void` | fondo de la app, negro real |
| `--color-surface` | `bg-surface` | inputs, hojas, tarjetas |
| `--color-line` | `border-line` | todos los bordes |
| `--color-ink` | `text-ink` | texto principal |
| `--color-muted` | `text-muted` | texto secundario, placeholders |
| `--color-accent` | `bg-accent` `text-accent` `border-accent` | acciones y estado seleccionado |

- [ ] **Step 3: Escribir `src/components/Header.tsx`**

```tsx
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-void px-4 py-4">
      <h1 className="text-lg font-semibold leading-tight text-ink">
        ¿Qué haría Cristiano Ronaldo?
      </h1>
    </header>
  );
}
```

- [ ] **Step 4: Escribir `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "my_brain",
  description: "Captura personal",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-void text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Escribir `src/app/page.tsx`**

```tsx
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <Header />
      <div className="flex-1 px-4 py-6 text-muted">
        Todavía no hay nada. Escribí algo.
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Crear `.env.example` y actualizar `.gitignore`**

`.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Verificar que `.gitignore` contiene `.env*.local`. Si no, agregarlo.

- [ ] **Step 7: Verificar**

Correr `npm run dev` y abrir `http://localhost:3000`.

Confirmar: fondo **negro puro** (no gris oscuro), el texto `¿Qué haría Cristiano Ronaldo?` arriba, el header queda fijo al scrollear, y el layout está centrado con ancho máximo en desktop.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold next.js con shell oscuro y header"
```

---

## Task 2: Base de datos, RLS y bucket

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `.env.local` (local, no se commitea)

**Interfaces:**
- Consumes: nada
- Produces: tablas `entries` y `contexts`, bucket `attachments`, función RPC `assign_context(p_context_id uuid, p_entry_ids uuid[])`

- [ ] **Step 1: Crear el proyecto en Supabase**

En [supabase.com](https://supabase.com) crear un proyecto nuevo (plan free). Copiar de **Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Pegarlos en `.env.local`.

- [ ] **Step 2: Escribir `supabase/migrations/0001_init.sql`**

```sql
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

-- ── Storage ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 52428800)
on conflict (id) do nothing;

-- Cada usuario solo toca la carpeta que lleva su uuid como primer segmento.
create policy attachments_owner on storage.objects
  for all
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 3: Ejecutar la migración**

En el dashboard de Supabase → **SQL Editor** → pegar el contenido completo de `0001_init.sql` → Run.

- [ ] **Step 4: Verificar**

En el dashboard:
- **Table Editor**: existen `entries` y `contexts`, ambas con el candado de RLS activo.
- **Storage**: existe el bucket `attachments` y **no** está marcado como público.
- **SQL Editor**: correr `select assign_context(gen_random_uuid(), '{}'::uuid[]);` → devuelve sin error.
- **SQL Editor**: correr `select * from entries;` → devuelve 0 filas sin error de permisos.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: esquema de base, rls y bucket de adjuntos"
```

---

## Task 3: Auth con magic link

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/types.ts`, `src/providers.tsx`
- Create: `src/features/auth/AuthGate.tsx`, `src/features/auth/LoginScreen.tsx`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `<Header />` (Task 1); tablas y bucket (Task 2)
- Produces:
  - `supabase` — instancia única de `SupabaseClient`
  - `EntryType`, `Attachment`, `Entry`, `NoteContext` — tipos de dominio
  - `<Providers>{children}</Providers>`
  - `<AuthGate>{children}</AuthGate>` — renderiza los hijos solo con sesión activa

- [ ] **Step 1: Instalar dependencias**

```bash
npm install @supabase/supabase-js @tanstack/react-query
```

- [ ] **Step 2: Escribir `src/lib/supabase/client.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

// Cliente único de navegador. No usamos @supabase/ssr porque ningún
// Server Component necesita la sesión: la app es 100% cliente.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  },
);
```

- [ ] **Step 3: Escribir `src/lib/types.ts`**

```ts
export type EntryType = "nota" | "idea" | "error" | "comentario";

export const ENTRY_TYPES: EntryType[] = ["nota", "idea", "error", "comentario"];

export interface Attachment {
  path: string;
  name: string;
  mime: string;
  size: number;
}

export interface Entry {
  id: string;
  created_at: string;
  type: EntryType;
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
```

- [ ] **Step 4: Escribir `src/providers.tsx`**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: Escribir `src/features/auth/LoginScreen.tsx`**

```tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-muted">
          Te mandé un link a <span className="text-ink">{email}</span>.
          Abrilo desde este mismo dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-lg font-semibold">¿Qué haría Cristiano Ronaldo?</h1>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
      />
      <button
        onClick={send}
        disabled={!email.includes("@") || sending}
        className="w-full max-w-xs rounded-xl bg-accent px-4 py-3 font-medium text-black disabled:opacity-30"
      >
        {sending ? "Enviando…" : "Entrar"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Escribir `src/features/auth/AuthGate.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { LoginScreen } from "./LoginScreen";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="min-h-dvh bg-void" />;
  if (!session) return <LoginScreen />;
  return <>{children}</>;
}
```

- [ ] **Step 7: Conectar en `src/app/layout.tsx`**

Envolver `{children}` con `<Providers>`:

```tsx
import { Providers } from "@/providers";
// …
      <body className="min-h-dvh bg-void text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
```

Y en `src/app/page.tsx` envolver el contenido con `<AuthGate>`:

```tsx
import { AuthGate } from "@/features/auth/AuthGate";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <AuthGate>
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        <Header />
        <div className="flex-1 px-4 py-6 text-muted">
          Todavía no hay nada. Escribí algo.
        </div>
      </main>
    </AuthGate>
  );
}
```

- [ ] **Step 8: Verificar**

`npm run dev` → aparece la pantalla de login. Poner el mail, tocar **Entrar**, abrir el link del mail. Debe entrar a la pantalla principal.

Después **recargar la página**: tiene que seguir logueado sin pedir nada. Si pide login en cada recarga, la sesión no persiste y el principio de los 3 segundos está roto — no seguir hasta arreglarlo.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: auth con magic link y persistencia de sesion"
```

---

## Task 4: Composer — capturar texto

**Files:**
- Create: `src/features/entries/api.ts`, `src/features/entries/hooks.ts`
- Create: `src/features/entries/TypeChips.tsx`, `src/features/entries/Composer.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `supabase`, `Entry`, `EntryType`, `ENTRY_TYPES`, `Attachment` (Task 3)
- Produces:
  - `createEntry(input: { type: EntryType; body: string; files: File[] }): Promise<Entry>`
  - `listEntries(limit?: number): Promise<Entry[]>`
  - `useEntries(): UseQueryResult<Entry[]>`
  - `useCreateEntry(): UseMutationResult<Entry, Error, { type: EntryType; body: string; files: File[] }>`
  - `<TypeChips value={EntryType} onChange={(t: EntryType) => void} />`
  - `<Composer />`

En esta tarea `files` siempre llega vacío. La subida real se implementa en la Task 6; la firma ya la dejamos definitiva para no tocar los llamadores después.

- [ ] **Step 1: Escribir `src/features/entries/api.ts`**

```ts
import { supabase } from "@/lib/supabase/client";
import type { Attachment, Entry, EntryType } from "@/lib/types";

export const BUCKET = "attachments";
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const SIGNED_URL_SECONDS = 3600;

export async function uploadFiles(_files: File[], _userId: string): Promise<Attachment[]> {
  // Implementado en la Task 6.
  return [];
}

export async function createEntry(input: {
  type: EntryType;
  body: string;
  files: File[];
}): Promise<Entry> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sin sesión");

  // Los archivos suben ANTES del insert: así una entrada nunca
  // queda apuntando a rutas que no existen.
  const attachments = await uploadFiles(input.files, auth.user.id);

  const { data, error } = await supabase
    .from("entries")
    .insert({
      type: input.type,
      body: input.body.trim() || null,
      attachments,
      user_id: auth.user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Entry;
}

export async function listEntries(limit = 20): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Entry[];
}
```

- [ ] **Step 2: Escribir `src/features/entries/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createEntry, listEntries } from "./api";

export const entriesKey = ["entries"] as const;

export function useEntries() {
  return useQuery({ queryKey: entriesKey, queryFn: () => listEntries(20) });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}
```

- [ ] **Step 3: Escribir `src/features/entries/TypeChips.tsx`**

```tsx
"use client";

import { ENTRY_TYPES, type EntryType } from "@/lib/types";

export function TypeChips({
  value,
  onChange,
}: {
  value: EntryType;
  onChange: (t: EntryType) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {ENTRY_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm capitalize transition ${
            value === t
              ? "bg-accent font-medium text-black"
              : "border border-line text-muted"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Escribir `src/features/entries/Composer.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { EntryType } from "@/lib/types";
import { useCreateEntry } from "./hooks";
import { TypeChips } from "./TypeChips";

const DRAFT_KEY = "my_brain:draft";

export function Composer() {
  const [body, setBody] = useState("");
  const [type, setType] = useState<EntryType>("nota");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const create = useCreateEntry();

  // Recupera el borrador y deja el foco listo: abrir la app = poder escribir.
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setBody(draft);
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (body) localStorage.setItem(DRAFT_KEY, body);
    else localStorage.removeItem(DRAFT_KEY);
  }, [body]);

  const canSave = body.trim().length > 0 && !create.isPending;

  async function save() {
    setError(null);
    try {
      await create.mutateAsync({ type, body, files: [] });
      // Solo limpiamos DESPUÉS de que el insert salió bien.
      setBody("");
      setType("nota");
      textareaRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-4">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Escribí…"
        className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none placeholder:text-muted focus:border-accent"
      />

      <TypeChips value={type} onChange={setType} />

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-xl bg-accent px-5 py-2.5 font-medium text-black disabled:opacity-30"
        >
          {create.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Conectar en `src/app/page.tsx`**

```tsx
import { AuthGate } from "@/features/auth/AuthGate";
import { Header } from "@/components/Header";
import { Composer } from "@/features/entries/Composer";

export default function Home() {
  return (
    <AuthGate>
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        <Header />
        <Composer />
        <div className="flex-1 px-4 py-6 text-muted">
          Todavía no hay nada. Escribí algo.
        </div>
      </main>
    </AuthGate>
  );
}
```

- [ ] **Step 6: Verificar**

1. Abrir la app: el cursor tiene que estar **ya** dentro del textarea, sin tocar nada.
2. Con el textarea vacío, `Guardar` está deshabilitado.
3. Escribir `probando`, elegir tipo `idea`, tocar `Guardar`. El textarea se limpia y el tipo vuelve a `nota`.
4. En Supabase → Table Editor → `entries`: hay una fila con `body = 'probando'`, `type = 'idea'`, `attachments = []`, `context_ids = {}`.
5. Escribir texto y **recargar** sin guardar: el texto sigue ahí (borrador en `localStorage`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: composer de captura de texto con tipo y borrador"
```

---

## Task 5: Lista de entradas

**Files:**
- Create: `src/lib/format.ts`, `src/features/entries/EntryRow.tsx`, `src/features/entries/EntryList.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useEntries` (Task 4), `Entry` (Task 3)
- Produces:
  - `relativeTime(iso: string): string`
  - `formatBytes(bytes: number): string`
  - `<EntryRow entry={Entry} selected={boolean} onToggle={() => void} />`
  - `<EntryList />`

- [ ] **Step 1: Escribir `src/lib/format.ts`**

```ts
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 2: Escribir `src/features/entries/EntryRow.tsx`**

```tsx
"use client";

import type { Entry } from "@/lib/types";
import { relativeTime } from "@/lib/format";

export function EntryRow({
  entry,
  selected,
  onToggle,
}: {
  entry: Entry;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex gap-3 border-b border-line px-4 py-3">
      {/* Círculo siempre visible: sin modo selección, sin long-press. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={selected ? "Deseleccionar" : "Seleccionar"}
        className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition ${
          selected
            ? "border-accent bg-accent"
            : "border-line"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="capitalize">{entry.type}</span>
          <span>·</span>
          <span>{relativeTime(entry.created_at)}</span>
        </div>

        {entry.body && (
          <p className="mt-1 line-clamp-2 text-sm text-ink">{entry.body}</p>
        )}
      </div>
    </li>
  );
}
```

Los adjuntos se agregan a esta fila en la Task 6 y el botón de borrar en la Task 7.

- [ ] **Step 3: Escribir `src/features/entries/EntryList.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useEntries } from "./hooks";
import { EntryRow } from "./EntryRow";

export function EntryList() {
  const { data: entries, isLoading, error } = useEntries();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <p className="px-4 py-6 text-sm text-muted">Cargando…</p>;
  }

  if (error) {
    return <p className="px-4 py-6 text-sm text-red-400">No se pudo cargar la lista.</p>;
  }

  if (!entries?.length) {
    return (
      <p className="px-4 py-6 text-sm text-muted">
        Todavía no hay nada. Escribí algo.
      </p>
    );
  }

  return (
    <ul className="pb-24">
      {entries.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          selected={selected.has(entry.id)}
          onToggle={() => toggle(entry.id)}
        />
      ))}
    </ul>
  );
}
```

El `pb-24` deja lugar para la `GroupBar` de la Task 8.

- [ ] **Step 4: Conectar en `src/app/page.tsx`**

Reemplazar el `<div>` del empty state por `<EntryList />`:

```tsx
import { AuthGate } from "@/features/auth/AuthGate";
import { Header } from "@/components/Header";
import { Composer } from "@/features/entries/Composer";
import { EntryList } from "@/features/entries/EntryList";

export default function Home() {
  return (
    <AuthGate>
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        <Header />
        <Composer />
        <EntryList />
      </main>
    </AuthGate>
  );
}
```

- [ ] **Step 5: Verificar**

1. La entrada creada en la Task 4 aparece en la lista con su tipo y el tiempo relativo.
2. Guardar una entrada nueva: aparece **arriba** de la lista sin recargar la página.
3. Tocar un círculo: se pinta de verde. Tocarlo de nuevo: se apaga. Seleccionar dos a la vez funciona.
4. Borrar todas las filas desde el Table Editor y recargar: aparece `Todavía no hay nada. Escribí algo.`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: lista de entradas con seleccion y empty state"
```

---

## Task 6: Adjuntos

**Files:**
- Modify: `src/features/entries/api.ts` (implementar `uploadFiles`, agregar `signedUrl`)
- Modify: `src/features/entries/Composer.tsx` (input de archivos)
- Modify: `src/features/entries/EntryRow.tsx` (mostrar y abrir adjuntos)

**Interfaces:**
- Consumes: todo lo de las Tasks 4 y 5
- Produces:
  - `uploadFiles(files: File[], userId: string): Promise<Attachment[]>` — implementación real
  - `signedUrl(path: string): Promise<string>`

- [ ] **Step 1: Reemplazar el stub de `uploadFiles` y agregar `signedUrl` en `src/features/entries/api.ts`**

```ts
// Supabase Storage rechaza ciertos caracteres en las keys.
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadFiles(files: File[], userId: string): Promise<Attachment[]> {
  const day = new Date().toISOString().slice(0, 10);
  const uploaded: Attachment[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" pasa los 50 MB`);
    }

    // El uuid en el nombre evita colisiones al subir dos archivos
    // con el mismo nombre el mismo día.
    const path = `${userId}/${day}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) throw new Error(`No se pudo subir "${file.name}": ${error.message}`);

    uploaded.push({
      path,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    });
  }

  return uploaded;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
```

Borrar el stub anterior de `uploadFiles`. `createEntry` ya la llama — no se toca.

- [ ] **Step 2: Agregar el input de archivos en `src/features/entries/Composer.tsx`**

Agregar al estado y a los refs:

```tsx
import { MAX_FILE_BYTES } from "./api";
import { formatBytes } from "@/lib/format";
// …
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
```

Reemplazar `canSave` y `save`:

```tsx
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
    setError(null);
    try {
      await create.mutateAsync({ type, body, files });
      setBody("");
      setType("nota");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      textareaRef.current?.focus();
    } catch (e) {
      // El texto y los archivos NO se limpian: nada de lo escrito se pierde.
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }
```

Reemplazar la fila del botón por:

```tsx
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
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

      <div className="flex items-center justify-between">
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
          className="rounded-xl border border-line px-4 py-2.5 text-muted"
        >
          Adjuntar
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="rounded-xl bg-accent px-5 py-2.5 font-medium text-black disabled:opacity-30"
        >
          {create.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
```

- [ ] **Step 3: Mostrar los adjuntos en `src/features/entries/EntryRow.tsx`**

Agregar imports y el handler:

```tsx
import { signedUrl } from "./api";
import { formatBytes } from "@/lib/format";
```

```tsx
  async function open(path: string) {
    try {
      const url = await signedUrl(path);
      window.open(url, "_blank", "noopener");
    } catch {
      alert("No se pudo abrir el archivo");
    }
  }
```

Y debajo del `<p>` del body:

```tsx
        {entry.attachments.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1">
            {entry.attachments.map((a) => (
              <li key={a.path}>
                <button
                  type="button"
                  onClick={() => open(a.path)}
                  className="flex max-w-full items-center gap-2 text-sm text-accent"
                >
                  <span className="truncate">{a.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatBytes(a.size)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
```

- [ ] **Step 4: Verificar**

1. Adjuntar una imagen, un PDF y un ZIP en una misma entrada, con texto. Guardar.
2. En Supabase → Storage → `attachments`: existen los 3 archivos bajo `{user_id}/{fecha}/`.
3. En Table Editor → `entries`: la columna `attachments` tiene un array de 3 objetos con `path`, `name`, `mime`, `size`.
4. En la lista, tocar cada adjunto: abre en pestaña nueva y **se ve/descarga**. Si el ZIP da 400, el bucket o la policy están mal.
5. Guardar una entrada **sin texto**, solo con un archivo: tiene que funcionar.
6. Intentar adjuntar un archivo de más de 50 MB: se rechaza **antes** de subir, con el nombre del archivo en el mensaje.
7. Cortar la red (DevTools → Offline) y tocar `Guardar`: aparece el error y **el texto y los archivos siguen en el formulario**.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: adjuntos de cualquier tipo con urls firmadas"
```

---

## Task 7: Borrar entradas

**Files:**
- Modify: `src/features/entries/api.ts` (agregar `deleteEntry`)
- Modify: `src/features/entries/hooks.ts` (agregar `useDeleteEntry`)
- Modify: `src/features/entries/EntryRow.tsx` (botón de borrar)

**Interfaces:**
- Consumes: todo lo anterior
- Produces:
  - `deleteEntry(entry: Entry): Promise<void>`
  - `useDeleteEntry(): UseMutationResult<void, Error, Entry>`

- [ ] **Step 1: Agregar `deleteEntry` en `src/features/entries/api.ts`**

```ts
export async function deleteEntry(entry: Entry): Promise<void> {
  // Primero los archivos: si falla el delete de la fila, no quedan
  // archivos apuntados por una entrada inexistente.
  if (entry.attachments.length > 0) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(entry.attachments.map((a) => a.path));
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("entries").delete().eq("id", entry.id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Agregar `useDeleteEntry` en `src/features/entries/hooks.ts`**

```ts
import { createEntry, deleteEntry, listEntries } from "./api";
// …
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: entriesKey }),
  });
}
```

- [ ] **Step 3: Agregar el botón en `src/features/entries/EntryRow.tsx`**

```tsx
import { useDeleteEntry } from "./hooks";
// …
  const remove = useDeleteEntry();

  function confirmDelete() {
    if (!confirm("¿Borrar esta entrada?")) return;
    remove.mutate(entry);
  }
```

Agregar como último hijo del `<li>`, después del `<div>` del contenido:

```tsx
      <button
        type="button"
        onClick={confirmDelete}
        disabled={remove.isPending}
        aria-label="Borrar entrada"
        className="mt-0.5 shrink-0 px-1 text-muted disabled:opacity-30"
      >
        ✕
      </button>
```

Botón visible, sin swipe: la regla de "sin gestos ocultos" aplica también acá.

- [ ] **Step 4: Verificar**

1. Borrar una entrada **con** adjuntos: desaparece de la lista, la fila desaparece del Table Editor, y los archivos desaparecen del bucket en Storage.
2. Borrar una entrada **sin** adjuntos: funciona igual.
3. Cancelar en el `confirm`: no pasa nada.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: borrado de entradas con limpieza de storage"
```

---

## Task 8: Contextos

**Files:**
- Create: `src/features/contexts/api.ts`, `src/features/contexts/hooks.ts`
- Create: `src/features/contexts/ContextSheet.tsx`, `src/features/contexts/GroupBar.tsx`
- Modify: `src/features/entries/EntryList.tsx`

**Interfaces:**
- Consumes: `supabase`, `NoteContext` (Task 3); el estado `selected` de `EntryList` (Task 5)
- Produces:
  - `listContexts(): Promise<NoteContext[]>`
  - `createContext(name: string): Promise<NoteContext>`
  - `renameContext(id: string, name: string): Promise<void>`
  - `assignContext(contextId: string, entryIds: string[]): Promise<void>`
  - `useContexts`, `useCreateContext`, `useRenameContext`, `useAssignContext`
  - `<GroupBar count={number} onGroup={() => void} onClear={() => void} />`
  - `<ContextSheet entryIds={string[]} onDone={() => void} onClose={() => void} />`

- [ ] **Step 1: Escribir `src/features/contexts/api.ts`**

```ts
import { supabase } from "@/lib/supabase/client";
import type { NoteContext } from "@/lib/types";

export async function listContexts(): Promise<NoteContext[]> {
  const { data, error } = await supabase
    .from("contexts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as NoteContext[];
}

export async function createContext(name: string): Promise<NoteContext> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sin sesión");

  const { data, error } = await supabase
    .from("contexts")
    .insert({ name: name.trim(), user_id: auth.user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as NoteContext;
}

export async function renameContext(id: string, name: string): Promise<void> {
  // El nombre vive en una sola fila: renombrar no toca ninguna entrada.
  const { error } = await supabase
    .from("contexts")
    .update({ name: name.trim() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function assignContext(contextId: string, entryIds: string[]): Promise<void> {
  // RPC porque supabase-js no expresa array_append en un update masivo.
  const { error } = await supabase.rpc("assign_context", {
    p_context_id: contextId,
    p_entry_ids: entryIds,
  });

  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Escribir `src/features/contexts/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { entriesKey } from "@/features/entries/hooks";
import { assignContext, createContext, listContexts, renameContext } from "./api";

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
```

- [ ] **Step 3: Escribir `src/features/contexts/GroupBar.tsx`**

```tsx
"use client";

export function GroupBar({
  count,
  onGroup,
  onClear,
}: {
  count: number;
  onGroup: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <button type="button" onClick={onClear} className="text-sm text-muted">
          {count} seleccionada{count > 1 ? "s" : ""} · Limpiar
        </button>
        <button
          type="button"
          onClick={onGroup}
          className="rounded-xl bg-accent px-4 py-2.5 font-medium text-black"
        >
          Agrupar en contexto
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Escribir `src/features/contexts/ContextSheet.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useAssignContext, useContexts, useCreateContext, useRenameContext } from "./hooks";

export function ContextSheet({
  entryIds,
  onDone,
  onClose,
}: {
  entryIds: string[];
  onDone: () => void;
  onClose: () => void;
}) {
  const { data: contexts } = useContexts();
  const createCtx = useCreateContext();
  const renameCtx = useRenameContext();
  const assign = useAssignContext();

  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function apply(contextId: string) {
    setError(null);
    try {
      await assign.mutateAsync({ contextId, entryIds });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agrupar");
    }
  }

  async function createAndApply() {
    setError(null);
    try {
      const created = await createCtx.mutateAsync(newName);
      setNewName("");
      await apply(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el contexto");
    }
  }

  function startRename(id: string, current: string) {
    const name = prompt("Nuevo nombre", current);
    if (name && name.trim() && name.trim() !== current) {
      renameCtx.mutate({ id, name });
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="max-h-[70dvh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold">
          Agrupar {entryIds.length} entrada{entryIds.length > 1 ? "s" : ""}
        </h2>

        {/* Chips de los contextos que ya existen: elegir en vez de tipear
            evita duplicados por typo. */}
        <div className="mb-5 flex flex-wrap gap-2">
          {contexts?.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 rounded-full border border-line pl-3 pr-1"
            >
              <button
                type="button"
                onClick={() => apply(c.id)}
                className="py-1.5 text-sm text-ink"
              >
                {c.name}
              </button>
              <button
                type="button"
                onClick={() => startRename(c.id, c.name)}
                aria-label={`Renombrar ${c.name}`}
                className="px-1.5 py-1 text-xs text-muted"
              >
                ✎
              </button>
            </span>
          ))}
          {contexts?.length === 0 && (
            <p className="text-sm text-muted">Todavía no hay contextos.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nuevo contexto"
            className="min-w-0 flex-1 rounded-xl border border-line bg-void px-4 py-2.5 outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={createAndApply}
            disabled={!newName.trim() || createCtx.isPending || assign.isPending}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 font-medium text-black disabled:opacity-30"
          >
            Crear
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Conectar en `src/features/entries/EntryList.tsx`**

Agregar imports y estado:

```tsx
import { GroupBar } from "@/features/contexts/GroupBar";
import { ContextSheet } from "@/features/contexts/ContextSheet";
// …
  const [sheetOpen, setSheetOpen] = useState(false);
```

Y reemplazar el `return` final por:

```tsx
  return (
    <>
      <ul className="pb-24">
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            selected={selected.has(entry.id)}
            onToggle={() => toggle(entry.id)}
          />
        ))}
      </ul>

      <GroupBar
        count={selected.size}
        onGroup={() => setSheetOpen(true)}
        onClear={() => setSelected(new Set())}
      />

      {sheetOpen && (
        <ContextSheet
          entryIds={[...selected]}
          onDone={() => {
            setSheetOpen(false);
            setSelected(new Set());
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
```

- [ ] **Step 6: Verificar**

1. Seleccionar 3 entradas: aparece la barra abajo diciendo `3 seleccionadas`.
2. `Agrupar en contexto` → escribir `investigacion-pagos` → `Crear`. La hoja se cierra y la selección se limpia.
3. Table Editor → `entries`: las 3 filas tienen el mismo UUID en `context_ids`. Table Editor → `contexts`: existe la fila con ese UUID.
4. Seleccionar 2 entradas más y asignarles el contexto **ya existente** tocando su chip. Verificar que se agregó.
5. Volver a asignar el **mismo** contexto a una entrada que ya lo tiene: el array **no** debe duplicar el UUID (lo garantiza el guard de la RPC).
6. Seleccionar una entrada que ya tiene un contexto y asignarle un **segundo** contexto: el array queda con 2 UUIDs. Esto confirma el N-a-N.
7. Renombrar un contexto con el lápiz: cambia el nombre en el chip y **`entries` no se toca** (verificar en Table Editor que `context_ids` sigue igual). Este es el motivo por el que usamos UUID en vez de tags de texto.
8. Con **cero** entradas seleccionadas, la barra inferior no existe. La app no menciona agrupar en ningún lado.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: contextos relacionados por uuid con agrupado multiple"
```

---

## Task 9: PWA instalable y deploy

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: la app completa (Tasks 1-8)
- Produces: app instalable en el celular y desplegada en Vercel

- [ ] **Step 1: Crear los íconos**

Dos PNG cuadrados de fondo negro `#000000` con el texto `mb` en blanco centrado, en 192×192 y 512×512. Guardarlos como `public/icon-192.png` y `public/icon-512.png`.

- [ ] **Step 2: Escribir `public/manifest.webmanifest`**

```json
{
  "name": "my_brain",
  "short_name": "my_brain",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 3: Referenciar el manifest en `src/app/layout.tsx`**

Agregar al objeto `metadata`:

```tsx
export const metadata: Metadata = {
  title: "my_brain",
  description: "Captura personal",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "my_brain" },
};
```

- [ ] **Step 4: Deploy a Vercel**

```bash
npx vercel --prod
```

En el dashboard de Vercel → Settings → Environment Variables, cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los mismos valores de `.env.local`. Redeployar.

Después, en Supabase → **Authentication → URL Configuration**, agregar la URL de producción a **Site URL** y a **Redirect URLs**. Sin esto el magic link redirige a `localhost` y no entra.

- [ ] **Step 5: Verificar en el celular — checklist final del spec (§10)**

Abrir la URL de producción en el celular, loguearse, y agregar a la pantalla de inicio.

- [ ] Se abre en pantalla completa, sin barra de navegador
- [ ] El teclado abre solo, con el cursor en el textarea
- [ ] Guardar solo texto
- [ ] Guardar solo archivo
- [ ] Guardar texto + varios archivos de tipos distintos (imagen, PDF, ZIP)
- [ ] Abrir un adjunto desde la lista
- [ ] Sacar una foto con la cámara desde `Adjuntar` y guardarla
- [ ] Crear contexto y asignarlo a 3 entradas
- [ ] Renombrar el contexto → las 3 entradas siguen agrupadas
- [ ] Borrar una entrada → desaparece de la lista y del bucket
- [ ] Cerrar la app y volver a abrirla → **no** pide login otra vez
- [ ] Cortar los datos y tocar Guardar → el texto no se pierde
- [ ] Cronometrar: abrir la app y guardar una nota corta en **menos de 3 segundos**

Si el último punto falla, el proyecto falla. Ese es el criterio.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: pwa instalable y deploy a produccion"
```

---

## Autorevisión contra el spec

| Requisito del spec | Tarea que lo cubre |
|---|---|
| §3 Stack (Next.js, Vercel, Supabase, sin backend) | 1, 2, 9 |
| §4 Tablas, constraint, índice GIN | 2 |
| §4 `attachments` jsonb | 2, 6 |
| §4 `context_ids uuid[]` N-a-N | 2, 8 |
| §5 Bucket privado, ruta con uuid, 50 MB, URL firmada 1h | 2, 6 |
| §6 Magic link, sesión persistente, RLS | 2, 3 |
| §7 Dark negro real, mobile-first, sin toggle | 1 |
| §7 Header fijo con el texto exacto | 1 |
| §7 Composer con autofocus, chips, adjuntar, guardar | 4, 6 |
| §7 Lista de 20, empty state, adjuntos abribles | 5, 6 |
| §7 Círculos siempre visibles, GroupBar, ContextSheet | 5, 8 |
| §7 Renombrar contexto sin tocar entradas | 8 |
| §8 Archivos suben antes del insert | 4, 6 |
| §9 Errores: el texto nunca se pierde | 4, 6 |
| §9 Archivo > 50 MB rechazado en cliente | 6 |
| §9 Guardar deshabilitado sin contenido | 4, 6 |
| §9 Borrar entrada + sus archivos | 7 |
| §9 Sin edición de entradas | — (no se implementa, por diseño) |
| §10 Checklist de verificación manual | 9 |
| §11 Fuera de alcance | — (no se implementa) |
| §12 Criterio de los 3 segundos | 9, step 5 |

**Consistencia de nombres verificada:** `Entry`, `NoteContext`, `Attachment`, `EntryType` (definidos en Task 3) se usan idénticos en 4, 5, 6, 7, 8. `createEntry`/`listEntries`/`deleteEntry`/`signedUrl`/`uploadFiles`/`MAX_FILE_BYTES`/`BUCKET`/`SIGNED_URL_SECONDS` viven todos en `features/entries/api.ts`. `entriesKey` se define en Task 4 y se importa en Task 8. La firma de `createEntry` incluye `files` desde la Task 4 aunque se implemente en la 6 — así ningún llamador se reescribe.
