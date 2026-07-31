# my_brain — App de captura personal

**Fecha:** 2026-07-30
**Estado:** Diseño aprobado
**Tipo:** Proyecto nuevo, uso personal, un solo usuario

---

## 1. Contexto y problema

Hoy la captura de ideas, notas, archivos y errores ocurre en tres lugares y ninguno funciona:

1. **Se pierde** — la idea llega y no se registra en ningún lado.
2. **Papel** — funciona porque tiene fricción cero, pero queda disperso y no es consultable.
3. **Se desarrolla en el momento** — la idea secuestra el foco y se pierde el resto del bloque de trabajo.

Como reemplazo parcial se usa WhatsApp (notas a uno mismo). WhatsApp **captura bien** — está siempre abierto y es instantáneo — pero **no devuelve nada**: no hay estructura, no hay tipos, no hay agrupación, no hay recuperación útil.

**Este proyecto ataca únicamente la captura y el almacenamiento estructurado.** La explotación de esos datos (consultas, análisis, agentes, grafo de conocimiento) es un proyecto separado que consumirá esta base de datos más adelante.

### Principio rector

> Si capturar toma más de 3 segundos, el papel gana y la app muere en dos semanas.

Toda decisión de diseño se resuelve a favor de la velocidad de captura.

---

## 2. Alcance

### Qué hace

- Capturar texto libre — **sin clasificar nada al escribir**
- Adjuntar archivos de **cualquier** tipo (imágenes, PDF, Excel, ZIP, etc.)
- Agrupar entradas en **contextos** relacionados por ID, y desagruparlas
- Mostrar el historial como un chat, con paginado hacia atrás
- Funcionar como PWA instalable en el celular, mobile-first, dark mode

### Qué NO hace (decisión explícita)

- **No responde nada.** No hay IA, no hay chat, no hay sugerencias.
- **No analiza.** Ningún procesamiento de los datos capturados.
- **No notifica.** Sin push, sin recordatorios, sin service worker de background.
- **No busca.** Sin buscador en el MVP.
- **No se integra con Graphify.** Graphify corre local, en otra máquina, contra esta base. Fuera de este proyecto.
- **No edita entradas.** Se puede borrar, no modificar. (Ver §9.)
- **No funciona offline.** Requiere conexión. (Ver §11.)

---

## 3. Stack

| Capa | Elección | Razón |
|------|----------|-------|
| Frontend | Next.js (App Router) | Deploy de un comando, PWA sin fricción |
| Hosting | Vercel (free) | Cero configuración, dominio HTTPS incluido |
| Base de datos | Supabase Postgres | Relacional, arrays nativos, índices GIN |
| Archivos | Supabase Storage | S3-compatible, acepta cualquier MIME type |
| Auth | Supabase Auth (magic link) | Sin passwords, un solo usuario |
| Backend propio | **Ninguno** | El cliente habla directo con Supabase bajo RLS |

**Servicios descartados:**
- **Cloudinary** — redundante. Supabase Storage ya acepta cualquier tipo de archivo, está en la misma plataforma que la base y comparte la misma sesión de auth.
- **Backend propio (Node/Express)** — no hay lógica de servidor que justificarlo. RLS de Postgres cubre la seguridad.

---

## 4. Modelo de datos

```sql
-- Contextos: agrupadores nombrados, referenciados por UUID
create table contexts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  user_id     uuid not null references auth.users(id)
);

-- Entradas: la unidad de captura
create table entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  -- null = SIN CLASIFICAR. No se elige al capturar (ver §7).
  type         text
               check (type is null or type in ('nota','idea','error','comentario')),
  body         text,
  attachments  jsonb not null default '[]'::jsonb,
  context_ids  uuid[] not null default '{}',
  user_id      uuid not null references auth.users(id),

  -- una entrada debe tener texto o al menos un archivo
  constraint entry_not_empty check (
    coalesce(trim(body), '') <> '' or jsonb_array_length(attachments) > 0
  )
);

create index entries_context_ids_idx on entries using gin (context_ids);
create index entries_created_at_idx  on entries (created_at desc);
```

### Forma de `attachments`

```jsonc
[
  {
    "path": "a1b2c3/2026-07-30/f47ac10b-informe.pdf",  // ruta en el bucket
    "name": "informe.pdf",                     // nombre original
    "mime": "application/pdf",
    "size": 284913                             // bytes
  }
]
```

### Decisiones de modelado y su razón

**`attachments` como `jsonb`, no como tabla.**
Un solo insert por entrada, sin joins, sin archivos huérfanos en base. Los adjuntos no se consultan de forma independiente de su entrada. Si algún día hace falta normalizarlos, es una migración corta.

