# Avance AULA360 PREMIUM — 2026-11-13

Rama: `premium/visual-3d-2026-11`

## Diagnósticos y análisis académico

- Se amplió el informe de `saberimp.js` para mostrar lectura pedagógica, dominio ponderado del grupo, prioridad por área, rangos orientativos de desempeño y listado de estudiantes por debajo del 50% en diagnósticos.
- Se mantiene el comparativo por curso, resultados individuales, CSV y dominio por grado de referencia.
- El informe aclara que los rangos son señales pedagógicas orientativas y que el global estimado Saber 11 no es un puntaje oficial ICFES.
- Los registros antiguos con cobertura incompleta se identifican como tales. No deben interpretarse como pruebas completas.

## Endurecimiento de creación de diagnósticos

Se actualizó `public.create_diag(uuid[],text,date,integer,text[])` en Supabase para:
- Rechazar cantidad nula o fuera del rango permitido.
- Rechazar diagnósticos con menos de 20 o más de 120 preguntas totales.
- Rechazar títulos de más de 120 caracteres.
- Rechazar áreas nulas, duplicadas o fuera del catálogo Saber 11 permitido.
- Mantener validación de cursos únicos y pertenecientes al colegio del usuario.
- Exigir preguntas publicadas, activas y con clave válida en cantidad suficiente.

Migración reproducible: `database/2026-11-13_harden_diagnostic_configuration.sql`.

## Estado del backend de pruebas de periodo

La inspección de Supabase confirmó que todavía no existen las tablas:
- `periodo_pruebas`
- `periodo_items`
- `periodo_targets`
- `periodo_intentos`

Tampoco aparecen funciones RPC cuyo nombre incluya `periodo`. El frontend `periodo.js` ya llama a estas tablas y RPC; por ello, las pruebas de periodo no pueden considerarse funcionales de extremo a extremo hasta implementar el contrato, RLS y calificación del lado servidor. No se creó un backend improvisado en este avance.

## Verificación y límites

- Confirmadas por introspección las validaciones nuevas de `create_diag`.
- Confirmada la presencia del informe ampliado y el CSV en `saberimp.js`.
- La rama sigue separada de `main`; no se fusionó ni desplegó.
- No se han hecho pruebas completas con estudiantes: el banco de preguntas revisado previamente sigue sin registros publicados válidos.


## Seguridad de resultados impresos

- Se revisaron los 36 archivos JavaScript del repositorio: el guardado del módulo impreso pasa por `saber_imp_guardar`; no hay escrituras directas del frontend a `saber_imp_results`.
- Se reemplazó la política RLS `ALL` por una política SELECT para el docente propietario, rector/coordinador del mismo colegio y administrador.
- Se revocó acceso de tabla a `anon` y escritura directa a `authenticated`; la escritura oficial continúa por la RPC `saber_imp_guardar`, que calcula con claves del servidor.
- Verificación SQL posterior: RLS activo; `anon` sin SELECT; `authenticated` con SELECT y sin INSERT/UPDATE/DELETE; RPC de guardado ejecutable por authenticated y no por anon.
- No se hizo una prueba real autenticada de carga OMR después del cambio. Se mantiene pendiente QA por roles.
- Detalle: `DOCUMENTACION/SEGURIDAD_RESULTADOS_IMPRESOS_2026-11-13.md`.

## Informe institucional y exportación

- El CSV del informe institucional ahora respeta los filtros activos de fuente, curso y búsqueda, igual que la vista en pantalla.
- Se corrigió el texto de resumen para indicar cinco fuentes de evaluación.
- Se incrementó la versión del módulo y la caché PWA para que los cambios se descarguen sin reutilizar scripts/estilos anteriores.
