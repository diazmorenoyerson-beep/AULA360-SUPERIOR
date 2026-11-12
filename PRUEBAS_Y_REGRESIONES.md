# Pruebas y regresiones

## Verificaciones estáticas ejecutadas

- [x] Se extrajeron los 68 elementos del paquete original a una copia de trabajo.
- [x] Se conservaron los archivos HTML, JS, PWA, iconos, plantilla Excel y documentación originales.
- [x] Se añadió una capa CSS sin reemplazar los módulos JavaScript.
- [x] Se centralizó la configuración Supabase del navegador.
- [x] Se comprobó que no quedan referencias al host anterior en los archivos de código activos.
- [x] Se identificaron las tablas y RPC invocados por el frontend y se generó `DOCUMENTACION/INVENTARIO_BACKEND.md`.
- [x] En el proyecto Supabase nuevo se aplicaron dos migraciones iniciales; las 11 tablas de la primera fase muestran RLS habilitado.

## Pendiente de prueba funcional

- [ ] Inicio/cierre de sesión y recuperación de contraseña.
- [ ] Alta de estudiante y alta/aprobación de docentes.
- [ ] Aislamiento de datos entre colegios, docentes y estudiantes.
- [ ] Cursos, listas, asistencia, chat y configuración de clase.
- [ ] Planeación, guías, talleres, banco de preguntas y simulacros.
- [ ] OMR, impresión, Excel, archivos y Storage.
- [ ] PWA, instalación, caché y modo offline.
- [ ] Pruebas responsive en escritorio, tablet y móvil.
- [ ] Despliegue final en Vercel.

## Advertencia

No declarar esta entrega lista para producción. El frontend invoca más recursos de los que existen en la primera fase del backend. La siguiente fase debe reconstruir y probar los contratos faltantes antes de habilitar usuarios reales.
