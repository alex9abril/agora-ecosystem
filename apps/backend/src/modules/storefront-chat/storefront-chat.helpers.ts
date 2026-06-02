export type ProductHintLite = { id: string; name: string; sku: string | null };

/** Palabras coloquiales / relleno que no ayudan al ILIKE del catálogo (p.name, p.description, p.sku). */
const STOPWORDS = new Set([
  'tienes',
  'tiene',
  'hay',
  'venden',
  'vende',
  'manejan',
  'maneja',
  'traen',
  'trae',
  'busco',
  'buscas',
  'necesito',
  'necesitas',
  'quiero',
  'quieres',
  'dame',
  'dan',
  'danos',
  'algun',
  'alguna',
  'algunos',
  'algunas',
  'unos',
  'unas',
  'por',
  'favor',
  'hola',
  'buenas',
  'buenos',
  'dias',
  'días',
  'disculpa',
  'disculpe',
  'oye',
  'mira',
  'solo',
  'solamente',
  'ustedes',
  'usted',
  'vosotros',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'en',
  'me',
  'mi',
  'mis',
  'con',
  'para',
  'porfa',
  'ok',
  'okay',
  /** Saludo / cortesía — no usar solos para ILIKE (evita falsos positivos, p. ej. «como» en descripciones). */
  'que',
  'tal',
  'como',
  'cómo',
  'estas',
  'estás',
  'esta',
  'está',
  'bien',
  'gracias',
  'gusto',
  'igualmente',
  'mucho',
  'saludos',
  'tarde',
  'noche',
  'noches',
  'buen',
  'va',
  'vas',
  'vamos',
  'listo',
  'genial',
  'encantado',
  'encantada',
  'conocerte',
  'verdad',
  'ahi',
  'ahí',
  'supuesto',
  'refiero',
  'digamos',
  'digo',
  'se',
  'usa',
  'usan',
  'poner',
  'ponen',
]);

/**
 * Limpia lenguaje natural para buscar en catálogo (ILIKE sobre nombre, descripción, SKU).
 * Ver `products.service.ts`: búsqueda simple sin sinónimos en SQL — aquí compensamos en app.
 */
export function refineSearchQueryForCatalog(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  /** Lenguaje coloquial → término más cercano al catálogo (nombre/SKU suelen ser técnicos). */
  s = s
    .replace(/\btriangulitos?\b/giu, 'triangulo')
    .replace(/\btriángulos?\b/giu, 'triangulo')
    .replace(/\bvia\b/giu, 'vía')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = s.split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w));
  if (tokens.length === 0) {
    return '';
  }
  return tokens.join(' ').slice(0, 120);
}

/**
 * Varias cadenas a intentar en findAll hasta obtener filas (orden de prioridad).
 */
export function buildSearchAttempts(raw: string): string[] {
  const primary = refineSearchQueryForCatalog(raw);
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (t.length < 2) return;
    if (!out.includes(t)) out.push(t);
  };

  if (primary) add(primary);

  const low = raw.toLowerCase();
  if (/\bbalatas?\b/.test(low)) {
    add('pastillas de freno');
    add('pastillas freno');
    add('pastilla freno');
    add('freno');
  }
  if (/\bpastillas?\b/.test(low) && /\bfreno/.test(low)) {
    add('pastillas freno');
    add('freno');
  }
  if (/\bfrenos?\b/.test(low)) {
    add('freno');
  }

  /** Triángulos / señalización vial (coloquial: triangulito rojo, en la vía, etc.). */
  if (
    /\btriangul|triángul/i.test(low) ||
    /\btriangulito\b/.test(low) ||
    /\b(en la )?(vía|via)\b/.test(low)
  ) {
    add('triangulo emergencia');
    add('triangulo carretera');
    add('triangulo reflectivo');
    add('triangulo');
    add('advertencia vial');
    add('senal emergencia');
    add('señal emergencia');
  }

  const parts = primary.split(/\s+/).filter((p) => p.length > 2);
  parts.sort((a, b) => b.length - a.length);
  for (const p of parts.slice(0, 4)) {
    add(p);
  }

  return out;
}

/**
 * Varias consultas al catálogo y fusión de candidatos (mejor para descripciones coloquiales).
 * Consultas cortas tipo SKU o dos palabras suelen bastar con el primer término que devuelva filas.
 */
export function shouldUseMergedCatalogSearch(raw: string): boolean {
  const low = raw.toLowerCase();
  if (/\bme refiero\b|\brefiero al\b|\brefiero a\b/.test(low)) return true;
  if (/\btriangul|triángul|triangulito\b/.test(low)) return true;
  if (/\b(en la )?(vía|via)\b/.test(low) && /\b(poner|coloc|senal|señal|emergencia|triangul|advertencia)\b/.test(low)) {
    return true;
  }
  const words = raw.trim().split(/\s+/).filter(Boolean).length;
  return words >= 10;
}

/** Extrae término de búsqueda a partir del último mensaje del usuario. */
export function extractProductSearchQuery(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'user') continue;
    let t = messages[i].content.replace(/\s+/g, ' ').trim();
    if (t.length < 2) return '';
    t = t.replace(/https?:\/\/\S+/gi, '').trim();
    if (t.length > 200) t = t.slice(0, 200);
    return t;
  }
  return '';
}

export function fallbackReply(search: string, hints: ProductHintLite[], storeLabel: string): string {
  if (hints.length > 0) {
    const top = hints.slice(0, 2);
    const list = top.map((p) => `• ${p.name}${p.sku ? ` (${p.sku})` : ''}`).join('\n');
    return `En ${storeLabel} hay opciones para «${search || 'tu búsqueda'}». Ejemplos:\n${list}${hints.length > 2 ? `\n…y más en el catálogo.` : ''}\n\n¿Vehículo o SKU para afinar?`;
  }
  if (search.length < 2) {
    return `¡Hola! Soy el asistente de ${storeLabel}. Cuéntame qué refacción o accesorio buscas (marca, modelo, año o SKU) y te guío hacia el producto adecuado.`;
  }
  return `No encontré coincidencias claras en catálogo para «${search}». Prueba con otra palabra clave o mira el catálogo; también puedes indicarme vehículo (marca, modelo, año) para orientarte mejor.`;
}
