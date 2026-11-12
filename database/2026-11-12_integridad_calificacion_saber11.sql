-- AULA360 · Integridad de calificación Saber 11
-- Fecha: 2026-11-12
-- Impide guardar intentos con claves faltantes/invalidas y respuestas ajenas
-- a la sesión. No inserta ni modifica intentos existentes.

create or replace function public.saber_submit(
 p_sim uuid, p_sesion integer, p_answers jsonb, p_seconds integer, p_auto boolean
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
 uid uuid:=auth.uid();
 sim public.saber_sims%rowtype;
 prof public.profiles%rowtype;
 total_n integer;
 key_n integer;
 correct_n integer:=0;
 pa jsonb:='{}'::jsonb;
 keys jsonb:='{}'::jsonb;
 exps jsonb:='{}'::jsonb;
 rec record;
 ans integer;
 good boolean;
 area_obj jsonb;
 answer_key text;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 if jsonb_typeof(coalesce(p_answers,'{}'::jsonb))<>'object' then
   raise exception 'Respuestas inválidas';
 end if;
 if p_seconds is null or p_seconds<0 or p_seconds>16200 then
   raise exception 'Tiempo de presentación inválido';
 end if;
 select * into prof from public.profiles where id=uid;
 if prof.role<>'est' or prof.course_id is null then
   raise exception 'Solo estudiantes asignados a un curso pueden presentar';
 end if;
 select s.* into sim
 from public.saber_sims s
 join public.saber_sim_targets t on t.sim_id=s.id
 where s.id=p_sim and t.course_id=prof.course_id and s.active
 for update of s;
 if not found then raise exception 'Simulacro no disponible para tu curso'; end if;
 if sim.due_at is not null and sim.due_at<now() then
   raise exception 'El plazo de este simulacro terminó';
 end if;
 if p_sesion not in (1,2) or
   (sim.modo='sesion1' and p_sesion<>1) or
   (sim.modo='sesion2' and p_sesion<>2) then
   raise exception 'Sesión no habilitada';
 end if;
 if (select count(*) from public.saber_attempts a
     where a.sim_id=p_sim and a.user_id=uid and a.sesion=p_sesion)>=sim.max_attempts then
   raise exception 'Ya agotaste los intentos de esta sesión';
 end if;
 select count(*) into total_n from public.saber_sim_items
 where sim_id=p_sim and sesion=p_sesion;
 if total_n=0 then raise exception 'Esta sesión no tiene preguntas disponibles'; end if;
 select count(*) into key_n
 from public.saber_sim_items i
 join public.question_keys k on k.question_id=i.question_id
 join public.questions q on q.id=i.question_id
 where i.sim_id=p_sim and i.sesion=p_sesion
   and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0);
 if key_n<>total_n then
   raise exception 'No se puede calificar: hay preguntas sin clave válida. Informa a tu docente.';
 end if;
 for answer_key in select jsonb_object_keys(coalesce(p_answers,'{}'::jsonb))
 loop
   if not exists (
     select 1 from public.saber_sim_items i
     where i.sim_id=p_sim and i.sesion=p_sesion
       and i.question_id::text=answer_key
   ) then
     raise exception 'Se recibió una respuesta que no pertenece a esta sesión';
   end if;
   if jsonb_typeof(p_answers->answer_key) not in ('number','null') then
     raise exception 'Formato de respuesta inválido';
   end if;
   if jsonb_typeof(p_answers->answer_key)='number' then
     if (p_answers->>answer_key)::numeric <> trunc((p_answers->>answer_key)::numeric)
       or (p_answers->>answer_key)::numeric<0
       or (p_answers->>answer_key)::numeric >= (
         select coalesce(array_length(q.options,1),0)
         from public.questions q
         where q.id=answer_key::uuid
       ) then
       raise exception 'La opción seleccionada no es válida';
     end if;
   end if;
 end loop;
 for rec in
   select i.question_id,i.area,k.correct,k.explanation
   from public.saber_sim_items i
   join public.question_keys k on k.question_id=i.question_id
   join public.questions q on q.id=i.question_id
   where i.sim_id=p_sim and i.sesion=p_sesion
   order by i.orden
 loop
   ans:=null;
   if p_answers ? rec.question_id::text
      and jsonb_typeof(p_answers->rec.question_id::text)='number' then
     ans:=(p_answers->>rec.question_id::text)::int;
   end if;
   good:=ans=rec.correct;
   if good then correct_n:=correct_n+1; end if;
   area_obj:=coalesce(pa->rec.area,'{"c":0,"t":0}'::jsonb);
   area_obj:=jsonb_build_object(
     'c',(area_obj->>'c')::int+case when good then 1 else 0 end,
     't',(area_obj->>'t')::int+1
   );
   pa:=jsonb_set(pa,array[rec.area],area_obj,true);
   keys:=jsonb_set(keys,array[rec.question_id::text],to_jsonb(rec.correct),true);
   if rec.explanation is not null then
     exps:=jsonb_set(exps,array[rec.question_id::text],to_jsonb(rec.explanation),true);
   end if;
 end loop;
 insert into public.saber_attempts(
   sim_id,user_id,sesion,respuestas,por_area,correct,total,seconds_used,auto
 ) values (
   p_sim,uid,p_sesion,coalesce(p_answers,'{}'::jsonb),pa,correct_n,total_n,p_seconds,coalesce(p_auto,false)
 );
 return jsonb_build_object('correct',correct_n,'total',total_n,'por_area',pa,'key',keys,'exp',exps);
end
$function$;

-- Verificación de permisos esperados:
-- anon: sin EXECUTE; authenticated: EXECUTE (la función valida rol est y curso).
