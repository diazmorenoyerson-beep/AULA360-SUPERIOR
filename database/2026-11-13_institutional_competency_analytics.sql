create or replace function public.informe_competencias_institucional()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_uid uuid:=auth.uid();
 v_role text;
 v_school bigint;
 v_out jsonb;
begin
 if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
 select p.role,p.colegio_id into v_role,v_school
 from public.profiles p where p.id=v_uid and p.teacher_status='aprobado';
 if v_role is null or v_role not in ('prof','rector','coordinador') then
   raise exception 'No tienes permiso para consultar el informe institucional';
 end if;
 if v_role in ('rector','coordinador') and v_school is null then
   raise exception 'Tu cuenta no tiene un colegio asignado';
 end if;
 with scoped_courses as (
   select c.id,c.name,c.grade from public.courses c
   where (v_role='prof' and c.teacher_id=v_uid)
      or (v_role in ('rector','coordinador') and c.colegio_id=v_school)
 ), competency_rows as (
   select i.id as test_id,i.title,i.kind,i.exam_date,c.id as course_id,c.name as course,c.grade,
     comp.key as competency,
     sum((comp.value->>'c')::integer)::integer as correct_n,
     sum((comp.value->>'t')::integer)::integer as total_n,
     count(distinct r.roster_id)::integer as students,
     jsonb_agg(jsonb_build_object('roster_id',r.roster_id,'correct',(comp.value->>'c')::integer,
       'total',(comp.value->>'t')::integer,
       'pct',round(100.0*(comp.value->>'c')::numeric/nullif((comp.value->>'t')::numeric,0),2))
       order by r.roster_id) as student_rows
   from public.saber_imp i
   join public.saber_imp_courses ic on ic.imp_id=i.id
   join scoped_courses c on c.id=ic.course_id
   join public.saber_imp_results r on r.imp_id=i.id
   join public.roster ro on ro.id=r.roster_id and ro.course_id=c.id
   cross join lateral jsonb_each(coalesce(r.por_competencia,'{}'::jsonb)) comp
   where i.kind in ('saber','diagnostico')
     and ((v_role='prof' and i.teacher_id=v_uid)
       or (v_role in ('rector','coordinador') and i.colegio_id=v_school))
   group by i.id,i.title,i.kind,i.exam_date,c.id,c.name,c.grade,comp.key
 )
 select coalesce(jsonb_agg(jsonb_build_object(
   'test_id',test_id,'title',title,'kind',kind,'exam_date',exam_date,
   'course_id',course_id,'course',course,'grade',grade,'competency',competency,
   'correct',correct_n,'total',total_n,
   'pct',round(100.0*correct_n::numeric/nullif(total_n,0),2),
   'students',students,'student_rows',student_rows
 ) order by grade,course,title,competency),'[]'::jsonb)
 into v_out from competency_rows;
 return jsonb_build_object('scope',jsonb_build_object('role',v_role,'school_id',v_school),
   'generated_at',now(),'competencies',v_out);
end
$function$;
revoke all on function public.informe_competencias_institucional() from public,anon;
grant execute on function public.informe_competencias_institucional() to authenticated;
