-- my_brain — bucket de adjuntos
-- Aplicada via MCP de Supabase el 2026-07-30.
--
-- Va separada de 0001 a proposito: las policies sobre storage.objects
-- pueden fallar por permisos segun el rol, y no queremos que eso
-- tumbe tambien el esquema de tablas.

-- Bucket privado, 50 MB por archivo, cualquier MIME type.
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
