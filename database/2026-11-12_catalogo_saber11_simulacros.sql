-- AULA360: alinear la selección de preguntas de simulacros con el catálogo académico.
-- Componentes canónicos definidos por la lógica existente de create_saber_sim:
-- Lectura Crítica, Matemáticas, Sociales y Ciudadanas, Ciencias Naturales e Inglés.
-- El administrador asigna cada asignatura escolar a uno de estos valores en areas/catalogo.js.
-- Reejecutable: si el código ya está normalizado, no hace cambios.

do $$
declare
  v_def text;
  v_old text;
begin
  select pg_get_functiondef(
    'public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure
  ) into v_def;

  v_old := v_def;
  v_def := replace(
    v_def,
    'array[''Sociales y Ciudadanas'',''Ciencias Sociales'',''Sociales'']::text[]',
    'array[''Sociales y Ciudadanas'']::text[]'
  );
  v_def := replace(
    v_def,
    'array[''Biología'',''Química'',''Física'']::text[]',
    'array[''Ciencias Naturales'']::text[]'
  );

  if v_def = v_old then
    if position('array[''Sociales y Ciudadanas'']::text[]' in v_def) > 0
       and position('array[''Ciencias Naturales'']::text[]' in v_def) > 0 then
      return;
    end if;
    raise exception 'No se encontró el mapeo esperado de create_saber_sim; no se aplicó ningún cambio.';
  end if;

  if position('array[''Sociales y Ciudadanas'']::text[]' in v_def) = 0
     or position('array[''Ciencias Naturales'']::text[]' in v_def) = 0 then
    raise exception 'La definición resultante no contiene los componentes canónicos.';
  end if;

  execute v_def;
end $$;

-- Verificación posterior:
-- select pg_get_functiondef('public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure);
