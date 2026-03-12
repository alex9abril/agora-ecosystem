#!/usr/bin/env node
/**
 * Importación de catálogo de productos y compatibilidades a AGORA
 *
 * Lee productos.csv y compatibilidades.csv, actualiza/inserta en catalog.products
 * por SKU e inserta compatibilidades en catalog.product_vehicle_compatibility.
 *
 * Uso:
 *   BUSINESS_ID='tu-uuid-del-negocio' node import-catalog.js
 *   BUSINESS_ID='...' PRODUCTOS_CSV=path COMPAT_CSV=path node import-catalog.js
 *
 * Variables de entorno:
 *   BUSINESS_ID       (requerido) UUID del negocio al que importar
 *   DATABASE_URL      (requerido) PostgreSQL connection string (ej. desde apps/backend/.env)
 *   PRODUCTOS_CSV     (opcional) Ruta a productos.csv; default: assets/catalogos/productos.csv
 *   COMPAT_CSV        (opcional) Ruta a compatibilidades.csv; default: assets/catalogos/compatibilidades.csv
 *   DRY_RUN           (opcional) 1 = no escribe en BD, solo muestra resumen
 *
 * Cargar .env del backend: desde repo root: node -r dotenv/config scripts/import-catalog.js
 * con dotenv_config_path=apps/backend/.env
 *
 * Documentación completa: scripts/README-import-catalog.md
 */

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');

const BASE = path.resolve(__dirname, '..');
const DEFAULT_PRODUCTOS = path.join(BASE, 'assets', 'catalogos', 'productos.csv');
const DEFAULT_COMPAT = path.join(BASE, 'assets', 'catalogos', 'compatibilidades.csv');

// Scion se trata como Toyota (misma marca en BD)
const MAKE_ALIAS = { Scion: 'Toyota' };

// Normalización nombre modelo en CSV -> code en catalog.vehicle_models (Toyota)
const MODEL_NAME_TO_CODE = {
  'Corolla': 'COROLLA',
  'Camry': 'CAMRY',
  'RAV4': 'RAV4',
  'Hilux': 'HILUX',
  'Yaris': 'YARIS',
  'Prius': 'PRIUS',
  'Tacoma': 'TACOMA',
  'Highlander': 'HIGHLANDER',
  '4Runner': '4RUNNER',
  'Sienna': 'SIENNA',
  'Tundra': 'TUNDRA',
  'Land Cruiser': 'LAND_CRUISER',
  'C-HR': 'CHR',
  'Sequoia': 'SEQUOIA',
  'Venza': 'VENZA',
  'Avalon': 'AVALON',
  'Supra': 'SUPRA',
  'FJ Cruiser': 'FJ_CRUISER',
  'xD': 'XD',
  'Matrix': 'MATRIX',
  'Prius C': 'PRIUS_C',
  'Prius V': 'PRIUS_V',
  'Yaris iA': 'YARIS_IA',
  'Corolla iM': 'COROLLA_IM',
  '86': '86',
  'Solara': 'SOLARA',
};

/**
 * Misma lógica que apps/backend/src/config/database.config.ts:
 * Si DATABASE_URL tiene la contraseña entre corchetes [PASSWORD], extraer el contenido
 * y reconstruir la URL sin corchetes (el backend hace esto para que pg reciba la contraseña correcta).
 */
