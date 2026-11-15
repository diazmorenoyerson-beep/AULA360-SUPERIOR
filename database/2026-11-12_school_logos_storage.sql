-- AULA360: almacenamiento de logos y membretes institucionales.
-- El bucket es público únicamente para servir imágenes usadas en membretes.
-- Las cargas siguen restringidas a rector/coordinador del colegio correspondiente.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('school-logos','school-logos',true,6291456,array['image/png','image/jpeg'])
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists school_logos_upload_by_school_staff on storage.objects;
create policy school_logos_upload_by_school_staff
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-logos'
  and (storage.foldername(name))[1] = ('colegio-' || (select aula360_my_school())::text)
  and (select aula360_my_role()) in ('rector','coordinador')
  and storage.extension(name) in ('png','jpg','jpeg')
);
