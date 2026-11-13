-- AULA360 SUPERIOR: backend seguro de simulacros generales en línea.
-- Las sesiones, el reloj y las respuestas viven en el servidor. No se exponen claves al estudiante.

create table public.simulacros (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references public.profiles(id) on delete restrict,
 title text not null check (char_length(btrim(title)) between 3 and 140),
 description text not null default '' check (char_length(description)<=1000),
 grade smallint not null check (grade between 6 and 11),
 subject text not null check (char_length(btrim(subject)) between 2 and 80),
 n_questions integer not null check (n_questions between 1 and 200),
 minutes_per_question numeric(6,2) not null default 1 check (minutes_per_question>0 and minutes_per_question<=10),
 max_attempts integer not null default 1 check (max_attempts between 1 and 20),
 due_at timestamptz, active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.simulacro_targets (
 simulacro_id uuid not null references public.simulacros(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(simulacro_id,course_id)
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(),
 simulacro_id uuid not null references public.simulacros(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 grade smallint not null, subject text not null,
 respuestas jsonb not null default '{}'::jsonb,
 score numeric(5,2) not null check(score between 0 and 100),
 correct integer not null check(correct>=0),
 total integer not null check(total>0 and correct<=total),
 seconds_used integer not null default 0 check(seconds_used>=0),
 auto boolean not null default false, created_at timestamptz not null default now()
);
create table public.general_sim_runs (
 id uuid primary key default gen_random_uuid(),
 simulacro_id uuid not null references public.simulacros(id) on delete restrict,
 user_id uuid not null references public.profiles(id) on delete restrict,
 question_ids uuid[] not null, answers jsonb not null default '{}'::jsonb,
 started_at timestamptz not null default now(), expires_at timestamptz not null,
 duration_seconds integer not null check(duration_seconds>0),
 submitted_at timestamptz, created_at timestamptz not null default now(),
 constraint general_sim_runs_questions_nonempty check(cardinality(question_ids)>0)
);
create unique index general_sim_runs_one_active_idx on public.general_sim_runs(simulacro_id,user_id) where submitted_at is null;
create index simulacros_teacher_created_idx on public.simulacros(teacher_id,created_at desc);
create index simulacro_targets_course_idx on public.simulacro_targets(course_id);
create index attempts_user_sim_idx on public.attempts(user_id,simulacro_id,created_at desc);
create index attempts_sim_created_idx on public.attempts(simulacro_id,created_at desc);
create index general_sim_runs_user_idx on public.general_sim_runs(user_id,simulacro_id);

alter table public.simulacros enable row level security;
alter table public.simulacro_targets enable row level security;
alter table public.attempts enable row level security;
alter table public.general_sim_runs enable row level security;

create policy simulacros_teacher_select on public.simulacros for select to authenticated using(teacher_id=(select auth.uid()));
create policy simulacros_target_student_select on public.simulacros for select to authenticated using(active and exists(select 1 from public.simulacro_targets t join public.profiles p on p.course_id=t.course_id where t.simulacro_id=simulacros.id and p.id=(select auth.uid()) and p.role='est'));
create policy simulacros_teacher_insert on public.simulacros for insert to authenticated with check(teacher_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='prof'));
create policy simulacros_teacher_update on public.simulacros for update to authenticated using(teacher_id=(select auth.uid())) with check(teacher_id=(select auth.uid()));
create policy simulacros_teacher_delete on public.simulacros for delete to authenticated using(teacher_id=(select auth.uid()));
create policy simulacro_targets_teacher_select on public.simulacro_targets for select to authenticated using(exists(select 1 from public.simulacros s where s.id=simulacro_id and s.teacher_id=(select auth.uid())));
create policy simulacro_targets_student_select on public.simulacro_targets for select to authenticated using(exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='est' and p.course_id=simulacro_targets.course_id));
create policy simulacro_targets_teacher_insert on public.simulacro_targets for insert to authenticated with check(exists(select 1 from public.simulacros s join public.courses c on c.id=course_id where s.id=simulacro_id and s.teacher_id=(select auth.uid()) and c.teacher_id=(select auth.uid())));
create policy simulacro_targets_teacher_delete on public.simulacro_targets for delete to authenticated using(exists(select 1 from public.simulacros s where s.id=simulacro_id and s.teacher_id=(select auth.uid())));
create policy attempts_student_select_own on public.attempts for select to authenticated using(user_id=(select auth.uid()));
create policy attempts_teacher_select_own_courses on public.attempts for select to authenticated using(exists(select 1 from public.simulacros s join public.simulacro_targets t on t.simulacro_id=s.id join public.courses c on c.id=t.course_id where s.id=attempts.simulacro_id and s.teacher_id=(select auth.uid()) and c.teacher_id=(select auth.uid())));

revoke all on public.simulacros,public.simulacro_targets,public.attempts,public.general_sim_runs from anon,authenticated;
grant select,insert,update,delete on public.simulacros to authenticated;
grant select,insert,delete on public.simulacro_targets to authenticated;
grant select on public.attempts to authenticated;
revoke all on public.general_sim_runs from anon,authenticated;

create or replace function public.start_general_sim(p_sim uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); prof public.profiles%rowtype; sim public.simulacros%rowtype;
 run public.general_sim_runs%rowtype; picked uuid[]; qn integer; secs integer; qs jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 select * into prof from public.profiles where id=uid;
 if prof.role<>'est' or prof.course_id is null then raise exception 'Solo estudiantes asignados a un curso pueden presentar'; end if;
 select s.* into sim from public.simulacros s join public.simulacro_targets t on t.simulacro_id=s.id
 where s.id=p_sim and t.course_id=prof.course_id and s.active for update of s;
 if not found then raise exception 'Simulacro no disponible para tu curso'; end if;
 if sim.due_at is not null and sim.due_at<now() then raise exception 'El plazo de este simulacro terminó'; end if;
 select * into run from public.general_sim_runs where simulacro_id=p_sim and user_id=uid and submitted_at is null for update;
 if found then
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'part',q.competency,'body',q.body,'options',q.options,'image_path',q.image_path,'stimulus_title',q.stimulus_title,'stimulus_content',q.stimulus_content) order by array_position(run.question_ids,q.id)),'[]'::jsonb)
  into qs from public.questions q where q.id=any(run.question_ids);
  return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,'seconds_left',greatest(0,ceil(extract(epoch from(run.expires_at-now())))::integer),'duration_seconds',run.duration_seconds,'resumed',true,'answers',run.answers,'questions',qs);
 end if;
 if (select count(*) from public.attempts a where a.simulacro_id=p_sim and a.user_id=uid)>=sim.max_attempts then raise exception 'Ya agotaste los intentos permitidos'; end if;
 select count(*) into qn from public.questions q join public.question_keys k on k.question_id=q.id where q.grade=sim.grade and q.subject=sim.subject and q.active and q.status='published' and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0);
 if qn<sim.n_questions then raise exception 'Banco insuficiente: se necesitan preguntas publicadas con clave válida'; end if;
 select array_agg(x.id) into picked from(select q.id from public.questions q join public.question_keys k on k.question_id=q.id where q.grade=sim.grade and q.subject=sim.subject and q.active and q.status='published' and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0) order by random() limit sim.n_questions)x;
 secs:=greatest(60,ceil(sim.n_questions*sim.minutes_per_question*60)::integer);
 insert into public.general_sim_runs(simulacro_id,user_id,question_ids,expires_at,duration_seconds) values(p_sim,uid,picked,now()+make_interval(secs=>secs),secs) returning * into run;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'part',q.competency,'body',q.body,'options',q.options,'image_path',q.image_path,'stimulus_title',q.stimulus_title,'stimulus_content',q.stimulus_content) order by array_position(picked,q.id)),'[]'::jsonb)
 into qs from public.questions q where q.id=any(picked);
 return jsonb_build_object('run_id',run.id,'started_at',run.started_at,'expires_at',run.expires_at,'seconds_left',secs,'duration_seconds',secs,'resumed',false,'answers','{}'::jsonb,'questions',qs);
