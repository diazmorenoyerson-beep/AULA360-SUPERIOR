# Endurecimiento de resultados impresos — 2026-11-13

Proyecto Supabase: `frhunuivktmfjiyvdqha`  
Rama GitHub: `premium/visual-3d-2026-11`

## Hallazgo y revisión del frontend

La tabla `public.saber_imp_results` tenía una política RLS `ALL` para usuarios autenticados autorizados por colegio o propiedad del simulacro. Además, los roles `anon` y `authenticated` tenían privilegios de escritura directos.

Se revisaron los 36 archivos JavaScript del repositorio. La única ruta de escritura del frontend para resultados impresos es la RPC `saber_imp_guardar(p_imp,p_rows)`; la consulta se realiza por `saber_imp_resultados(p_imp)`. No se encontraron escrituras directas con `.from('saber_imp_results')`.

La función de guardado:
- Pertenece a `postgres`, es `SECURITY DEFINER` y fija `search_path=''`.
- Comprueba identidad, autorización sobre el simulacro, pertenencia del estudiante al curso, cuadernillo y posiciones de respuestas.
- Calcula aciertos, áreas, grados y competencias con las claves del servidor.
- Solo concede ejecución a `authenticated` y `service_role`; no a `anon`.

## Cambio aplicado

Migración: `database/2026-11-13_harden_saber_imp_results_write_access.sql`

- Se reemplazó la política `ALL` por una política `SELECT` para docente propietario, rector/coordinador del mismo colegio y administrador.
- Se revocaron todos los privilegios de tabla a `anon`.
- Se revocaron INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES y TRIGGER a `authenticated`.
- Se conservó SELECT para `authenticated`.
- El guardado oficial continúa por la RPC validada `saber_imp_guardar`.

## Verificación posterior

Consulta de privilegios e introspección RLS confirmaron:
- RLS habilitado.
- Una política SELECT para `authenticated`.
- `anon` no puede leer la tabla.
- `authenticated` puede leer, pero no insertar, actualizar ni borrar.
- `anon` no puede ejecutar la RPC de guardado.
- `authenticated` conserva ejecución de la RPC de guardado.

No se ejecutó una prueba de escritura autenticada con una cuenta real; el flujo completo de OMR/guardado debe verificarse con roles reales antes de producción.

## Asesores Supabase

El asesor de seguridad sigue mostrando avisos generales de funciones `SECURITY DEFINER` expuestas a `authenticated`, incluidas RPC intencionales que validan identidad y ámbito. No se revocaron en bloque para no romper operaciones legítimas. También aparecen dos tablas de sesiones con RLS sin políticas directas (`general_sim_runs`, `saber_session_runs`); ambas se usan deliberadamente mediante RPC controladas y sin permisos directos de clientes.

Los avisos de políticas permisivas múltiples e índices no utilizados corresponden a otras tablas y requieren auditoría individual; no se hicieron cambios masivos.

## Pendiente

- Probar con cuenta de rector/coordinador, docente propietario, docente ajeno y estudiante.
- Confirmar que OMR sigue guardando mediante la RPC y que el informe CSV coincide con la consulta.
- Completar pruebas de interfaz autenticadas y registrar resultados antes de promover a producción.
