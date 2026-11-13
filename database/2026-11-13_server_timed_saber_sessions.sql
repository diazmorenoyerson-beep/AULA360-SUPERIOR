-- AULA360 PREMIUM · Server-authoritative timer for online Saber 11 sessions.
-- Active sessions survive refreshes; the database controls expiry and recorded time.
-- Safe to reapply.

create table if not exists public.saber_session_runs (
  id uuid primary key default gen_random_uuid(),
  sim_id uuid not null references public.saber_sims(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sesion smallint not null check (sesion in (1,2)),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  duration_seconds integer not null check (duration_seconds>0),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists saber_session_runs_one_active_idx
  on public.saber_session_runs(sim_id,user_id,sesion) where submitted_at is null;
create index if not exists saber_session_runs_user_idx
  on public.saber_session_runs(user_id,sim_id,sesion);
alter table public.saber_session_runs enable row level security;
revoke all on public.saber_session_runs from anon,authenticated;

create or replace function public.saber_begin_session(p_sim uuid,p_sesion integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
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
      'duration_seconds',run.duration_seconds,'resumed',true);
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
    'seconds_left',seconds_n,'duration_seconds',seconds_n,'resumed',false);
end
$$;
grant execute on function public.saber_begin_session(uuid,integer) to authenticated;

do $$
declare d text;
begin
  select pg_get_functiondef('public.saber_submit(uuid,integer,jsonb,integer,boolean)'::regprocedure) into d;
  if position('saber_session_runs' in d)=0 then
    d:=replace(d,
      $q$ prof public.profiles%rowtype;
 total_n integer;$q$,
      $q$ prof public.profiles%rowtype;
 run public.saber_session_runs%rowtype;
 server_seconds integer;
 total_n integer;$q$);
    d:=replace(d,
      $q$ insert into public.saber_attempts(
   sim_id,user_id,sesion,respuestas,por_area,correct,total,seconds_used,auto
 ) values (
   p_sim,uid,p_sesion,coalesce(p_answers,'{}'::jsonb),pa,correct_n,total_n,p_seconds,coalesce(p_auto,false)
 );$q$,
      $q$ select * into run from public.saber_session_runs
   where sim_id=p_sim and user_id=uid and sesion=p_sesion and submitted_at is null
   for update;
 if not found then raise exception 'No hay una sesión activa. Inicia el simulacro nuevamente.'; end if;
 server_seconds:=greatest(0,least(run.duration_seconds,ceil(extract(epoch from (now()-run.started_at)))::integer));
 insert into public.saber_attempts(
   sim_id,user_id,sesion,respuestas,por_area,correct,total,seconds_used,auto
 ) values (
   p_sim,uid,p_sesion,coalesce(p_answers,'{}'::jsonb),pa,correct_n,total_n,server_seconds,
   coalesce(p_auto,false) or now()>=run.expires_at
 );
 update public.saber_session_runs set submitted_at=now() where id=run.id;$q$);
    if position('server_seconds' in d)=0 then raise exception 'No se pudo integrar el cronómetro del servidor'; end if;
    execute d;
  end if;
end $$;
