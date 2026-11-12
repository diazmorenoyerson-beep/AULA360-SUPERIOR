-- AULA360 · Guardado íntegro de resultados OMR
-- Aplicar en Supabase SQL Editor.
-- Calcula resultados por área y por grado de referencia; conserva autorización y validaciones.

create or replace function public.saber_imp_guardar(p_imp uuid,p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $function$
declare
 u uuid:=auth.uid(); rec jsonb; rid bigint; cu smallint; ans jsonb;
 totaln integer; correctn integer; pa jsonb; pg jsonb; inserted integer:=0;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.saber_imp i where i.id=p_imp and ((i.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador')) or i.teacher_id=u or public.aula360_is_admin())) then raise exception 'No autorizado'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Lote inválido'; end if;
 for rec in select value from jsonb_array_elements(p_rows) loop
  rid:=(rec->>'roster_id')::bigint; cu:=(rec->>'cuad')::smallint; ans:=rec->'answers';
  if cu not between 1 and 3 or jsonb_typeof(ans)<>'object' then raise exception 'Hoja inválida'; end if;
  if not exists(select 1 from public.saber_imp_courses x join public.roster r on r.course_id=x.course_id where x.imp_id=p_imp and r.id=rid) then raise exception 'Estudiante no pertenece a los cursos del simulacro'; end if;
  select count(*),count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::int=k.correct)
   into totaln,correctn from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu;
  if totaln=0 then raise exception 'Cuadernillo sin preguntas'; end if;
  select coalesce(jsonb_object_agg(area,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) into pa from (
   select x.area,count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::int=k.correct)::int c,count(*)::int t
   from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu group by x.area
  ) z;
  select coalesce(jsonb_object_agg(grado_ref::text,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) into pg from (
   select x.grado_ref,count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::int=k.correct)::int c,count(*)::int t
   from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu group by x.grado_ref
  ) z;
  insert into public.saber_imp_results(imp_id,roster_id,cuad,answers,correct_n,total_n,por_area,por_grado)
  values(p_imp,rid,cu,ans,correctn,totaln,pa,pg)
  on conflict(imp_id,roster_id,cuad) do update set answers=excluded.answers,correct_n=excluded.correct_n,total_n=excluded.total_n,por_area=excluded.por_area,por_grado=excluded.por_grado,created_at=now();
  inserted:=inserted+1;
 end loop;
 return inserted;
end $function$;
revoke all on function public.saber_imp_guardar(uuid,jsonb) from public,anon;
grant execute on function public.saber_imp_guardar(uuid,jsonb) to authenticated;
