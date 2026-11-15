-- AULA360: hardening RLS for period tests and general simulacros.
-- REVIEWED DRAFT. Apply only after staging/role-based regression tests.
-- No data is modified by this migration.

begin;

-- Keep period-test ownership and school scope stable on INSERT/UPDATE.
drop policy if exists periodo_tests_insert_teacher on public.periodo_pruebas;
create policy periodo_tests_insert_teacher
on public.periodo_pruebas
for insert to authenticated
with check (
  teacher_id = (select auth.uid())
  and colegio_id is not distinct from (select public.aula360_my_school())
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.teacher_status = 'aprobado'
      and p.role in ('prof','rector','coordinador')
  )
);

drop policy if exists periodo_tests_update_teacher on public.periodo_pruebas;
create policy periodo_tests_update_teacher
on public.periodo_pruebas
for update to authenticated
using (
  teacher_id = (select auth.uid())
  or (
    colegio_id = (select public.aula360_my_school())
    and (select public.aula360_my_role()) in ('rector','coordinador')
  )
)
with check (
  (
    teacher_id = (select auth.uid())
    and colegio_id is not distinct from (select public.aula360_my_school())
  )
  or (
    colegio_id = (select public.aula360_my_school())
    and (select public.aula360_my_role()) in ('rector','coordinador')
  )
);

-- SECURITY DEFINER helpers intentionally break the mutual RLS dependency.
-- They expose only boolean authorization checks, not row data.
create or replace function public.aula360_can_read_simulacro(p_simulacro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.simulacros s
    where s.id = p_simulacro_id
      and (
        s.teacher_id = (select auth.uid())
        or (
          s.active
          and exists (
            select 1
            from public.simulacro_targets t
            join public.profiles p on p.course_id = t.course_id
            where t.simulacro_id = s.id
              and p.id = (select auth.uid())
              and p.role = 'est'
          )
        )
      )
  );
$$;

create or replace function public.aula360_can_read_simulacro_target(
  p_simulacro_id uuid,
  p_course_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.simulacros s
    where s.id = p_simulacro_id
      and (
        s.teacher_id = (select auth.uid())
        or exists (
          select 1
          from public.profiles p
          where p.id = (select auth.uid())
            and p.role = 'est'
            and p.course_id = p_course_id
        )
      )
  );
$$;

create or replace function public.aula360_can_manage_simulacro_target(p_simulacro_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.simulacros s
    where s.id = p_simulacro_id
      and s.teacher_id = (select auth.uid())
  );
$$;

revoke all on function public.aula360_can_read_simulacro(uuid) from public, anon;
revoke all on function public.aula360_can_read_simulacro_target(uuid,uuid) from public, anon;
revoke all on function public.aula360_can_manage_simulacro_target(uuid) from public, anon;
grant execute on function public.aula360_can_read_simulacro(uuid) to authenticated;
grant execute on function public.aula360_can_read_simulacro_target(uuid,uuid) to authenticated;
grant execute on function public.aula360_can_manage_simulacro_target(uuid) to authenticated;

drop policy if exists simulacros_scoped_select on public.simulacros;
create policy simulacros_scoped_select
on public.simulacros
for select to authenticated
using (public.aula360_can_read_simulacro(id));

drop policy if exists simulacro_targets_scoped_select on public.simulacro_targets;
create policy simulacro_targets_scoped_select
on public.simulacro_targets
for select to authenticated
using (public.aula360_can_read_simulacro_target(simulacro_id, course_id));

drop policy if exists simulacro_targets_teacher_insert on public.simulacro_targets;
create policy simulacro_targets_teacher_insert
on public.simulacro_targets
for insert to authenticated
with check (
  public.aula360_can_manage_simulacro_target(simulacro_id)
  and exists (
    select 1
    from public.courses c
    where c.id = course_id
      and c.teacher_id = (select auth.uid())
  )
);

drop policy if exists simulacro_targets_teacher_delete on public.simulacro_targets;
create policy simulacro_targets_teacher_delete
on public.simulacro_targets
for delete to authenticated
using (public.aula360_can_manage_simulacro_target(simulacro_id));

commit;

-- Post-apply verification (run separately under authenticated test users):
-- 1) teacher cannot move a period test to another colegio_id or change teacher_id.
-- 2) approved rector/coordinator can update only rows within their own school.
-- 3) student sees only active simulacros targeted to their course.
-- 4) teacher sees/manages only their own simulacros and targets.
-- 5) run SELECTs against both tables to confirm SQLSTATE 42P17 is gone.
-- 6) verify anonymous users cannot execute the helper functions.
