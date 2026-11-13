create or replace function public.informe_simulacros_generales()
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare uid uuid:=auth.uid(); v_role text; v_school bigint; out_json jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 select p.role,p.colegio_id into v_role,v_school from public.profiles p where p.id=uid and p.teacher_status='aprobado';
 if v_role is null or v_role not in ('prof','rector','coordinador') then raise exception 'No tienes permiso para consultar estos resultados'; end if;
 if v_role in ('rector','coordinador') and v_school is null then raise exception 'Tu cuenta no tiene un colegio asignado'; end if;
 with scoped_courses as (
   select c.id,c.name,c.grade from public.courses c
   where (v_role='prof' and c.teacher_id=uid) or (v_role in ('rector','coordinador') and c.colegio_id=v_school)
 ), student_rows as (
   select sim.id test_id,sim.title,sim.grade,sim.subject,sim.due_at,c.id course_id,c.name course,c.grade course_grade,
     a.user_id,s.full_name student,count(*)::integer attempts,sum(a.correct)::integer correct_n,sum(a.total)::integer total_n,
     round(avg(a.score),2) average_score,max(a.score) best_score,(array_agg(a.score order by a.created_at desc))[1] latest_score,
     max(a.created_at) last_at,(array_agg(a.auto order by a.created_at desc))[1] automatic
   from public.simulacros sim join public.simulacro_targets t on t.simulacro_id=sim.id
   join scoped_courses c on c.id=t.course_id join public.attempts a on a.simulacro_id=sim.id
   join public.profiles s on s.id=a.user_id and s.course_id=c.id
   where s.role='est' and s.teacher_status='aprobado'
     and ((v_role='prof' and sim.teacher_id=uid) or v_role in ('rector','coordinador'))
   group by sim.id,sim.title,sim.grade,sim.subject,sim.due_at,c.id,c.name,c.grade,a.user_id,s.full_name
 ), rows_by_course as (
   select test_id,title,grade,subject,due_at,course_id,course,course_grade,
     (select count(*) from public.profiles p where p.course_id=sr.course_id and p.role='est' and p.teacher_status='aprobado') enrolled,
     count(*)::integer participants,sum(attempts)::integer attempts,round(avg(average_score),2) average_pct,
     jsonb_agg(jsonb_build_object('student',student,'attempts',attempts,'correct',correct_n,'total',total_n,
       'pct',round(100.0*correct_n::numeric/nullif(total_n,0),2),'average_score',average_score,
       'best_score',best_score,'latest_score',latest_score,'last_at',last_at,'automatic',automatic) order by student) students
   from student_rows sr group by test_id,title,grade,subject,due_at,course_id,course,course_grade
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.course_grade,x.course,x.title),'[]'::jsonb) into out_json from rows_by_course x;
 return jsonb_build_object('generated_at',now(),'rows',out_json);
end
$function$;
revoke all on function public.informe_simulacros_generales() from public,anon;
grant execute on function public.informe_simulacros_generales() to authenticated;