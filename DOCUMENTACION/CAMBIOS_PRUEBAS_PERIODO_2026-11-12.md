# AULA360 — Correcciones del módulo de Pruebas de periodo
Fecha: 2026-11-12

## Cambios aplicados en `periodo.js`

1. Se eliminó el valor fijo `grado: 11`. Antes de guardar, el frontend consulta los grados reales de las preguntas seleccionadas en `questions.grade` y exige que todas pertenezcan a un solo grado.
2. Al publicar, contrasta el grado de las preguntas con los cursos elegidos y evita publicar una prueba con cursos de otro grado.
3. La prueba se crea inicialmente como borrador; primero se insertan preguntas y cursos destino y solo al final se cambia a publicada. Así se evita que aparezca a los estudiantes antes de tener sus relaciones cargadas.
4. Se comprueba el error de la consulta de intentos del estudiante y se propaga el error al consultar resultados docentes, en vez de presentar silenciosamente listas vacías.

## Límites y pendientes

- El backend conectado aún no tiene las tablas `periodo_pruebas`, `periodo_items`, `periodo_targets`, `periodo_intentos` ni las RPC `periodo_banco`, `periodo_preguntas`, `periodo_enviar`. Por tanto, estos cambios de frontend están preparados pero **no se pueden probar de extremo a extremo** hasta completar el backend.
- La validación visual del grado no sustituye la autorización en Supabase. Las RPC y políticas RLS deben validar propiedad del examen, pertenencia del estudiante al curso, fechas, intentos y calificación.
- No se ha ejecutado SQL de escritura, no se han creado tablas ni funciones y no se ha tocado producción.

## Verificación realizada

- Se volvió a leer el archivo desde la rama de trabajo después del commit.
- Confirmado que ya no existe `grado:11`.
- Confirmada la consulta de grados de preguntas, la publicación diferida y la comprobación de errores.
- Pendiente: pruebas automatizadas y funcionales contra el backend una vez implementado.
