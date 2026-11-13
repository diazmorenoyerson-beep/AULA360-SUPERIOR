-- Harden printed answer-sheet RPC against malformed or forged answer payloads.
CREATE OR REPLACE FUNCTION public.saber_imp_guardar(p_imp uuid, p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 u uuid:=auth.uid(); rec jsonb; rid bigint; cu smallint; ans jsonb;
 totaln integer; correctn integer; pa jsonb; pg jsonb; inserted integer:=0;
 answer_key text; answer_value jsonb;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.saber_imp i WHERE i.id=p_imp AND
   ((i.colegio_id=public.aula360_my_school() AND public.aula360_my_role() IN ('rector','coordinador'))
    OR i.teacher_id=u OR public.aula360_is_admin())) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF jsonb_typeof(p_rows)<>'array' OR jsonb_array_length(p_rows)>500 THEN RAISE EXCEPTION 'Lote inválido'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) x
   GROUP BY (x->>'roster_id'),(x->>'cuad') HAVING count(*)>1) THEN
   RAISE EXCEPTION 'El lote contiene hojas duplicadas del mismo estudiante y cuadernillo';
 END IF;
 FOR rec IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
   IF coalesce(rec->>'roster_id','') !~ '^[0-9]+$' OR coalesce(rec->>'cuad','') !~ '^[1-3]$'
      OR jsonb_typeof(rec->'answers')<>'object' THEN RAISE EXCEPTION 'Hoja inválida'; END IF;
   rid:=(rec->>'roster_id')::bigint; cu:=(rec->>'cuad')::smallint; ans:=rec->'answers';
   IF NOT EXISTS(SELECT 1 FROM public.saber_imp_courses x JOIN public.roster r ON r.course_id=x.course_id
     WHERE x.imp_id=p_imp AND r.id=rid) THEN RAISE EXCEPTION 'Estudiante no pertenece a los cursos del simulacro'; END IF;
   FOR answer_key,answer_value IN SELECT key,value FROM jsonb_each(ans) LOOP
     IF answer_key !~ '^[1-9][0-9]*$' OR NOT EXISTS(SELECT 1 FROM public.saber_imp_items x
       WHERE x.imp_id=p_imp AND x.cuad=cu AND x.pos=answer_key::integer) THEN
       RAISE EXCEPTION 'La hoja contiene una posición que no pertenece al cuadernillo';
     END IF;
     IF answer_value<>'null'::jsonb AND (jsonb_typeof(answer_value)<>'number' OR answer_value::text !~ '^[0-3]$') THEN
       RAISE EXCEPTION 'La hoja contiene una respuesta inválida';
     END IF;
   END LOOP;
   SELECT count(*),count(*) FILTER(WHERE (ans->>x.pos::text) ~ '^[0-3]$' AND (ans->>x.pos::text)::integer=k.correct)
     INTO totaln,correctn FROM public.saber_imp_items x JOIN public.question_keys k ON k.question_id=x.question_id
     WHERE x.imp_id=p_imp AND x.cuad=cu;
   IF totaln=0 THEN RAISE EXCEPTION 'Cuadernillo sin preguntas'; END IF;
   SELECT coalesce(jsonb_object_agg(area,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) INTO pa FROM (
     SELECT x.area,count(*) FILTER(WHERE (ans->>x.pos::text) ~ '^[0-3]$' AND (ans->>x.pos::text)::integer=k.correct)::integer c,
       count(*)::integer t FROM public.saber_imp_items x JOIN public.question_keys k ON k.question_id=x.question_id
     WHERE x.imp_id=p_imp AND x.cuad=cu GROUP BY x.area) z;
   SELECT coalesce(jsonb_object_agg(grado_ref::text,jsonb_build_object('c',c,'t',t)),'{}'::jsonb) INTO pg FROM (
     SELECT x.grado_ref,count(*) FILTER(WHERE (ans->>x.pos::text) ~ '^[0-3]$' AND (ans->>x.pos::text)::integer=k.correct)::integer c,
       count(*)::integer t FROM public.saber_imp_items x JOIN public.question_keys k ON k.question_id=x.question_id
     WHERE x.imp_id=p_imp AND x.cuad=cu GROUP BY x.grado_ref) z;
   INSERT INTO public.saber_imp_results(imp_id,roster_id,cuad,answers,correct_n,total_n,por_area,por_grado)
     VALUES(p_imp,rid,cu,ans,correctn,totaln,pa,pg)
     ON CONFLICT(imp_id,roster_id,cuad) DO UPDATE SET answers=excluded.answers,correct_n=excluded.correct_n,
       total_n=excluded.total_n,por_area=excluded.por_area,por_grado=excluded.por_grado,created_at=now();
   inserted:=inserted+1;
 END LOOP;
 RETURN inserted;
END
$function$;
