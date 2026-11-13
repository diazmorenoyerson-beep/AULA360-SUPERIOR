-- Harden diagnostic creation: strict area catalog, no duplicate areas, NULL-safe count and bounded title.
-- Idempotent: applies targeted replacements to the deployed function definition.
do $$
declare d text;
begin
 select pg_get_functiondef('public.create_diag(uuid[],text,date,integer,text[])'::regprocedure) into d;
 d:=replace(d,
 $old$ if coalesce(array_length(p_courses,1),0)=0 or coalesce(array_length(p_areas,1),0)=0 or p_per_area not between 1 and 120 or cardinality(p_areas)*p_per_area not between 20 and 120 then raise exception 'El diagnóstico debe tener entre 20 y 120 preguntas en total'; end if;$old$,
 $new$ if coalesce(array_length(p_courses,1),0)=0 or coalesce(array_length(p_areas,1),0)=0 or p_per_area is null or p_per_area not between 1 and 120 then raise exception 'Configuración inválida'; end if;
 if p_title is not null and char_length(trim(p_title))>120 then raise exception 'El título no puede superar 120 caracteres'; end if;
 if array_position(p_areas,null) is not null then raise exception 'La selección contiene áreas inválidas'; end if;
 if cardinality(p_areas)<>(select count(distinct x) from unnest(p_areas) x) then raise exception 'No repitas áreas en el diagnóstico'; end if;
 if exists(select 1 from unnest(p_areas) x where x not in ('Lectura Crítica','Matemáticas','Sociales y Ciudadanas','Ciencias Naturales','Inglés')) then raise exception 'El diagnóstico contiene un área no permitida'; end if;$new$);
 if position('p_per_area is null' in d)=0 or position('No repitas áreas' in d)=0 or position('área no permitida' in d)=0 then
   raise exception 'No se pudieron incorporar las validaciones del diagnóstico';
 end if;
 execute d;
end $$;