**`context_ids uuid[]`, no `group_id`.**
Con `group_id` una entrada pertenece a un solo grupo, y una idea suele pertenecer a dos contextos a la vez. El array da N-a-N sin tabla puente.

**UUID en vez de tag de texto.**
Renombrar un contexto es un `UPDATE` de una fila, no de cuarenta. El nombre vive en un solo lugar.

**Costo aceptado:** Postgres no permite foreign keys dentro de un array. Borrar un contexto deja UUIDs huérfanos en `entries.context_ids`. Por eso **borrar contextos queda fuera del MVP** (§11) y la limpieza, si hiciera falta, es un `UPDATE` puntual.

---

## 5. Storage

- **Bucket:** `attachments`, **privado**.
- **Ruta:** `{user_id}/{YYYY-MM-DD}/{uuid}-{nombre-original}`. El UUID en el nombre evita colisiones al subir dos archivos iguales el mismo día.
- **Límite por archivo:** 50 MB.
- **Tipos aceptados:** todos (`accept="*/*"` en el input).
- **Acceso:** URLs firmadas con expiración de 1 hora, generadas on-demand al tocar un adjunto. Nunca URLs públicas.

---

## 6. Auth y seguridad

- **Método:** magic link al mail del usuario. Sin registro público.
- **Sesión:** persistente. La app no pide login en cada apertura — eso rompería el principio de los 3 segundos.

### RLS

Ambas tablas con RLS activo. Política única por tabla:

```sql
alter table entries  enable row level security;
alter table contexts enable row level security;

create policy owner_all on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy owner_all on contexts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Storage: política equivalente sobre el bucket, restringiendo por prefijo `{user_id}/`.

---

## 7. Interfaz

> **Nota de implementación (2026-07-30).** Esta sección se escribió antes de
> construir y quedó desactualizada en varios puntos. Lo que se construyó:
> layout de **chat** (historial scrolleable arriba, composer fijo abajo,
> burbujas con separadores de día), **sin selector de tipo** (§4), **sin
> header** — en una app de captura es chrome muerto —, paginado de **10 con
> scroll infinito hacia arriba**, y Borrar/Agrupar en la barra de selección
> en lugar de acciones por fila. Los grupos se ven con una paleta categórica
> validada (`#3987e5` azul, `#c98500` amarillo, `#d55181` magenta): el
> **color identifica al grupo** y el **✓ identifica la selección**, dos
> señales en dos canales. Del 4º grupo en adelante el color cae a neutro:
> los colores categóricos no se ciclan, porque repetir uno diría que dos
> grupos distintos son el mismo. El nombre del grupo siempre está visible
> como chip, así la identidad nunca queda solo en el color.

Una sola pantalla. Mobile-first. **Dark mode fijo** — negro real (`#000`), no gris. Sin toggle: menos estado, menos código, mejor en pantallas OLED y es una app de uso nocturno.

```
┌─────────────────────────────────┐
│   ¿Qué haría Cristiano Ronaldo? │  ← header fijo
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │                             │ │  ← textarea, autofocus
│ │                             │ │
│ └─────────────────────────────┘ │
│ [Nota][Idea][Error][Comentario] │  ← chips de tipo
│ [📎 Adjuntar]        [Guardar]  │
├─────────────────────────────────┤
│  ○  idea · hace 2h              │
│     "revisar el flujo de..."    │
│  ○  nota · hace 5h              │
│     📎 informe.pdf              │
│  ○  error · ayer                │
│     "no validé el input antes"  │
└─────────────────────────────────┘
   [Agrupar en contexto]  ← barra que aparece al seleccionar
```

### Header

Texto fijo `¿Qué haría Cristiano Ronaldo?`, siempre visible, tipografía grande. Es un ancla personal, no decoración: la adopción de la app depende de que el usuario la abra, y el ancla emocional trabaja a favor de eso.

### Composer

- **Textarea** con `autofocus` al montar. Es lo único que le gana al papel.
- **Chips de tipo** — un tap. Default: `nota`.
- **Adjuntar** — `<input type="file" multiple accept="*/*">`. En móvil el sistema ofrece cámara, galería o archivos.
- **Guardar** — deshabilitado si no hay texto ni archivos. Al guardar: limpia el formulario, devuelve el foco al textarea, y la nueva entrada aparece arriba de la lista.

### Lista

- Últimas **20** entradas, orden `created_at desc`.
- Cada fila: círculo de selección, chip de tipo, tiempo relativo, primeras 2 líneas del body, nombres de adjuntos.
- Tocar un adjunto → genera URL firmada y abre.
- Existe para **confirmar que se guardó**, no para navegar el archivo histórico.
- Empty state: `Todavía no hay nada. Escribí algo.`

