-- Informe académico de pruebas de periodo por curso y estudiante.
-- El RPC valida propietario o rector/coordinador del mismo colegio y no expone respuestas.

create or replace function public.periodo_reporte(p_prueba uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
 u uuid:=auth.uid();
 p public.periodo_pruebas%rowtype;
 out_json jsonb;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 select * into p from public.periodo_pruebas where id=p_prueba;
 if not found then raise exception 'Prueba inexistente'; end if;
 if not (
  p.teacher_id=u
  or (p.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
 ) then raise exception 'No tienes permiso para consultar este informe'; end if;

 select jsonb_build_object(
  'prueba',jsonb_build_object('id',p.id,'titulo',p.titulo,'asignatura',p.asignatura,'grado',p.grado,'periodo',p.periodo,'estado',p.estado,'minutos',p.minutos,'max_intentos',p.max_intentos),
  'total_preguntas',(select count(*) from public.periodo_items i where i.prueba_id=p.id),
  'total_intentos',(select count(*) from public.periodo_intentos a where a.prueba_id=p.id and a.submitted_at is not null),
  'cursos',coalesce((
    select jsonb_agg(jsonb_build_object(
      'course_id',c.id,'curso',c.name,'grado',c.grade,
      'matriculados',(select count(*) from public.profiles s where s.course_id=c.id and s.role='est' and s.teacher_status='aprobado'),
      'presentaron',(select count(distinct a.user_id) from public.periodo_intentos a join public.profiles s on s.id=a.user_id where a.prueba_id=p.id and a.submitted_at is not null and s.course_id=c.id),
      'intentos',(select count(*) from public.periodo_intentos a join public.profiles s on s.id=a.user_id where a.prueba_id=p.id and a.submitted_at is not null and s.course_id=c.id),
      'promedio',(select round(avg(a.score),2) from public.periodo_intentos a join public.profiles s on s.id=a.user_id where a.prueba_id=p.id and a.submitted_at is not null and s.course_id=c.id)
    ) order by c.grade,c.name)
    from public.periodo_targets t join public.courses c on c.id=t.course_id where t.prueba_id=p.id
  ),'[]'::jsonb),
  'estudiantes',coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id',s.id,'nombre',s.full_name,'curso',c.name,'grado',c.grade,
      'intentos',(select count(*) from public.periodo_intentos a where a.prueba_id=p.id and a.user_id=s.id and a.submitted_at is not null),
      'mejor_nota',(select max(a.score) from public.periodo_intentos a where a.prueba_id=p.id and a.user_id=s.id and a.submitted_at is not null),
      'ultima_nota',(select a.score from public.periodo_intentos a where a.prueba_id=p.id and a.user_id=s.id and a.submitted_at is not null order by a.submitted_at desc limit 1),
      'ultimo_envio',(select a.submitted_at from public.periodo_intentos a where a.prueba_id=p.id and a.user_id=s.id and a.submitted_at is not null order by a.submitted_at desc limit 1),
      'entrega_automatica',(select a.automatic from public.periodo_intentos a where a.prueba_id=p.id and a.user_id=s.id and a.submitted_at is not null order by a.submitted_at desc limit 1)
    ) order by c.grade,c.name,s.full_name)
    from public.profiles s join public.courses c on c.id=s.course_id
    where s.role='est' and s.teacher_status='aprobado'
      and exists(select 1 from public.periodo_targets t where t.prueba_id=p.id and t.course_id=s.course_id)
  ),'[]'::jsonb)
 ) into out_json;
 return out_json;
end $$;

revoke all on function public.periodo_reporte(uuid) from public,anon;
grant execute on function public.periodo_reporte(uuid) to authenticated;
