# PROMPT MAESTRO — REDISEÑO VISUAL INTEGRAL Y SEGURO DE AULA360

Actúa como un equipo senior compuesto por: arquitecto frontend, diseñador UX/UI especializado en plataformas SaaS educativas, ingeniero JavaScript, especialista en accesibilidad, QA y auditor de regresiones.

## 1. MISIÓN

Inspecciona TODO el proyecto AULA360 que viene en este ZIP y realiza un rediseño visual integral, consistente y de nivel comercial. El objetivo es que se vea moderno, atractivo, premium, intuitivo y profesional en escritorio, tablet y móvil.

No quiero una simple página de inicio nueva ni un maquillaje de dos tarjetas. Quiero revisar y mejorar la apariencia de TODAS las pantallas, vistas, paneles, menús, modales, formularios, tablas, estados vacíos, mensajes, tarjetas, botones, gráficos, listados y componentes que existan en el código.

La referencia `REFERENCIAS_VISUALES/Concepto_visual_AULA360.png` expresa una dirección estética: azul institucional profundo, blanco, acentos turquesa y dorado, tarjetas elegantes, jerarquía clara, gráficos legibles y botones con volumen 3D moderado. Es una imagen conceptual generada, NO una captura real del producto ni una fuente de funcionalidades. No copies textos ficticios, nombres, cifras, usuarios ni módulos que no existan.

## 2. REGLA ABSOLUTA: NO ROMPER LO QUE FUNCIONA

La prioridad número uno es conservar íntegramente el comportamiento actual. Este trabajo es principalmente de diseño y experiencia de usuario, no una reescritura funcional.

- No reconstruyas la aplicación desde cero.
- No cambies de framework ni migres a React/Vue/Angular.
- No cambies el modelo de datos, tablas, columnas, vistas, funciones RPC, políticas RLS, autenticación ni configuración de Supabase.
- No cambies nombres de funciones globales, objetos `window`, IDs, clases, atributos `data-*`, nombres de campos, valores `name`, selectores, rutas, claves locales ni contratos que use el JavaScript, salvo que demuestres que es indispensable y que no rompe dependencias.
- No elimines código por parecer antiguo, duplicado o poco elegante sin demostrar que no se usa.
- No sustituyas operaciones reales por datos de demostración. No inventes usuarios, notas, puntajes, estadísticas, cursos ni registros.
- No cambies reglas de negocio, permisos, roles, validaciones, consultas, ordenamientos, filtros, exportaciones, impresiones, cargas de archivos ni flujos de trabajo.
- No elimines ni alteres la lógica de impresión, plantillas, hojas de respuesta, OMR, documentos, descargas, archivos Excel, asistencia, evaluaciones ni simulacros.
- No elimines la compatibilidad PWA: `manifest.json`, iconos, `sw.js`, instalación, caché y funcionamiento sin conexión deben seguir operando.
- No cambies URLs, enlaces externos, CDN ni versiones de dependencias sin justificación técnica y pruebas.
- Nunca escribas secretos, tokens, claves privadas o credenciales en archivos ni en el informe.

Si una mejora visual exige tocar lógica, primero identifica las dependencias, limita el cambio al mínimo, conserva la interfaz pública del módulo y prueba el flujo antes y después. Ante una duda que pueda comprometer datos o funcionalidad, conserva el comportamiento actual y documenta la limitación en vez de improvisar.

## 3. RECONOCIMIENTO TÉCNICO DEL PROYECTO

La copia recibida contiene, entre otros, estos elementos que debes verificar directamente:

- `index.html`: documento principal grande, con estructura de aplicación, pantallas y lógica integrada.
- `styles.css`: hoja de estilos principal; contiene estilos compilados de Tailwind CSS 3.4.17 y reglas visuales.
- Módulos JavaScript separados, por ejemplo `dashboard.js`, `docente.js`, `permisos.js`, `colegio.js`, `banco.js`, `bancoia.js`, `subirpreg.js`, `claseasis.js`, `asistencia.js`, `saber.js`, `cuadernillo.js`, `taller_ia.js`, `aulavirtual.js`, `virtual.js`, `mensajes.js`, `reuniones.js`, `planeador.js`, `horarios.js`, `horario.js`, `talleres.js`, `guias.js`, `listados.js`, `omr.js`, `saberimp.js` y otros.
- Supabase JS UMD cargado desde CDN y Chart.js para gráficos.
- `manifest.json`, `sw.js`, iconos y recursos de marca para PWA.