end $$;

create or replace function public.save_general_sim_answers(p_run uuid,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); run public.general_sim_runs%rowtype; k text; opt_n integer;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' then raise exception 'Respuestas inválidas'; end if;
 select * into run from public.general_sim_runs where id=p_run and user_id=uid and submitted_at is null for update;
 if not found then raise exception 'La sesión no está activa o no te pertenece'; end if;
 if now()>=run.expires_at then raise exception 'El tiempo terminó; se calificará el último guardado del servidor'; end if;
 for k in select jsonb_object_keys(p_answers) loop
  if not(k::uuid=any(run.question_ids)) then raise exception 'Respuesta ajena al simulacro'; end if;
  if jsonb_typeof(p_answers->k) not in('number','null') then raise exception 'Formato de respuesta inválido'; end if;
  if jsonb_typeof(p_answers->k)='number' then
   select coalesce(array_length(q.options,1),0) into opt_n from public.questions q where q.id=k::uuid;
   if (p_answers->>k)::numeric<>trunc((p_answers->>k)::numeric) or (p_answers->>k)::numeric<0 or (p_answers->>k)::numeric>=opt_n then raise exception 'Opción seleccionada inválida'; end if;
  end if;
 end loop;
 update public.general_sim_runs set answers=p_answers where id=run.id;
 return jsonb_build_object('saved',true,'saved_at',now(),'expires_at',run.expires_at);
