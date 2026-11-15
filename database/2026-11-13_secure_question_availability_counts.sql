-- Conteo de preguntas listas para simulacros, filtrado por ámbito del usuario.
create or replace function public.avail_counts()
returns table(grade smallint,subject text,n bigint)
language plpgsql security definer set search_path=''
as $$
declare p public.profiles%rowtype; course_grade smallint;
begin
 if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
 select * into p from public.profiles where id=auth.uid();
 if not found then raise exception 'Perfil no disponible'; end if;
 if p.role='est' then
  if p.course_id is null then return; end if;
  select c.grade into course_grade from public.courses c where c.id=p.course_id;
  if course_grade is null then return; end if;
  return query select q.grade,q.subject,count(*)::bigint from public.questions q
   join public.question_keys k on k.question_id=q.id
   where q.grade=course_grade and q.active and q.status='published'
   and k.correct>=0 and k.correct<coalesce(array_length(q.options,1),0)
   group by q.grade,q.subject order by q.subject;
  return;
 end if;
 if p.role<>'prof' and not p.is_admin then raise exception 'No tienes permiso para consultar la cobertura del banco'; end if;
 return query select q.grade,q.subject,count(*)::bigint from public.questions q
  join public.question_keys k on k.question_id=q.id
  where q.active and q.status='published' and k.correct>=0
   and k.correct<coalesce(array_length(q.options,1),0)
   and (p.is_admin or (q.grade=any(p.grados) and q.subject=any(p.asignaturas)))
  group by q.grade,q.subject order by q.grade,q.subject;
end $$;
revoke all on function public.avail_counts() from public,anon;
grant execute on function public.avail_counts() to authenticated;