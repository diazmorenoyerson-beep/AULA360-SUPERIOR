# Auditoría de seguridad y rendimiento Supabase — 2026-11-12

Proyecto revisado: `frhunuivktmfjiyvdqha`  
Fecha de consulta: 2026-11-12 (UTC)  
Alcance: inspección de solo lectura. No se ejecutaron cambios de esquema, políticas, funciones ni configuración.

## Resultados confirmados

### Controles positivos
- Las 50 tablas base del esquema `public` tienen Row Level Security (RLS) habilitado.
- Se inspeccionaron las políticas de `profiles`, `courses`, `questions`, `planes_area` y `asignaturas`. Existen restricciones por usuario, rol, colegio o autor en las políticas consultadas.
- La política de lectura pública/autenticada de `asignaturas` usa `true`; es un catálogo, no contiene datos personales según el esquema inspeccionado.

### Alertas de seguridad del asesor Supabase
1. **34 funciones SECURITY DEFINER ejecutables por authenticated.** El asesor `authenticated_security_definer_function_executable` las reporta como advertencia. Esto no demuestra por sí solo una vulnerabilidad: cada función debe revisarse por su lógica de autorización, validación de `auth.uid()`, parámetros y privilegios. No revocar EXECUTE masivamente.
2. **Protección contra contraseñas filtradas desactivada.** El asesor `auth_leaked_password_protection` reporta esta configuración como deshabilitada. Recomendar habilitarla desde Auth cuando se confirme la política de acceso y el impacto esperado.

### Alertas de rendimiento
- El asesor reportó **23 claves foráneas sin índice de cobertura**. Deben priorizarse según volumen y consultas reales antes de crear índices.
- El asesor reportó **23 casos de políticas permisivas múltiples** para la misma tabla/rol/acción. No implica automáticamente acceso indebido: hay que revisar si las condiciones OR resultantes corresponden al modelo de permisos esperado.
- También aparecen índices sin uso observado; no deben eliminarse basándose únicamente en una captura de estadísticas, porque pueden servir a cargas poco frecuentes.

## Políticas revisadas (resumen)
- `profiles`: lectura según identidad propia, administración, dirección del colegio o relación docente-estudiante; actualización propia y actualización privilegiada de ámbito.
- `courses`: lectura para docente propietario, administración y dirección del colegio; escritura de docente con comprobación de propiedad.
- `questions`: lectura de preguntas publicadas/activas y lectura de preguntas propias por docentes aprobados; administración completa.
- `planes_area`: propiedad del docente y lectura de dirección del colegio.
- `asignaturas`: catálogo visible; escrituras administrativas.

## Próximos pasos seguros
1. Inspeccionar el cuerpo de las 34 funciones SECURITY DEFINER y clasificarlas por riesgo; corregir solo las que carezcan de autorización adecuada.
2. Revisar el flujo de contraseñas y activar la protección contra filtraciones con aprobación del responsable del proyecto.
3. Cruzar las 23 claves foráneas sin índice con el uso de tablas y consultas antes de proponer índices.
4. Revisar las políticas permisivas múltiples por su efecto combinado, sin cambiar políticas en bloque.
5. Mantener pendiente la implementación de Pruebas de periodo hasta definir y validar el contrato de tablas, RLS y RPC.

## Estado
Auditoría de solo lectura documentada. No se modificó Supabase. La rama de trabajo continúa separada de producción.
