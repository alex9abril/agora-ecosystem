#!/usr/bin/env node
/**
 * Analiza la carpeta public/logos y genera brands.json con todas las imágenes.
 * Solo incluye .svg y .png. El nombre de la marca se deriva del nombre del archivo:
 * - "logotoyota.svg" -> "Toyota"
 * - "mazda.png" -> "Mazda"
 *
 * Uso: node scripts/generate-brands-json.js
 * (ejecutar desde la raíz de apps/store-front)
 */

const fs = require('fs');
const path = require('path');

const LOGOS_DIR = path.join(__dirname, '..', 'public', 'logos');
const BRANDS_JSON = path.join(LOGOS_DIR, 'brands.json');
const IMAGE_EXT = ['.svg', '.png'];

function filenameToName(filename) {
  const base = path.basename(filename, path.extname(filename));
  let name = base.replace(/^logo_?/i, '').trim();
  if (!name) name = base;
  name = name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return name;
}

const files = fs.readdirSync(LOGOS_DIR);
const brands = files
  .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
  .sort()
  .map((file) => ({
    name: filenameToName(file),
    logo: file,
  }));

fs.writeFileSync(BRANDS_JSON, JSON.stringify(brands, null, 2) + '\n', 'utf8');
console.log('Generado', BRANDS_JSON, 'con', brands.length, 'marcas:', brands.map((b) => b.logo).join(', '));
