-- AULA360 | Cambios aplicados en producción el 2026-11-12
-- Refuerzo de autorización de asistencia y validación multi-colegio de horarios.
-- Ejecutado y verificado en Supabase. No inserta datos de prueba.

CREATE OR REPLACE FUNCTION public.asistencia_set_doc(p_docente uuid, p_doc text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if auth.uid() is null
    or (select public.aula360_my_role()) not in ('rector','coordinador')
    or not exists(
      select 1 from public.profiles
      where id=p_docente
        and colegio_id=(select public.aula360_my_school())
        and role='prof'
        and teacher_status='aprobado'
    ) then
   raise exception 'No autorizado';
 end if;

 if length(regexp_replace(coalesce(p_doc,''),'[^0-9]','','g')) not between 5 and 20 then
   raise exception 'Documento inválido';
 end if;

 update public.profiles
 set document=regexp_replace(p_doc,'[^0-9]','','g')
 where id=p_docente;
 return true;
end
$function$;

CREATE OR REPLACE FUNCTION public.hz_guardar_version(
 p_colegio bigint,
 p_nombre text,
 p_puntuacion numeric,
 p_resumen jsonb,
 p_clases jsonb,
 p_tipo text DEFAULT 'regular'::text,
 p_nivel text DEFAULT 'colegio'::text,
 p_desde date DEFAULT NULL::date,
 p_hasta date DEFAULT NULL::date,
 p_motivo text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 uid uuid:=auth.uid();
 sid uuid;
 j jsonb;
begin
 if uid is null
    or p_colegio is distinct from (select public.aula360_my_school())
    or (select public.aula360_my_role()) not in ('rector','coordinador') then
   raise exception 'No autorizado';
 end if;

 if length(trim(coalesce(p_nombre,''))) not between 1 and 120
    or p_tipo not in ('regular','emergente')
    or p_nivel not in ('colegio','primaria','bachillerato') then
   raise exception 'Datos inválidos';
 end if;

 if jsonb_typeof(coalesce(p_clases,'[]'::jsonb)) <> 'array' then
   raise exception 'Clases inválidas';
 end if;

 if p_tipo='emergente' and (p_desde is null or p_hasta is null or p_hasta<p_desde) then
   raise exception 'Fechas inválidas';
 end if;

 -- Validar primero todas las referencias antes de crear la versión.
 for j in select value from jsonb_array_elements(coalesce(p_clases,'[]'::jsonb)) loop
   if nullif(j->>'asignacion_id','') is null
      or nullif(j->>'franja_id','') is null
      or nullif(j->>'dia','') is null then
     raise exception 'Cada clase debe tener asignación, día y franja';
   end if;

   if (j->>'dia')::smallint not between 1 and 7 then
     raise exception 'Día de clase inválido';
   end if;

   if not exists(
     select 1 from public.hz_asignaciones a
     where a.id=(j->>'asignacion_id')::uuid
       and a.colegio_id=p_colegio
   ) then
     raise exception 'Una asignación no pertenece a este colegio';
   end if;

   if not exists(
     select 1 from public.hz_franjas f
     where f.id=(j->>'franja_id')::uuid
       and f.colegio_id=p_colegio
       and f.es_clase
   ) then
     raise exception 'Una franja no pertenece a este colegio o no es lectiva';
   end if;

   if nullif(j->>'aula_id','') is not null and not exists(
     select 1 from public.hz_aulas a
     where a.id=(j->>'aula_id')::uuid
       and a.colegio_id=p_colegio
       and a.activa
   ) then
     raise exception 'Un aula no pertenece a este colegio o está inactiva';
   end if;
 end loop;

 insert into public.hz_versiones(
   colegio_id,nombre,puntuacion,resumen,tipo,nivel,desde,hasta,motivo,created_by
 )
 values(
   p_colegio,trim(p_nombre),p_puntuacion,coalesce(p_resumen,'{}'),
   p_tipo,p_nivel,p_desde,p_hasta,nullif(trim(p_motivo),''),uid
 )
 returning id into sid;

 for j in select value from jsonb_array_elements(coalesce(p_clases,'[]'::jsonb)) loop
   insert into public.hz_clases(version_id,asignacion_id,dia,franja_id,aula_id)
   values(
     sid,
     (j->>'asignacion_id')::uuid,
     (j->>'dia')::smallint,
     (j->>'franja_id')::uuid,
     nullif(j->>'aula_id','')::uuid
   );
 end loop;

 return sid;
end
$function$;
