# AULA360 Superior

Copia de trabajo basada en el ZIP original. Se conserva la aplicación vanilla JavaScript, sus módulos, los IDs y los contratos existentes. El rediseño visual se incorpora como una capa CSS adicional.

## Abrir en el computador

1. Descarga y descomprime el ZIP.
2. Abre la carpeta `AULA360_SUPERIOR` en Visual Studio Code.
3. Instala la extensión **Live Server** (Ritwick Dey).
4. Haz clic derecho en `index.html` → **Open with Live Server**.
5. Se abrirá en el navegador, normalmente en `http://127.0.0.1:5500`.

También puedes ejecutar `python -m http.server 8000` desde esa carpeta y visitar `http://localhost:8000`.

## Estado de conexión

`supabase-config.js` apunta al proyecto nuevo AULA360 en Supabase y usa una clave publishable (apta para cliente; no es una clave service_role). La base nueva tiene una primera fase de tablas y RLS, pero la reconstrucción del backend aún no está completa. Por eso, el inicio de sesión y las vistas que consultan módulos pendientes pueden mostrar errores hasta completar sus tablas, RPC y políticas.

No uses esta copia como producción todavía. No introduzcas claves secretas en archivos del navegador.

## Qué se cambió en esta entrega

- Se añadió una capa de diseño responsive con identidad azul institucional, turquesa y dorado.
- Se conservaron los módulos JS originales y la estructura funcional existente.
- Se centralizó la conexión pública a Supabase en `supabase-config.js`.
- Se sustituyeron las referencias al proyecto Supabase anterior por el proyecto nuevo.
- Se generó el inventario de tablas y RPC invocados por el frontend.

## Pendiente antes de producción

- Completar el esquema SQL de los módulos educativos, horarios, planeación, guías, banco de preguntas, simulacros, OMR, virtual, permisos y reuniones.
- Crear y probar las funciones RPC invocadas por el frontend.
- Configurar buckets de Storage y sus políticas.
- Probar registro, inicio de sesión, permisos por rol, CRUD, impresión, Excel, OMR, PWA y modo offline.
- Configurar Vercel y desplegar desde el repositorio GitHub.
