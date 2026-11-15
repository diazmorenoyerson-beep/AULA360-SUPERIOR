-- AULA360: persist Saber 11 timed-session answers on the server.
-- The browser may keep a convenience cache, but the server snapshot is authoritative.
alter table public.saber_session_runs
  add column if not exists answers jsonb not null default '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.saber_save_answers(p_run uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  run public.saber_session_runs%rowtype;
  answer_key text;
begin
  if uid is null then raise exception 'Debes iniciar sesión'; end if;
  if p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception 'Respuestas inválidas'; end if;
  select * into run from public.saber_session_runs
    where id=p_run and user_id=uid and submitted_at is null for update;
  if not found then raise exception 'La sesión no está activa o no te pertenece'; end if;
  if now()>=run.expires_at then raise exception 'El tiempo de esta sesión terminó; se calificarán las respuestas guardadas antes del cierre'; end if;
  for answer_key in select jsonb_object_keys(p_answers)
  loop
    if not exists(select 1 from public.saber_sim_items i where i.sim_id=run.sim_id and i.sesion=run.sesion and i.question_id::text=answer_key) then
      raise exception 'Se recibió una respuesta que no pertenece a esta sesión';
    end if;
    if jsonb_typeof(p_answers->answer_key) not in ('number','null') then raise exception 'Formato de respuesta inválido'; end if;
    if jsonb_typeof(p_answers->answer_key)='number' then
      if (p_answers->>answer_key)::numeric<>trunc((p_answers->>answer_key)::numeric)
        or (p_answers->>answer_key)::numeric<0
        or (p_answers->>answer_key)::numeric >= (
          select coalesce(array_length(q.options,1),0)
          from public.saber_sim_items i join public.questions q on q.id=i.question_id
          where i.sim_id=run.sim_id and i.sesion=run.sesion and i.question_id::text=answer_key
        ) then raise exception 'La opción seleccionada no es válida'; end if;
    end if;
  end loop;
  update public.saber_session_runs set answers=p_answers where id=run.id;
  return jsonb_build_object('saved',true,'saved_at',now(),'expires_at',run.expires_at);
end
$function$
;
revoke all on function public.saber_save_answers(uuid,jsonb) from public,anon;
grant execute on function public.saber_save_answers(uuid,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.saber_begin_session(p_sim uuid, p_sesion integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid:=auth.uid();
  prof public.profiles%rowtype;
  sim public.saber_sims%rowtype;
  run public.saber_session_runs%rowtype;
  qn integer;
  official_n integer;
  seconds_n integer;
begin
  if uid is null then raise exception 'Debes iniciar sesión'; end if;
  select * into prof from public.profiles where id=uid;
  if prof.role<>'est' or prof.course_id is null then raise exception 'Solo estudiantes asignados a un curso pueden presentar'; end if;
  select s.* into sim from public.saber_sims s
    join public.saber_sim_targets t on t.sim_id=s.id
    where s.id=p_sim and t.course_id=prof.course_id and s.active
    for update of s;
  if not found then raise exception 'Simulacro no disponible para tu curso'; end if;
  if sim.due_at is not null and sim.due_at<now() then raise exception 'El plazo de este simulacro terminó'; end if;
  if p_sesion is null or p_sesion not in (1,2) or (sim.modo='sesion1' and p_sesion<>1) or (sim.modo='sesion2' and p_sesion<>2) then
    raise exception 'Sesión no habilitada';
  end if;
  select * into run from public.saber_session_runs
    where sim_id=p_sim and user_id=uid and sesion=p_sesion and submitted_at is null
    for update;
  if found then
    return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,
      'seconds_left',greatest(0,ceil(extract(epoch from (run.expires_at-now())))::integer),
      'duration_seconds',run.duration_seconds,'resumed',true,'answers',coalesce(run.answers,'{}'::jsonb));
  end if;
  if (select count(*) from public.saber_attempts a where a.sim_id=p_sim and a.user_id=uid and a.sesion=p_sesion)>=sim.max_attempts then
    raise exception 'Ya agotaste los intentos de esta sesión';
  end if;
  select count(*) into qn from public.saber_sim_items where sim_id=p_sim and sesion=p_sesion;
  if qn=0 then raise exception 'Esta sesión no tiene preguntas disponibles'; end if;
  official_n:=case p_sesion when 1 then 120 else 134 end;
  seconds_n:=greatest(60,round(270.0*qn/official_n)::integer*60);
  insert into public.saber_session_runs(sim_id,user_id,sesion,expires_at,duration_seconds)
    values(p_sim,uid,p_sesion,now()+make_interval(secs=>seconds_n),seconds_n)
    returning * into run;
  return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,
    'seconds_left',seconds_n,'duration_seconds',seconds_n,'resumed',false,'answers','{}'::jsonb);
