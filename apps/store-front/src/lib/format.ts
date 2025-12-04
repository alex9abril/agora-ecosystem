/**
 * Utilidades para formatear números y precios
 */

/**
 * Formatea un número como precio con separadores de miles
 * @param price - Precio a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns Precio formateado con separadores de miles (ej: $12,450.00)
 */
export function formatPrice(price: number | string | null | undefined, decimals: number = 2): string {
  if (price === null || price === undefined) {
    return '$0.00';
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numPrice);
}

/**
 * Formatea un número con separadores de miles (sin símbolo de moneda)
 * @param number - Número a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns Número formateado (ej: 12,450.00)
 */
export function formatNumber(number: number | string | null | undefined, decimals: number = 2): string {
  if (number === null || number === undefined) {
    return '0.00';
  }

  const numValue = typeof number === 'string' ? parseFloat(number) : number;
  
  if (isNaN(numValue)) {
    return '0.00';
  }

  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

