-- AULA360 · Solo preguntas calificables en disponibilidad y simulacros Saber 11
-- Fecha: 2026-11-12
-- Conserva la definición actual de las funciones y refuerza el filtro para
-- incluir únicamente preguntas con clave correcta dentro del rango de opciones.

do $$
declare
 f text;
 old_expr text := 'q.status=''published'' and q.active';
 new_expr text := 'q.status=''published'' and q.active and exists (select 1 from public.question_keys k where k.question_id=q.id and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0))';
begin
 select pg_get_functiondef(p.oid) into f
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='create_saber_sim'
   and pg_get_function_identity_arguments(p.oid)='p_title text, p_description text, p_due timestamp with time zone, p_max integer, p_courses uuid[], p_modo text';
 if f is null then raise exception 'No se encontró create_saber_sim'; end if;
 if position(old_expr in f)=0 then raise exception 'No se encontró el filtro de preguntas en create_saber_sim'; end if;
 f:=replace(f,old_expr,new_expr);
 execute f;

 select pg_get_functiondef(p.oid) into f
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='saber_disponibilidad'
   and pg_get_function_identity_arguments(p.oid)='';
 if f is null then raise exception 'No se encontró saber_disponibilidad'; end if;
 if position(old_expr in f)=0 then raise exception 'No se encontró el filtro de preguntas en saber_disponibilidad'; end if;
 f:=replace(f,old_expr,new_expr);
 execute f;
end $$;

-- Las dos funciones solo cuentan/seleccionan preguntas publicadas, activas
-- y con clave válida para una de sus opciones. No crea datos.
