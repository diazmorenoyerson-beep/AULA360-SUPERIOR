# Auditoría RLS de claves y resultados de evaluaciones — 2026-11-12

Proyecto Supabase: `frhunuivktmfjiyvdqha`  
Alcance: lectura de políticas RLS y privilegios de tabla. No se ejecutaron escrituras.

## Hallazgo prioritario: resultados de pruebas impresas

La tabla `public.saber_imp_results` tiene RLS habilitado y una política permisiva:

- `saber_imp_results_director_all`
- Comando: `ALL`
- Rol: `authenticated`
- `USING` y `WITH CHECK`: permiten operar sobre resultados si el usuario es rector/coordinador del colegio, propietario (`teacher_id=auth.uid()`) del simulacro o administrador global.

Además, `authenticated` tiene privilegios SQL de SELECT, INSERT, UPDATE y DELETE sobre esta tabla.

La función `saber_imp_guardar` realiza el cálculo oficial de respuestas correctas y resultados por área/grado en el servidor. Sin embargo, la política `ALL` deja abierta una vía de escritura directa a usuarios autenticados autorizados por la política, sin obligarlos a usar esa función.

**Riesgo:** un docente propietario o directivo autorizado podría insertar, modificar o borrar filas de resultados directamente y alterar el registro oficial sin pasar por el cálculo de `saber_imp_guardar`.

**Recomendación:** revisar el contrato del módulo de pruebas impresas y separar permisos:
- Lectura de resultados para los roles autorizados.
- Escritura únicamente mediante RPC controlada que valide el lote y calcule las notas.
- Retirar INSERT/UPDATE/DELETE directos a `authenticated` o reemplazar la política `ALL` por políticas de solo lectura, después de comprobar que el frontend no depende de escrituras directas.

No se aplicó este cambio porque requiere confirmar las rutas de escritura del frontend y preparar una migración reversible.

## Otras tablas inspeccionadas

### `question_keys`
- RLS habilitado.
- Única política observada: administrador global, para todas las operaciones.
- No hay política para `anon`.
- La tabla tiene grants amplios a nivel SQL, pero la ausencia de política para `anon` y la política limitada para `authenticated` mantienen el filtro RLS. Recomendable revisar grants por mínimo privilegio en una migración posterior.

### `saber_attempts`
- RLS habilitado.
- Estudiante puede leer solo sus propios intentos.
- Docente propietario del simulacro y administrador pueden leer los intentos.
- No se observó política directa de INSERT/UPDATE/DELETE para usuarios autenticados; el envío oficial pasa por `saber_submit`.

### `saber_sim_items`
- Estudiante puede leer ítems de simulacros activos asignados a su curso.
- Docente propietario y administrador tienen política `ALL`.
- Las claves de respuesta no están en esta tabla; `question_keys` mantiene una política separada.
- La política `ALL` permite al propietario alterar los ítems de su propio simulacro. Confirmar que esto coincide con el comportamiento de edición esperado.

### `saber_imp_items`
- Rector/coordinador del colegio, docente propietario y administrador tienen política `ALL`.
- Permite editar el contenido/estructura del cuadernillo impreso. Confirmar si debe bloquearse la edición una vez que existan resultados asociados.

## Nota sobre grants y RLS

La consulta de privilegios muestra grants SQL amplios a `anon` y `authenticated` para estas tablas. Los grants por sí solos no eliminan RLS: las políticas continúan filtrando operaciones. Aun así, conviene aplicar mínimo privilegio a nivel de grants, especialmente para `anon`, en una migración revisada y probada.

## Próximos pasos
1. Revisar en el frontend todos los accesos directos a `saber_imp_results` y `saber_imp_items`.
2. Diseñar una migración que preserve lectura autorizada y centralice la escritura de resultados en RPC.
3. Probar con cuentas separadas de estudiante, docente propietario, docente ajeno, coordinador, rector y administrador.
4. Verificar que el cierre de la prueba impida modificar ítems después de cargar resultados, si esa es la regla de negocio.

## Estado
Hallazgo documentado. Supabase permanece sin cambios.
