# AULA360 — Contrato técnico para Pruebas de periodo
Fecha de inspección: 2026-11-12  
Estado: análisis de compatibilidad; **no se ha ejecutado DDL ni se han modificado datos**.

## 1. Hallazgo de bloqueo

El módulo del frontend `periodo.js` ya implementa el flujo docente/estudiante, pero el backend conectado no contiene las cuatro tablas que el módulo consulta ni las tres RPC que invoca. Por tanto, no basta con retocar la interfaz: el módulo no puede funcionar de extremo a extremo hasta completar y probar el backend.

Dependencias consultadas por el frontend:
- Tablas: `periodo_pruebas`, `periodo_items`, `periodo_targets`, `periodo_intentos`.
- RPC: `periodo_banco(p_subject, p_grade)`, `periodo_preguntas(p_prueba)`, `periodo_enviar(p_prueba, p_answers, p_seconds)`.
- Tablas existentes relacionadas: `profiles`, `courses`, `asignaturas`, `planes_area`, `questions`.

## 2. Esquema existente confirmado

En el proyecto Supabase se verificó:
- `profiles`: PK `id uuid`; incluye `role`, `is_admin`, `colegio_id`, `course_id uuid`, `grados smallint[]`, `asignaturas text[]`.
- `courses`: PK `id uuid`; incluye `teacher_id uuid`, `colegio_id bigint`, `grade smallint`, `name text`.
- `asignaturas`: `id integer`, `nombre text`, `banco_subject text`.
- `questions`: PK `id uuid`; incluye `grade smallint`, `subject text`, `body text`, `options array`, `status text`, `active boolean`, `assets jsonb`, `context_kind`, `image_path`, `stimulus_title`, `stimulus_content`, `author_id uuid`, `competency text`.
- `planes_area`: incluye `docente_id`, `asignatura`, `grado`, `malla jsonb`.

No se deben inventar columnas adicionales de `questions`: el módulo también lee `grupo_key`, `topic`, `difficulty` y posiblemente `explanation`, pero esas columnas no aparecieron en el esquema consultado. Antes de programar el RPC hay que adaptar el mapeo a las columnas reales y verificar dónde vive la clave correcta de cada pregunta.

## 3. Riesgos funcionales detectados en el frontend actual

1. `guardar()` inserta `grado: 11` fijo, aunque el docente puede seleccionar cursos de distintos grados. El valor no debe quedar codificado así. La solución correcta es derivar y validar el grado desde los cursos seleccionados, o eliminar ese campo del contrato si no es parte del modelo definitivo.
2. El listado del estudiante consulta todas las pruebas publicadas y no aplica filtro de curso en la consulta visible. La autorización real debe hacerse en servidor/RLS/RPC; ocultar botones en el navegador no protege pruebas ni respuestas.
3. `periodo_preguntas` debe devolver solo el contenido necesario para presentar el examen y nunca exponer la respuesta correcta ni explicaciones antes de la entrega.
4. `periodo_enviar` debe calcular la nota en el servidor. No debe confiar en claves correctas, puntajes ni totales enviados por el navegador.
5. `resultados()` no comprueba explícitamente `r.error`; hoy un fallo puede mostrarse como una tabla vacía y ocultar el problema.
6. El contador del navegador no es una garantía de tiempo. El servidor debe validar ventana de apertura/cierre, duración y número de intentos con datos persistidos.

## 4. Contrato de datos recomendado (pendiente de aprobación del esquema)

### `periodo_pruebas`
Identidad UUID; docente creador; colegio; título; asignatura; periodo; minutos; máximo de intentos; fechas de apertura/cierre; estado (`borrador`, `publicada`, `cerrada`); marcas de creación/actualización.

### `periodo_items`
Identidad UUID; `prueba_id`; `question_id`; posición entera única por prueba. Debe impedir duplicar una misma pregunta dentro de una prueba.

### `periodo_targets`
Identidad UUID; `prueba_id`; `course_id`. Debe validar en servidor que el curso pertenece al colegio/docente autorizado.

### `periodo_intentos`
Identidad UUID; `prueba_id`; `user_id`; respuestas JSON; aciertos; total; nota; segundos empleados; fecha de entrega. Debe restringir lectura de respuestas/resultados por rol y relación con curso.

Estos campos son un contrato de diseño, no una afirmación de que las tablas ya existan. Los tipos, constraints, políticas y cascadas se definirán tras inspeccionar las migraciones completas y el modelo de roles actual.

## 5. Reglas de seguridad no negociables

- RLS habilitado en las cuatro tablas.
- Docentes: crear y administrar únicamente pruebas propias y cursos autorizados.
- Estudiantes: ver pruebas publicadas dirigidas a su curso; crear únicamente sus propios intentos; leer solo sus resultados.
- Claves de respuestas: solo accesibles desde la función de calificación del servidor; nunca incluirlas en el payload de inicio.
- RPC de envío: derivar `auth.uid()`, validar destinatario, estado, ventana, intentos y duración; calcular la calificación con la clave almacenada en el banco.
- No usar `user_metadata` para decisiones de autorización.
- Cualquier función `SECURITY DEFINER` debe justificar por qué necesita elevar privilegios, fijar `search_path`, validar identidad/rol dentro de su cuerpo y limitar `EXECUTE` a los roles estrictamente necesarios.

## 6. Plan de implementación seguro

1. Inspeccionar migraciones existentes, políticas RLS, columnas reales y el formato de respuestas correctas del banco.
2. Escribir una migración nueva y versionada para las cuatro tablas, índices, constraints y políticas específicas.
3. Implementar las tres RPC con autorización y calificación del lado servidor.
4. Ejecutar pruebas con cuentas de docente, estudiante del curso objetivo, estudiante de otro curso y administrador.
5. Adaptar `periodo.js` al esquema confirmado; corregir el grado fijo, manejo de errores y filtros de disponibilidad.
6. Ejecutar Supabase advisors y pruebas funcionales antes de activar el módulo.

## 7. Estado de cambios

- Solo inspección SQL de lectura.
- No se crearon tablas, funciones, políticas ni usuarios.
- No se modificó el proyecto de producción.
- No se debe declarar este módulo operativo hasta completar los pasos de implementación y pruebas.
