/**
 * Utilidades para almacenamiento seguro de sesión
 * Usa localStorage para mantener la sesión entre recargas de página
 */

const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
  LANGUAGE: 'app_language',
} as const;

/**
 * Almacenar token de acceso
 */
export function setAuthToken(token: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
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
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
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
        return JSON.parse(userStr);
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

/**
 * Guardar idioma preferido
 */
export function setLanguage(lang: 'en' | 'es'): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    } catch (e) {
      console.error('[Storage] Error guardando idioma:', e);
    }
  }
}

/**
 * Obtener idioma guardado
 */
export function getLanguage(): 'en' | 'es' | null {
  if (typeof window !== 'undefined') {
    try {
      const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
      if (lang === 'en' || lang === 'es') {
        return lang;
      }
    } catch (e) {
      console.error('[Storage] Error obteniendo idioma:', e);
    }
  }
  return null;
}