La estructura no es necesariamente la lista completa de pantallas. Debes inspeccionar cada archivo y descubrir todos los módulos, vistas, rutas internas, funciones de renderizado, roles, estados y componentes existentes antes de modificar.

## 4. FASE CERO OBLIGATORIA: INVENTARIO Y RESPALDO

Antes de editar:

1. Descomprime el proyecto en un directorio de trabajo nuevo. Conserva intacto el ZIP recibido.
2. Haz un inventario de todos los archivos y sus tamaños. Identifica recursos, dependencias, módulos y archivos de configuración.
3. Lee `index.html` completo y todos los `.js` y `.css`. No te limites a los primeros resultados de búsqueda.
4. Mapea cada pantalla/vista y cada rol real (por ejemplo rector, coordinador, docente, estudiante y administrador si aparecen en el código). No supongas que todos los roles tienen los mismos permisos.
5. Identifica los mecanismos de navegación, renderizado, carga dinámica de scripts, eventos `onclick`/listeners, funciones globales, IDs y clases usadas como selectores.
6. Identifica los flujos críticos y las integraciones: login/logout, recuperación de contraseña, Supabase, permisos, carga/descarga de archivos, formularios, filtros, gráficos, impresión, exportación, PWA y service worker.
7. Crea un inventario de pantallas con: nombre, archivo responsable, rol autorizado, elementos visibles, acciones principales, dependencias y riesgo de regresión.
8. Guarda una copia íntegra de referencia y registra el estado inicial. No sobrescribas el original.

Entrega primero un breve diagnóstico e inventario. Después continúa con el rediseño en la misma sesión; no te detengas esperando aprobación, salvo que encuentres un riesgo real que impida continuar con seguridad.

## 5. DIRECCIÓN DE ARTE Y SISTEMA VISUAL

Construye un sistema visual unificado para AULA360:

### Identidad
- Mantén el nombre AULA360 y utiliza los logos e iconos existentes. No inventes una marca distinta.
- Estética SaaS educativa premium, actual, limpia, confiable y motivadora.
- Paleta sugerida: azul marino institucional como base; azul vivo para acciones principales; blanco y grises azulados para superficies; turquesa para progreso/éxito; dorado como acento limitado. Verifica contraste real antes de aplicar.
- Evita saturación, exceso de degradados, sombras exageradas, emojis como sustitutos de iconos y efectos que dificulten la lectura.

### Layout y navegación
- Diseña una estructura consistente: navegación lateral en escritorio cuando corresponda, encabezado claro, área principal ordenada y navegación móvil usable.
- Mantén visibles el contexto, nombre de sección y acciones relevantes.
- Agrupa módulos relacionados; mejora jerarquía, espaciado, alineación, anchuras y densidad de información.
- La navegación debe conservar exactamente las opciones permitidas para cada rol.
- En móvil, evita desbordamientos horizontales; convierte tablas complejas en patrones responsive legibles sin perder acciones ni datos.

### Tarjetas y dashboards
- Tarjetas con radios coherentes, bordes sutiles, elevación moderada y jerarquía tipográfica.
- Indicadores con etiquetas comprensibles, unidades, estados y contexto. No inventes valores.
- Gráficos Chart.js legibles, responsive, con leyendas y colores accesibles; conserva los datos y callbacks actuales.
- Estados vacíos, carga, error y éxito diseñados con claridad, sin ocultar fallos.

### Botones 3D
Quiero botones con apariencia tridimensional elegante y profesional:
- Volumen discreto mediante sombra inferior, gradiente sutil y borde/relieve.
- Estados hover, focus-visible, active/pressed y disabled bien diferenciados.
- Al presionar, pequeña traslación vertical y reducción de sombra para simular pulsación física.
- Transiciones rápidas y suaves; respeta `prefers-reduced-motion`.
- Jerarquía clara: primario, secundario, terciario, peligro y acciones de icono.
- Mantén el texto y el área de clic accesibles. No conviertas todos los botones en piezas brillantes o recargadas.
- No uses efectos 3D que cambien la posición del layout o tapen contenido.

