-- AULA360: clasificación opcional de paquetes tradicionales por componente Saber 11.
-- La materia escolar original permanece en banco_documentos.materia.
-- No asigna equivalencias automáticamente ni modifica documentos existentes.
alter table public.banco_documentos
  add column if not exists componente_saber11 text
  check (
    componente_saber11 is null
    or componente_saber11 in (
      'Lectura Crítica',
      'Matemáticas',
      'Sociales y Ciudadanas',
      'Ciencias Naturales',
      'Inglés'
    )
  );
