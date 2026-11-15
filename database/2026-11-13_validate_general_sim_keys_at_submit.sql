-- Revalidar las claves del banco al enviar: pueden haber cambiado después de iniciar.
create or replace function public.submit_general_sim(p_run uuid,p_auto boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); run public.general_sim_runs%rowtype; sim public.simulacros%rowtype;
 prof public.profiles%rowtype; q record; a integer; c integer:=0; n integer; sec integer;
 key_json jsonb:='{}'::jsonb; exp_json jsonb:='{}'::jsonb; ans_json jsonb;
begin
 if uid is null then raise exception 'Debes iniciar sesión'; end if;
 select * into prof from public.profiles where id=uid;
 if prof.role<>'est' then raise exception 'Solo estudiantes pueden enviar simulacros'; end if;
 select * into run from public.general_sim_runs where id=p_run and user_id=uid and submitted_at is null for update;
 if not found then raise exception 'La sesión no está activa o ya fue enviada'; end if;
 select * into sim from public.simulacros where id=run.simulacro_id for update;
 ans_json:=coalesce(run.answers,'{}'::jsonb); n:=cardinality(run.question_ids);
 if n=0 then raise exception 'Simulacro sin preguntas'; end if;
 if (select count(*) from unnest(run.question_ids)x(id) join public.question_keys k on k.question_id=x.id
  join public.questions qu on qu.id=x.id where k.correct>=0 and k.correct<coalesce(array_length(qu.options,1),0))<>n then
  raise exception 'No se puede calificar: falta una clave válida o cambió una pregunta del banco';
 end if;
 for q in select x.id,k.correct,k.explanation from unnest(run.question_ids) with ordinality x(id,ord)
  join public.question_keys k on k.question_id=x.id join public.questions qu on qu.id=x.id order by x.ord loop
  a:=null;
  if ans_json?q.id::text and jsonb_typeof(ans_json->q.id::text)='number' then a:=(ans_json->>q.id::text)::integer; end if;
  if a=q.correct then c:=c+1; end if;
  key_json:=jsonb_set(key_json,array[q.id::text],to_jsonb(q.correct),true);
  if q.explanation is not null then exp_json:=jsonb_set(exp_json,array[q.id::text],to_jsonb(q.explanation),true); end if;
 end loop;
 sec:=greatest(0,least(run.duration_seconds,ceil(extract(epoch from(now()-run.started_at)))::integer));
 insert into public.attempts(simulacro_id,user_id,grade,subject,respuestas,score,correct,total,seconds_used,auto)
 values(run.simulacro_id,uid,sim.grade,sim.subject,ans_json,round(100.0*c/n,2),c,n,sec,coalesce(p_auto,false) or now()>=run.expires_at);
 update public.general_sim_runs set submitted_at=now() where id=run.id;
 return jsonb_build_object('score',round(100.0*c/n,2),'correct',c,'total',n,'ans',ans_json,'key',key_json,'exp',exp_json,'auto',coalesce(p_auto,false) or now()>=run.expires_at);
end $$;
revoke all on function public.submit_general_sim(uuid,boolean) from public,anon;
grant execute on function public.submit_general_sim(uuid,boolean) to authenticated;