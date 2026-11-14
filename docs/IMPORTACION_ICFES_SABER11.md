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
- El importador rechaza una aplicación que ya tenga un lote publicado; no sobrescribe
  resultados existentes. Una corrección de un periodo publicado requiere un procedimiento
  de reemplazo/versionado revisado por un administrador.
- Rechaza claves institucionales duplicadas dentro del archivo según institución,
  calendario, sector y jornada.
- Si falla una carga, intenta eliminar las filas parciales de ese lote y lo marca
  `failed`. Si la limpieza falla, muestra una advertencia que debe resolverse antes
  de reintentar.
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

## Control de duplicados del esquema

La restricción de la tabla usa `UNIQUE NULLS NOT DISTINCT` sobre aplicación,
institución, calendario, sector y jornada. Esto evita que valores NULL permitan
duplicados silenciosos. El importador también rechaza duplicados dentro del archivo
y bloquea la publicación repetida de una aplicación ya publicada.

## Pendiente antes de una carga real

Confirmar con el diccionario y los encabezados del archivo ICFES que la granularidad
real sea institución/calendario/sector/jornada. Si el archivo incluye otra dimensión
que diferencie legítimamente registros, debe incorporarse a la clave antes de importar.
