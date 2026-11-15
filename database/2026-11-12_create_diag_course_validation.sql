-- Validación atómica de cursos para creación de diagnósticos.
-- Idempotente: no vuelve a insertar las validaciones si ya están instaladas.
do $migration$
declare
  v text;
  old_block text := ' if coalesce(array_length(p_courses,1),0)=0 or coalesce(array_length(p_areas,1),0)=0 or p_per_area not between 1 and 120 then raise exception ''Configuración inválida''; end if;';
  new_block text;
begin
  v := pg_get_functiondef('public.create_diag(uuid[],text,date,integer,text[])'::regprocedure);
  if position('Hay cursos inexistentes o fuera de tu colegio' in v) > 0 then
    raise notice 'La validación de cursos ya está instalada';
    return;
  end if;
  if position(old_block in v) = 0 then
    raise exception 'No se encontró el bloque esperado; migración cancelada';
  end if;
  new_block := old_block || E'\n if array_position(p_courses,null) is not null then raise exception ''La selección contiene cursos inválidos''; end if;\n if cardinality(p_courses) <> (select count(distinct x) from unnest(p_courses) x) then raise exception ''No repitas cursos en el diagnóstico''; end if;\n if exists(select 1 from unnest(p_courses) x left join public.courses c on c.id=x where c.id is null or c.colegio_id is distinct from pr.colegio_id) then raise exception ''Hay cursos inexistentes o fuera de tu colegio''; end if;';
  v := replace(v, old_block, new_block);
  execute v;
end
$migration$;
