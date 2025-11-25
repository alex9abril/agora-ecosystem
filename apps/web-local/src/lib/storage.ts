/**
 * Utilidades para almacenamiento seguro de sesión
 * Usa localStorage para mantener la sesión entre recargas de página
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
} as const;

/**
 * Almacenar token de acceso
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      console.log('[Storage] Token guardado en localStorage');
    } catch (e) {
      console.error('[Storage] Error guardando token:', e);
    }
  }
}

/**
 * Obtener token de acceso
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('[Storage] Token recuperado:', token ? 'Sí' : 'No');
      return token;
    } catch (e) {
      console.error('[Storage] Error obteniendo token:', e);
      return null;
    }
  }
  return null;
}

/**
 * Almacenar refresh token
 */
export function setRefreshToken(token: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
      console.log('[Storage] Refresh token guardado');
    } catch (e) {
      console.error('[Storage] Error guardando refresh token:', e);
    }
  }
}

/**
 * Obtener refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (e) {
      console.error('[Storage] Error obteniendo refresh token:', e);
      return null;
    }
  }
  return null;
}

/**
 * Almacenar información del usuario
 */
export function setUser(user: any): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      console.log('[Storage] Usuario guardado:', user?.email || 'N/A');
    } catch (e) {
      console.error('[Storage] Error guardando usuario:', e);
    }
  }
}

/**
 * Obtener información del usuario
 */
export function getUser(): any | null {
  if (typeof window !== 'undefined') {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('[Storage] Usuario recuperado:', user?.email || 'N/A');
        return user;
      }
    } catch (e) {
      console.error('[Storage] Error parsing user from storage:', e);
      return null;
    }
  }
  return null;
}

/**
 * Limpiar toda la información de autenticación
 */
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    try {
      console.log('[Storage] Limpiando autenticación');
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch (e) {
      console.error('[Storage] Error limpiando auth:', e);
    }
  }
}

/**
 * Verificar si hay una sesión activa
 */
export function hasAuth(): boolean {
  return !!getAuthToken() && !!getUser();
}

