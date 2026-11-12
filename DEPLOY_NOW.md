# AULA360 Superior — publicación rápida

## Estado real de esta entrega

Este paquete contiene el frontend original de AULA360 con una primera capa de rediseño visual, los módulos JavaScript originales, branding, PWA y configuración para servir archivos estáticos en Vercel. La configuración apunta al proyecto Supabase nuevo `frhunuivktmfjiyvdqha`.

**No declarar como producción funcional todavía.** La base nueva solo tiene la fase inicial de identidad, colegios, cursos, listas, asistencia, ajustes de clase y chat. El frontend también consulta tablas y RPC de simulacros, banco de preguntas, planeación, guías, horarios, aula virtual y otros módulos que aún no han sido reconstruidos. Por tanto, pantallas que dependan de esas funciones pueden mostrar errores o quedar sin datos. No usar con información real ni abrir registros públicos hasta completar esas partes y probar RLS.

## Publicar una vista previa estática en Vercel

1. Descomprimir este ZIP.
2. Abrir una terminal dentro de la carpeta `AULA360_SUPERIOR` (la que contiene `index.html` y `vercel.json`).
3. Instalar Node.js LTS si no está instalado: https://nodejs.org/
4. Ejecutar:

   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

5. Cuando pregunte el directorio del proyecto, usar `./` (la carpeta actual). No seleccionar un framework; si pregunta por el directorio de salida, usar `.`.
6. Para publicarlo en la URL de producción:

   ```bash
   vercel --prod
   ```

7. En Vercel, revisar la URL generada y probar en ventana privada. No compartirla como entrega funcional hasta completar las pruebas de backend.

## Publicar desde GitHub

El repositorio previsto es `https://github.com/diazmorenoyerson-beep/AULA360-SUPERIOR`. Se puede subir el contenido completo de esta carpeta (incluyendo archivos PNG, XLSX y subcarpetas) con GitHub Desktop o `git` y luego importarlo en Vercel. En Vercel: Add New → Project → Import Git Repository → seleccionar `AULA360-SUPERIOR` → Framework Preset `Other` → Root Directory `./` → Deploy.

## Supabase

- Project ref: `frhunuivktmfjiyvdqha`
- URL pública: `https://frhunuivktmfjiyvdqha.supabase.co`
- La clave publishable incluida en `supabase-config.js` es pública por diseño. Nunca añadir `service_role` ni secretos al frontend.
- No se han creado datos de prueba ni un administrador inicial. Crear el administrador mediante un procedimiento seguro desde Supabase Auth/SQL Editor; no asignar privilegios desde el navegador.

## Antes de producción

- Completar el esquema de los módulos restantes y sus RPC.
- Revisar políticas RLS con usuarios de cada rol.
- Crear buckets y políticas de Storage para imágenes/documentos.
- Configurar el primer administrador con procedimiento de una sola vez.
- Ejecutar pruebas de registro, inicio/cierre de sesión, recuperación de contraseña, roles, cursos, formularios, Excel, impresión, OMR, PWA/offline y permisos.
- Verificar que no queden referencias al proyecto Supabase anterior.
