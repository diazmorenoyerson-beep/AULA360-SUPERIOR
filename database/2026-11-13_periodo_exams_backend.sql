-- AULA360: backend seguro para pruebas de periodo.
-- Tablas, RLS, validación de publicación, sesiones temporizadas y calificación servidor.

create table if not exists public.periodo_pruebas (
 id uuid primary key default gen_random_uuid(),
 teacher_id uuid not null references auth.users(id) on delete cascade,
 colegio_id bigint,
 titulo text not null,
 asignatura text not null,
 grado smallint not null,
 periodo smallint not null check(periodo between 1 and 4),
 minutos integer not null default 60 check(minutos between 5 and 300),
 max_intentos integer not null default 1 check(max_intentos between 1 and 5),
 abre timestamptz,
 cierra timestamptz,
 estado text not null default 'borrador' check(estado in ('borrador','publicada','cerrada')),
 created_at timestamptz not null default now(),
 constraint periodo_pruebas_window_ck check(abre is null or cierra is null or abre<cierra),
 constraint periodo_pruebas_title_ck check(char_length(trim(titulo)) between 1 and 160)
);
create table if not exists public.periodo_items (
 id uuid primary key default gen_random_uuid(),
 prueba_id uuid not null references public.periodo_pruebas(id) on delete cascade,
 pos integer not null check(pos>0),
 question_id uuid not null references public.questions(id) on delete restrict,
 unique(prueba_id,pos), unique(prueba_id,question_id)
);
create table if not exists public.periodo_targets (
 prueba_id uuid not null references public.periodo_pruebas(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 primary key(prueba_id,course_id)
);
create table if not exists public.periodo_intentos (
 id uuid primary key default gen_random_uuid(),
 prueba_id uuid not null references public.periodo_pruebas(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 correct integer not null default 0 check(correct>=0),
 total integer not null default 0 check(total>=0),
 score numeric(6,2) not null default 0 check(score between 0 and 100),
 answers jsonb not null default '{}'::jsonb,
 started_at timestamptz not null default now(),
 submitted_at timestamptz,
 seconds_used integer not null default 0 check(seconds_used>=0),
 automatic boolean not null default false,
 created_at timestamptz not null default now()
);
do $
begin
 if not exists(select 1 from pg_constraint where conrelid='public.periodo_intentos'::regclass and conname='periodo_intentos_user_profile_fkey') then
  alter table public.periodo_intentos add constraint periodo_intentos_user_profile_fkey foreign key(user_id) references public.profiles(id) on delete cascade;
 end if;
end $;
create index if not exists periodo_pruebas_teacher_idx on public.periodo_pruebas(teacher_id,created_at desc);
create index if not exists periodo_targets_course_idx on public.periodo_targets(course_id,prueba_id);
create index if not exists periodo_intentos_student_idx on public.periodo_intentos(user_id,prueba_id,created_at desc);
create index if not exists periodo_intentos_test_idx on public.periodo_intentos(prueba_id,created_at desc);
create unique index if not exists periodo_intentos_one_active_idx on public.periodo_intentos(prueba_id,user_id) where submitted_at is null;

alter table public.periodo_pruebas enable row level security;
alter table public.periodo_items enable row level security;
alter table public.periodo_targets enable row level security;
alter table public.periodo_intentos enable row level security;

create or replace function public.periodo_is_target(p_prueba uuid,p_course uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.periodo_targets t where t.prueba_id=p_prueba and t.course_id=p_course) $$;
revoke all on function public.periodo_is_target(uuid,uuid) from public,anon;
grant execute on function public.periodo_is_target(uuid,uuid) to authenticated;

drop policy if exists periodo_tests_read_scope on public.periodo_pruebas;
create policy periodo_tests_read_scope on public.periodo_pruebas for select to authenticated using (
 teacher_id=auth.uid()
 or (colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
 or (estado='publicada' and exists(select 1 from public.profiles s where s.id=auth.uid() and public.periodo_is_target(periodo_pruebas.id,s.course_id)))
);
drop policy if exists periodo_tests_insert_teacher on public.periodo_pruebas;
create policy periodo_tests_insert_teacher on public.periodo_pruebas for insert to authenticated with check (
 teacher_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.teacher_status='aprobado' and p.role in ('prof','rector','coordinador') and (colegio_id is not distinct from p.colegio_id))
);
drop policy if exists periodo_tests_update_teacher on public.periodo_pruebas;
create policy periodo_tests_update_teacher on public.periodo_pruebas for update to authenticated using (
 teacher_id=auth.uid() or (colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
) with check (
 teacher_id=auth.uid() or (colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
);
drop policy if exists periodo_tests_delete_teacher on public.periodo_pruebas;
create policy periodo_tests_delete_teacher on public.periodo_pruebas for delete to authenticated using (
 teacher_id=auth.uid() or (colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
);

drop policy if exists periodo_items_read_scope on public.periodo_items;
create policy periodo_items_read_scope on public.periodo_items for select to authenticated using (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and (
 p.teacher_id=auth.uid() or (p.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
 or (p.estado='publicada' and exists(select 1 from public.periodo_targets t join public.profiles s on s.course_id=t.course_id where t.prueba_id=p.id and s.id=auth.uid()))
 ))
);
drop policy if exists periodo_items_manage_teacher on public.periodo_items;
create policy periodo_items_manage_teacher on public.periodo_items for all to authenticated using (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and p.teacher_id=auth.uid() and p.estado='borrador')
) with check (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and p.teacher_id=auth.uid() and p.estado='borrador')
);

drop policy if exists periodo_targets_read_scope on public.periodo_targets;
create policy periodo_targets_read_scope on public.periodo_targets for select to authenticated using (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and (
 p.teacher_id=auth.uid() or (p.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
 or (p.estado='publicada' and exists(select 1 from public.profiles s where s.id=auth.uid() and s.course_id=periodo_targets.course_id and public.periodo_is_target(p.id,s.course_id)))
 ))
);
drop policy if exists periodo_targets_manage_teacher on public.periodo_targets;
create policy periodo_targets_manage_teacher on public.periodo_targets for all to authenticated using (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and p.teacher_id=auth.uid() and p.estado='borrador')
) with check (
 exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and p.teacher_id=auth.uid() and p.estado='borrador')
 and exists(select 1 from public.courses c join public.periodo_pruebas p on p.id=prueba_id where c.id=course_id and c.grade=p.grado and (c.teacher_id=p.teacher_id or (public.aula360_my_role() in ('rector','coordinador') and c.colegio_id=p.colegio_id and p.colegio_id is not null)))
);

drop policy if exists periodo_attempts_read_scope on public.periodo_intentos;
create policy periodo_attempts_read_scope on public.periodo_intentos for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.periodo_pruebas p where p.id=prueba_id and (
 p.teacher_id=auth.uid() or (p.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
 ))
);
revoke all on public.periodo_intentos from anon,authenticated;
grant select on public.periodo_intentos to authenticated;
revoke all on public.periodo_pruebas,public.periodo_items,public.periodo_targets from anon;
grant select,insert,update,delete on public.periodo_pruebas,public.periodo_items,public.periodo_targets to authenticated;

