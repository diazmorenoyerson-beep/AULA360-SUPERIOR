# Plan maestro de construcción de módulos AULA360 — 2026-11-12

## Alcance revisado

Se inspeccionó el paquete original `AULA360_SUPERIOR_PUBLICACION_2.zip`, el inventario de pantallas, las llamadas `from()` y `rpc()` de los módulos y el estado actual del proyecto Supabase.

El paquete contiene 33 módulos de aplicación JavaScript (más configuración y service worker). La presencia de un archivo no significa que el módulo esté terminado ni probado.

## Bloques de construcción

### 1. Evaluación y banco
- Banco de preguntas: `banco_preguntas.js`, `subirpreg.js`, `banco.js`, `banco_paquete.js`, `bancoia.js`.
- Simulacros Saber: `saber.js`, `saberimp.js`, `cuadernillo.js`, `hoja.js`, `omr.js`.
- Pruebas de periodo: `periodo.js`.
- Dependencias destacadas: `questions`, `question_keys`, tablas `saber_*`, `periodo_*`, y RPC de creación, entrega, calificación y cobertura.
- Estado: banco/Saber tienen backend parcial; Pruebas de periodo tiene brechas confirmadas de tablas y RPC.

### 2. Docencia y planeación
- `docente.js`, `planeador.js`, `clase_ia.js`, `claseasis.js`, `guias.js`, `taller_ia.js`, `talleres.js`.
- Dependencias destacadas: planes de área, referentes, planeadores, sesiones de clase, formatos, guías y talleres.
- Estado: existen tablas y funciones para algunos flujos; faltan tablas/funciones referenciadas por otros.

### 3. Gestión institucional
- `colegio.js`, `asistencia.js`, `permisos.js`, `mensajes.js`, `reuniones.js`, `listados.js`, `planillas.js`.
- Dependencias destacadas: perfiles, cursos, roster, asistencia, permisos, mensajes, reuniones, formatos y listados.
- Estado: perfiles/cursos/roster/asistencia/chat tienen base; faltan entidades de listados, auditoría, permisos/formularios y otras.

### 4. Horarios
- `horario.js`, `horarios.js`, `horarios_archivo.js`.
- Dependencias: `hz_*` (asignaciones, franjas, aulas, docentes, grupos, restricciones, versiones y clases).
- Estado: hay funciones de guardar/publicar versión y tablas de horarios, pero requiere pruebas integrales de conflictos, permisos y publicación.

### 5. Aula virtual
- `aulavirtual.js`, `virtual.js`, `vercomo.js`.
- Dependencias: materiales, archivos, descargas, trabajos, entregas y cursos destinatarios.
- Estado: varias tablas y cuatro RPC de flujo virtual están ausentes en el proyecto revisado.

### 6. Experiencia y navegación
- `dashboard.js`, `vercomo.js`, `index.html`, `styles.css`, `sw.js`.
- Estado: capa visual premium inicial aplicada en la rama; aún falta validación visual funcional pantalla por pantalla y pruebas de navegación/caché.

## Brechas backend conocidas

La auditoría previa encontró 23 nombres de tablas usados por frontend que no están presentes en el esquema público y 21 RPC referenciadas que faltan. La lista debe reconciliarse por módulo y por nombre canónico antes de crear migraciones, ya que el frontend tiene variantes de nombres con guion y guion bajo.

## Orden de construcción y aceptación

1. **Banco de preguntas y evaluaciones:** normalizar contrato de preguntas y claves; cerrar permisos; completar Pruebas de periodo; probar creación, asignación, entrega, calificación y resultados.
2. **Aula virtual:** definir modelo de materiales/trabajos/entregas/descargas; crear políticas por colegio, docente, curso y estudiante; implementar RPC; probar el ciclo completo.
3. **Planeación y docencia:** cerrar referentes, formatos, planeadores, talleres y sesiones; probar envío y revisión por rol.
4. **Gestión institucional:** terminar permisos, reuniones, listados, planillas y directorio; proteger datos personales y validar alcance de colegio.
5. **Horarios:** validar restricciones, choques, aulas, franjas y publicación con casos reales.
6. **Acabado visual y regresión:** aplicar el sistema visual 3D coherentemente a cada pantalla; probar estados vacíos, carga, error, móvil/escritorio y accesibilidad.

## Regla de seguridad de despliegue

- Trabajar en `premium/visual-3d-2026-11`.
- No aplicar migraciones destructivas ni grants globales.
- No fusionar el PR ni cambiar producción hasta que cada bloque tenga migración reproducible, pruebas de roles y aceptación funcional.
- No declarar un módulo terminado si solo se ha revisado su archivo o su sintaxis.

## Estado actual

Este documento es el mapa de construcción y dependencias, no una declaración de finalización. Los siguientes cambios deben ser implementaciones ejecutables módulo por módulo, con migraciones y pruebas verificables.
