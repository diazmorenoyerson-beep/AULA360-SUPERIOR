# Aula virtual: trabajos, materiales y entregas — 2026-11-13

## Backend creado

Migración aplicada: `aula360_virtual_work_delivery_backend`  
Archivo fuente: `database/2026-11-13_aula360_virtual_work_delivery_backend.sql`

Se crearon cinco tablas con RLS:
- `virtual_trabajos`: publicación, fecha límite, tipo, límites, cursos y estado.
- `virtual_trabajo_cursos`: destinatarios por curso.
- `virtual_archivos`: metadatos de archivos descargables.
- `virtual_entregas`: entregas de estudiantes, nota, retroalimentación y estado pendiente/enviada.
- `virtual_descargas`: registro de descargas por estudiante y archivo.

Se crearon dos buckets privados de Storage, ambos con límite de 25 MB y tipos MIME de documentos, presentaciones, hojas de cálculo, imágenes y ZIP:
- `virtual-material`
- `virtual-entregas`

## RPC y controles

- `virtual_pedir_descarga(p_archivo)`: comprueba asignación, disponibilidad y límite por estudiante/archivo; registra la descarga.
- `virtual_pedir_entrega(p_trabajo,p_nombre,p_size)`: valida estudiante, curso, fecha, extensión, peso y número de entregas; crea una ruta temporal de carga.
- `virtual_confirmar_entrega(p_entrega,p_comentario)`: solo confirma la entrega propia y verifica que el objeto exista en el bucket privado.
- `virtual_cancelar_entrega(p_entrega)`: elimina únicamente una entrega pendiente del usuario.

Las cuatro RPC son `SECURITY DEFINER`, fijan `search_path=''`, pertenecen a `postgres`, no son ejecutables por `anon` y solo se conceden a `authenticated`. Las escrituras de descargas y entregas no se permiten directamente desde el navegador.

RLS limita los trabajos a su responsable, directivos del mismo colegio y estudiantes del curso asignado. Las entregas son visibles para el estudiante dueño, el docente responsable y directivos del colegio. Las calificaciones solo permiten actualizar `nota` y `retroalimentacion`; los clientes no pueden cambiar propietario, estado, ruta o identidad.

## Frontend ajustado

- Se actualizó el módulo `virtual.js` para limpiar archivos subidos si falla la publicación o la confirmación de una entrega.
- Antes de borrar un trabajo, el frontend verifica que la lectura y eliminación de los archivos de Storage hayan funcionado; así evita borrar el registro y dejar archivos huérfanos por un fallo de permisos.
- Se actualizaron las versiones de carga de `virtual.js`, `aulavirtual.js`, `index.html` y la caché PWA.

## Verificaciones realizadas

- Se confirmó que las cinco tablas existen y tienen RLS habilitado.
- Se confirmaron las políticas de lectura/escritura de las tablas y las seis políticas de Storage.
- Se confirmó que ambos buckets son privados y limitan archivos a 25 MB.
- Se confirmó que `anon` no puede ejecutar las RPC; `authenticated` sí puede llamar las cuatro funciones controladas.
- Se verificó por privilegios que el navegador no puede insertar entregas ni inventar descargas; solo puede calificar con nota/retroalimentación y activar/ajustar límites permitidos.
- Se ejecutó una prueba transaccional con el perfil rector disponible: inserción de trabajo, asignación a un curso de prueba y registro de metadatos; la transacción se revirtió y no dejó datos de prueba.
- Se comprobó sintaxis JavaScript de `virtual.js`, `aulavirtual.js`, `institucional.js`, `dashboard.js` y `sw.js`.

## QA pendiente

En el proyecto actual solo hay un perfil rector aprobado y cero cursos; no hay cuentas de docente ni estudiante con las que ejecutar una prueba real de subida, descarga, entrega y calificación. Por ello, el backend y las rutas SQL están preparados, pero el flujo completo de extremo a extremo debe probarse al crear un curso y cuentas reales de docente/estudiante antes de producción.
