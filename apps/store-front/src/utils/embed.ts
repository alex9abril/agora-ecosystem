/**
 * Utilidades para detectar y manejar contexto embebido (iframe)
 * [AGORA EMBED] - Prefijo para logs de debugging
 */

const LOG_PREFIX = '[AGORA EMBED]';

/**
 * Detecta si la tienda está corriendo dentro de un iframe.
 * Usa try/catch porque acceder a window.top puede lanzar SecurityError
 * en contextos cross-origin.
 */
export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    // SecurityError cuando el iframe es cross-origin y no podemos acceder a top
    // En ese caso, asumimos que estamos embebidos
    return true;
  }
}

/**
 * Intenta escapar del iframe navegando la ventana superior a la URL actual.
 * Solo funciona si estamos en el mismo origen que el parent.
 * @returns true si se pudo escapar, false si falló
 */
export function tryBreakoutFromIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.self === window.top) return false; // Ya estamos en top
    const currentUrl = window.location.href;
    window.top!.location.href = currentUrl;
    return true;
  } catch {
    console.warn(`${LOG_PREFIX} No se pudo escapar del iframe (cross-origin)`);
    return false;
  }
}

/**
 * Obtiene la URL base del store-front (para construir URLs standalone).
 * En SSR retorna vacío; en cliente usa origin.
 */
export function getStoreOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}
