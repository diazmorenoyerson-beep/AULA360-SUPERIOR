-- Restringir las operaciones de gestión de simulacros a docentes aprobados.
drop policy if exists simulacros_teacher_insert on public.simulacros;
create policy simulacros_teacher_insert on public.simulacros for insert to authenticated
with check(teacher_id=(select auth.uid()) and exists(
 select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='prof' and p.teacher_status='aprobado'
));
drop policy if exists simulacros_teacher_update on public.simulacros;
create policy simulacros_teacher_update on public.simulacros for update to authenticated
using(teacher_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='prof' and p.teacher_status='aprobado'))
with check(teacher_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='prof' and p.teacher_status='aprobado'));
drop policy if exists simulacros_teacher_delete on public.simulacros;
create policy simulacros_teacher_delete on public.simulacros for delete to authenticated
using(teacher_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='prof' and p.teacher_status='aprobado'));