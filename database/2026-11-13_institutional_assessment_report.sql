CREATE OR REPLACE FUNCTION public.informe_institucional()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_school bigint;
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select p.role, p.colegio_id
    into v_role, v_school
  from public.profiles p
  where p.id = v_uid and p.teacher_status = 'aprobado';

  if v_role is null then
    raise exception 'Tu cuenta no está habilitada para consultar el informe';
  end if;
  if v_role not in ('prof','rector','coordinador') then
    raise exception 'No tienes permiso para consultar el informe institucional';
  end if;
  if v_role in ('rector','coordinador') and v_school is null then
    raise exception 'Tu cuenta no tiene un colegio asignado';
  end if;

  with scoped_courses as (
    select c.id, c.name, c.grade, c.teacher_id, c.colegio_id
    from public.courses c
    where
      (v_role = 'prof' and c.teacher_id = v_uid)
      or (v_role in ('rector','coordinador') and c.colegio_id = v_school)
  ),
  period_rows as (
    select
      p.id as test_id, p.titulo as title, p.asignatura as subject,
      p.grado as grade, p.periodo as period, p.estado as status,
      c.id as course_id, c.name as course, c.grade as course_grade,
      (select count(*) from public.profiles s
        where s.course_id = c.id and s.role = 'est' and s.teacher_status = 'aprobado') as enrolled,
      (select count(distinct a.user_id) from public.periodo_intentos a
        join public.profiles s on s.id = a.user_id
        where a.prueba_id = p.id and a.submitted_at is not null and s.course_id = c.id) as participants,
      (select count(*) from public.periodo_intentos a
        join public.profiles s on s.id = a.user_id
        where a.prueba_id = p.id and a.submitted_at is not null and s.course_id = c.id) as attempts,
      (select round(avg(a.score),2) from public.periodo_intentos a
        join public.profiles s on s.id = a.user_id
        where a.prueba_id = p.id and a.submitted_at is not null and s.course_id = c.id) as average_score,
      coalesce((select jsonb_agg(jsonb_build_object(
        'student_id', s.id, 'student', s.full_name,
        'attempts', x.n, 'best_score', x.best_score, 'latest_score', x.latest_score,
        'latest_submitted_at', x.latest_submitted_at, 'automatic', x.automatic
      ) order by s.full_name)
      from public.profiles s
      join lateral (
        select count(*)::integer as n, max(a.score) as best_score,
          (array_agg(a.score order by a.submitted_at desc))[1] as latest_score,
          max(a.submitted_at) as latest_submitted_at,
          (array_agg(a.automatic order by a.submitted_at desc))[1] as automatic
        from public.periodo_intentos a
        where a.prueba_id = p.id and a.user_id = s.id and a.submitted_at is not null
      ) x on x.n > 0
      where s.course_id = c.id and s.role = 'est' and s.teacher_status = 'aprobado'
      ), '[]'::jsonb) as students
    from public.periodo_pruebas p
    join public.periodo_targets t on t.prueba_id = p.id
    join scoped_courses c on c.id = t.course_id
    where (v_role = 'prof' and p.teacher_id = v_uid)
       or (v_role in ('rector','coordinador') and p.colegio_id = v_school)
  ),
  online_student as (
    select sim.id as test_id, sim.title, sim.description, sim.due_at,
      c.id as course_id, c.name as course, c.grade,
      a.user_id, s.full_name,
      count(*)::integer as attempts,
      sum(a.correct)::integer as correct_n, sum(a.total)::integer as total_n,
      round(100.0 * sum(a.correct)::numeric / nullif(sum(a.total),0),2) as pct,
      max(a.created_at) as last_at
    from public.saber_sims sim
    join public.saber_sim_targets t on t.sim_id = sim.id
    join scoped_courses c on c.id = t.course_id
    join public.saber_attempts a on a.sim_id = sim.id
    join public.profiles s on s.id = a.user_id and s.course_id = c.id
    where a.total > 0
      and ((v_role = 'prof' and sim.teacher_id = v_uid)
        or (v_role in ('rector','coordinador') and sim.colegio_id = v_school))
    group by sim.id, sim.title, sim.description, sim.due_at,
      c.id, c.name, c.grade, a.user_id, s.full_name
  ),
  online_rows as (
    select
      test_id, title, description, due_at, course_id, course, grade,
      (select count(*) from public.profiles s
        where s.course_id = o.course_id and s.role = 'est' and s.teacher_status = 'aprobado') as enrolled,
      count(*)::integer as participants,
      sum(attempts)::integer as attempts,
      round(avg(pct),2) as average_pct,
      coalesce(jsonb_agg(jsonb_build_object(
        'student_id', user_id, 'student', full_name, 'attempts', attempts,
        'correct', correct_n, 'total', total_n, 'pct', pct, 'last_at', last_at
      ) order by full_name),'[]'::jsonb) as students
    from online_student o
    group by test_id, title, description, due_at, course_id, course, grade
  ),
  offline_student as (
    select i.id as test_id, i.title, i.kind, i.exam_date,
      c.id as course_id, c.name as course, c.grade as course_grade,
      r.id as roster_id, r.full_name as student,
      sum(res.correct_n)::integer as correct_n,
      sum(res.total_n)::integer as total_n,
      round(100.0 * sum(res.correct_n)::numeric / nullif(sum(res.total_n),0),2) as pct,
      count(*)::integer as sheets,
      max(res.created_at) as last_at
    from public.saber_imp i
    join public.saber_imp_courses ic on ic.imp_id = i.id
    join scoped_courses c on c.id = ic.course_id
    join public.roster r on r.course_id = c.id
    join public.saber_imp_results res on res.imp_id = i.id and res.roster_id = r.id
    where i.kind in ('saber','diagnostico')
      and ((v_role = 'prof' and i.teacher_id = v_uid)
        or (v_role in ('rector','coordinador') and i.colegio_id = v_school))
    group by i.id, i.title, i.kind, i.exam_date, c.id, c.name, c.grade, r.id, r.full_name
  ),
  offline_rows as (
    select
      test_id, title, kind, exam_date, course_id, course, course_grade as grade,
      (select count(*) from public.roster rr where rr.course_id = o.course_id) as enrolled,
      count(*)::integer as participants,
      sum(sheets)::integer as sheets,
      round(avg(pct),2) as average_pct,
      coalesce(jsonb_agg(jsonb_build_object(
        'roster_id', roster_id, 'student', student, 'correct', correct_n,
        'total', total_n, 'pct', pct, 'sheets', sheets, 'last_at', last_at
      ) order by student),'[]'::jsonb) as students
    from offline_student o
    group by test_id, title, kind, exam_date, course_id, course, course_grade
  )
  select jsonb_build_object(
    'scope', jsonb_build_object('role',v_role,'school_id',v_school),
    'generated_at', now(),
    'courses', coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'name',name,'grade',grade
    ) order by grade,name) from scoped_courses),'[]'::jsonb),
    'periodo', coalesce((select jsonb_agg(to_jsonb(x) order by x.grade,x.course,x.title) from period_rows x),'[]'::jsonb),
    'saber_online', coalesce((select jsonb_agg(to_jsonb(x) order by x.grade,x.course,x.title) from online_rows x),'[]'::jsonb),
    'impresos', coalesce((select jsonb_agg(to_jsonb(x) order by x.grade,x.course,x.title) from offline_rows x where x.kind='saber'),'[]'::jsonb),
    'diagnosticos', coalesce((select jsonb_agg(to_jsonb(x) order by x.grade,x.course,x.title) from offline_rows x where x.kind='diagnostico'),'[]'::jsonb)
  ) into v_out;

  return v_out;
end
$function$
;
revoke all on function public.informe_institucional() from public, anon;
grant execute on function public.informe_institucional() to authenticated;
