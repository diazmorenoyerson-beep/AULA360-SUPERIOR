-- AULA360 · Evitar preguntas duplicadas entre sesiones de un mismo simulacro Saber 11
-- Aplicación: Supabase SQL Editor
-- Idempotente sobre la definición existente: añade un filtro a ambos selectores de preguntas.
-- Conserva SECURITY DEFINER, search_path, permisos y toda la lógica actual de create_saber_sim.

do $$
declare
  d text;
  needle text := 'and q.subject=any(source_names)';
  replacement text;
begin
  d := pg_get_functiondef(
    'public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure
  );

  if (length(d)-length(replace(d, needle, '')))/length(needle) <> 2 then
    raise exception 'La definición de create_saber_sim no coincide con la esperada; no se aplicaron cambios';
  end if;

  replacement := needle ||
    ' and not exists (select 1 from public.saber_sim_items si where si.sim_id=sid and si.question_id=q.id)';

  d := replace(d, needle, replacement);
  execute d;
end $$;

-- Verificación posterior:
select
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  (length(pg_get_functiondef(p.oid)) -
   length(replace(pg_get_functiondef(p.oid),
     'not exists (select 1 from public.saber_sim_items si where si.sim_id=sid and si.question_id=q.id)', ''))) /
   length('not exists (select 1 from public.saber_sim_items si where si.sim_id=sid and si.question_id=q.id)')
     as duplicate_guards,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.oid='public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure;