end $$;

create or replace function public.submit_general_sim(p_run uuid,p_auto boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); run public.general_sim_runs%rowtype; sim public.simulacros%rowtype;
 prof public.profiles%rowtype; q record; a integer; c integer:=0; n integer; sec integer;
 key_json jsonb:='{}'::jsonb; exp_json jsonb:='{}'::jsonb; ans_json jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 select * into prof from public.profiles where id=uid;
 if prof.role<>'est' then raise exception 'Solo estudiantes pueden enviar simulacros'; end if;
 select * into run from public.general_sim_runs where id=p_run and user_id=uid and submitted_at is null for update;
 if not found then raise exception 'La sesión no está activa o ya fue enviada'; end if;
 select * into sim from public.simulacros where id=run.simulacro_id for update;
 ans_json:=coalesce(run.answers,'{}'::jsonb); n:=cardinality(run.question_ids);
 if n=0 then raise exception 'Simulacro sin preguntas'; end if;
 for q in select x.id,k.correct,k.explanation from unnest(run.question_ids) with ordinality x(id,ord) join public.question_keys k on k.question_id=x.id join public.questions qu on qu.id=x.id order by x.ord loop
  a:=null;
  if ans_json?q.id::text and jsonb_typeof(ans_json->q.id::text)='number' then a:=(ans_json->>q.id::text)::integer; end if;
  if a=q.correct then c:=c+1; end if;
  key_json:=jsonb_set(key_json,array[q.id::text],to_jsonb(q.correct),true);
  if q.explanation is not null then exp_json:=jsonb_set(exp_json,array[q.id::text],to_jsonb(q.explanation),true); end if;
 end loop;
 if (select count(*) from unnest(run.question_ids)x(id) join public.question_keys k on k.question_id=x.id)<>n then raise exception 'No se puede calificar: falta una clave de respuesta'; end if;
 sec:=greatest(0,least(run.duration_seconds,ceil(extract(epoch from(now()-run.started_at)))::integer));
 insert into public.attempts(simulacro_id,user_id,grade,subject,respuestas,score,correct,total,seconds_used,auto)
 values(run.simulacro_id,uid,sim.grade,sim.subject,ans_json,round(100.0*c/n,2),c,n,sec,coalesce(p_auto,false) or now()>=run.expires_at);
 update public.general_sim_runs set submitted_at=now() where id=run.id;
 return jsonb_build_object('score',round(100.0*c/n,2),'correct',c,'total',n,'ans',ans_json,'key',key_json,'exp',exp_json,'auto',coalesce(p_auto,false) or now()>=run.expires_at);
end $$;
revoke all on function public.start_general_sim(uuid) from public,anon;
revoke all on function public.save_general_sim_answers(uuid,jsonb) from public,anon;
revoke all on function public.submit_general_sim(uuid,boolean) from public,anon;
grant execute on function public.start_general_sim(uuid) to authenticated;
grant execute on function public.save_general_sim_answers(uuid,jsonb) to authenticated;
grant execute on function public.submit_general_sim(uuid,boolean) to authenticated;
