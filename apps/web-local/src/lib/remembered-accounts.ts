/**
 * Cuentas recordadas para la pantalla de login (solo email + nombre opcional).
 * Persistencia en localStorage; máximo 5, ordenadas por última vez usada.
 */

const STORAGE_KEY = 'agora.auth.remembered_accounts';
const MAX_ACCOUNTS = 5;

export interface RememberedAccount {
  email: string;
  fullName?: string;
  lastUsedAt: string;
}

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

function parseStored(raw: string): RememberedAccount[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: any): item is RememberedAccount =>
        item && typeof item.email === 'string' && item.email.trim() !== ''
    ).map((item: any) => ({
      email: normalizeEmail(item.email),
      fullName: typeof item.fullName === 'string' ? item.fullName : undefined,
      lastUsedAt: typeof item.lastUsedAt === 'string' ? item.lastUsedAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function getRememberedAccounts(): RememberedAccount[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const list = parseStored(raw);
  return list
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, MAX_ACCOUNTS);
}

export function addOrUpdateRememberedAccount(
  email: string,
  fullName?: string
): RememberedAccount[] {
  const normalized = normalizeEmail(email);
  if (!normalized) return getRememberedAccounts();

  const list = getRememberedAccounts();
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((a) => a.email === normalized);

  let next: RememberedAccount[];
  if (existingIndex >= 0) {
    const existing = list[existingIndex];
    next = [
      { ...existing, fullName: fullName ?? existing.fullName, lastUsedAt: now },
      ...list.slice(0, existingIndex),
      ...list.slice(existingIndex + 1),
    ];
  } else {
    next = [{ email: normalized, fullName, lastUsedAt: now }, ...list].slice(0, MAX_ACCOUNTS);
  }

  next = next
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, MAX_ACCOUNTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[remembered-accounts] No se pudo guardar en localStorage', e);
  }
  return next;
}

export function removeRememberedAccount(email: string): RememberedAccount[] {
  const normalized = normalizeEmail(email);
  const list = getRememberedAccounts().filter((a) => a.email !== normalized);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[remembered-accounts] No se pudo guardar en localStorage', e);
  }
  return list;
}

