# Auditoría técnica AULA360 — 12 de noviembre de 2026

## Alcance y método

Auditoría estática del frontend distribuido en el ZIP `AULA360_SUPERIOR_PUBLICACION.zip` y consulta de solo lectura al proyecto Supabase `frhunuivktmfjiyvdqha`. Se compararon los contratos `.from(...)` y `.rpc(...)` detectados en los módulos JavaScript con las tablas y funciones presentes en el esquema `public`.

Esta auditoría no ejecutó escrituras ni modificó la base de datos.

## Resultado del contrato frontend/backend

- Tablas/referencias distintas inventariadas en el frontend: 64.
- Tablas públicas existentes en Supabase: 49.
- Referencias de tabla del frontend que no existen actualmente: 23.
- Funciones RPC esperadas por el frontend: 51.
- Funciones RPC esperadas que no existen actualmente: 20.
- Migraciones registradas por Supabase: 4.

### Tablas del frontend pendientes

`attempts`, `auditoria`, `clase_sesiones`, `colegio_estudiantes`, `formatos-colegio`, `periodo_intentos`, `periodo_items`, `periodo_pruebas`, `periodo_targets`, `planeador-formatos`, `planes-area`, `print_jobs`, `print_results`, `referentes`, `simulacros`, `talleres_preparados`, `virtual_archivos`, `virtual_descargas`, `virtual_entregas`, `virtual_trabajo_cursos`, `virtual_trabajos`, `virtual-entregas`, `virtual-material`.

Nota: `planes_area` sí existe; `planes-area` es otro nombre y no existe. `virtual-entregas` y `virtual-material` son referencias con guion y tampoco existen.

### Funciones RPC pendientes

`banco_ia_config_set`, `banco_ia_generar_ahora`, `banco_ia_resumen`, `banco_ia_tope_set`, `clase_abiertas`, `clase_abrir`, `clase_cerrar`, `clase_lista`, `clase_manual`, `clase_marcar`, `clase_marcar_doc`, `clase_reporte`, `periodo_banco`, `periodo_enviar`, `periodo_preguntas`, `rector_borrar_lista`, `rector_cargar_lista`, `virtual_cancelar_entrega`, `virtual_confirmar_entrega`, `virtual_pedir_descarga`, `virtual_pedir_entrega`.

## Avisos de seguridad de Supabase

El asesor de seguridad devolvió:

1. 34 funciones `SECURITY DEFINER` ejecutables por el rol `authenticated`. El aviso no demuestra por sí solo una vulnerabilidad: cada función debe revisarse para confirmar validación de identidad, rol, ámbito de colegio, argumentos y permisos. No revocar permisos en bloque porque podría romper funciones legítimas del frontend.
2. Protección de contraseñas filtradas desactivada en Supabase Auth. Se recomienda habilitarla desde la configuración de Auth después de validar su impacto operativo.

## Estado de publicación

- La rama `premium/visual-3d-2026-11` contiene los cambios visuales iniciales.
- La producción no fue modificada.
- Existe un despliegue preview con estado `READY` basado en el commit `8b5f27d00891a21066c6d9d79ca77e979405d067`.
- El commit posterior que actualiza el identificador del service worker no pudo desplegarse: Vercel devolvió el límite del plan Hobby de 100 despliegues por 24 horas.
- El preview puede requerir sesión SSO porque la protección del proyecto está activada para dominios de despliegue no personalizados.

## Plan recomendado de cierre

1. Resolver el acceso al preview y validar el CSS en escritorio y móvil.
2. Reconstruir el esquema faltante por módulos, empezando por pruebas de periodo, clases/sesiones, impresión y aula virtual.
3. Definir RLS y políticas de Storage por rol y colegio antes de exponer datos.
4. Revisar individualmente las funciones `SECURITY DEFINER` y habilitar protección de contraseñas filtradas.
5. Probar con cuentas de prueba independientes para estudiante, docente, rector, coordinador y administrador.
6. Integrar a `main` solo después de las pruebas de regresión y la aprobación de la revisión.

## Restricciones

No se crearon tablas o RPC automáticamente a partir de nombres detectados. El inventario del frontend no especifica por sí solo columnas, relaciones, reglas de negocio ni permisos. Cada migración debe derivarse del uso real en el módulo correspondiente y revisarse antes de aplicarla.
