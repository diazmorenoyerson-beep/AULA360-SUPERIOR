# Importación de agregados oficiales ICFES Saber 11

Este proceso administrativo carga agregados por institución desde un archivo oficial ICFES a
`public.icfes_saber11_imports` y `public.icfes_saber11_results`.

## Seguridad y operación

- Ejecutar únicamente en una máquina administrativa confiable.
- La variable `SUPABASE_SERVICE_ROLE_KEY` es un secreto privilegiado. No incluirla en código,
  frontend, archivos versionados, capturas ni comandos compartidos.
- No importar microdatos individuales ni información personal de estudiantes.
- El proceso crea un lote en estado `staged`, inserta por lotes de 250, y solo lo marca
  `published` al terminar toda la carga. Ante error lo marca `failed`.
- No ejecutar simultáneamente dos cargas para la misma aplicación.
- Verificar primero que los encabezados del archivo correspondan a los alias admitidos.
  Si el ICFES cambia los nombres de columnas, ampliar el mapa del script antes de cargar.

## Requisitos

Python 3.10+ y `openpyxl` para XLSX/XLSM. CSV se procesa con la biblioteca estándar.

```bash
pip install openpyxl
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<secret>"
python scripts/import_icfes_saber11.py resultados.xlsx --application "2025-1"
```

También acepta CSV:

```bash
python scripts/import_icfes_saber11.py resultados.csv --application "2025-1"
```

Parámetros opcionales: `--sheet "NombreHoja"`, `--source-url URL`,
`--source-name "Nombre de fuente"`, `--published-at YYYY-MM-DD`,
`--include-source-row`.

## Validación

- Código y nombre institucional obligatorios.
- Promedios de las cinco áreas entre 0 y 100.
- Desviaciones estándar entre 0 y 100.
- Evaluados entero no negativo.
- El promedio global solo se importa si la fuente trae un campo explícito; no se calcula
  promediando las cinco áreas.
- Los encabezados de la fuente se normalizan quitando tildes, espacios y signos.

## Limitación conocida

El esquema actual tiene una restricción UNIQUE con columnas opcionales que pueden ser NULL;
PostgreSQL permite filas aparentemente duplicadas cuando alguna de esas columnas es NULL.
Antes de una carga histórica completa debe aplicarse una clave de deduplicación que use
`NULLS NOT DISTINCT` o índices únicos con `COALESCE`, tras confirmar la granularidad real
del archivo (institución/calendario/sector/jornada).