function fixDatabaseUrl(url) {
  if (!url || !url.startsWith('postgresql://')) return url;
  const match = url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if (!match) return url;
  const user = match[1];
  const password = match[2];
  const rest = match[3];
  const host = rest.split(':')[0];
  const port = rest.split(':')[1]?.split('/')[0] || '5432';
  const database = rest.split('/')[1] || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

function loadEnv() {
  const envPath = process.env.DOTENV_CONFIG_PATH || path.join(BASE, 'apps', 'backend', '.env');
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  const exists = fs.existsSync(resolvedPath);
  console.log('[env] Ruta .env (resuelta):', resolvedPath);
  console.log('[env] Archivo existe:', exists);
  if (exists) {
    const result = require('dotenv').config({ path: resolvedPath });
    if (result.error) console.warn('[env] Error al cargar .env:', result.error.message);
  } else {
    require('dotenv').config();
  }
  const dbUrl = process.env.DATABASE_URL;
  console.log('[env] DATABASE_URL definido:', !!dbUrl, dbUrl ? `(longitud ${dbUrl.length}, usuario: ${dbUrl.match(/\/\/([^:]+):/)?.[1] || '?'})` : '');
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function empty(s) {
  if (s == null || s === '') return true;
  const t = String(s).trim().toLowerCase();
  return t === 'null' || t === '';
}

/** Valor no vacío: ignora null, undefined, '' y la cadena "null". */
function valueOrEmpty(s) {
  if (s == null || s === '') return '';
  const t = String(s).trim();
  return t.toLowerCase() === 'null' ? '' : t;
}

function toNum(s) {
  if (empty(s)) return null;
  const n = parseInt(String(s).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

async function run() {
  loadEnv();

  const businessId = process.env.BUSINESS_ID;
  const databaseUrl = process.env.DATABASE_URL;
  const productosPath = process.env.PRODUCTOS_CSV || DEFAULT_PRODUCTOS;
  const compatPath = process.env.COMPAT_CSV || DEFAULT_COMPAT;
  const dryRun = process.env.DRY_RUN === '1';

  if (!businessId) {
    console.error('Falta BUSINESS_ID. Uso: BUSINESS_ID=<uuid> [DATABASE_URL=...] node import-catalog.js');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('Falta DATABASE_URL (ej. desde apps/backend/.env).');
    process.exit(1);
  }
  if (!fs.existsSync(productosPath)) {
    console.error('No se encontró productos CSV:', productosPath);
    process.exit(1);
  }
  if (!fs.existsSync(compatPath)) {
    console.error('No se encontró compatibilidades CSV:', compatPath);
    process.exit(1);
  }

  console.log('BUSINESS_ID:', businessId);
  console.log('Productos CSV:', productosPath);
  console.log('Compatibilidades CSV:', compatPath);
  console.log('DRY_RUN:', dryRun);
  console.log('');

  const connectionString = fixDatabaseUrl(databaseUrl);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const stats = {
    productsUpdated: 0,
    productsInserted: 0,
    productsSkipped: 0,
    compatInserted: 0,
    compatSkippedNoProduct: 0,
    compatSkippedDuplicate: 0,
    compatUniversal: 0,
  };

  try {
    // ---------- 1. Productos ----------
    const productosRows = parseCsv(productosPath);
    console.log('Filas en productos.csv:', productosRows.length);

    let productIdx = 0;
    for (const row of productosRows) {
      productIdx++;
      if (productIdx % 100 === 0) {
        console.log('  Productos: procesadas', productIdx, '/', productosRows.length, 'filas...');
      }
      const sku = row.sku && row.sku.trim() ? row.sku.trim() : null;
      if (!sku) {
        stats.productsSkipped++;
        continue;
      }

      const nameFromCsv = valueOrEmpty(row.nombre) || valueOrEmpty(row.name);
      const descFromCsv = valueOrEmpty(row.descripcion) || valueOrEmpty(row.description);
      const nameForInsert = nameFromCsv || sku || 'Sin nombre';
      const descForInsert = descFromCsv || '';

      let price = parseFloat(row.sale_price);
      if (Number.isNaN(price) || price < 0) price = 0;
      const imageUrl = (row.image_1_url && row.image_1_url.trim()) || null;

      const existing = await client.query(
        'SELECT id, name, description FROM catalog.products WHERE business_id = $1 AND sku = $2',
        [businessId, sku]
      );

      if (existing.rows.length > 0) {
        if (!dryRun) {
          const current = existing.rows[0];
          const nameToSet = nameFromCsv ? nameFromCsv : (current.name && current.name.trim().toLowerCase() !== 'null' ? current.name : (valueOrEmpty(row.name) || sku || 'Sin nombre'));
          const descToSet = descFromCsv !== '' ? descFromCsv : (current.description != null && String(current.description).trim().toLowerCase() !== 'null' ? current.description : '');
          await client.query(
            `UPDATE catalog.products SET description = $1, name = $2, updated_at = CURRENT_TIMESTAMP
             WHERE business_id = $3 AND sku = $4`,
            [descToSet === '' ? null : descToSet, nameToSet, businessId, sku]
          );
        }
        stats.productsUpdated++;
      } else {
        if (!dryRun) {
          await client.query(
            `INSERT INTO catalog.products (business_id, name, description, price, sku, image_url, is_available, is_featured, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, 0)`,
            [businessId, nameForInsert, descForInsert || null, price, sku, imageUrl]
          );
        }
        stats.productsInserted++;
      }
    }

    console.log('Productos: actualizados=', stats.productsUpdated, 'insertados=', stats.productsInserted, 'omitidos=', stats.productsSkipped);

    // ---------- 2. Mapa sku -> product_id ----------
    const productsBySku = await client.query(
      'SELECT id, sku FROM catalog.products WHERE business_id = $1 AND sku IS NOT NULL',
      [businessId]
    );
    const skuToProductId = {};
    for (const p of productsBySku.rows) {
      skuToProductId[p.sku] = p.id;
    }
    console.log('Productos con SKU en BD para este negocio:', Object.keys(skuToProductId).length);

    // ---------- 3. Variantes únicas desde CSV (make, model, year, body_trim, engine_transmission) ----------
    const compatRows = parseCsv(compatPath);
    const variantKey = (make, model, year, bodyTrim, engineTrans) =>
      `${make}|${model}|${year}|${bodyTrim || ''}|${engineTrans || ''}`;
    const uniqueVariants = new Map(); // key -> { make, model, year, body_trim, engine_transmission }
    for (const r of compatRows) {
      const makeRaw = empty(r.make) ? '' : String(r.make).trim();
      const make = makeRaw ? (MAKE_ALIAS[makeRaw] || makeRaw) : '';
      const model = empty(r.model) ? '' : String(r.model).trim();
      const year = toNum(r.year);
      const yearVal = year == null ? '' : String(year);
      const bodyTrim = empty(r.body_trim) ? '' : String(r.body_trim).trim();
      const engineTrans = empty(r.engine_transmission) ? '' : String(r.engine_transmission).trim();
      const key = variantKey(make, model, yearVal, bodyTrim, engineTrans);
      if (!uniqueVariants.has(key)) {
        uniqueVariants.set(key, { make, model, year: yearVal, body_trim: bodyTrim || null, engine_transmission: engineTrans || null });
      }
    }
    console.log('Variantes únicas (vehicle_variants) a asegurar:', uniqueVariants.size);

    const variantIdByKey = {};
    if (!dryRun) {
      for (const [key, v] of uniqueVariants.entries()) {
        const yearInt = v.year === '' ? null : parseInt(v.year, 10);
        if (!v.make || !v.model || yearInt == null) continue;
        const sel = await client.query(
          `SELECT id FROM catalog.vehicle_variants
           WHERE make = $1 AND model = $2 AND year = $3
             AND COALESCE(body_trim, '') = COALESCE($4, '')
             AND COALESCE(engine_transmission, '') = COALESCE($5, '')`,
          [v.make, v.model, yearInt, v.body_trim, v.engine_transmission]
        );
        if (sel.rows.length > 0) {
          variantIdByKey[key] = sel.rows[0].id;
        } else {
          const ins = await client.query(
            `INSERT INTO catalog.vehicle_variants (make, model, year, body_trim, engine_transmission, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING id`,
            [v.make, v.model, yearInt, v.body_trim, v.engine_transmission]
          );
          if (ins.rows.length > 0) variantIdByKey[key] = ins.rows[0].id;
        }
      }
    }

    // ---------- 4. Compatibilidades: producto ↔ variante (o universal) ----------
    const compatRowKey = (r) => {
      const makeRaw = empty(r.make) ? '' : String(r.make).trim();
      const make = makeRaw ? (MAKE_ALIAS[makeRaw] || makeRaw) : '';
      const model = empty(r.model) ? '' : String(r.model).trim();
      const year = toNum(r.year);
      const yearVal = year == null ? '' : String(year);
      const bodyTrim = empty(r.body_trim) ? '' : String(r.body_trim).trim();
      const engineTrans = empty(r.engine_transmission) ? '' : String(r.engine_transmission).trim();
      return `${(r.sku || '').trim()}\t${variantKey(make, model, yearVal, bodyTrim, engineTrans)}`;
    };
    const compatSeen = new Set();
    const toInsert = [];
    for (const r of compatRows) {
      const key = compatRowKey(r);
      if (compatSeen.has(key)) continue;
      compatSeen.add(key);
      const sku = (r.sku && r.sku.trim()) || '';
      const makeRaw = empty(r.make) ? '' : String(r.make).trim();
      const make = makeRaw ? (MAKE_ALIAS[makeRaw] || makeRaw) : '';
      const model = empty(r.model) ? '' : String(r.model).trim();
      const year = toNum(r.year);
      const yearVal = year == null ? '' : String(year);
      const bodyTrim = empty(r.body_trim) ? '' : String(r.body_trim).trim();
      const engineTrans = empty(r.engine_transmission) ? '' : String(r.engine_transmission).trim();
      const vKey = variantKey(make, model, yearVal, bodyTrim, engineTrans);
      toInsert.push({ sku, make, model, year: yearVal, body_trim: bodyTrim || null, engine_transmission: engineTrans || null, variantKey: vKey });
    }

    console.log('Compatibilidades únicas a insertar:', toInsert.length);

    let compatIdx = 0;
    for (const row of toInsert) {
      compatIdx++;
      if (compatIdx % 500 === 0) {
        console.log('  Compatibilidades: procesadas', compatIdx, '/', toInsert.length, '...');
      }
      const productId = skuToProductId[row.sku];
      if (!productId) {
        stats.compatSkippedNoProduct++;
        continue;
      }

      const isUniversal = empty(row.make) && empty(row.model) && row.year === '';

      if (isUniversal) {
        stats.compatUniversal++;
        if (!dryRun) {
          const exists = await client.query(
            'SELECT 1 FROM catalog.product_vehicle_compatibility WHERE product_id = $1 AND is_universal = TRUE LIMIT 1',
            [productId]
          );
          if (exists.rows.length === 0) {
            await client.query(
              `INSERT INTO catalog.product_vehicle_compatibility (product_id, vehicle_variant_id, is_universal, is_active)
               VALUES ($1, NULL, TRUE, TRUE)`,
              [productId]
            );
            stats.compatInserted++;
          } else {
            stats.compatSkippedDuplicate++;
          }
        } else {
          stats.compatInserted++;
        }
        continue;
      }

      const variantId = variantIdByKey[row.variantKey];
      if (!variantId) {
        stats.compatSkippedNoProduct++;
        continue;
      }

      if (!dryRun) {
        const exists = await client.query(
          'SELECT 1 FROM catalog.product_vehicle_compatibility WHERE product_id = $1 AND vehicle_variant_id = $2 LIMIT 1',
          [productId, variantId]
        );
        if (exists.rows.length === 0) {
          await client.query(
            `INSERT INTO catalog.product_vehicle_compatibility (product_id, vehicle_variant_id, is_universal, is_active)
             VALUES ($1, $2, FALSE, TRUE)`,
            [productId, variantId]
          );
          stats.compatInserted++;
        } else {
          stats.compatSkippedDuplicate++;
        }
      } else {
        stats.compatInserted++;
      }
    }

    console.log('Compatibilidades: insertadas=', stats.compatInserted, 'universal=', stats.compatUniversal, 'omitidas (sin producto/variante)=', stats.compatSkippedNoProduct, 'duplicadas=', stats.compatSkippedDuplicate);
  } finally {
    await client.end();
  }

    console.log('');
    console.log('Resumen:', stats);
  if (dryRun) console.log('(DRY_RUN: no se escribió en la base de datos)');
  console.log('');
  console.log('Ha finalizado.');
}

run().catch((err) => {
  if (err.code === '28P01') {
    console.error('\nError: Falló la autenticación con la base de datos.');
    console.error('Revisa DATABASE_URL en tu .env (usuario y contraseña de Supabase).');
    console.error('Ver scripts/README-import-catalog.md sección "Troubleshooting".\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});
