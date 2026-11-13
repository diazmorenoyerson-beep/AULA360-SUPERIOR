-- PROPUESTA NO APLICADA: endurecimiento de create_diag
-- Revisar en staging y probar con rector/coordinador/admin antes de aplicar.
create or replace function public.create_diag(
  p_courses uuid[],
  p_title text,
  p_date date,
  p_per_area integer,
  p_areas text[]
)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  u uuid := auth.uid();
  pr public.profiles%rowtype;
  c public.courses%rowtype;
  sid uuid;
  ar text;
  qids uuid[];
  ids uuid[] := '{}'::uuid[];
  aliases text[];
  allowed_areas constant text[] := array[
    'Lectura Crítica','Matemáticas','Sociales y Ciudadanas',
    'Ciencias Naturales','Inglés','Biología','Química','Física',
    'Lenguaje','Ciencias Sociales','Filosofía','Economía',
    'Ciencias Políticas','Competencias Ciudadanas','Democracia',
    'Ética','Tecnología e Informática','Educación Artística',
    'Educación Física','Educación Económica y Financiera','Religión'
  ];
begin
  if u is null then raise exception 'Debes iniciar sesión'; end if;
  select * into pr from public.profiles where id = u;
  if not found or pr.teacher_status <> 'aprobado'
     or not (pr.role in ('rector','coordinador') or pr.is_admin) then
    raise exception 'No autorizado para crear diagnósticos';
  end if;

  if coalesce(cardinality(p_courses),0) = 0
     or coalesce(cardinality(p_areas),0) = 0
     or p_per_area is null or p_per_area < 1 then
    raise exception 'Configuración inválida';
  end if;
  if cardinality(p_courses) <> (select count(distinct x) from unnest(p_courses) x) then
    raise exception 'La lista de cursos contiene duplicados';
  end if;
  if cardinality(p_areas) <> (select count(distinct x) from unnest(p_areas) x) then
    raise exception 'La lista de áreas contiene duplicados';
  end if;
  if exists (select 1 from unnest(p_areas) x where x is null or not (x = any(allowed_areas))) then
    raise exception 'El diagnóstico contiene áreas no permitidas';
  end if;
  if p_per_area::bigint * cardinality(p_areas) not between 20 and 120 then
    raise exception 'El diagnóstico debe tener entre 20 y 120 preguntas en total';
  end if;
  if p_title is not null and length(trim(p_title)) > 100 then
    raise exception 'El nombre no puede superar 100 caracteres';
  end if;

  -- Rechazar la solicitud completa si un solo curso no pertenece al colegio.
  if exists (
    select 1 from unnest(p_courses) x
    left join public.courses co on co.id = x
    where co.id is null or co.colegio_id is distinct from pr.colegio_id
  ) then
    raise exception 'La selección contiene cursos inexistentes o ajenos a tu colegio';
  end if;

  for c in
    select co.* from public.courses co
    where co.id = any(p_courses)
    order by co.grade, co.name
  loop
    insert into public.saber_imp(teacher_id,colegio_id,title,exam_date,kind,grado)
    values (u,pr.colegio_id,coalesce(nullif(trim(p_title),''),'Diagnóstico'),
            p_date,'diagnostico',c.grade)
    returning id into sid;

    insert into public.saber_imp_courses(imp_id,course_id) values (sid,c.id);

    foreach ar in array p_areas loop
      aliases := case ar
        when 'Lectura Crítica' then array['Lectura Crítica','Lengua Castellana','Lenguaje']
        when 'Matemáticas' then array['Matemáticas']
        when 'Sociales y Ciudadanas' then array['Sociales y Ciudadanas','Ciencias Sociales','Competencias Ciudadanas','Historia','Geografía','Economía','Ciencias Políticas','Democracia','Filosofía']
        when 'Ciencias Naturales' then array['Ciencias Naturales','Biología','Química','Física','Agroambiental']
        when 'Inglés' then array['Inglés']
        else array[ar]
      end;

      select array_agg(id) into qids from (
        select q.id
        from public.questions q
        where q.grade <= c.grade
          and q.subject = any(aliases)
          and q.status = 'published'
          and q.active
          and exists (
            select 1 from public.question_keys k
            where k.question_id = q.id
              and k.correct >= 0
              and k.correct < cardinality(q.options)
          )
        order by random()
        limit p_per_area
      ) picked;

      if coalesce(cardinality(qids),0) < p_per_area then
        raise exception 'Banco insuficiente para % en %: faltan preguntas publicadas con clave válida', ar, c.name;
      end if;

      insert into public.saber_imp_items(imp_id,question_id,cuad,pos,area,grado_ref)
      select sid, x, 1, row_number() over (), ar,
             (select q.grade from public.questions q where q.id = x)
      from unnest(qids) x;
    end loop;
    ids := array_append(ids,sid);
  end loop;

  return ids;
end
$function$;

-- No modificar ACL hasta inspeccionar el propietario y los grants actuales.
-- La sustitución conserva la firma y el comportamiento esperado del frontend.
