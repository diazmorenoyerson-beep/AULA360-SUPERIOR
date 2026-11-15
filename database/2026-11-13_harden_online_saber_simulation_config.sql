-- AULA360 PREMIUM
-- Harden online Saber 11 simulation configuration.
-- Idempotent: safely reapplies only when the validations are missing.

do $$
declare
  d text;
begin
  select pg_get_functiondef(
    'public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure
  ) into d;

  if position($q$p_description is not null and char_length(p_description)>500$q$ in d)=0 then
    if position($q$if p_title is null or char_length(trim(p_title)) not between 1 and 80 then raise exception 'Nombre inválido'; end if;$q$ in d)=0 then
      raise exception 'No se encontró el punto de inserción de validaciones de nombre';
    end if;
    d:=replace(
      d,
      $q$if p_title is null or char_length(trim(p_title)) not between 1 and 80 then raise exception 'Nombre inválido'; end if;$q$,
      $q$if p_title is null or char_length(trim(p_title)) not between 1 and 80 then raise exception 'Nombre inválido'; end if;
 if p_description is not null and char_length(p_description)>500 then raise exception 'Las indicaciones no pueden superar 500 caracteres'; end if;
 if p_due is not null and p_due<=now() then raise exception 'La fecha límite debe ser futura'; end if;$q$
    );
  end if;

  if position($q$p_max is null or p_max not between 1 and 5 or p_modo is null$q$ in d)=0 then
    if position($q$if p_max not between 1 and 5 or p_modo not in ('completo','sesion1','sesion2') then raise exception 'Configuración inválida'; end if;$q$ in d)=0 then
      raise exception 'No se encontró la validación de configuración';
    end if;
    d:=replace(
      d,
      $q$if p_max not between 1 and 5 or p_modo not in ('completo','sesion1','sesion2') then raise exception 'Configuración inválida'; end if;$q$,
      $q$if p_max is null or p_max not between 1 and 5 or p_modo is null or p_modo not in ('completo','sesion1','sesion2') then raise exception 'Configuración inválida'; end if;$q$
    );
  end if;

  execute d;
end
$$;
