-- AULA360 · catálogo académico central
-- Permite crear, editar y eliminar áreas/asignaturas únicamente al administrador global.
-- Las políticas SELECT públicas existentes se conservan.
drop policy if exists areas_admin_insert on public.areas;
drop policy if exists areas_admin_update on public.areas;
drop policy if exists areas_admin_delete on public.areas;
create policy areas_admin_insert on public.areas for insert to authenticated with check (public.aula360_is_admin());
create policy areas_admin_update on public.areas for update to authenticated using (public.aula360_is_admin()) with check (public.aula360_is_admin());
create policy areas_admin_delete on public.areas for delete to authenticated using (public.aula360_is_admin());
drop policy if exists asignaturas_admin_insert on public.asignaturas;
drop policy if exists asignaturas_admin_update on public.asignaturas;
drop policy if exists asignaturas_admin_delete on public.asignaturas;
create policy asignaturas_admin_insert on public.asignaturas for insert to authenticated with check (public.aula360_is_admin());
create policy asignaturas_admin_update on public.asignaturas for update to authenticated using (public.aula360_is_admin()) with check (public.aula360_is_admin());
create policy asignaturas_admin_delete on public.asignaturas for delete to authenticated using (public.aula360_is_admin());
