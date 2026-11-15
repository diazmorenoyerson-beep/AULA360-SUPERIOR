# Construcción prioritaria: análisis de pruebas, simulacros y diagnósticos

Fecha: 2026-11-12
Rama: `premium/visual-3d-2026-11`

## 1. Mapa funcional comprobado en el código

### Simulacros en línea (docente y estudiante)
- Navegación: `simp` para el docente y `sim` para el estudiante.
- El frontend consulta `simulacros`, `simulacro_targets` y `attempts`.
- La pantalla docente carga los simulacros propios y cursos; la pantalla estudiante carga simulacros y sus intentos.
- Hallazgo: las tablas `simulacros` y `attempts` no estaban presentes en el inventario público revisado. El flujo de simulacros en línea no se puede considerar operativo en este proyecto hasta diseñar e implementar su contrato de datos, RLS, entrega y calificación. El nombre `simulacro_targets` también debe confirmarse en la reconciliación del esquema.

### Simulacros Saber 11 impresos
- Módulo: `saberimp.js`, expuesto como `SIMP`.
- Navegación: rector/coordinador y administración; permite crear simulacros impresos, construir tres cuadernillos, imprimir hojas personalizadas, leer hojas por foto/PDF y guardar resultados.
- Backend usado: `saber_imp`, `saber_imp_courses`, `saber_imp_items`, `saber_imp_results`, `create_saber_imp`, `saber_imp_contenido`, `saber_imp_estudiantes`, `saber_imp_guardar`, `saber_imp_resultados`, `banco_saber_cobertura`.
- Estado: existe una implementación frontend amplia y varias funciones backend. Se detectó riesgo RLS en escritura directa de `saber_imp_results`; la recomendación de endurecimiento está documentada y no se ha aplicado.

### Diagnósticos por grupo
- No hay un archivo independiente `diag.js`: la pestaña `diag` reutiliza intencionalmente `saberimp.js` y `SIMP.load('diag')`.
- Usa `create_diag`, `saber_imp` y las mismas rutas de contenido, impresión, hojas, OMR y resultados.
- Crea un diagnóstico por curso/grupo y permite elegir áreas y número de preguntas.
- Hallazgo de validación backend: `create_diag` ignora IDs de cursos ajenos/inexistentes cuando la lista también contiene cursos válidos; debe rechazar toda la solicitud si algún curso no pertenece al colegio/actor. La validación de áreas debe restringirse a un catálogo permitido y eliminar duplicados.

### Análisis de pruebas
- En el módulo impreso, los resultados se recuperan mediante `saber_imp_resultados`, se agrupan por estudiante, curso, área y grado, y se exportan a CSV.
- El análisis existente ofrece porcentajes por área y puntaje global estimado Saber 11. Para diagnósticos calcula porcentaje total.
- Esto todavía no equivale a un módulo institucional completo de análisis: faltan comparativos entre aplicaciones, evolución temporal, ranking/alertas pedagógicas y consolidación entre grupos, con filtros y permisos explícitos.
- El dashboard docente calcula estadísticas de intentos de `attempts`; por tanto también depende de la tabla ausente para simulacros en línea.

## 2. Contrato que se debe completar

### Simulacros en línea
Entidades mínimas a diseñar antes de migrar:
- simulacro: autor, colegio, título, grado, asignatura/área, ventana de disponibilidad, duración, máximo de intentos, estado y configuración de aleatorización.
- destinos: cursos asignados, validados contra el colegio del docente.
- ítems: preguntas seleccionadas, orden/versión y referencia a pregunta.
- intentos: usuario, simulacro, inicio/fin, respuestas, calificación calculada en servidor, estado y metadatos de integridad.
- detalle de respuestas: pregunta, respuesta del estudiante, corrección y retroalimentación autorizada.

La entrega y calificación deben ocurrir mediante RPC transaccional. El cliente no puede enviar el puntaje final ni consultar claves correctas antes de finalizar. RLS debe aislar por estudiante, docente propietario, colegio y administrador.

### Análisis de pruebas
Debe consolidar resultados desde fuentes oficiales, sin duplicar resultados ni mezclar escalas:
- simulacro en línea: puntaje/porcentaje según su contrato;
- Saber 11 impreso: porcentaje por área y global estimado 0–500;
- diagnóstico: porcentaje y desempeño por área/grado de referencia;
- prueba de periodo: escala propia y número de intentos.

Las comparaciones deben normalizarse por escala y mostrar claramente cuándo los resultados no son comparables. No convertir automáticamente porcentajes a puntajes ICFES oficiales.

## 3. Secuencia de implementación

1. Reconciliar el modelo de preguntas y las tablas existentes; confirmar columnas y relaciones con introspección del esquema.
2. Diseñar migración de simulacros en línea y sus políticas RLS, sin tocar tablas ajenas.
3. Implementar RPC de creación, asignación, inicio, entrega y consulta de resultados; nunca exponer claves durante el intento.
4. Conectar `simp` y `sim` a ese contrato y retirar dependencias de tablas inexistentes hasta que estén creadas.
5. Fortalecer `create_diag` y revisar permisos de `saber_imp_results` antes de ampliar reportes.
6. Crear una vista de análisis consolidado que consuma RPCs autorizadas para docente y directivos.
7. Probar con cuentas de estudiante, docente de otro colegio, docente propietario, rector/coordinador y administrador.
8. Publicar únicamente en preview; no fusionar ni tocar producción hasta completar pruebas.

## 4. Criterios de aceptación

- Ningún usuario puede ver preguntas/clave de un simulacro que no le corresponde.
- Un estudiante solo consulta sus propios intentos y resultados.
- Un docente solo gestiona simulacros de su propiedad y cursos permitidos.
- Un directivo solo consulta datos de su colegio.
- Una lista de cursos mixta (propios y ajenos) se rechaza completa.
- Una entrega repetida no duplica ni recalifica de forma inconsistente.
- Los reportes distinguen simulacro, diagnóstico, Saber 11 impreso y prueba de periodo.
- CSV coincide con los datos mostrados y respeta los filtros y permisos.

## 5. Estado de ejecución

Este documento recoge la inspección real del frontend y del esquema disponible. No se han creado aún las tablas faltantes ni se ha aplicado SQL de escritura. No se declara operativo el módulo de simulacros en línea hasta cerrar el backend y las pruebas de roles.
