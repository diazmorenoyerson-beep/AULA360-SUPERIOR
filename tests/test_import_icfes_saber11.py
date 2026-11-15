"""Pruebas unitarias del importador ICFES; usan datos sintéticos, nunca se cargan."""
import math
import tempfile
import unittest
from pathlib import Path

from scripts.import_icfes_saber11 import norm, number, integer, transform, rows_from_file


class ImportIcfesTests(unittest.TestCase):
    def sample(self):
        return {
            "CODINST": "123456789012",
            "NOMBREINSTITUCION": "Institución de prueba",
            "CODIGOMUNICIPIO": "17001",
            "NOMBREMUNICIPIO": "Manizales",
            "DEPARTAMENTO": "Caldas",
            "CALENDARIO": "A",
            "NATURALEZA": "OFICIAL",
            "JORNADA": "MAÑANA",
            "EVALUADOS": "25",
            "PROM_LECTURA_CRITICA": "55,5",
            "PROM_MATEMATICAS": "60.0",
            "PROM_SOCIALES_CIUDADANAS": "52",
            "PROM_CIENCIAS_NATURALES": "58",
            "PROM_INGLES": "61",
        }

    def test_normalizes_accents_and_symbols(self):
        self.assertEqual(norm("Promedio Matemáticas (%)"), "PROMEDIO_MATEMATICAS")

    def test_accepts_comma_decimal(self):
        self.assertEqual(number("55,5", "score", 0, 100), 55.5)

    def test_rejects_nan_and_infinity(self):
        for value in ("NaN", "nan", "Infinity", "-Infinity"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    number(value, "score", 0, 100)

    def test_rejects_out_of_range_score(self):
        with self.assertRaises(ValueError):
            number("100.1", "score", 0, 100)

    def test_integer_requires_whole_nonnegative_value(self):
        self.assertEqual(integer("25", "evaluated_count"), 25)
        with self.assertRaises(ValueError):
            integer("2.5", "evaluated_count")
        with self.assertRaises(ValueError):
            integer("-1", "evaluated_count")

    def test_transform_maps_institution_and_areas(self):
        item = transform(self.sample(), "2025-1", False)
        self.assertEqual(item["application"], "2025-1")
        self.assertEqual(item["institution_code"], "123456789012")
        self.assertEqual(item["average_reading"], 55.5)
        self.assertEqual(item["evaluated_count"], 25)
        self.assertIsNone(item["average_global"])

    def test_transform_rejects_missing_required_area_average(self):
        for field in ("PROM_LECTURA_CRITICA", "PROM_MATEMATICAS",
                      "PROM_SOCIALES_CIUDADANAS", "PROM_CIENCIAS_NATURALES",
                      "PROM_INGLES"):
            with self.subTest(field=field):
                row = self.sample()
                row[field] = ""
                with self.assertRaisesRegex(ValueError, "promedio obligatorio"):
                    transform(row, "2025-1", False)

    def test_global_average_is_not_derived(self):
        item = transform(self.sample(), "2025-1", False)
        self.assertIsNone(item["average_global"])
        row = self.sample()
        row["PROMEDIO_GLOBAL"] = "57.8"
        self.assertEqual(transform(row, "2025-1", False)["average_global"], 57.8)

    def test_transform_rejects_missing_institution_identity(self):
        row = self.sample()
        row["CODINST"] = ""
        with self.assertRaises(ValueError):
            transform(row, "2025-1", False)

    def test_csv_reader_normalizes_headers(self):
        content = (
            "Código DANE,Nombre Institución,Promedio Lectura Crítica\n"
            "123,Centro de prueba,55.5\n"
        )
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sample.csv"
            path.write_text(content, encoding="utf-8")
            rows = list(rows_from_file(path, None))
        self.assertEqual(rows[0]["CODIGO_DANE"], "123")
        self.assertEqual(rows[0]["NOMBRE_INSTITUCION"], "Centro de prueba")


if __name__ == "__main__":
    unittest.main()
