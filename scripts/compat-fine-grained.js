#!/usr/bin/env node
/**
 * Compatibilidad fina: construye catálogo vehicle_specs desde compatibilidades.csv
 * y reimporta compatibilidades usando vehicle_spec_id (sin llenar notes).
 *
 * Flujo:
 * 1. Opcional: agregar columna trim_levels a vehicle_specs si no existe
 * 2. Lee compatibilidades.csv y extrae únicos (make, model, year, body_trim, engine_transmission)
 * 3. Por cada uno: resuelve vehicle_year_id, parsea engine_transmission en variantes,
 *    crea vehicle_specs (engine_displacement, engine_cylinders, transmission_type, trim_levels)
 * 4. Borra compatibilidades existentes (no universales) de los productos del negocio
 * 5. Vuelve a insertar compatibilidades: una fila por vehicle_spec_id, notes = null
 *
 * Uso:
 *   BUSINESS_ID='uuid' node compat-fine-grained.js
 *   BUSINESS_ID='uuid' COMPAT_CSV=path node compat-fine-grained.js
 *   DRY_RUN=1 BUSINESS_ID='uuid' node compat-fine-grained.js  (solo construye catálogo, no borra ni reimporta)
 */

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');

const BASE = path.resolve(__dirname, '..');
const DEFAULT_COMPAT = path.join(BASE, 'assets', 'catalogos', 'compatibilidades.csv');

const MAKE_ALIAS = { Scion: 'Toyota' };

const MODEL_NAME_TO_CODE = {
  'Corolla': 'COROLLA', 'Camry': 'CAMRY', 'RAV4': 'RAV4', 'Hilux': 'HILUX', 'Yaris': 'YARIS',
  'Prius': 'PRIUS', 'Tacoma': 'TACOMA', 'Highlander': 'HIGHLANDER', '4Runner': '4RUNNER',
  'Sienna': 'SIENNA', 'Tundra': 'TUNDRA', 'Land Cruiser': 'LAND_CRUISER', 'C-HR': 'CHR',
  'Sequoia': 'SEQUOIA', 'Venza': 'VENZA', 'Avalon': 'AVALON', 'Supra': 'SUPRA', 'FJ Cruiser': 'FJ_CRUISER',
  'xD': 'XD', 'Matrix': 'MATRIX', 'Prius C': 'PRIUS_C', 'Prius V': 'PRIUS_V', 'Yaris iA': 'YARIS_IA',
  'Corolla iM': 'COROLLA_IM', '86': '86', 'Solara': 'SOLARA',
};

function loadEnv() {
  const envPath = process.env.DOTENV_CONFIG_PATH || path.join(BASE, 'apps', 'backend', '.env');
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  if (fs.existsSync(resolvedPath)) require('dotenv').config({ path: resolvedPath });
  else require('dotenv').config();
}

function fixDatabaseUrl(url) {
  if (!url || !url.startsWith('postgresql://')) return url;
  const match = url.match(/postgresql:\/\/([^:]+):\[([^\]]+)\]@(.+)/);
  if (!match) return url;
  const [, user, password, rest] = match;
  const host = rest.split(':')[0];
  const port = rest.split(':')[1]?.split('/')[0] || '5432';
  const database = rest.split('/')[1] || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
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