### Selección y agrupado

Los círculos están **siempre visibles** — sin long-press, sin modo selección. Menos gestos, menos código, más descubrible en móvil.

Al tocar uno o más círculos aparece una barra inferior: **`Agrupar en contexto`**. Abre una hoja con los contextos existentes como chips (para no crear duplicados por typo) más un campo `Nuevo contexto`. Al aplicar, el `context_id` se agrega al array de cada entrada seleccionada.

### Riesgo de diseño asumido

Agrupar es **mantenimiento** — trabajo que ocurre *después*. En un sistema personal, todo lo que es "después" se abandona a las tres semanas.

**Regla:** la app es 100% útil sin agrupar nada. El agrupado es opcional siempre. La app **nunca** pide, sugiere ni recuerda agrupar.

---

## 8. Flujos

### Capturar

1. Abrir app → textarea con foco.
2. Escribir y/o adjuntar. (Opcional: cambiar tipo.)
3. `Guardar` → suben los archivos a Storage → se inserta la entrada con las rutas resultantes → formulario limpio, foco de vuelta.

Los archivos suben **antes** del insert. Así la entrada nunca queda apuntando a rutas que no existen.

### Agrupar

1. Tocar los círculos de las entradas relacionadas.
2. `Agrupar en contexto` → elegir existente o crear nuevo.
3. Aplicar → `UPDATE` sobre las entradas seleccionadas.

### Renombrar contexto

En la hoja de contextos, cada chip tiene un ícono de lápiz → renombrar. Un `UPDATE` sobre `contexts.name`. Las entradas no se tocan. (Sin long-press: la app no usa gestos ocultos en ningún lado.)

---

## 9. Errores y casos borde

| Caso | Comportamiento |
|------|----------------|
| Falla la subida de un archivo | No se inserta la entrada. Se muestra el error y el texto **queda en el textarea**. Nunca se pierde lo escrito. |
| Falla el insert después de subir | Se muestra el error, el texto queda. Los archivos subidos quedan huérfanos en Storage — aceptado, limpieza manual. |
| Archivo > 50 MB | Se rechaza en el cliente antes de intentar subir, con mensaje claro. |
| Guardar sin texto ni archivos | Botón deshabilitado. |
| Sin conexión | Error visible, el texto **no se limpia**. (Offline real: §11.) |
| Sesión expirada | Redirige a magic link, preservando el borrador en `localStorage`. |
| Borrar una entrada | Swipe o menú en la fila, con confirmación. Borra la fila y sus archivos del bucket. |
| Editar una entrada | **No existe en el MVP.** Es una app de captura, no de redacción. Si algo salió mal, se borra y se escribe de nuevo. |

---

## 10. Verificación

Sin suite de tests automatizados en el MVP — es un proyecto personal de un solo usuario y el costo no se justifica todavía.

Verificación manual antes de dar por terminado:

- [ ] Guardar solo texto
- [ ] Guardar solo archivo
- [ ] Guardar texto + varios archivos de tipos distintos (imagen, PDF, ZIP)
- [ ] Abrir un adjunto desde la lista (URL firmada funciona)
- [ ] Crear contexto y asignarlo a 3 entradas
- [ ] Renombrar contexto → las 3 entradas reflejan el nombre nuevo
- [ ] Borrar entrada → desaparece de la lista y del bucket
- [ ] Instalar como PWA en el celular y capturar desde ahí
- [ ] RLS: con otro usuario, no se ve ninguna fila
- [ ] Cortar la red al guardar → el texto no se pierde

---

## 11. Fuera de alcance — Fase 2

Nada de esto se construye hasta que existan datos reales de uso sostenido.

- **Búsqueda** — por texto, tipo, contexto y rango de fechas.
- **Captura offline** — IndexedDB + cola de sincronización. Importa de verdad (la captura ocurre en la calle), pero no antes de que la app exista y se use.
- **Borrar contextos** — requiere resolver los UUIDs huérfanos en `context_ids`.
- **Vista por contexto** — navegar todas las entradas de un contexto.
- **Editar entradas.**
- **Exportación** — dump JSON/CSV para consumo externo.

**Otros proyectos, no este:** Graphify sobre esta base, agentes de IA, análisis de días, recordatorios.

---

## 12. Criterios de éxito

El proyecto es exitoso si, **a los 30 días**:

1. Se captura en la app y **no** en WhatsApp.
2. Capturar toma menos que sacar el papel.
3. Hay suficientes entradas para que valga la pena consultarlas.

Nada de esto depende de features. Depende de fricción. Cualquier decisión futura que agregue pasos a la captura va en contra de los tres criterios.
