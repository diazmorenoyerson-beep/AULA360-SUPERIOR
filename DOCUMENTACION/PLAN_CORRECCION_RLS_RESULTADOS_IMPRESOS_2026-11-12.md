# Plan de corrección RLS — resultados de pruebas impresas

Fecha: 2026-11-12  
Proyecto Supabase: `frhunuivktmfjiyvdqha`

## Verificación del frontend original

Se inspeccionó `AULA360_SUPERIOR/saberimp.js` dentro del ZIP original. El flujo de guardado de hojas identificadas llama a:

```js
sb.rpc('saber_imp_guardar', { p_imp: Z.sel, p_rows: [...m.values()] })
```

La consulta de resultados usa `sb.rpc('saber_imp_resultados', { p_imp: Z.sel })`.

En el archivo inspeccionado no se encontraron escrituras directas a la tabla `saber_imp_results`. Esto respalda la posibilidad de cerrar la escritura directa mediante RLS/grants sin cambiar el flujo visible del frontend, pero todavía se debe buscar en el resto de módulos y probar la versión completa.

## Cambio propuesto (NO APLICADO)

1. Conservar SELECT a rector/coordinador del colegio, docente propietario y administrador.
2. Eliminar la política `ALL` de `saber_imp_results` y crear política SELECT equivalente.
3. Revocar INSERT, UPDATE y DELETE directos de `authenticated` y `anon` sobre `saber_imp_results`; la RPC `saber_imp_guardar` como SECURITY DEFINER puede seguir realizando el guardado si su propietario/privilegios son correctos.
4. Antes de ejecutar, comprobar propietario de la función, search_path, grants EXECUTE y que no haya otras funciones o procesos legítimos que dependan de escritura directa.
5. Probar la RPC con cada rol autorizado y verificar que las escrituras directas fallen incluso para el docente propietario.

## Pruebas de aceptación

- El docente propietario puede cargar hojas mediante `saber_imp_guardar`.
- Un docente ajeno no puede leer ni escribir resultados.
- Un estudiante no puede leer ni escribir resultados impresos.
- Rector/coordinador del mismo colegio puede consultar, pero no alterar filas directamente.
- Administrador puede consultar, pero la edición queda centralizada en RPC.
- El frontend continúa mostrando los resultados guardados.

## Estado

Solo análisis y plan. No se creó ni ejecutó migración SQL; no se alteraron políticas ni privilegios en Supabase.
