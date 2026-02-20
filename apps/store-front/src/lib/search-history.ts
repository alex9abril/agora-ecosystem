/**
 * Historial de búsquedas por tienda (localStorage).
 * Cada contexto (global, grupo, sucursal, brand) tiene su propio historial
 * para no mezclar búsquedas entre tiendas.
 */

const STORAGE_PREFIX = 'agora_search_history_';
const MAX_ITEMS = 15;

/**
 * Obtiene la clave de localStorage para el historial de una tienda.
 * @param contextType - global | grupo | sucursal | brand
 * @param slug - slug de la tienda (ej. toyota-satelite) o null para global
 */
export function getSearchHistoryStorageKey(contextType: string, slug: string | null): string {
  const safeSlug = (slug || 'default').replace(/[^a-z0-9-]/gi, '_');
  return `${STORAGE_PREFIX}${contextType}_${safeSlug}`;
}

/**
 * Lee el historial de búsquedas de una tienda desde localStorage.
 */
export function getSearchHistory(contextType: string, slug: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getSearchHistoryStorageKey(contextType, slug);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

/**
 * Añade una búsqueda al historial de la tienda (al inicio, sin duplicados, límite MAX_ITEMS).
 */
export function addSearchToHistory(contextType: string, slug: string | null, query: string): void {
  const q = query.trim();
  if (!q) return;
  if (typeof window === 'undefined') return;
  try {
    const key = getSearchHistoryStorageKey(contextType, slug);
    const current = getSearchHistory(contextType, slug);
    const filtered = current.filter((item) => item.toLowerCase() !== q.toLowerCase());
    const next = [q, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Elimina una búsqueda del historial de la tienda.
 */
export function removeSearchFromHistory(contextType: string, slug: string | null, query: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getSearchHistoryStorageKey(contextType, slug);
    const current = getSearchHistory(contextType, slug);
    const next = current.filter((item) => item !== query);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Borra todo el historial de búsquedas de la tienda.
 */
export function clearSearchHistory(contextType: string, slug: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getSearchHistoryStorageKey(contextType, slug);
    localStorage.setItem(key, JSON.stringify([]));
  } catch {
    // ignore
  }
}