create or replace function public.periodo_set_owner()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare p public.profiles%rowtype;
begin
 select * into p from public.profiles where id=auth.uid();
 if auth.uid() is null or p.id is null or p.teacher_status<>'aprobado' or p.role not in ('prof','rector','coordinador') then raise exception 'No autorizado para crear pruebas'; end if;
 new.teacher_id:=auth.uid(); new.colegio_id:=p.colegio_id; return new;
end $$;
drop trigger if exists periodo_set_owner_trg on public.periodo_pruebas;
create trigger periodo_set_owner_trg before insert on public.periodo_pruebas for each row execute function public.periodo_set_owner();

create or replace function public.periodo_guard_publish()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
begin
 if old.estado<>'borrador' and (
  new.titulo is distinct from old.titulo or new.asignatura is distinct from old.asignatura or
  new.grado is distinct from old.grado or new.periodo is distinct from old.periodo or
  new.minutos is distinct from old.minutos or new.max_intentos is distinct from old.max_intentos or
  new.abre is distinct from old.abre or new.cierra is distinct from old.cierra
 ) then raise exception 'Una prueba publicada no puede cambiar su contenido ni programación'; end if;
 if new.estado='publicada' then
  if not exists(select 1 from public.periodo_targets t where t.prueba_id=new.id) then raise exception 'Asigna al menos un curso antes de publicar'; end if;
  if not exists(select 1 from public.periodo_items i where i.prueba_id=new.id) then raise exception 'Agrega preguntas antes de publicar'; end if;
  if exists(select 1 from public.periodo_targets t join public.courses c on c.id=t.course_id where t.prueba_id=new.id and c.grade<>new.grado) then raise exception 'Todos los cursos deben ser del mismo grado de las preguntas'; end if;
  if exists(select 1 from public.periodo_items i join public.questions q on q.id=i.question_id left join public.question_keys k on k.question_id=q.id where i.prueba_id=new.id and (q.grade<>new.grado or q.status<>'published' or not q.active or k.question_id is null or k.correct<0 or k.correct>=cardinality(q.options))) then raise exception 'Hay preguntas que no están publicadas, activas o tienen una clave inválida'; end if;
 end if;
 return new;
