/**
 * Cliente API para comunicarse con el backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
  timestamp?: string;
}

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

/**
 * Obtener token de autenticación desde storage
 */
function getAuthTokenFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const { getAuthToken } = require('./storage');
      return getAuthToken();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Manejar sesión expirada: limpiar storage y redirigir al login
 */
function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  
  console.log('[API] Sesión expirada, cerrando sesión...');
  
  // Limpiar storage
  try {
    const { clearAuth } = require('./storage');
    clearAuth();
  } catch (e) {
    console.error('[API] Error limpiando auth:', e);
    // Limpiar manualmente si falla
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
  }
  
  // Disparar evento personalizado para que AuthContext se actualice
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
  
  // Redirigir al login (solo si no estamos ya en login)
  if (window.location.pathname !== '/auth/login') {
    window.location.href = '/auth/login';
  }
}

// Variable global para evitar loops infinitos al refrescar
let isRefreshing = false;

/**
 * Intentar refrescar el token cuando expire
 */
async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  // Si ya estamos refrescando, esperar
  if (isRefreshing) {
    console.log('[API] Ya se está refrescando el token, esperando...');
    // Esperar un poco y verificar si ya se refrescó
    await new Promise(resolve => setTimeout(resolve, 500));
    const { getAuthToken } = require('./storage');
    const newToken = getAuthToken();
    if (newToken) {
      return newToken;
    }
    return null;
  }
  
  isRefreshing = true;
  
  try {
    const { getRefreshToken } = require('./storage');
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      console.log('[API] No hay refresh token disponible');
      isRefreshing = false;
      return null;
    }
    
    console.log('[API] Intentando refrescar token...');
    
    // Llamar directamente al endpoint de refresh sin usar apiRequest para evitar loop
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error(`Refresh failed: ${response.status}`);
    }
    
    const text = await response.text();
    if (!text) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    const refreshResponse = JSON.parse(text);
    
    if (!refreshResponse.success || !refreshResponse.data) {
      throw new Error(refreshResponse.message || 'Error al refrescar token');
    }
    
    const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data;
    
    // Guardar nuevos tokens
    const { setAuthToken, setRefreshToken } = require('./storage');
    setAuthToken(accessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    
    console.log('[API] Token refrescado exitosamente');
    isRefreshing = false;
    return accessToken;
  } catch (error: any) {
    console.error('[API] Error al refrescar token:', error);
    isRefreshing = false;
    return null;
  }
}

/**
 * Cliente HTTP para hacer requests al backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  // Agregar token de autenticación si está disponible y no se especificó explícitamente
  const authToken = getAuthTokenFromStorage();
  const existingHeaders = options.headers;
  
  // Verificar si ya existe Authorization en los headers
  let hasExistingAuth = false;
  if (existingHeaders instanceof Headers) {
    hasExistingAuth = existingHeaders.has('Authorization');
  } else if (Array.isArray(existingHeaders)) {
    hasExistingAuth = existingHeaders.some(([key]) => key.toLowerCase() === 'authorization');
  } else if (existingHeaders && typeof existingHeaders === 'object') {
    hasExistingAuth = 'Authorization' in existingHeaders || 'authorization' in existingHeaders;
  }
  
  // Construir headers base
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Copiar headers existentes si es un objeto
  if (existingHeaders && typeof existingHeaders === 'object' && !Array.isArray(existingHeaders) && !(existingHeaders instanceof Headers)) {
    Object.assign(headers, existingHeaders);
  }

  // Agregar token si existe y no hay uno ya en los headers
  if (authToken && !hasExistingAuth) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: ApiResponse<T>;
  
  try {
    const text = await response.text();
    if (!text) {
      // Respuesta vacía - si es 401, manejar como sesión expirada
      if (response.status === 401) {
        console.log('[API] Respuesta vacía con 401, sesión expirada');
        const newToken = await tryRefreshToken();
        if (!newToken) {
          handleSessionExpired();
          throw new ApiError('Sesión expirada', 401);
        }
        // Reintentar con el nuevo token
        return apiRequest<T>(endpoint, options);
      }
      
      throw new ApiError(
        'Respuesta vacía del servidor',
        response.status,
        { rawResponse: response }
      );
    }
    data = JSON.parse(text);
  } catch (jsonError) {
    // Si no se puede parsear JSON y es 401, manejar como sesión expirada
    if (response.status === 401) {
      console.log('[API] Error parseando respuesta 401, sesión expirada');
      const newToken = await tryRefreshToken();
      if (!newToken) {
        handleSessionExpired();
        throw new ApiError('Sesión expirada', 401);
      }
      // Reintentar con el nuevo token
      return apiRequest<T>(endpoint, options);
    }
    
    // Si no se puede parsear JSON, puede ser un error de red o respuesta vacía
    console.error('[API] Error parseando respuesta:', jsonError);
    throw new ApiError(
      'Error al procesar la respuesta del servidor',
      response.status,
      { rawResponse: response, parseError: jsonError }
    );
  }

  // Si la respuesta no es exitosa o no tiene success=true
  if (!response.ok || !data.success) {
    const statusCode = data.statusCode || response.status;
    
    // Endpoints públicos de autenticación que no deben intentar refrescar token
    const publicAuthEndpoints = ['/auth/signin', '/auth/signup', '/auth/signup/admin', '/auth/password/reset', '/auth/password/update'];
    const isPublicAuthEndpoint = publicAuthEndpoints.some(ep => endpoint.includes(ep));
    
    // Si es 401 (no autorizado)
    if (statusCode === 401) {
      // Para endpoints públicos de autenticación, usar el mensaje del backend directamente
      if (isPublicAuthEndpoint) {
        const error = new ApiError(
          data.message || 'Error de autenticación',
          statusCode,
          data
        );
        console.error('[API] Error de autenticación en endpoint público:', {
          endpoint,
          status: error.statusCode,
          message: error.message,
        });
        throw error;
      }
      
      console.log('[API] Error 401 detectado, intentando refrescar token...');
      
      // Evitar loop infinito: si el endpoint es /auth/refresh, no intentar refrescar
      if (endpoint.includes('/auth/refresh')) {
        console.log('[API] Error en refresh token, cerrando sesión');
        handleSessionExpired();
        throw new ApiError(data.message || 'Sesión expirada', 401, data);
      }
      
      const newToken = await tryRefreshToken();
      if (newToken) {
        // Reintentar la petición original con el nuevo token
        console.log('[API] Reintentando petición con token refrescado');
        return apiRequest<T>(endpoint, options);
      } else {
        // No se pudo refrescar, cerrar sesión
        handleSessionExpired();
        throw new ApiError(data.message || 'Sesión expirada. Por favor, inicia sesión nuevamente', 401, data);
      }
    }
    
    // Para otros errores, lanzar normalmente
    const error = new ApiError(
      data.message || 'Error en la petición',
      statusCode,
      data
    );
    console.error('[API] Error en petición:', {
      endpoint,
      status: error.statusCode,
      message: error.message,
    });
    throw error;
  }

  return data.data as T;
}

/**
 * Cliente HTTP con autenticación
 */
export async function authenticatedRequest<T = any>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

