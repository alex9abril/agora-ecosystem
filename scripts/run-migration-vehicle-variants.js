#!/usr/bin/env node
/**
 * Ejecuta la migración radical de compatibilidades (vehicle_variants + product_vehicle_compatibility).
 * Usa DATABASE_URL del .env (misma lógica que import-catalog.js).
 *
 * Uso (desde repo root o desde scripts/):
 *   node scripts/run-migration-vehicle-variants.js
 *   DOTENV_CONFIG_PATH=apps/backend/.env node scripts/run-migration-vehicle-variants.js
 */

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const BASE = path.resolve(__dirname, '..');
const MIGRATION_PATH = path.join(BASE, 'database', 'agora', 'migration_vehicle_variants_and_compat_radical.sql');

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

function loadEnv() {
  const envPath = process.env.DOTENV_CONFIG_PATH || path.join(BASE, 'apps', 'backend', '.env');
  const resolvedPath = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  if (fs.existsSync(resolvedPath)) {
    require('dotenv').config({ path: resolvedPath });
  } else {
    require('dotenv').config();
  }
}

async function run() {
  loadEnv();
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error('Falta DATABASE_URL. Usa .env de backend o DOTENV_CONFIG_PATH=apps/backend/.env');
    process.exit(1);
  }
  const url = fixDatabaseUrl(rawUrl);
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');
  const client = new Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Migración ejecutada correctamente: vehicle_variants + product_vehicle_compatibility.');
  } catch (err) {
    console.error('Error ejecutando migración:', err.message);
    throw err;
  } finally {
    await client.end();
  }
  console.log('Ha finalizado.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