end $$;
drop trigger if exists periodo_guard_publish_trg on public.periodo_pruebas;
create trigger periodo_guard_publish_trg before update of estado,titulo,asignatura,grado,periodo,minutos,max_intentos,abre,cierra on public.periodo_pruebas for each row execute function public.periodo_guard_publish();

create or replace function public.periodo_banco(p_subject text,p_grade smallint default null)
returns table(id uuid,body text,options text[],image_path text,stimulus_title text,stimulus_content text,grupo_key text,topic text,difficulty text,grade smallint)
language plpgsql security definer set search_path=public,pg_temp
as $$
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.teacher_status='aprobado' and p.role in ('prof','rector','coordinador')) then raise exception 'No autorizado para consultar el banco'; end if;
 if p_subject is null or length(trim(p_subject))=0 then raise exception 'Selecciona una asignatura'; end if;
 return query select q.id,q.body,q.options,q.image_path,q.stimulus_title,q.stimulus_content,null::text,null::text,null::text,q.grade
 from public.questions q where q.subject=p_subject and q.status='published' and q.active
 and (p_grade is null or q.grade=p_grade)
 and exists(select 1 from public.question_keys k where k.question_id=q.id and k.correct>=0 and k.correct<cardinality(q.options))
 order by q.created_at desc;
end $$;

