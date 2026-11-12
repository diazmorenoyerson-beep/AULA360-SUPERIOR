-- Alinea la selección de preguntas de Ciencias Naturales con las materias del banco.
-- Idempotente y limitado al mapeo de fuente en create_saber_sim.
do $migration$
declare
 v text;
 old_block text := '(''Ciencias Naturales'',29,array[''Ciencias Naturales'']::text[])';
 new_block text := '(''Ciencias Naturales'',29,array[''Ciencias Naturales'',''Biología'',''Química'',''Física'']::text[])';
begin
 v:=pg_get_functiondef('public.create_saber_sim(text,text,timestamp with time zone,integer,uuid[],text)'::regprocedure);
 if position(new_block in v)>0 then
   raise notice 'La equivalencia de Ciencias Naturales ya está instalada';
   return;
 end if;
 if position(old_block in v)=0 then
   raise exception 'No se encontró la equivalencia esperada; migración cancelada';
 end if;
 v:=replace(v,old_block,new_block);
 execute v;
end
$migration$;
