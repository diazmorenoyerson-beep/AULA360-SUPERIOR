-- AULA360 PREMIUM: los resultados impresos solo se escriben mediante saber_imp_guardar().
-- Se conserva la lectura directa únicamente para los usuarios autorizados por RLS.
drop policy if exists saber_imp_results_director_all on public.saber_imp_results;

create policy saber_imp_results_director_select
on public.saber_imp_results
for select
to authenticated
using (
  exists (
    select 1
    from public.saber_imp i
    where i.id = saber_imp_results.imp_id
      and (
        (i.colegio_id = public.aula360_my_school()
          and public.aula360_my_role() in ('rector','coordinador'))
        or i.teacher_id = (select auth.uid())
        or public.aula360_is_admin()
      )
  )
);

-- Ningún cliente anónimo debe acceder a la tabla; authenticated solo puede leer.
revoke all privileges on table public.saber_imp_results from anon;
revoke insert, update, delete, truncate, references, trigger
on table public.saber_imp_results from authenticated;
grant select on table public.saber_imp_results to authenticated;