create or replace function public.periodo_preguntas(p_prueba uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare u uuid:=auth.uid(); s public.profiles%rowtype; p public.periodo_pruebas%rowtype; a public.periodo_intentos%rowtype; qs jsonb;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 select * into s from public.profiles where id=u;
 if s.role<>'est' or s.teacher_status<>'aprobado' then raise exception 'Solo estudiantes activos pueden presentar pruebas'; end if;
 select * into p from public.periodo_pruebas where id=p_prueba and estado='publicada';
 if not found then raise exception 'La prueba no está disponible'; end if;
 if not exists(select 1 from public.periodo_targets t where t.prueba_id=p.id and t.course_id=s.course_id) then raise exception 'Esta prueba no está asignada a tu curso'; end if;
 if exists(select 1 from public.periodo_items i join public.questions q on q.id=i.question_id left join public.question_keys k on k.question_id=q.id where i.prueba_id=p.id and (q.status<>'published' or not q.active or k.question_id is null or k.correct<0 or k.correct>=cardinality(q.options))) then raise exception 'La prueba contiene preguntas sin clave válida; contacta a tu docente'; end if;
 if p.abre is not null and now()<p.abre then raise exception 'La prueba todavía no está abierta'; end if;
 if p.cierra is not null and now()>p.cierra then raise exception 'El plazo de esta prueba terminó'; end if;
 select * into a from public.periodo_intentos where prueba_id=p.id and user_id=u and submitted_at is null for update;
 if not found then
  if (select count(*) from public.periodo_intentos x where x.prueba_id=p.id and x.user_id=u and x.submitted_at is not null)>=p.max_intentos then raise exception 'Ya agotaste los intentos permitidos'; end if;
  insert into public.periodo_intentos(prueba_id,user_id,total,started_at) select p.id,u,count(*),now() from public.periodo_items where prueba_id=p.id returning * into a;
 end if;
 select jsonb_agg(jsonb_build_object('id',q.id,'body',q.body,'options',q.options,'image_path',q.image_path,'stimulus_title',q.stimulus_title,'stimulus_content',q.stimulus_content,'grupo_key',null,'grade',q.grade) order by i.pos)
 into qs from public.periodo_items i join public.questions q on q.id=i.question_id where i.prueba_id=p.id;
 if coalesce(jsonb_array_length(qs),0)=0 then raise exception 'La prueba no tiene preguntas'; end if;
 return jsonb_build_object('prueba',jsonb_build_object('id',p.id,'titulo',p.titulo,'minutos',p.minutos,'started_at',a.started_at,'expires_at',a.started_at+make_interval(mins=>p.minutos),'answers',a.answers),'preguntas',qs);
end $$;

create or replace function public.periodo_guardar_respuestas(p_prueba uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare u uuid:=auth.uid(); a public.periodo_intentos%rowtype; p public.periodo_pruebas%rowtype; k text; v integer; opts integer;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 if jsonb_typeof(p_answers)<>'object' then raise exception 'Formato de respuestas inválido'; end if;
 select * into p from public.periodo_pruebas where id=p_prueba and estado='publicada';
 if not found then raise exception 'La prueba no está disponible'; end if;
 select * into a from public.periodo_intentos where prueba_id=p.id and user_id=u and submitted_at is null for update;
 if not found then raise exception 'No hay un intento activo'; end if;
 if now()>a.started_at+make_interval(mins=>p.minutos) then raise exception 'El tiempo terminó'; end if;
 for k in select jsonb_object_keys(p_answers) loop
  select cardinality(q.options) into opts from public.periodo_items i join public.questions q on q.id=i.question_id where i.prueba_id=p.id and i.question_id::text=k;
  if opts is null then raise exception 'Respuesta de pregunta ajena a esta prueba'; end if;
  if jsonb_typeof(p_answers->k)<>'number' then raise exception 'Respuesta inválida'; end if;
  v:=(p_answers->>k)::integer;
  if v<0 or v>=opts then raise exception 'Opción fuera de rango'; end if;
 end loop;
 update public.periodo_intentos set answers=p_answers where id=a.id;
 return jsonb_build_object('saved',true,'expires_at',a.started_at+make_interval(mins=>p.minutos));
end $$;

create or replace function public.periodo_enviar(p_prueba uuid,p_answers jsonb,p_seconds integer default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare u uuid:=auth.uid(); a public.periodo_intentos%rowtype; p public.periodo_pruebas%rowtype; n integer; c integer; lim timestamptz; ans jsonb; ky jsonb:='{}'::jsonb; ex jsonb:='{}'::jsonb; it record; v integer; used integer; auto boolean;
begin
 if u is null then raise exception 'Debes iniciar sesión'; end if;
 if jsonb_typeof(p_answers)<>'object' then raise exception 'Formato de respuestas inválido'; end if;
 select * into p from public.periodo_pruebas where id=p_prueba;
 if not found then raise exception 'Prueba inexistente'; end if;
 select * into a from public.periodo_intentos where prueba_id=p.id and user_id=u and submitted_at is null for update;
 if not found then raise exception 'No hay un intento activo para esta prueba'; end if;
 lim:=a.started_at+make_interval(mins=>p.minutos);
 if now()>lim then p_answers:=a.answers; end if;
 if exists(select 1 from jsonb_object_keys(p_answers) k where not exists(select 1 from public.periodo_items i where i.prueba_id=p.id and i.question_id::text=k)) then raise exception 'La entrega contiene preguntas que no pertenecen a esta prueba'; end if;
 if exists(select 1 from public.periodo_items i join public.questions q on q.id=i.question_id left join public.question_keys k on k.question_id=q.id where i.prueba_id=p.id and (k.question_id is null or k.correct<0 or k.correct>=cardinality(q.options))) then raise exception 'No se puede calificar: faltan claves de respuesta válidas'; end if;
 n:=0;c:=0;
 for it in select i.question_id,k.correct,k.explanation,q.options from public.periodo_items i join public.question_keys k on k.question_id=i.question_id join public.questions q on q.id=i.question_id where i.prueba_id=p.id order by i.pos loop
  n:=n+1;
  v:=case when p_answers ? it.question_id::text and jsonb_typeof(p_answers->it.question_id::text)='number' then (p_answers->>it.question_id::text)::integer else null end;
  if v is not null and (v<0 or v>=cardinality(it.options)) then raise exception 'Una respuesta contiene una opción inválida'; end if;
  if v=it.correct then c:=c+1; end if;
  ky:=ky||jsonb_build_object(it.question_id::text,it.correct);
  if it.explanation is not null then ex:=ex||jsonb_build_object(it.question_id::text,it.explanation); end if;
 end loop;
 if n=0 then raise exception 'La prueba no tiene preguntas calificables'; end if;
 used:=greatest(0,least(p.minutos*60,extract(epoch from (now()-a.started_at))::integer));
 auto:=now()>lim; ans:=p_answers;
 update public.periodo_intentos set answers=ans,correct=c,total=n,score=round(c*100.0/n,2),seconds_used=used,automatic=auto,submitted_at=now() where id=a.id;
 return jsonb_build_object('score',round(c*100.0/n,2),'correct',c,'total',n,'key',ky,'exp',ex,'ans',ans,'automatic',auto);
end $$;

revoke all on function public.periodo_banco(text,smallint) from public,anon;
revoke all on function public.periodo_preguntas(uuid) from public,anon;
revoke all on function public.periodo_guardar_respuestas(uuid,jsonb) from public,anon;
revoke all on function public.periodo_enviar(uuid,jsonb,integer) from public,anon;
grant execute on function public.periodo_banco(text,smallint) to authenticated;
grant execute on function public.periodo_preguntas(uuid) to authenticated;
grant execute on function public.periodo_guardar_respuestas(uuid,jsonb) to authenticated;
grant execute on function public.periodo_enviar(uuid,jsonb,integer) to authenticated;
-- Estas funciones solo se invocan como triggers; no deben exponerse como RPC.
revoke all on function public.periodo_guard_publish() from public,anon,authenticated;
revoke all on function public.periodo_set_owner() from public,anon,authenticated;
