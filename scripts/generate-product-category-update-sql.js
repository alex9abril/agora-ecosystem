#!/usr/bin/env node
/**
 * Genera el script SQL para actualizar catalog.products.category_id
 * a partir de un CSV con columnas: product_uuid, product_name, category_uuid, category_name
 *
 * Uso: node scripts/generate-product-category-update-sql.js [ruta_csv]
 * Por defecto usa: assets/categorizacion/product_category_mapping.csv
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const DEFAULT_CSV = path.join(BASE, 'assets', 'categorizacion', 'product_category_mapping.csv');
const OUTPUT_SQL = path.join(BASE, 'database', 'agora', 'update_products_category_from_mapping.sql');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] !== undefined ? values[j] : '';
    });
    rows.push(row);
  }
  return rows;
}

function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!fs.existsSync(csvPath)) {
    console.error('No se encontró el CSV:', csvPath);
    process.exit(1);
  }

  const rows = readCSV(csvPath);
  const pairs = [];
  for (const r of rows) {
    const productUuid = (r.product_uuid || '').trim();
    const categoryUuid = (r.category_uuid || '').trim();
    if (!productUuid || !categoryUuid || categoryUuid === 'Sin categoría') continue;
    if (!UUID_REGEX.test(productUuid) || !UUID_REGEX.test(categoryUuid)) continue;
    pairs.push({ product_uuid: productUuid, category_uuid: categoryUuid });
  }

  const valuesLines = pairs
    .map((p) => `  ('${p.product_uuid}'::uuid, '${p.category_uuid}'::uuid)`)
    .join(',\n');

  const sql = `-- ============================================================================
-- AGORA ECOSYSTEM - Actualizar category_id de productos desde mapping
-- ============================================================================
-- Descripción: Establece la relación producto -> categoría en catalog.products
--              a partir de un listado (product_uuid, category_uuid).
--              Ejecutar en Supabase SQL Editor después de exportar la
--              categorización final (ej. desde productos_categorizados_final).
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2026-02-11
-- Hora: 12:00:00
-- ============================================================================

SET search_path TO catalog, core;

-- Actualizar category_id solo para productos que tienen categoría asignada en el mapping
UPDATE catalog.products p
SET
  category_id = v.category_uuid,
  updated_at = CURRENT_TIMESTAMP
FROM (VALUES
${valuesLines}
) AS v(product_uuid, category_uuid)
WHERE p.id = v.product_uuid;

-- Verificación (ejecutar si se desea): productos con categoría asignada
-- SELECT p.id, p.name, pc.name AS category_name FROM catalog.products p
-- LEFT JOIN catalog.product_categories pc ON pc.id = p.category_id WHERE p.category_id IS NOT NULL;

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 1. Los productos con "Sin categoría" en el CSV no se modifican (category_id queda como estaba).
-- 2. Para regenerar este script desde otro CSV: node scripts/generate-product-category-update-sql.js <ruta.csv>
-- 3. El CSV debe tener columnas: product_uuid, product_name, category_uuid, category_name
-- ============================================================================
`;

  fs.writeFileSync(OUTPUT_SQL, sql, 'utf-8');
  console.log('SQL generado:', OUTPUT_SQL);
  console.log('Filas con categoría asignada:', pairs.length);
}

main();
