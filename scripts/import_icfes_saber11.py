#!/usr/bin/env python3
"""Importador administrativo de agregados ICFES Saber 11 a Supabase.

Uso:
  pip install openpyxl
  export SUPABASE_URL="https://<project>.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="<secret>"
  python scripts/import_icfes_saber11.py archivo.xlsx --application "2025-1" --sheet "Resultados"

El archivo debe contener una fila de encabezados y agregados institucionales,
no microdatos individuales. La clave service_role se usa solo en este proceso
local y nunca debe incorporarse al frontend ni subirse al repositorio.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from urllib.parse import urlencode, quote
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

BATCH_SIZE = 250
AREA_FIELDS = {
    "average_reading": ["PROM_LECTURA_CRITICA", "PROMEDIO_LECTURA_CRITICA", "LECTURA_CRITICA", "PROM_LECTURA"],
    "average_math": ["PROM_MATEMATICAS", "PROMEDIO_MATEMATICAS", "MATEMATICAS", "PROM_MAT"],
    "average_social": ["PROM_SOCIALES_CIUDADANAS", "PROMEDIO_SOCIALES_CIUDADANAS", "SOCIALES_CIUDADANAS", "PROM_SOCIALES"],
    "average_natural_sciences": ["PROM_CIENCIAS_NATURALES", "PROMEDIO_CIENCIAS_NATURALES", "CIENCIAS_NATURALES", "PROM_CIEN"],
    "average_english": ["PROM_INGLES", "PROMEDIO_INGLES", "INGLES", "PROM_ING"],
}
ALIASES = {
    "institution_code": ["CODINST", "CODIGO_INSTITUCION", "CODIGO_ESTABLECIMIENTO", "CODIGO_DANE"],
    "institution_name": ["NOMBREINSTITUCION", "NOMBRE_INSTITUCION", "NOMBRE_ESTABLECIMIENTO", "ESTABLECIMIENTO"],
    "municipality_code": ["CODIGOMUNICIPIO", "COD_MUNICIPIO", "CODIGO_MUNICIPIO"],
    "municipality_name": ["NOMBREMUNICIPIO", "MUNICIPIO"],
    "department_name": ["DEPARTAMENTO", "NOMBRE_DEPARTAMENTO"],
    "academic_calendar": ["CALENDARIO"],
    "sector": ["NATURALEZA", "SECTOR"],
    "jornada": ["JORNADA"],
    "evaluated_count": ["EVALUADOS", "NUMERO_EVALUADOS", "TOTAL_EVALUADOS"],
    "classification": ["CLASIFICACION", "CLASIFICACION_PLANTEL"],
    "average_global": ["PROMEDIO_GLOBAL", "PUNTAJE_GLOBAL", "PROM_GLOBAL"],
    "period_code": ["PERIODO", "PERIODO_APLICACION", "APLICACION"],
}
SD_ALIASES = {
    "sd_reading": ["DESV_LECTURA_CRITICA", "DESVIACION_LECTURA_CRITICA", "SD_LECTURA_CRITICA"],
    "sd_math": ["DESV_MATEMATICAS", "DESVIACION_MATEMATICAS", "SD_MATEMATICAS"],
    "sd_social": ["DESV_SOCIALES_CIUDADANAS", "DESVIACION_SOCIALES_CIUDADANAS", "SD_SOCIALES"],
    "sd_natural_sciences": ["DESV_CIENCIAS_NATURALES", "DESVIACION_CIENCIAS_NATURALES", "SD_CIENCIAS_NATURALES"],
    "sd_english": ["DESV_INGLES", "DESVIACION_INGLES", "SD_INGLES"],
}

def norm(value: object) -> str:
    s = unicodedata.normalize("NFKD", str(value or ""))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9]+", "_", s.upper()).strip("_")

def number(value: object, field: str, low: float | None = None, high: float | None = None):
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, str):
        value = value.strip().replace(" ", "")
        if "," in value and "." not in value:
            value = value.replace(",", ".")
        else:
            value = value.replace(",", "")
    n = float(value)
    if not math.isfinite(n):
        raise ValueError(f"{field} debe ser un número finito: {value}")
    if low is not None and n < low or high is not None and n > high:
        raise ValueError(f"{field} fuera de rango: {value}")
    return n

def integer(value: object, field: str):
    n = number(value, field, 0)
    if n is None:
        return None
    if not n.is_integer():
        raise ValueError(f"{field} debe ser entero: {value}")
    return int(n)

def pick(row: dict, aliases: list[str]):
    for alias in aliases:
        key = norm(alias)
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None

def rows_from_file(path: Path, sheet: str | None) -> Iterable[dict]:
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield {norm(k): v for k, v in row.items() if k}
        return
    if path.suffix.lower() not in (".xlsx", ".xlsm"):
        raise ValueError("Formato no soportado. Usa .xlsx, .xlsm o .csv; .xls requiere conversión.")
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise RuntimeError("Falta openpyxl. Instala con: pip install openpyxl") from exc
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet] if sheet else wb.active
    iterator = ws.iter_rows(values_only=True)
    headers = next(iterator, None)
    if not headers:
        raise ValueError("La hoja no contiene encabezados.")
    keys = [norm(h) for h in headers]
    for values in iterator:
        if not any(v is not None for v in values):
            continue
        yield {k: v for k, v in zip(keys, values) if k}

def transform(row: dict, application: str, source_row: bool):
    code = pick(row, ALIASES["institution_code"])
    name = pick(row, ALIASES["institution_name"])
    if not code or not name:
        raise ValueError("Falta código o nombre de institución")
    out = {
        "application": application,
        "period_code": str(pick(row, ALIASES["period_code"]) or application).strip(),
        "institution_code": str(code).strip(),
        "institution_name": str(name).strip(),
        "municipality_code": clean(pick(row, ALIASES["municipality_code"])),
        "municipality_name": clean(pick(row, ALIASES["municipality_name"])),
        "department_name": clean(pick(row, ALIASES["department_name"])),
        "academic_calendar": clean(pick(row, ALIASES["academic_calendar"])),
        "sector": clean(pick(row, ALIASES["sector"])),
        "jornada": clean(pick(row, ALIASES["jornada"])),
        "evaluated_count": integer(pick(row, ALIASES["evaluated_count"]), "evaluated_count"),
        "classification": clean(pick(row, ALIASES["classification"])),
        "average_global": number(pick(row, ALIASES["average_global"]), "average_global", 0, 500),
    }
    for field, aliases in AREA_FIELDS.items():
        out[field] = number(pick(row, aliases), field, 0, 100)
        if out[field] is None:
            raise ValueError(f"Falta el promedio obligatorio del área: {field}")
    for field, aliases in SD_ALIASES.items():
        out[field] = number(pick(row, aliases), field, 0, 100)
    if source_row:
        out["source_row"] = {k: str(v) if isinstance(v, (date, datetime)) else v for k, v in row.items()}
    return out

def clean(value):
    return str(value).strip() if value not in (None, "") else None

def request(url: str, key: str, method: str, payload=None, prefer=None):
    data = None if payload is None else json.dumps(payload, ensure_ascii=False, default=str).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            body = response.read()
            return response.headers, json.loads(body) if body else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Supabase HTTP {exc.code}: {detail}") from exc

def main():
    parser = argparse.ArgumentParser(description="Carga controlada de agregados ICFES Saber 11")
    parser.add_argument("file", type=Path)
    parser.add_argument("--application", required=True, help="Ej. 2025-1 o 2025-2")
    parser.add_argument("--sheet")
    parser.add_argument("--source-url", default="https://www.icfes.gov.co/")
    parser.add_argument("--source-name", default="ICFES - resultados agregados Saber 11")
    parser.add_argument("--published-at")
    parser.add_argument("--include-source-row", action="store_true")
    args = parser.parse_args()
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        parser.error("Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.")
    if not args.file.is_file():
        parser.error(f"No existe el archivo: {args.file}")
    hasher = hashlib.sha256()
    with args.file.open("rb") as source_file:
        for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()
    # Evita publicar dos veces la misma aplicación.
    query = urlencode({"application": f"eq.{args.application}", "status": "eq.published", "select": "id,checksum"})
    _, published = request(f"{base}/rest/v1/icfes_saber11_imports?{query}", key, "GET")
    if published:
        raise RuntimeError(
            f"Ya existe una importación publicada para {args.application} "
            f"(id={published[0]['id']}). No se sobrescribe automáticamente."
        )
    metadata = {
        "source_name": args.source_name, "source_url": args.source_url,
        "application": args.application, "published_at": args.published_at,
        "checksum": checksum, "status": "staged", "notes": f"Archivo: {args.file.name}"
    }
    _, created = request(f"{base}/rest/v1/icfes_saber11_imports", key, "POST", metadata, "return=representation")
    import_id = created[0]["id"]
    total = 0
    batch = []
    seen_keys = set()
    try:
        for raw in rows_from_file(args.file, args.sheet):
            item = transform(raw, args.application, args.include_source_row)
            # Granularidad: institución + calendario + sector + jornada.
            dedupe_key = (
                item["application"], item["institution_code"],
                item["academic_calendar"], item["sector"], item["jornada"]
            )
            if dedupe_key in seen_keys:
                raise ValueError(f"Fila duplicada para clave institucional: {dedupe_key}")
            seen_keys.add(dedupe_key)
            item["import_id"] = import_id
            batch.append(item)
            if len(batch) >= BATCH_SIZE:
                request(f"{base}/rest/v1/icfes_saber11_results", key, "POST", batch, "return=minimal")
                total += len(batch)
                print(f"Filas cargadas: {total}", flush=True)
                batch.clear()
        if batch:
            request(f"{base}/rest/v1/icfes_saber11_results", key, "POST", batch, "return=minimal")
            total += len(batch)
        if total == 0:
            raise ValueError("El archivo no produjo registros válidos.")
        request(f"{base}/rest/v1/icfes_saber11_imports?id=eq.{import_id}", key, "PATCH",
                {"rows_loaded": total, "status": "validated"}, "return=minimal")
        # Publicación explícita: solo tras terminar la lectura y todas las inserciones.
        request(f"{base}/rest/v1/icfes_saber11_imports?id=eq.{import_id}", key, "PATCH",
                {"status": "published"}, "return=minimal")
        print(f"Importación publicada. id={import_id}; filas={total}; sha256={checksum}")
    except Exception as exc:
        # Si la respuesta del PATCH de publicación se perdió, primero consulta
        # el estado real. Nunca borres resultados que quizá ya estén publicados.
        status = None
        try:
            status_query = urlencode({"id": f"eq.{import_id}", "select": "status"})
            _, current = request(
                f"{base}/rest/v1/icfes_saber11_imports?{status_query}", key, "GET"
            )
            status = current[0]["status"] if current else None
        except Exception as status_error:
            print(
                f"ADVERTENCIA: no se pudo confirmar el estado del lote ({status_error}). "
                "Se conservan los datos para evitar borrar una publicación posiblemente exitosa.",
                file=sys.stderr,
            )
            raise RuntimeError(
                f"{exc}. Estado del lote no verificable; no se ejecutó limpieza automática. "
                f"Revisar import_id={import_id} en Supabase."
            ) from exc

        if status == "published":
            print(
                f"ADVERTENCIA: Supabase confirma que el lote {import_id} está publicado; "
                "no se borraron sus resultados.", file=sys.stderr
            )
            raise

        # Solo limpia cuando Supabase confirma que el lote NO está publicado.
        try:
            request(
                f"{base}/rest/v1/icfes_saber11_results?import_id=eq.{quote(import_id)}",
                key, "DELETE", None, "return=minimal"
            )
        except Exception as cleanup_error:
            print(f"ADVERTENCIA: no se pudieron limpiar filas parciales: {cleanup_error}", file=sys.stderr)
        request(f"{base}/rest/v1/icfes_saber11_imports?id=eq.{import_id}", key, "PATCH",
                {"rows_loaded": 0, "status": "failed", "notes": str(exc)[:1500]}, "return=minimal")
        raise

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
