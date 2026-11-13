# AULA360 PREMIUM — backend de pruebas de periodo (2026-11-13)

Rama: `premium/visual-3d-2026-11`

## Implementado en Supabase

Se crearon cuatro tablas con RLS habilitado:

- `periodo_pruebas`: configuración, docente responsable, colegio, asignatura, grado, periodo, ventana de publicación y límites de intentos.
- `periodo_items`: preguntas seleccionadas y orden.
- `periodo_targets`: cursos destinatarios.
- `periodo_intentos`: estudiante, respuestas, tiempo de inicio, tiempo utilizado, calificación y entrega automática.

Índices para docente, curso, estudiante e intentos; índice único parcial para impedir dos intentos activos simultáneos del mismo estudiante en la misma prueba.

RPC disponibles:

- `periodo_banco`: devuelve preguntas publicadas y con clave válida, sin exponer respuestas correctas.
- `periodo_preguntas`: verifica estudiante, curso destinatario, publicación, ventana y máximo de intentos; inicia o reanuda el intento y devuelve vencimiento y respuestas previamente guardadas.
- `periodo_guardar_respuestas`: persiste respuestas en servidor, valida que pertenezcan al examen y que la opción exista; no acepta cambios después del vencimiento.
- `periodo_enviar`: calcula la nota exclusivamente con claves del servidor, calcula el tiempo desde el inicio registrado y congela las respuestas guardadas si el tiempo ya venció.
- Al abrir y calificar vuelve a comprobar que todas las preguntas conserven claves válidas; si una clave desaparece o se invalida, no calcula una nota parcial injusta.

Seguridad:
- RLS por docente propietario, curso asignado y colegio para rector/coordinador.
- El docente solo puede asignar sus propios cursos; rector/coordinador pueden asignar cursos de su colegio.
- Las pruebas publicadas no permiten modificar contenido ni programación.
- La publicación exige cursos, preguntas publicadas/activas, grado coincidente y claves válidas.
- La tabla de intentos no permite escritura directa desde clientes; solo lectura autorizada y RPCs.
- Las funciones sensibles usan `SECURITY DEFINER`, `search_path` fijo y permisos explícitos.

## Frontend actualizado

`periodo.js`:
- Carga el banco desde `periodo_banco`.
- Guarda respuestas al servidor a medida que el estudiante responde.
- Al recargar, recupera las respuestas guardadas y calcula el tiempo restante usando la fecha de vencimiento del servidor.
- Espera las escrituras pendientes antes de entregar.
- Muestra intentos y señala las entregas automáticas en los informes de docente/estudiante.

## Migración

`database/2026-11-13_periodo_exams_backend.sql`

## Verificación y limitaciones

- Confirmadas 4 tablas, RLS en las 4, 9 políticas y los índices principales.
- Confirmadas en el código las llamadas de guardado de respuestas, recuperación del reloj y espera de escrituras antes de entregar.
- El banco actualmente tiene 0 preguntas publicadas, activas y con clave válida; por ello no se puede completar una prueba real de extremo a extremo todavía.
- No se han creado exámenes de prueba ni se han inventado preguntas.
- No se ha desplegado a Vercel ni fusionado a `main`.
- Pendiente: QA autenticado con docente y estudiante, una vez el banco tenga preguntas publicadas y claves válidas; revisar también la compilación global del frontend.


## Informe académico por prueba

Se añadió el RPC `periodo_reporte(p_prueba)`, protegido por propietario o rol rector/coordinador del mismo colegio. Devuelve:

- Resumen de la prueba, cantidad de preguntas e intentos entregados.
- Por curso: estudiantes matriculados activos, participantes únicos, intentos y promedio de notas.
- Por estudiante: intentos, mejor nota, última nota, fecha del último envío y si fue automático.
- No devuelve claves ni respuestas del examen.

El frontend `periodo.js` ahora presenta indicadores, participación por curso, seguimiento individual y exportación CSV.

Migración: `database/2026-11-13_periodo_academic_report.sql`.

No se presentan bandas de riesgo ni niveles de desempeño inventados; esos criterios deben definirse institucionalmente antes de incorporarlos.


## Ajustes adicionales de integridad y seguridad

- Los intentos sin entregar ya no consumen el contador de intentos del estudiante; se puede reanudar la sesión activa.
- Una prueba publicada no puede volver a borrador y una prueba cerrada no puede reabrirse.
- Las funciones de trigger `periodo_guard_publish` y `periodo_set_owner` no se pueden invocar directamente como RPC.
- Se separaron las políticas de escritura de items/destinatarios para evitar políticas SELECT permisivas duplicadas.
- Se indexó la FK `periodo_items.question_id`.
- Se revocó la ejecución anónima de `saber_begin_session`; conserva ejecución para usuarios autenticados.

La revisión de seguridad general sigue mostrando advertencias preexistentes de otras funciones `SECURITY DEFINER` del proyecto. No se revocaron masivamente porque varias son flujos activos de la plataforma y requieren auditoría individual. La tabla `saber_session_runs` mantiene RLS sin políticas directas deliberadamente: se accede mediante RPCs autorizadas.


## Sesiones Saber 11: respuestas guardadas en servidor (2026-11-13)

Se reforzó el flujo de simulacros cronometrados:

- `saber_session_runs.answers` guarda el snapshot de respuestas en PostgreSQL.
- `saber_save_answers(p_run,p_answers)` valida que el intento pertenezca al estudiante autenticado, que siga abierto, que no haya vencido y que cada pregunta/opción corresponda al simulacro.
- `saber_begin_session` devuelve las respuestas del servidor al reanudar; el reloj sigue ligado a `expires_at`.
- `saber_submit` ya no califica el JSON enviado por el navegador: califica exclusivamente el último snapshot guardado en el servidor. Si el tiempo terminó, registra la entrega como automática.
- El cliente guarda respuestas en segundo plano, espera la última escritura antes de una entrega manual y usa el snapshot del servidor cuando se reanuda.
- Se fijó `search_path` vacío en las funciones privilegiadas del flujo y se revocó EXECUTE a `public` y `anon`; `authenticated` conserva el permiso.

Migración: `database/2026-11-13_saber_server_answer_persistence.sql`.

Verificación técnica: la columna existe, las tres RPC tienen permisos autenticados y no permiten ejecución anónima; `saber_submit` usa `run.answers` y no lee las respuestas del payload. La prueba completa con una sesión real de estudiante sigue pendiente porque el banco tiene cero preguntas publicadas y válidas. La persistencia en servidor mejora integridad y recuperación, pero no equivale a una certificación anti-trampas ni sustituye el QA autenticado.
