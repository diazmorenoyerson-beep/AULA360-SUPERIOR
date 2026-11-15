# Revisión individual de funciones sensibles — 2026-11-12

Proyecto: `frhunuivktmfjiyvdqha`  
Alcance: lectura de definiciones y privilegios de ejecución de funciones `SECURITY DEFINER`. No se modificó Supabase.

## Hallazgos favorables confirmados

- Ninguna de las funciones `SECURITY DEFINER` inspeccionadas concede ejecución al rol `anon`; la ejecución se limita a `authenticated` o a contextos internos sin privilegio directo de usuario.
- `saber_submit` valida sesión, identidad del estudiante, curso asignado, simulacro activo, vencimiento, intentos disponibles, pertenencia de cada respuesta al examen y rango de opciones. Comprueba que todas las preguntas tengan clave válida antes de calificar.
- `permiso_solicitar` exige docente aprobado, colegio asociado y destinatario rector/coordinador aprobado del mismo colegio.
- `permiso_responder` exige rector/coordinador aprobado, limita al coordinador a solicitudes dirigidas a él y solo permite responder solicitudes pendientes.
- `planeador_enviar` valida propietario, colegio y destinatarios permitidos. `planeador_revisar` limita la revisión a envíos del colegio dirigidos al rol del revisor.
- `guia_enviar` valida docente aprobado, propietario o ámbito de plataforma y grado de la guía.
- `saber_imp_contenido`, `saber_imp_estudiantes` y `saber_imp_resultados` validan que el solicitante sea responsable del simulacro, directivo del mismo colegio o administrador global antes de entregar contenido, listados o resultados.

## Observaciones para seguimiento

1. **`create_diag`: selección parcial de cursos.** La función recorre únicamente cursos cuyo colegio coincide con el perfil. Si el arreglo contiene IDs ajenos/inexistentes mezclados con IDs válidos, puede procesar los válidos e ignorar silenciosamente los demás. No se observa acceso cruzado, pero conviene rechazar el arreglo completo si algún ID no pertenece al colegio, para que la operación sea explícita y predecible.
2. **`create_diag`: validación de áreas.** Acepta etiquetas de área proporcionadas por el cliente y las transforma en alias de asignaturas; no se observó una lista cerrada de áreas válidas ni rechazo de duplicados. Conviene validar contra el catálogo de áreas del producto.
3. **`hz_guardar_version`: validación de carga.** Verifica colegio, rol, asignaciones, franjas y aulas, pero no se observó límite explícito de cantidad de clases ni validación de rango de `p_puntuacion` y estructura de `p_resumen`. Definir límites de negocio antes de endurecerla.
4. **`saber_imp_contenido`: datos de calificación.** Incluye las claves correctas en el JSON de contenido. El control de acceso observado es apropiado para el flujo de generación/revisión institucional; se debe confirmar que ningún cliente estudiante invoque esta RPC desde la interfaz y que los permisos de tabla no permitan eludir el flujo.
5. **`asistencia_docentes`: datos identificativos.** Devuelve nombre y documento de docentes aprobados del colegio solo a rectoría/coordinación, según el rol obtenido por función auxiliar. Confirmar que el uso funcional requiere mostrar el documento completo; si no, devolverlo enmascarado.
6. **`banco_saber_cobertura`: agregado de banco.** No contiene comprobación de usuario dentro de la función, aunque el privilegio EXECUTE observado no incluye `anon`. Devuelve únicamente conteos de cobertura de preguntas de grado 11, no enunciados ni claves.

## Privilegios observados

La consulta de privilegios confirma `anon_execute=false` en todas las funciones `SECURITY DEFINER` revisadas. Algunas funciones internas tienen ejecución directa deshabilitada para `authenticated`, lo cual es coherente con su uso mediante triggers.

## Próximas acciones recomendadas

- Prioridad alta: inspeccionar las políticas RLS de `question_keys`, `saber_sim_items`, `saber_attempts`, `saber_imp_items` y `saber_imp_results`, porque almacenan claves o resultados.
- Prioridad media: ajustar `create_diag` para rechazar cursos inválidos/ajenos y áreas desconocidas, una vez confirmado el contrato del frontend.
- Prioridad media: confirmar la necesidad de documento completo en la lista de asistencia y aplicar enmascaramiento si el flujo lo permite.
- No cambiar grants, funciones ni políticas sin pruebas por rol (estudiante, docente, coordinador, rector y administrador).

## Estado

Auditoría de solo lectura. No se realizaron escrituras ni cambios de configuración en Supabase.
