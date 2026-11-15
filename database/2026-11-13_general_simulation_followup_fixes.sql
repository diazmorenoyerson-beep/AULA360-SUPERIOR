-- Ajustes posteriores al backend inicial de simulacros generales.
alter table public.simulacros add column if not exists kind text not null default 'simulacro' check(kind in ('simulacro','tarea'));
alter table public.simulacros add column if not exists updated_at timestamptz not null default now();

-- Permite reanudar una sesión iniciada antes del cierre aunque la fecha límite ya haya pasado.
create or replace function public.start_general_sim(p_sim uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); prof public.profiles%rowtype; sim public.simulacros%rowtype;
 run public.general_sim_runs%rowtype; picked uuid[]; qn integer; secs integer; qs jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 select * into prof from public.profiles where id=uid;
 if prof.role<>'est' or prof.course_id is null then raise exception 'Solo estudiantes asignados a un curso pueden presentar'; end if;
 select s.* into sim from public.simulacros s join public.simulacro_targets t on t.simulacro_id=s.id
 where s.id=p_sim and t.course_id=prof.course_id and s.active for update of s;
 if not found then raise exception 'Simulacro no disponible para tu curso'; end if;
 select * into run from public.general_sim_runs where simulacro_id=p_sim and user_id=uid and submitted_at is null for update;
 if found then
  if sim.due_at is not null and run.started_at>sim.due_at then raise exception 'La sesión se inició después del cierre del simulacro'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'part',q.competency,'body',q.body,'options',q.options,'image_path',q.image_path,'stimulus_title',q.stimulus_title,'stimulus_content',q.stimulus_content) order by array_position(run.question_ids,q.id)),'[]'::jsonb)
  into qs from public.questions q where q.id=any(run.question_ids);
  return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,'seconds_left',greatest(0,ceil(extract(epoch from(run.expires_at-now())))::integer),'duration_seconds',run.duration_seconds,'resumed',true,'answers',run.answers,'questions',qs);
 end if;
 if sim.due_at is not null and sim.due_at<now() then raise exception 'El plazo de este simulacro terminó'; end if;
 if (select count(*) from public.attempts a where a.simulacro_id=p_sim and a.user_id=uid)>=sim.max_attempts then raise exception 'Ya agotaste los intentos permitidos'; end if;
 select count(*) into qn from public.questions q join public.question_keys k on k.question_id=q.id
 where q.grade=sim.grade and q.subject=sim.subject and q.active and q.status='published' and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0);
 if qn<sim.n_questions then raise exception 'Banco insuficiente: se necesitan preguntas publicadas con clave válida'; end if;
 select array_agg(x.id) into picked from(select q.id from public.questions q join public.question_keys k on k.question_id=q.id
 where q.grade=sim.grade and q.subject=sim.subject and q.active and q.status='published' and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0)
 order by random() limit sim.n_questions)x;
 secs:=greatest(60,ceil(sim.n_questions*sim.minutes_per_question*60)::integer);
 insert into public.general_sim_runs(simulacro_id,user_id,question_ids,expires_at,duration_seconds)
 values(p_sim,uid,picked,now()+make_interval(secs=>secs),secs) returning * into run;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'part',q.competency,'body',q.body,'options',q.options,'image_path',q.image_path,'stimulus_title',q.stimulus_title,'stimulus_content',q.stimulus_content) order by array_position(picked,q.id)),'[]'::jsonb)
 into qs from public.questions q where q.id=any(picked);
 return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,'seconds_left',secs,'duration_seconds',secs,'resumed',false,'answers','{}'::jsonb,'questions',qs);
end $$;
revoke all on function public.start_general_sim(uuid) from public,anon;
grant execute on function public.start_general_sim(uuid) to authenticated;
