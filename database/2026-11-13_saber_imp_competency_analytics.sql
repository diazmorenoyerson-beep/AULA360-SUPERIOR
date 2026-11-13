alter table public.saber_imp_results
  add column if not exists por_competencia jsonb not null default '{}'::jsonb;

-- Recalcula el agregado de competencia usando las claves del servidor.
-- Conserva las validaciones de identidad, matrícula, cuadernillo y payload existentes.
create or replace function public.saber_imp_guardar(p_imp uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
 u uuid:=auth.uid(); rec jsonb; rid bigint; cu smallint; ans jsonb;
 totaln integer; correctn integer; pa jsonb; pg jsonb; pc jsonb;
 inserted integer:=0; answer_key text; answer_value jsonb;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.saber_imp i where i.id=p_imp and (
   (i.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
   or i.teacher_id=auth.uid() or public.aula360_is_admin()
 )) then raise exception 'No autorizado'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Lote inválido'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) x group by (x->>'roster_id'),(x->>'cuad') having count(*)>1) then
   raise exception 'El lote contiene hojas duplicadas del mismo estudiante y cuadernillo';
 end if;
 for rec in select value from jsonb_array_elements(p_rows) loop
   if coalesce(rec->>'roster_id','') !~ '^[0-9]+$' or coalesce(rec->>'cuad','') !~ '^[1-3]$' or jsonb_typeof(rec->'answers')<>'object' then raise exception 'Hoja inválida'; end if;
   rid:=(rec->>'roster_id')::bigint; cu:=(rec->>'cuad')::smallint; ans:=rec->'answers';
   if not exists(select 1 from public.saber_imp_courses x join public.roster r on r.course_id=x.course_id where x.imp_id=p_imp and r.id=rid) then raise exception 'Estudiante no pertenece a los cursos del simulacro'; end if;
   for answer_key,answer_value in select key,value from jsonb_each(ans) loop
     if answer_key !~ '^[1-9][0-9]*$' or not exists(select 1 from public.saber_imp_items x where x.imp_id=p_imp and x.cuad=cu and x.pos=answer_key::integer) then raise exception 'La hoja contiene una posición que no pertenece al cuadernillo'; end if;
     if answer_value<>'null'::jsonb and (jsonb_typeof(answer_value)<>'number' or answer_value::text !~ '^[0-3]$') then raise exception 'La hoja contiene una respuesta inválida'; end if;
   end loop;
   select count(*),count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::integer=k.correct)
   into totaln,correctn from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu;
   if totaln=0 then raise exception 'Cuadernillo sin preguntas'; end if;
   select coalesce(jsonb_object_agg(area,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) into pa from (
     select x.area,count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::integer=k.correct)::integer c,count(*)::integer t
     from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu group by x.area
   ) z;
   select coalesce(jsonb_object_agg(grado_ref::text,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) into pg from (
     select x.grado_ref,count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::integer=k.correct)::integer c,count(*)::integer t
     from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id where x.imp_id=p_imp and x.cuad=cu group by x.grado_ref
   ) z;
   select coalesce(jsonb_object_agg(competencia,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) into pc from (
     select nullif(btrim(q.competency),'') competencia,
       count(*) filter(where (ans->>x.pos::text) ~ '^[0-3]$' and (ans->>x.pos::text)::integer=k.correct)::integer c,count(*)::integer t
     from public.saber_imp_items x join public.question_keys k on k.question_id=x.question_id join public.questions q on q.id=x.question_id
     where x.imp_id=p_imp and x.cuad=cu and nullif(btrim(q.competency),'') is not null group by nullif(btrim(q.competency),'')
   ) z;
   insert into public.saber_imp_results(imp_id,roster_id,cuad,answers,correct_n,total_n,por_area,por_grado,por_competencia)
   values(p_imp,rid,cu,ans,correctn,totaln,pa,pg,pc)
   on conflict(imp_id,roster_id,cuad) do update set answers=excluded.answers,correct_n=excluded.correct_n,total_n=excluded.total_n,por_area=excluded.por_area,por_grado=excluded.por_grado,por_competencia=excluded.por_competencia,created_at=now();
   inserted:=inserted+1;
 end loop;
 return inserted;
end
$function$;

drop function if exists public.saber_imp_resultados(uuid);
create function public.saber_imp_resultados(p_imp uuid)
returns table(roster_id bigint,name text,document text,course text,por_area jsonb,por_grado jsonb,por_competencia jsonb,cuad smallint,correct_n integer,total_n integer)
language plpgsql security definer set search_path = public, pg_temp
as $function$
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.saber_imp i where i.id=p_imp and (
   (i.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
   or i.teacher_id=u or public.aula360_is_admin()
 )) then raise exception 'No autorizado'; end if;
 return query select r.roster_id,s.full_name,s.document,c.grade::text||'° '||c.name,r.por_area,r.por_grado,r.por_competencia,r.cuad,r.correct_n,r.total_n
 from public.saber_imp_results r join public.roster s on s.id=r.roster_id join public.courses c on c.id=s.course_id
 where r.imp_id=p_imp order by c.grade,c.name,s.full_name,r.cuad;
end
$function$;
revoke all on function public.saber_imp_guardar(uuid,jsonb) from public,anon;
grant execute on function public.saber_imp_guardar(uuid,jsonb) to authenticated;
revoke all on function public.saber_imp_resultados(uuid) from public,anon;
grant execute on function public.saber_imp_resultados(uuid) to authenticated;