function toNum(s) {
  if (empty(s)) return null;
  const n = parseInt(String(s).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parsea "1.8L L4 - Gas" o "2.5L L4 - Electric/Gas" en { displacement, cylinders, transmissionType }.
 * Si hay varias separadas por coma, devuelve array de objetos.
 */
function parseEngineTransmission(str) {
  if (empty(str)) return [];
  const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
  const result = [];
  for (const part of parts) {
    const dash = part.indexOf(' - ');
    if (dash === -1) continue;
    const left = part.slice(0, dash).trim();
    const transmissionType = part.slice(dash + 3).trim();
    const match = left.match(/^(\d+\.?\d*)L\s*(L|V|H|I)(\d+)$/i);
    if (!match) {
      result.push({ displacement: left.replace(/\s+/g, ' '), cylinders: null, transmissionType });
      continue;
    }
    const cylinders = parseInt(match[3], 10);
    result.push({ displacement: `${match[1]}L`, cylinders: Number.isNaN(cylinders) ? null : cylinders, transmissionType });
  }
  return result.length ? result : [{ displacement: null, cylinders: null, transmissionType: str.trim() }];
}

async function run() {
  loadEnv();
  const businessId = process.env.BUSINESS_ID;
  const databaseUrl = process.env.DATABASE_URL;
  const compatPath = process.env.COMPAT_CSV || DEFAULT_COMPAT;
  const dryRun = process.env.DRY_RUN === '1';

  if (!businessId || !databaseUrl) {
    console.error('Faltan BUSINESS_ID o DATABASE_URL.');
    process.exit(1);
  }
  if (!fs.existsSync(compatPath)) {
    console.error('No se encontró CSV:', compatPath);
    process.exit(1);
  }

  const client = new Client({
    connectionString: fixDatabaseUrl(databaseUrl),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(`
      ALTER TABLE catalog.vehicle_specs
      ADD COLUMN IF NOT EXISTS trim_levels TEXT
    `);
    console.log('Columna trim_levels en vehicle_specs verificada.');

    const compatRows = parseCsv(compatPath);
    const makeModelYearTrimEngine = new Map();
    for (const r of compatRows) {
      const makeRaw = empty(r.make) ? null : String(r.make).trim();
      const make = makeRaw ? (MAKE_ALIAS[makeRaw] || makeRaw) : null;
      const model = empty(r.model) ? null : String(r.model).trim();
      const year = toNum(r.year);
      const bodyTrim = empty(r.body_trim) ? null : String(r.body_trim).trim();
      const engineTrans = empty(r.engine_transmission) ? null : String(r.engine_transmission).trim();
      if (empty(make) && empty(model) && year === null) continue;
      if (!make) continue;
      const key = `${make}\t${model || ''}\t${year ?? ''}\t${bodyTrim || ''}\t${engineTrans || ''}`;
      if (!makeModelYearTrimEngine.has(key)) {
        makeModelYearTrimEngine.set(key, { make, model, year, bodyTrim, engineTrans });
      }
    }

    console.log('Combinaciones únicas make/model/year/trim/engine (Toyota):', makeModelYearTrimEngine.size);

    const brands = await client.query('SELECT id, name, code FROM catalog.vehicle_brands WHERE is_active = TRUE');
    const brandByName = {};
    for (const b of brands.rows) {
      brandByName[b.name.toUpperCase()] = b.id;
      brandByName[b.code] = b.id;
    }
    const toyotaBrandId = brandByName['TOYOTA'] || brandByName['Toyota'];
    if (!toyotaBrandId) {
      console.error('No se encontró marca Toyota.');
      process.exit(1);
    }

    const models = await client.query('SELECT id, brand_id, name, code FROM catalog.vehicle_models WHERE is_active = TRUE');
    const modelByBrandAndCode = {};
    for (const m of models.rows) {
      modelByBrandAndCode[`${m.brand_id}|${m.code}`] = m.id;
      modelByBrandAndCode[`${m.brand_id}|${m.name.toUpperCase()}`] = m.id;
    }

    const years = await client.query('SELECT id, model_id, year_start, year_end FROM catalog.vehicle_years WHERE is_active = TRUE');
    const yearByModelAndYear = {};
    for (const y of years.rows) {
      const end = y.year_end != null ? y.year_end : 2100;
      for (let yr = y.year_start; yr <= end; yr++) {
        const k = `${y.model_id}|${yr}`;
        if (!yearByModelAndYear[k]) yearByModelAndYear[k] = y.id;
      }
    }

    const specByKey = new Map();
    let specsCreated = 0;

    for (const [, row] of makeModelYearTrimEngine) {
      const code = row.model ? (MODEL_NAME_TO_CODE[row.model] || row.model.replace(/\s+/g, '_').toUpperCase()) : null;
      const modelId = code ? (modelByBrandAndCode[`${toyotaBrandId}|${code}`] || modelByBrandAndCode[`${toyotaBrandId}|${row.model?.toUpperCase()}`]) : null;
      if (!modelId && row.model) continue;
      const yearId = modelId && row.year != null ? yearByModelAndYear[`${modelId}|${row.year}`] : null;
      if (!yearId) continue;

      const variants = parseEngineTransmission(row.engineTrans);
      const trimLevels = row.bodyTrim || null;

      for (const v of variants) {
        const specKey = `${yearId}|${v.displacement || ''}|${v.cylinders ?? ''}|${v.transmissionType || ''}|${trimLevels || ''}`;
        if (specByKey.has(specKey)) continue;

        if (!dryRun) {
          const ins = await client.query(
            `INSERT INTO catalog.vehicle_specs (year_id, engine_displacement, engine_cylinders, transmission_type, trim_levels, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING id`,
            [yearId, v.displacement, v.cylinders, v.transmissionType?.slice(0, 50) || null, trimLevels]
          );
          specByKey.set(specKey, ins.rows[0].id);
          specsCreated++;
        } else {
          specByKey.set(specKey, `dry-${specKey}`);
        }
      }
    }

    console.log('vehicle_specs creados o ya existentes (claves únicas):', specByKey.size, dryRun ? '(DRY_RUN)' : '');

    const productsBySku = await client.query(
      'SELECT id, sku FROM catalog.products WHERE business_id = $1 AND sku IS NOT NULL',
      [businessId]
    );
    const skuToProductId = {};
    for (const p of productsBySku.rows) skuToProductId[p.sku] = p.id;

    if (!dryRun) {
      const del = await client.query(
        `DELETE FROM catalog.product_vehicle_compatibility
         WHERE product_id IN (SELECT id FROM catalog.products WHERE business_id = $1)
         AND is_universal = FALSE`,
        [businessId]
      );
      console.log('Compatibilidades específicas borradas para el negocio:', del.rowCount);
    }

    const compatKey = (r) => `${(r.sku || '').trim()}\t${empty(r.make) ? '' : String(r.make).trim()}\t${empty(r.model) ? '' : String(r.model).trim()}\t${toNum(r.year) ?? ''}\t${empty(r.body_trim) ? '' : String(r.body_trim).trim()}\t${empty(r.engine_transmission) ? '' : String(r.engine_transmission).trim()}`;
    const seenCompat = new Set();
    let inserted = 0;
    let universalCount = 0;
    let compatProcessed = 0;

    for (const r of compatRows) {
      compatProcessed++;
      if (compatProcessed % 500 === 0) {
        console.log('  Procesando compatibilidades:', compatProcessed, '/', compatRows.length, '...');
      }
      const sku = (r.sku && r.sku.trim()) || '';
      const productId = skuToProductId[sku];
      if (!productId) continue;

      const makeRaw = empty(r.make) ? null : String(r.make).trim();
      const make = makeRaw ? (MAKE_ALIAS[makeRaw] || makeRaw) : null;
      const model = empty(r.model) ? null : String(r.model).trim();
      const year = toNum(r.year);
      const bodyTrim = empty(r.body_trim) ? null : String(r.body_trim).trim();
      const engineTrans = empty(r.engine_transmission) ? null : String(r.engine_transmission).trim();

      if (empty(make) && empty(model) && year === null) {
        const uk = `universal|${productId}`;
        if (seenCompat.has(uk)) continue;
        seenCompat.add(uk);
        if (!dryRun) {
          const ex = await client.query(
            'SELECT 1 FROM catalog.product_vehicle_compatibility WHERE product_id = $1 AND is_universal = TRUE LIMIT 1',
            [productId]
          );
          if (ex.rows.length === 0) {
            await client.query(
              `INSERT INTO catalog.product_vehicle_compatibility (product_id, is_universal, is_active)
               VALUES ($1, TRUE, TRUE)`,
              [productId]
            );
          }
        }
        universalCount++;
        continue;
      }

      if (!make || !toyotaBrandId) continue;
      const code = model ? (MODEL_NAME_TO_CODE[model] || model.replace(/\s+/g, '_').toUpperCase()) : null;
      const modelId = code ? (modelByBrandAndCode[`${toyotaBrandId}|${code}`] || modelByBrandAndCode[`${toyotaBrandId}|${model?.toUpperCase()}`]) : null;
      const yearId = modelId && year != null ? yearByModelAndYear[`${modelId}|${year}`] : null;
      if (!yearId) continue;

      const variants = parseEngineTransmission(engineTrans);
      const trimLevels = bodyTrim || null;

      for (const v of variants) {
        const specKey = `${yearId}|${v.displacement || ''}|${v.cylinders ?? ''}|${v.transmissionType || ''}|${trimLevels || ''}`;
        const specId = specByKey.get(specKey);
        if (!specId || typeof specId === 'string') continue;

        const rowKey = `${productId}|${specId}`;
        if (seenCompat.has(rowKey)) continue;
        seenCompat.add(rowKey);

        if (!dryRun) {
          const ctx = await client.query(
            `SELECT vs.year_id AS vehicle_year_id, vy.model_id AS vehicle_model_id, vm.brand_id AS vehicle_brand_id
             FROM catalog.vehicle_specs vs
             JOIN catalog.vehicle_years vy ON vy.id = vs.year_id
             JOIN catalog.vehicle_models vm ON vm.id = vy.model_id
             WHERE vs.id = $1`,
            [specId]
          );
          if (ctx.rows.length === 0) continue;
          const { vehicle_year_id, vehicle_model_id, vehicle_brand_id } = ctx.rows[0];
          await client.query(
            `INSERT INTO catalog.product_vehicle_compatibility
             (product_id, vehicle_spec_id, vehicle_year_id, vehicle_model_id, vehicle_brand_id, is_universal, is_active)
             VALUES ($1, $2, $3, $4, $5, FALSE, TRUE)
             ON CONFLICT (product_id, vehicle_spec_id, vehicle_year_id, vehicle_model_id, vehicle_brand_id, is_universal) DO NOTHING`,
            [productId, specId, vehicle_year_id, vehicle_model_id, vehicle_brand_id]
          );
        }
        inserted++;
      }
    }

    console.log('Compatibilidades universales:', universalCount);
    console.log('Compatibilidades por spec insertadas:', inserted);
  } finally {
    await client.end();
  }

  console.log('');
  console.log('Ha finalizado.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
