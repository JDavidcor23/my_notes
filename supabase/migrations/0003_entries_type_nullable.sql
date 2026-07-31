-- my notes — el tipo deja de elegirse al capturar
-- Aplicada via MCP de Supabase el 2026-07-30.
--
-- Clasificar a mano es fricción antes de capturar, y termina marcando todo
-- con el valor por defecto. Eso produce una columna que MIENTE, y esta base
-- existe para analizarla después: datos falsos envenenan el análisis.
--
-- NULL = "sin clasificar", que es la verdad. Un proceso posterior puede
-- derivar el tipo leyendo el texto.

alter table entries alter column type drop default;
alter table entries alter column type drop not null;

alter table entries drop constraint entries_type_check;
alter table entries add constraint entries_type_check
  check (type is null or type in ('nota','idea','error','comentario'));
