/**
 * Familias de SKU por prefijo acordado (sin IA).
 * Orden: prefijos de 2 letras; el primero que coincida gana.
 */
export const SKU_FAMILY_PREFIXES = ["PT", "PK", "PU", "PW"] as const;

export type SkuFamilyPrefix = (typeof SKU_FAMILY_PREFIXES)[number];

/**
 * Devuelve el prefijo de familia (PT, PK, PU, PW) si el SKU empieza así; si no, cadena vacía.
 */
export function getSkuLineFromSku(sku: string | null | undefined): string {
  const s = (sku ?? "").trim().toUpperCase();
  if (!s) return "";
  for (const p of SKU_FAMILY_PREFIXES) {
    if (s.startsWith(p)) return p;
  }
  return "";
}
