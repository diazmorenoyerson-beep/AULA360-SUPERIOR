# Corrección OMR: marcas ambiguas

Fecha: 2026-11-12  
Rama: `premium/visual-3d-2026-11`  
Commit de código: `64a0d2990aac35ff82c9ec89e373e53d7a9b9c36`

## Problema
El lector OMR distingue marcas correctas de marcas que requieren revisión. Antes de esta corrección, una marca dudosa podía convertirse en una respuesta nula y entrar al proceso de calificación como si fuera una omisión.

## Cambio
En `saberimp.js`, dentro de `calSave()`, cada hoja procesada se evalúa antes de incluirse en el lote. Si `evalIt(it).rev > 0`, se agrega a la lista de errores y se cancela el guardado del lote completo. El mensaje indica cuántas marcas requieren revisión y solicita volver a escanear con mayor nitidez.

## Alcance y límites
- La validación evita guardar automáticamente una hoja que conserva marcas ambiguas.
- No modifica claves, puntajes ni resultados ya almacenados.
- No reemplaza las pruebas con hojas físicas de distintas calidades y dispositivos.
- La corrección está guardada en GitHub; no se considera desplegada hasta que Vercel genere un deployment con este commit.

## Verificación
Se volvió a consultar el archivo en GitHub y se confirmó que la condición de bloqueo está dentro de `calSave()`, antes de enviar el lote a `saber_imp_guardar`.
