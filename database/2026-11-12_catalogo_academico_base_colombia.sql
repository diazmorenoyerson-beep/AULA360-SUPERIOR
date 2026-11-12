-- AULA360 · Catálogo académico base Colombia
-- Idempotente: se puede ejecutar más de una vez sin duplicar áreas/asignaturas.
-- Las 9 áreas corresponden a las áreas obligatorias y fundamentales de la Ley 115.
-- Las asignaturas son una organización inicial editable por rectoría.
-- No se asignan códigos Saber 11 sin cotejarlos con preguntas/paquetes reales.

drop index if exists public.asignaturas_banco_subject_unique_idx;

insert into public.areas(nombre) values
 ('Ciencias Naturales y Educación Ambiental'),
 ('Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia'),
 ('Educación Artística y Cultural'),
 ('Educación Ética y en Valores Humanos'),
 ('Educación Física, Recreación y Deportes'),
 ('Educación Religiosa'),
 ('Humanidades, Lengua Castellana e Idiomas Extranjeros'),
 ('Matemáticas'),
 ('Tecnología e Informática')
on conflict(nombre) do nothing;

with seed(area_nombre,asignatura) as (
 values
 ('Ciencias Naturales y Educación Ambiental','Ciencias Naturales'),
 ('Ciencias Naturales y Educación Ambiental','Biología'),
 ('Ciencias Naturales y Educación Ambiental','Física'),
 ('Ciencias Naturales y Educación Ambiental','Química'),
 ('Ciencias Naturales y Educación Ambiental','Educación Ambiental'),
 ('Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia','Ciencias Sociales'),
 ('Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia','Historia'),
 ('Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia','Geografía'),
 ('Ciencias Sociales, Historia, Geografía, Constitución Política y Democracia','Constitución Política y Democracia'),
 ('Educación Artística y Cultural','Educación Artística y Cultural'),
 ('Educación Ética y en Valores Humanos','Ética y Valores'),
 ('Educación Física, Recreación y Deportes','Educación Física'),
 ('Educación Física, Recreación y Deportes','Recreación y Deportes'),
 ('Educación Religiosa','Educación Religiosa'),
 ('Humanidades, Lengua Castellana e Idiomas Extranjeros','Lengua Castellana'),
 ('Humanidades, Lengua Castellana e Idiomas Extranjeros','Inglés'),
 ('Matemáticas','Matemáticas'),
 ('Matemáticas','Álgebra'),
 ('Matemáticas','Geometría'),
 ('Matemáticas','Estadística'),
 ('Tecnología e Informática','Tecnología e Informática')
)
insert into public.asignaturas(nombre,area_id)
select s.asignatura,a.id from seed s join public.areas a on a.nombre=s.area_nombre
on conflict(nombre) do update set area_id=excluded.area_id;

-- Un componente Saber 11 puede agrupar varias asignaturas escolares.
-- Por eso banco_subject NO tiene restricción de unicidad.