### Formularios, tablas y modales
- Inputs, selects, textareas, checkboxes y radios consistentes, con etiquetas visibles, ayuda y errores claros.
- Conserva validaciones, tipos, `name`, IDs y valores esperados por el código.
- Tablas con encabezados claros, alineación correcta, acciones accesibles y responsive.
- Modales con foco visible, cierre coherente, scroll correcto y sin romper el comportamiento de teclado.

### Tipografía, iconos y accesibilidad
- Usa una escala tipográfica clara y consistente; evita texto demasiado pequeño.
- Usa iconos SVG/CSS o una librería ya disponible. No agregues dependencias externas sin necesidad.
- Contraste WCAG AA como objetivo para texto normal y controles.
- Navegación por teclado, foco visible, labels, atributos ARIA cuando correspondan y estados no comunicados solo por color.

## 6. COBERTURA: TODAS LAS PANTALLAS

Rediseña todos los contextos encontrados en el inventario, no solo el dashboard principal. Como mínimo revisa las áreas que realmente existan en el código:

- Acceso/autenticación y recuperación.
- Dashboard general y paneles específicos por rol.
- Colegio e información institucional.
- Usuarios, docentes, coordinadores, estudiantes, cursos y listados.
- Simulacros ICFES, Saber 11, pruebas, exámenes, cuadernillos y hojas de respuesta/OMR.
- Banco de preguntas, carga de preguntas y banco asistido por IA.
- Talleres, talleres con IA y evaluación/calificación.
- Aula virtual, clases, trabajos, entregas y recursos.
- Asistencia de estudiantes y docentes.
- Planeador, plan de área, horarios y periodos.
- Guías, reuniones, mensajes, permisos y planillas.
- Estadísticas, reportes, rankings y vistas de seguimiento.
- Configuración, perfil y cualquier otra vista descubierta.

La lista es una guía de inspección, no autorización para crear módulos inexistentes. Cada rol debe conservar sus vistas y permisos originales.

## 7. MÉTODO DE IMPLEMENTACIÓN SEGURO

Trabaja por capas, evitando reescribir lógica:

1. Define tokens CSS centralizados para colores, tipografía, radios, sombras, espaciado, bordes y estados.
2. Crea o refactoriza componentes visuales reutilizables con clases CSS namespaced para evitar colisiones.
3. Moderniza primero el shell común (fondo, contenedor, header, navegación, títulos y superficies).
4. Rediseña las pantallas una por una, conservando el HTML funcional y los contratos JavaScript.
5. Unifica botones, tarjetas, formularios, tablas, badges, alertas, tabs, modales y estados.
6. Ajusta breakpoints y accesibilidad.
7. Revisa las vistas específicas por rol; nunca muestres acciones no autorizadas.
8. Revisa impresión por separado: las reglas `@media print`, `#printarea`, formatos oficiales y hojas deben seguir produciendo documentos limpios. No apliques sombras, fondos oscuros ni elementos de navegación al área imprimible.
9. Revisa PWA y caché: si cambian assets estáticos, actualiza el versionado de caché de forma deliberada y prueba instalación/actualización. No elimines el fallback offline.
10. No agregues librerías, frameworks, fuentes o recursos remotos si puedes lograr el resultado con CSS/JS existentes. Si agregas algo, justifica tamaño, licencia, seguridad y efecto offline.

No reemplaces grandes bloques de `index.html` con una plantilla nueva sin rastrear todas las funciones, IDs, eventos y elementos a los que se conectan los módulos.

## 8. PRUEBAS Y CONTROL DE REGRESIONES OBLIGATORIOS

No declares que todo funciona si no lo has ejecutado. Realiza las pruebas posibles en tu entorno y diferencia claramente entre probado, inspeccionado estáticamente y pendiente por falta de credenciales/servicios.

