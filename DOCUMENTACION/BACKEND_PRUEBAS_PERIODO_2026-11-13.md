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
