DO $migration$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO d
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='create_saber_sim'
   AND pg_get_function_identity_arguments(p.oid)='p_title text, p_description text, p_due timestamp with time zone, p_max integer, p_courses uuid[], p_modo text';
 IF d IS NULL THEN RAISE EXCEPTION 'No se encontró create_saber_sim'; END IF;
 IF position('El banco no tiene suficientes preguntas' in d)=0 THEN
   d:=replace(d,
     'actual:=coalesce(array_length(chosen,1),0);',
     'actual:=coalesce(array_length(chosen,1),0);' || E'\n   if actual<need then raise exception ''El banco no tiene suficientes preguntas para %: se necesitan % y solo hay %'',area_name,need,actual; end if;');
 END IF;
 IF position('No repitas cursos en el simulacro' in d)=0 THEN
   d:=replace(d,
     'if coalesce(array_length(p_courses,1),0)=0 then raise exception ''Selecciona al menos un curso''; end if;',
     'if coalesce(array_length(p_courses,1),0)=0 then raise exception ''Selecciona al menos un curso''; end if;' || E'\n if cardinality(p_courses)<> (select count(distinct x) from unnest(p_courses) x) then raise exception ''No repitas cursos en el simulacro''; end if;');
 END IF;
 EXECUTE d;
END
$migration$;