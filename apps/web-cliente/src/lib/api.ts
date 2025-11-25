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
  
  if (isRefreshing) {
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
      isRefreshing = false;
      return null;
    }
    
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
  
  const authToken = getAuthTokenFromStorage();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken && !headers.Authorization && !(options.headers as HeadersInit)?.Authorization) {
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
      if (response.status === 401) {
        const newToken = await tryRefreshToken();
        if (!newToken) {
          handleSessionExpired();
          throw new ApiError('Sesión expirada', 401);
        }
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
    if (response.status === 401) {
      const newToken = await tryRefreshToken();
      if (!newToken) {
        handleSessionExpired();
        throw new ApiError('Sesión expirada', 401);
      }
      return apiRequest<T>(endpoint, options);
    }
    
    console.error('[API] Error parseando respuesta:', jsonError);
    throw new ApiError(
      'Error al procesar la respuesta del servidor',
      response.status,
      { rawResponse: response, parseError: jsonError }
    );
  }

  if (!response.ok || !data.success) {
    const statusCode = data.statusCode || response.status;
    
    if (statusCode === 401) {
      if (endpoint.includes('/auth/refresh')) {
        handleSessionExpired();
        throw new ApiError('Sesión expirada', 401);
      }
      
      const newToken = await tryRefreshToken();
      if (newToken) {
        return apiRequest<T>(endpoint, options);
      } else {
        handleSessionExpired();
        throw new ApiError('Sesión expirada. Por favor, inicia sesión nuevamente', 401);
      }
    }
    
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

