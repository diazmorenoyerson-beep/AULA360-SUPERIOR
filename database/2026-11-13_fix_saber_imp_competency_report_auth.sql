-- Corrige el control de propietario en el RPC de resultados de competencia.
-- La consulta solo devuelve resultados al docente propietario, rector/coordinador
-- del mismo colegio o administrador autorizado.
create or replace function public.saber_imp_resultados(p_imp uuid)
returns table(roster_id bigint,name text,document text,course text,por_area jsonb,por_grado jsonb,por_competencia jsonb,cuad smallint,correct_n integer,total_n integer)
language plpgsql security definer set search_path = ''
as $function$
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 if not exists(select 1 from public.saber_imp i where i.id=p_imp and (
   (i.colegio_id=public.aula360_my_school() and public.aula360_my_role() in ('rector','coordinador'))
   or i.teacher_id=auth.uid() or public.aula360_is_admin()
 )) then raise exception 'No autorizado'; end if;
 return query select r.roster_id,s.full_name,s.document,c.grade::text||'° '||c.name,r.por_area,r.por_grado,r.por_competencia,r.cuad,r.correct_n,r.total_n
 from public.saber_imp_results r join public.roster s on s.id=r.roster_id join public.courses c on c.id=s.course_id
 where r.imp_id=p_imp order by c.grade,c.name,s.full_name,r.cuad;
end
$function$;
revoke all on function public.saber_imp_resultados(uuid) from public,anon;
grant execute on function public.saber_imp_resultados(uuid) to authenticated;
