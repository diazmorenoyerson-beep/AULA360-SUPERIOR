-- AULA360 · Corrección de alcance RLS del módulo Saber 11
-- Fecha: 2026-11-12
-- Objetivo: vincular cada lectura de simulacros, cursos e ítems al curso
-- del estudiante autenticado. No modifica datos ni resultados.

begin;

drop policy if exists saber_targets_student_read on public.saber_sim_targets;
create policy saber_targets_student_read
on public.saber_sim_targets
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.course_id = saber_sim_targets.course_id
  )
);

drop policy if exists saber_sims_target_student_read on public.saber_sims;
create policy saber_sims_target_student_read
on public.saber_sims
for select to authenticated
using (
  active = true
  and exists (
    select 1
    from public.saber_sim_targets t
    join public.profiles p on p.course_id = t.course_id
    where t.sim_id = saber_sims.id
      and p.id = (select auth.uid())
  )
);

drop policy if exists saber_items_student_read on public.saber_sim_items;
create policy saber_items_student_read
on public.saber_sim_items
for select to authenticated
using (
  exists (
    select 1
    from public.saber_sim_targets t
    join public.profiles p on p.course_id = t.course_id
    join public.saber_sims s on s.id = t.sim_id
    where t.sim_id = saber_sim_items.sim_id
      and p.id = (select auth.uid())
      and s.active = true
  )
);

commit;

-- Verificación posterior:
-- select tablename, policyname, cmd, qual from pg_policies
-- where schemaname='public'
-- and policyname in ('saber_targets_student_read',
-- 'saber_sims_target_student_read','saber_items_student_read');
