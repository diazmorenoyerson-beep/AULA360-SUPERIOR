-- Consolidate SELECT policies without widening access.
drop policy if exists simulacros_teacher_select on public.simulacros;
drop policy if exists simulacros_target_student_select on public.simulacros;
create policy simulacros_scoped_select on public.simulacros for select to authenticated
using (teacher_id=(select auth.uid()) or (active and exists(
 select 1 from public.simulacro_targets t join public.profiles p on p.course_id=t.course_id
 where t.simulacro_id=simulacros.id and p.id=(select auth.uid()) and p.role='est'
)));
drop policy if exists simulacro_targets_teacher_select on public.simulacro_targets;
drop policy if exists simulacro_targets_student_select on public.simulacro_targets;
create policy simulacro_targets_scoped_select on public.simulacro_targets for select to authenticated
using (exists(select 1 from public.simulacros s where s.id=simulacro_id and s.teacher_id=(select auth.uid()))
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='est' and p.course_id=simulacro_targets.course_id));
drop policy if exists attempts_student_select_own on public.attempts;
drop policy if exists attempts_teacher_select_own_courses on public.attempts;
create policy attempts_scoped_select on public.attempts for select to authenticated
using (user_id=(select auth.uid()) or exists(
 select 1 from public.simulacros s join public.simulacro_targets t on t.simulacro_id=s.id
 join public.courses c on c.id=t.course_id
 where s.id=attempts.simulacro_id and s.teacher_id=(select auth.uid()) and c.teacher_id=(select auth.uid())
));