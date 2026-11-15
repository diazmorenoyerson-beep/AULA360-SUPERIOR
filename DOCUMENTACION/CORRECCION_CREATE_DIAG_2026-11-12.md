# Corrección propuesta para creación de diagnósticos

**Estado: preparada para revisión; no aplicada a Supabase.**

## Hallazgo corregido

La versión activa de `create_diag` itera únicamente los cursos que encuentra dentro del colegio. Si la petición mezcla cursos válidos con IDs de otros colegios o inexistentes, puede crear diagnósticos para los válidos e ignorar silenciosamente los inválidos.

## Cambios propuestos

- Rechazar la operación completa cuando cualquier curso sea inexistente o ajeno al colegio.
- Rechazar áreas fuera del catálogo de la interfaz y entradas duplicadas.
- Validar el total de preguntas entre 20 y 120 antes de iniciar escrituras.
- Limitar el título a 100 caracteres.
- Mantener selección de preguntas publicadas, activas y con clave válida.
- Mantener la misma firma RPC para no romper el frontend `SIMP.crearDiag()`.

## Archivo SQL

El archivo `DOCUMENTACION/SQL_PROPUESTA_CREATE_DIAG_SEGURA_2026-11-12.sql` contiene la función completa propuesta. No es una migración aplicada ni debe ejecutarse en producción sin revisión.

## Pruebas obligatorias en staging

1. Rector aprobado con todos los cursos propios: crea un diagnóstico por curso.
2. Rector con un curso propio y otro de colegio ajeno: rechaza todo y no crea filas.
3. ID de curso inexistente mezclado con uno propio: rechaza todo.
4. Áreas duplicadas, desconocidas o nulas: rechaza todo.
5. Total menor de 20 o mayor de 120: rechaza todo.
6. Banco insuficiente para una sola área: rollback completo, sin diagnósticos parciales.
7. Docente sin rol directivo, usuario anónimo y directivo no aprobado: rechaza.
8. Confirmar que impresión, OMR, guardado y consulta de resultados siguen funcionando.

## Siguiente riesgo a resolver

La política RLS `saber_imp_results_director_all` permite SELECT/INSERT/UPDATE/DELETE a directivos, docente propietario y administrador. La función `saber_imp_guardar` ya calcula el resultado en servidor; por eso el siguiente cambio debe retirar escritura directa solo después de revisar todas las referencias del frontend y probar la RPC con los roles reales. No se debe revocar a ciegas.

