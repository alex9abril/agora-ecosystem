/**
 * Mapeo de marcas de vehículo por NOMBRE a ruta del logo en /logos.
 * Los archivos en public/logos se nombran según el nombre de la marca (normalizado).
 * Ej.: "Toyota" -> logotoyota.svg, toyota.svg; "Mercedes-Benz" -> mercedesbenz.svg, logomercedesbenz.svg
 */

import type { VehicleBrand } from '@/lib/vehicle-brands';

const LOGOS_BASE = '/logos';

/**
 * Normaliza el nombre de la marca para coincidir con nombres de archivo:
 * minúsculas, sin espacios, sin guiones.
 */
function slugFromName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

/**
 * Devuelve las URLs de logo a probar en orden (por nombre de marca).
 * Primero con prefijo "logo" (logotoyota.svg), luego sin prefijo (toyota.svg).
 * Extensiones: .svg y .png.
 */
export function getBrandLogoUrls(brand: VehicleBrand): { svg: string; png: string; logoSvg: string; logoPng: string } {
  const slug = slugFromName(brand.name);
  if (!slug) return { svg: '', png: '', logoSvg: '', logoPng: '' };
  return {
    logoSvg: `${LOGOS_BASE}/logo${slug}.svg`,
    logoPng: `${LOGOS_BASE}/logo${slug}.png`,
    svg: `${LOGOS_BASE}/${slug}.svg`,
    png: `${LOGOS_BASE}/${slug}.png`,
  };
}

/**
 * Lista de URLs a intentar en orden (para probar una por una hasta que una cargue).
 */
export function getBrandLogoUrlCandidates(brand: VehicleBrand): string[] {
  const u = getBrandLogoUrls(brand);
  return [u.logoSvg, u.svg, u.logoPng, u.png].filter(Boolean);
}
