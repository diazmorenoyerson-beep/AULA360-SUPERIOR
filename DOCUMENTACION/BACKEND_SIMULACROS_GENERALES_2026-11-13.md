# Backend de simulacros generales en línea — 2026-11-13

## Alcance implementado
El módulo general de simulacros (distinto de Saber 11) cuenta ahora con:
- Tablas `simulacros`, `simulacro_targets`, `attempts` y `general_sim_runs`.
- Asignación de evaluaciones a cursos propiedad del docente.
- Inicio de sesión de examen en servidor, selección aleatoria de preguntas publicadas con clave válida y reloj con vencimiento persistido.
- Reanudación de una sesión activa sin reiniciar el reloj.
- Guardado de respuestas en servidor; el envío califica exclusivamente el snapshot guardado en servidor y vuelve a validar que las claves sigan siendo válidas al calificar.
- Cálculo de nota, aciertos, tiempo usado y envío automático por vencimiento.
- Conteo de cobertura del banco limitado al grado/asignaturas del docente o al curso del estudiante (`avail_counts`).
- Panel docente con intentos, participantes, promedio y mejor resultado por estudiante.
- RLS en las cuatro tablas. `general_sim_runs` no tiene políticas ni permisos directos para clientes; las funciones autorizadas operan como única puerta de acceso a sesiones.

## RPC
- `avail_counts()`
- `start_general_sim(p_sim uuid)`
- `save_general_sim_answers(p_run uuid,p_answers jsonb)`
- `submit_general_sim(p_run uuid,p_auto boolean)`

Las funciones tienen `search_path=''`, comprueban `auth.uid()`, y sus permisos EXECUTE están revocados para `public` y `anon`; se conceden a `authenticated`. Las respuestas correctas nunca se entregan al cliente durante el examen.

## Frontend
`index.html` dejó de descargar y elegir preguntas directamente desde el navegador. Ahora usa las RPC de inicio, guardado y envío. El autoguardado se programa al responder; el envío fuerza una última sincronización y reintenta tras errores transitorios. El service worker pasa a `aula360-premium-v25`.

## Migraciones
- `database/2026-11-13_general_simulations_backend.sql`
- `database/2026-11-13_general_simulation_followup_fixes.sql`
- `database/2026-11-13_secure_question_availability_counts.sql`
- `database/2026-11-13_general_simulation_policy_consolidation.sql`
- `database/2026-11-13_validate_general_sim_keys_at_submit.sql`
- `database/2026-11-13_general_simulation_teacher_approval_policies.sql`

## Verificación y límites conocidos
- Confirmado en Supabase: las cuatro tablas existen con RLS habilitado.
- Confirmado: las tres RPC de sesión y `avail_counts` no son ejecutables por `anon`, sí por `authenticated`, y fijan `search_path` vacío.
- Las políticas SELECT de simulacros, destinatarios e intentos están consolidadas por ámbito; las operaciones de gestión de simulacros requieren docente aprobado.
- El asesor de seguridad aún informa avisos generales de funciones SECURITY DEFINER de otras partes del proyecto. Los avisos de las RPC nuevas corresponden a endpoints autenticados intencionales; requieren autorización interna por usuario/sesión.
- `general_sim_runs` y `saber_session_runs` aparecen en el asesor como RLS sin políticas. Es deliberado: no tienen permisos directos para clientes y se usan desde RPC controladas.
- El banco de preguntas publicado con clave válida está vacío (0 registros válidos en la consulta de grado 11). Por eso todavía no se puede completar una prueba E2E de estudiante/docente con nota real. No cargar preguntas inventadas para simular una prueba.
- No se ha desplegado esta rama a Vercel ni se ha verificado una URL pública. La restricción de deployments reportada previamente sigue pendiente de una nueva oportunidad de despliegue.
