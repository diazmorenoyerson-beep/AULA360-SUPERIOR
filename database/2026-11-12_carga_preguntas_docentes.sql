-- AULA360 · Integridad de carga de preguntas por docentes
-- Ejecutado en producción el 2026-11-12. No inserta preguntas de prueba.

alter table public.questions
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists competency text;

create index if not exists questions_author_id_idx on public.questions(author_id);

drop policy if exists questions_teacher_own_read on public.questions;
create policy questions_teacher_own_read
on public.questions for select to authenticated
using (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'prof'
      and p.teacher_status = 'aprobado'
  )
);

create or replace function public.docente_subir_preguntas(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_subject text;
  v_grade smallint;
  v_body text;
  v_options text[];
  v_correct integer;
  v_ext text;
  v_id uuid;
  v_n integer := 0;
  v_before integer := 0;
  v_after integer := 0;
  v_explanation text;
  v_stimulus_title text;
  v_stimulus_content text;
  v_competency text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Envía entre 1 y 100 preguntas por lote.';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.teacher_status <> 'aprobado' or (v_profile.role <> 'prof' and not coalesce(v_profile.is_admin,false)) then
    raise exception 'Solo un docente aprobado puede subir preguntas.';
  end if;

  select count(*) into v_before from public.questions where author_id = v_uid;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Cada pregunta debe ser un objeto válido.'; end if;

    v_subject := nullif(btrim(v_item->>'subject'),'');
    v_grade := nullif(v_item->>'grade','')::smallint;
    v_body := btrim(coalesce(v_item->>'body',''));
    v_competency := nullif(btrim(v_item->>'competency'),'');
    v_explanation := nullif(btrim(v_item->>'explanation'),'');
    v_stimulus_title := nullif(btrim(v_item->>'stimulus_title'),'');
    v_stimulus_content := nullif(btrim(v_item->>'stimulus_content'),'');

    if v_subject is null or v_grade is null or v_grade < 0 or v_grade > 13 then
      raise exception 'Cada pregunta debe tener asignatura y grado válidos.';
    end if;
    if length(v_body) < 10 or length(v_body) > 2000 then raise exception 'El enunciado debe tener entre 10 y 2000 caracteres.'; end if;
    if v_competency is not null and length(v_competency) > 120 then raise exception 'La competencia supera 120 caracteres.'; end if;
    if v_explanation is not null and length(v_explanation) > 2000 then raise exception 'La explicación supera 2000 caracteres.'; end if;
    if v_stimulus_title is not null and length(v_stimulus_title) > 200 then raise exception 'El título del contexto supera 200 caracteres.'; end if;
    if v_stimulus_content is not null and length(v_stimulus_content) > 10000 then raise exception 'El contexto supera 10000 caracteres.'; end if;

    if not coalesce(v_profile.is_admin,false) and (
      not (v_grade = any(v_profile.grados))
      or not exists (
        select 1 from public.asignaturas a
        where a.banco_subject = v_subject
          and a.nombre = any(v_profile.asignaturas)
      )
    ) then
      raise exception 'No tienes asignada esa materia o ese grado.';
    end if;

    if jsonb_typeof(v_item->'options') <> 'array' then raise exception 'Las opciones deben ser una lista.'; end if;
    select array_agg(btrim(value)) into v_options from jsonb_array_elements_text(v_item->'options');
    if coalesce(array_length(v_options,1),0) < 2 or array_length(v_options,1) > 5
       or exists(select 1 from unnest(v_options) x where x = '') then
      raise exception 'Cada pregunta debe tener entre 2 y 5 opciones completas.';
    end if;
    v_correct := (v_item->>'correct')::integer;
    if v_correct < 0 or v_correct >= array_length(v_options,1) then raise exception 'La clave correcta no coincide con las opciones.'; end if;

    v_ext := 'DOC-' || replace(v_uid::text,'-','') || '-' || replace(gen_random_uuid()::text,'-','');
    insert into public.questions(ext_id,grade,subject,body,options,status,active,author_id,competency,stimulus_title,stimulus_content)
    values(v_ext,v_grade,v_subject,v_body,v_options,'draft',false,v_uid,v_competency,v_stimulus_title,v_stimulus_content)
    returning id into v_id;

    insert into public.question_keys(question_id,correct,explanation)
    values(v_id,v_correct,v_explanation);
    v_n := v_n + 1;
  end loop;

  select count(*) into v_after from public.questions where author_id = v_uid;
  return jsonb_build_object('n',v_n,'desde',v_before+1,'hasta',v_after);
end;
$$;

revoke all on function public.docente_subir_preguntas(jsonb) from public, anon;
grant execute on function public.docente_subir_preguntas(jsonb) to authenticated;