### Comprobaciones estáticas
- Todos los archivos referenciados existen.
- No hay errores de sintaxis JavaScript.
- No hay IDs duplicados nuevos.
- No se eliminaron funciones globales ni hooks usados por otros módulos.
- No se rompieron referencias CSS/JS, imágenes, fuentes o rutas.
- No se introdujeron secretos.
- No se añadieron datos falsos.

### Comprobaciones de navegador
Si dispones de navegador, prueba a 1440px, 1024px, 768px y 390px como mínimo:
- Inicio de sesión y salida (si hay entorno de prueba autorizado).
- Navegación de cada rol disponible.
- Apertura de cada módulo y subvista.
- Botones, formularios, filtros, tabs, modales y menús.
- Carga y descarga de archivos.
- Gráficos y tablas.
- Simulacros, respuestas, calificación y resultados.
- Asistencia, planeación, mensajes y permisos.
- Impresión y exportación.
- Consola del navegador y solicitudes fallidas.
- PWA: manifest, iconos, service worker, actualización de caché y fallback offline.

No uses datos de producción para pruebas destructivas. No borres ni modifiques registros reales. Si necesitas probar escritura, usa un entorno de pruebas o registros expresamente autorizados.

### Comparación
Compara el antes y después de cada pantalla. Verifica que la mejora visual no cambie el contenido, las acciones, los permisos ni los datos mostrados.

## 9. ENTREGABLES OBLIGATORIOS

Al terminar, entrega:

1. Un ZIP completo y ejecutable con TODO el proyecto, no solo los archivos modificados.
2. `README_REDISENO.md` con instrucciones para ejecutar/publicar y resumen de la arquitectura.
3. `INVENTARIO_PANTALLAS.md` con todas las pantallas encontradas, roles y archivos responsables, marcando cuáles fueron rediseñadas.
4. `CAMBIOS_REALIZADOS.md` con archivos modificados y descripción precisa de cada cambio.
5. `PRUEBAS_Y_REGRESIONES.md` con pruebas ejecutadas, resultados, limitaciones y pendientes. No afirmes pruebas que no realizaste.
6. Una carpeta de capturas `CAPTURAS/` con imágenes reales de las pantallas rediseñadas si tu entorno permite ejecutarlas. Las capturas deben ser del producto, no mockups inventados.
7. Lista explícita de cualquier cambio funcional inevitable, riesgo o asunto que requiera intervención humana.

Conserva los nombres y rutas de los archivos originales siempre que sea posible. No entregues únicamente fragmentos, parches o instrucciones: necesito el proyecto completo actualizado.

## 10. CRITERIO DE ACEPTACIÓN

El trabajo se considera terminado solo si:
- Todas las pantallas existentes fueron inventariadas y tratadas o justificadas como no modificadas.
- El diseño se siente como un único producto profesional.
- Los botones 3D tienen estados completos y no obstaculizan el uso.
- La interfaz responde bien en móvil, tablet y escritorio.
- Se mantienen los roles, permisos, datos, integraciones, formularios y flujos existentes.
- No hay errores nuevos conocidos de JavaScript, CSS, carga de recursos o navegación.
- Impresión, archivos y PWA siguen contemplados y probados en la medida posible.
- Se entrega el ZIP completo y los documentos de auditoría.

## 11. FORMA DE TRABAJO Y COMUNICACIÓN

No me preguntes por colores, estilos o componentes: usa el criterio profesional descrito aquí y la referencia visual adjunta. No inventes pantallas ni contenido. Si hay varias opciones, elige la más segura y coherente con el sistema existente.

Primero resume el inventario y los riesgos. Luego implementa el rediseño completo en una copia. Trabaja de forma incremental y valida cada grupo de cambios. Si el contexto o los límites de ejecución no permiten completar todo en una sola pasada, prioriza conservar la funcionalidad y continúa por módulos; informa con precisión qué quedó terminado y qué no.

**ORDEN FINAL:** Rediseña visualmente AULA360 de forma integral, premium y consistente, pero conserva lo que ya funciona. La apariencia puede cambiar profundamente; la lógica, los datos, los permisos y los procesos deben permanecer intactos salvo cambios mínimos, justificados y probados.
