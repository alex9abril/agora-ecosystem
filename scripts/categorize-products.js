#!/usr/bin/env node
/**
 * Script para clasificar productos del CSV usando el catálogo de categorías.
 * Lee: Global Product Categories.csv, products_rows.csv
 * Genera: product_category_mapping.csv con (product_uuid, product_name, category_uuid, category_name)
 *
 * Uso: node scripts/categorize-products.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'assets', 'categorizacion');
const CATEGORIES_FILE = path.join(BASE, 'Global Product Categories.csv');
const PRODUCTS_FILE = path.join(BASE, 'products_rows.csv');
const OUTPUT_FILE = path.join(BASE, 'product_category_mapping.csv');

// Parse CSV line handling quoted fields
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
  return { header, rows };
}

// Normalizar texto para matching: minúsculas y quitar acentos
function normalize(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

// Palabras significativas: length >= 3 para evitar matches por "bar", "sr", "at", etc.
const MIN_WORD_LEN = 3;
function getWords(str) {
  const normalized = normalize(str);
  return normalized
    .split(/[\s,;.()\/\-]+/)
    .filter((w) => w.length >= MIN_WORD_LEN);
}

// Categorías cuyo nombre es muy genérico o engañoso (evitar asignar por "para", "hibrido", etc.)
const SKIP_CATEGORY_NAMES = new Set([
  'computadora para hev',
  'computadora para bev',
  'computadora para hibrido',
  'inversor para hev',
  'comunicacion por radio',
  'motor para bev',
  'refrigerante toyota genuino',
  'kit de emergencia',
]);
  // También excluir cualquier categoría cuyo nombre termine en " para [siglas]" (HEV, BEV, EV, etc.)
function shouldSkipCategory(catNorm) {
  if (SKIP_CATEGORY_NAMES.has(catNorm)) return true;
  if (/ para (hev|bev|ev|fcv|fcev|hibrido)$/.test(catNorm)) return true;
  return false;
}

// Puntuación: cuántas palabras de la categoría aparecen en el texto del producto
// Bonus si el nombre completo de la categoría aparece como substring
function scoreMatch(productTextNorm, productWords, categoryName) {
  const catNorm = normalize(categoryName);
  if (shouldSkipCategory(catNorm)) return 0;
  // Si la categoría es "X para Y", exigir que Y aparezca en el producto (evitar "para" genérico)
  const paraMatch = catNorm.match(/^(.+?) para (.+)$/);
  if (paraMatch) {
    const afterPara = paraMatch[2].trim();
    const wordsAfter = getWords(afterPara);
    if (wordsAfter.length > 0) {
      const hasAfter = wordsAfter.some((w) => productTextNorm.includes(w) || productWords.has(w));
      if (!hasAfter) return 0;
    }
  }
  const catWords = getWords(categoryName);
  if (catWords.length === 0) return 0;
  let matchedWords = 0;
  for (const w of catWords) {
    if (w.length < MIN_WORD_LEN) continue;
    if (productTextNorm.includes(w) || productWords.has(w)) matchedWords += 1;
  }
  // Requerir al menos 1 palabra significativa coincidente
  if (matchedWords === 0) return 0;
  let score = matchedWords / Math.max(1, catWords.length);
  // Bonus fuerte si el nombre completo de la categoría aparece
  if (productTextNorm.includes(catNorm)) score += 2;
  // Preferir categorías con más palabras coincidentes
  score += matchedWords * 0.5;
  return score;
}

function buildCategoryTree(rows) {
  const byId = new Map();
  rows.forEach((r) => {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      parent_id: r.parent_category_id && r.parent_category_id !== 'null' ? r.parent_category_id : null,
      depth: 0,
    });
  });
  function depth(id) {
    const c = byId.get(id);
    if (!c) return 0;
    if (c.depth) return c.depth;
    c.depth = 1 + (c.parent_id ? depth(c.parent_id) : 0);
    return c.depth;
  }
  byId.forEach((c) => depth(c.id));
  return Array.from(byId.values());
}

function main() {
  console.log('Leyendo categorías:', CATEGORIES_FILE);
  const { rows: categoryRows } = readCSV(CATEGORIES_FILE);
  const categories = buildCategoryTree(categoryRows);
  console.log('Categorías cargadas:', categories.length);

  console.log('Leyendo productos:', PRODUCTS_FILE);
  const { rows: productRows } = readCSV(PRODUCTS_FILE);
  console.log('Productos cargados:', productRows.length);

  // Ordenar categorías por profundidad descendente (más específicas primero) y luego por nombre
  categories.sort((a, b) => b.depth - a.depth || a.name.localeCompare(b.name));

  const outputRows = [];
  let matched = 0;
  let noMatch = 0;

  for (const product of productRows) {
    const productId = product.id || '';
    const productName = product.name || '';
    const sku = product.sku || '';
    const description = product.description || '';
    const searchText = [sku, productName, description].join(' ');
    const productTextNorm = normalize(searchText);
    const productWords = new Set(getWords(searchText));

    let bestCategory = null;
    let bestScore = 0;

    for (const cat of categories) {
      const score = scoreMatch(productTextNorm, productWords, cat.name);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = cat;
      }
    }

    if (bestCategory && bestScore >= 0.5) {
      matched++;
      outputRows.push({
        product_uuid: productId,
        product_name: productName,
        category_uuid: bestCategory.id,
        category_name: bestCategory.name,
      });
    } else {
      noMatch++;
      outputRows.push({
        product_uuid: productId,
        product_name: productName,
        category_uuid: '',
        category_name: 'Sin categoría',
      });
    }
  }

  // Escribir CSV de salida
  const outHeader = 'product_uuid,product_name,category_uuid,category_name';
  const escape = (v) => {
    const s = String(v == null ? '' : v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const outLines = [
    outHeader,
    ...outputRows.map(
      (r) =>
        [r.product_uuid, r.product_name, r.category_uuid, r.category_name].map(escape).join(',')
    ),
  ];
  fs.writeFileSync(OUTPUT_FILE, outLines.join('\n'), 'utf-8');

  console.log('Resultado escrito en:', OUTPUT_FILE);
  console.log('Productos con categoría asignada:', matched);
  console.log('Productos sin categoría:', noMatch);
}

main();