end
$function$
;
revoke all on function public.saber_begin_session(uuid,integer) from public,anon;
grant execute on function public.saber_begin_session(uuid,integer) to authenticated;

CREATE OR REPLACE FUNCTION public.saber_submit(p_sim uuid, p_sesion integer, p_answers jsonb, p_seconds integer, p_auto boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 sim public.saber_sims%rowtype;
 prof public.profiles%rowtype;
 run public.saber_session_runs%rowtype;
 server_seconds integer;
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
 saved_answers jsonb:='{}'::jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
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
 if p_sesion not in (1,2) or
   (sim.modo='sesion1' and p_sesion<>1) or
   (sim.modo='sesion2' and p_sesion<>2) then
   raise exception 'Sesión no habilitada';
 end if;
 select * into run from public.saber_session_runs
   where sim_id=p_sim and user_id=uid and sesion=p_sesion and submitted_at is null
   for update;
 if not found then raise exception 'No hay una sesión activa. Inicia el simulacro nuevamente.'; end if;
 if sim.due_at is not null and run.started_at>sim.due_at then raise exception 'La sesión fue iniciada después del cierre del simulacro'; end if;
 saved_answers:=coalesce(run.answers,'{}'::jsonb);
 if jsonb_typeof(saved_answers)<>'object' then raise exception 'Respuestas guardadas inválidas'; end if;
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

 -- Rechaza respuestas ajenas al examen o índices que no correspondan a sus opciones.
 for answer_key in select jsonb_object_keys(saved_answers)
 loop
   if not exists (
     select 1 from public.saber_sim_items i
     join public.questions q on q.id=i.question_id
     where i.sim_id=p_sim and i.sesion=p_sesion
       and i.question_id::text=answer_key
   ) then
     raise exception 'Se recibió una respuesta que no pertenece a esta sesión';
   end if;
   if jsonb_typeof(saved_answers->answer_key) not in ('number','null') then
     raise exception 'Formato de respuesta inválido';
   end if;
   if jsonb_typeof(saved_answers->answer_key)='number' then
     if (saved_answers->>answer_key)::numeric <> trunc((saved_answers->>answer_key)::numeric)
       or (saved_answers->>answer_key)::numeric<0
       or (saved_answers->>answer_key)::numeric >= (
         select coalesce(array_length(q.options,1),0)
         from public.questions q where q.id=answer_key::uuid
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
   if saved_answers ? rec.question_id::text
      and jsonb_typeof(saved_answers->rec.question_id::text)='number' then
     ans:=(saved_answers->>rec.question_id::text)::int;
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

 server_seconds:=greatest(0,least(run.duration_seconds,ceil(extract(epoch from (now()-run.started_at)))::integer));
 insert into public.saber_attempts(
   sim_id,user_id,sesion,respuestas,por_area,correct,total,seconds_used,auto
 ) values (
   p_sim,uid,p_sesion,saved_answers,pa,correct_n,total_n,server_seconds,
   coalesce(p_auto,false) or now()>=run.expires_at
 );
 update public.saber_session_runs set submitted_at=now() where id=run.id;
 return jsonb_build_object('correct',correct_n,'total',total_n,'por_area',pa,'key',keys,'exp',exps,'auto',coalesce(p_auto,false) or now()>=run.expires_at);
end
$function$
;
revoke all on function public.saber_submit(uuid,integer,jsonb,integer,boolean) from public,anon;
grant execute on function public.saber_submit(uuid,integer,jsonb,integer,boolean) to authenticated;
