# Diagnóstico técnico: simulacros en línea AULA360
**Fecha:** 2026-11-12  
**Rama:** `premium/visual-3d-2026-11`  
**Estado:** inspección de solo lectura; no se modificó Supabase.

## 1. Hallazgo principal

El frontend de `index.html` implementa un flujo de simulacros genéricos que consulta y escribe directamente estas estructuras:

- `simulacros`
- `simulacro_targets`
- `attempts`

En la inspección del esquema real de `public`, ninguna de esas tres tablas existe. Tampoco se encontró una función RPC llamada `submit_attempt`. El frontend sí la invoca al finalizar el examen.

El flujo de creación docente inserta directamente en `simulacros`, crea destinatarios en `simulacro_targets`, y después permite actualizar, eliminar y añadir/quitar cursos mediante operaciones directas desde el navegador.

## 2. Estructuras existentes que sí se pueden reutilizar como referencia

El proyecto ya tiene un módulo distinto de simulacros Saber con estas tablas:

- `saber_sims`
- `saber_sim_targets`
- `saber_sim_items`
- `saber_attempts`

También existe `saber_submit(uuid, integer, jsonb, integer, boolean)`, una función `SECURITY DEFINER` que:
- exige sesión de usuario y perfil estudiante con curso;
- valida que el simulacro esté activo y asignado al curso;
- valida vencimiento, sesión e intentos máximos;
- valida que las respuestas pertenezcan a los ítems del examen y que los índices estén dentro de las opciones;
- calcula los aciertos en servidor con `question_keys`;
- guarda el intento y devuelve el resultado y la clave al final.

La función está vinculada al modelo `saber_sims`, no al contrato genérico `simulacros`. No se debe llamar ni adaptar a ciegas.

## 3. Riesgos detectados en el flujo genérico actual

1. **No desplegable contra el esquema actual:** las consultas a las tres tablas ausentes fallarán.
2. **RPC ausente:** `finish()` invoca `submit_attempt`, que no existe en el catálogo inspeccionado.
3. **Selección no persistida:** `startSim()` toma preguntas aleatorias de `questions` al iniciar cada intento; no fija una lista de ítems por simulacro. Esto dificulta reproducir y auditar un examen.
4. **Control de intentos en servidor pendiente:** el navegador agrupa intentos y muestra conteos, pero eso no reemplaza una validación atómica en servidor.
5. **Publicación no atómica:** la creación inserta primero el simulacro y luego sus destinatarios. Si falla el segundo paso, puede quedar un simulacro huérfano.
6. **Permisos no definidos:** las operaciones directas de alta, modificación y eliminación requieren políticas RLS estrictas por docente propietario, colegio y curso. No se deben crear tablas con políticas genéricas.
7. **Clave de respuestas:** el estudiante solo recibe columnas de preguntas sin `question_keys`, lo cual es correcto como principio. El cálculo debe permanecer en servidor.

## 4. Contrato del frontend genérico observado

Creación de simulacro:
- `title`, `kind`, `description`, `grade`, `subject`
- `n_questions`, `minutes_per_question`, `max_attempts`, `due_at`
- relación destino por `simulacro_id` y `course_id)

Consultas de estudiante:
- lista de simulacros;
- curso propio (`profiles.course_id`);
- intentos propios con `simulacro_id` y `score).

Consulta de docente:
- simulacros filtrados por `teacher_id`;
- relación anidada `simulacro_targets(course_id));
- historial de `attempts` con `subject`, `score`, `grade`, `created_at`, perfil, curso y simulacro.

Finalización:
- RPC `submit_attempt` con parámetros `p_grade`, `p_subject`, `p_answers`, `p_seconds_left`, `p_auto`, `p_simulacro_id`.

## 5. Decisión técnica recomendada

No crear ahora tablas genéricas ni duplicar el motor Saber. Primero se debe decidir si el módulo genérico será:
- **A. una capa de compatibilidad** sobre el motor existente `saber_sims`/items/intentos, si sus reglas de sesiones, selección de preguntas y calificación cubren los casos de `kind`; o
- **B. un motor separado**, con tablas propias, ítems fijados al publicar, RPC transaccionales para crear/publicar y finalizar, y RLS por propietario/curso.

La opción A reduce duplicación, pero requiere mapear con precisión `kind`, una o varias materias, selección de preguntas y el formato de resultados. La opción B es más fiel al frontend actual, pero implica diseñar, probar y mantener otro motor.

## 6. Siguiente trabajo antes de escribir SQL

1. Auditar todas las vistas y usos de `SF.k` (`kind`) para conocer los tipos de simulacro soportados.
2. Auditar todos los consumidores de `attempts` y `simulacros` (estudiante, docente, tablero, medallas y exportaciones).
3. Comparar las reglas de `saber_submit` con el contrato genérico y documentar incompatibilidades.
4. Proponer una migración única y pruebas RLS para estudiante, docente propietario, docente ajeno, directivo y administrador.
5. No ejecutar DDL ni modificar datos de producción hasta tener el contrato completo.

## 7. Verificación realizada

- Lectura de `index.html` en la rama de trabajo.
- Inspección de columnas reales en `information_schema.columns`.
- Inspección de políticas RLS de `questions`, `question_keys` y las cuatro tablas `saber_*`.
- Lectura de la definición de `saber_submit`.
- No se ejecutaron escrituras SQL, no se crearon tablas ni se cambiaron políticas.
