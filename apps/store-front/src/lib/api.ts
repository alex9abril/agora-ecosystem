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
      const token = localStorage.getItem('auth_token');
      return token;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Manejar sesión expirada: limpiar storage y redirigir al login
 * Solo redirige si el endpoint requiere autenticación
 */
function handleSessionExpired(requiresAuth: boolean = false) {
  if (typeof window === 'undefined') return;
  
  console.log('[API] Sesión expirada, cerrando sesión...');
  
  // Limpiar storage
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_user');
  } catch (e) {
    console.error('[API] Error limpiando auth:', e);
  }
  
  // Disparar evento personalizado para que AuthContext se actualice
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
  
  // Solo redirigir al login si el endpoint requiere autenticación
  // Endpoints públicos (productos, sucursales, grupos) no deben redirigir
  if (requiresAuth && window.location.pathname !== '/auth/login' && !window.location.pathname.startsWith('/auth/')) {
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
    const token = localStorage.getItem('auth_token');
    if (token) {
      return token;
    }
    return null;
  }
  
  isRefreshing = true;
  
  try {
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (!refreshToken) {
      isRefreshing = false;
      return null;
    }
    
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
    localStorage.setItem('auth_token', accessToken);
    if (newRefreshToken) {
      localStorage.setItem('auth_refresh_token', newRefreshToken);
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
 * Determinar si un endpoint requiere autenticación
 */
function requiresAuthentication(endpoint: string): boolean {
  // Endpoints públicos que NO requieren autenticación
  const publicEndpoints = [
    '/catalog/products',
    '/businesses/branches',
    '/businesses/groups',
  ];
  
  // Endpoints que SÍ requieren autenticación
  const authRequiredEndpoints = [
    '/cart',
    '/orders',
    '/addresses',
    '/auth/me',
    '/auth/refresh',
  ];
  
  // Verificar si es un endpoint público
  const isPublic = publicEndpoints.some(publicPath => endpoint.startsWith(publicPath));
  if (isPublic) {
    return false;
  }
  
  // Verificar si es un endpoint que requiere autenticación
  const requiresAuth = authRequiredEndpoints.some(authPath => endpoint.startsWith(authPath));
  if (requiresAuth) {
    return true;
  }
  
  // Por defecto, no requerir autenticación para endpoints desconocidos
  // (permite que el backend decida)
  return false;
}

/**
 * Cliente HTTP para hacer requests al backend
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const needsAuth = requiresAuthentication(endpoint);
  
  const authToken = getAuthTokenFromStorage();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Solo agregar token si existe y el endpoint lo requiere
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
      if (response.status === 401 && needsAuth) {
        const newToken = await tryRefreshToken();
        if (!newToken) {
          handleSessionExpired(needsAuth);
          throw new ApiError('Sesión expirada', 401);
        }
        return apiRequest<T>(endpoint, options);
      }
      
      // Para endpoints públicos con 401, simplemente lanzar error sin redirigir
      if (response.status === 401 && !needsAuth) {
        throw new ApiError('No autorizado', 401);
      }
      
      throw new ApiError(
        'Respuesta vacía del servidor',
        response.status,
        { rawResponse: response }
      );
    }
    data = JSON.parse(text);
  } catch (jsonError) {
    if (response.status === 401 && needsAuth) {
      const newToken = await tryRefreshToken();
      if (!newToken) {
        handleSessionExpired(needsAuth);
        throw new ApiError('Sesión expirada', 401);
      }
      return apiRequest<T>(endpoint, options);
    }
    
    // Para endpoints públicos con 401, simplemente lanzar error sin redirigir
    if (response.status === 401 && !needsAuth) {
      throw new ApiError('No autorizado', 401);
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
        handleSessionExpired(needsAuth);
        throw new ApiError('Sesión expirada', 401);
      }
      
      // Solo intentar refrescar token si el endpoint requiere autenticación
      if (needsAuth) {
        const newToken = await tryRefreshToken();
        if (newToken) {
          return apiRequest<T>(endpoint, options);
        } else {
          handleSessionExpired(needsAuth);
          throw new ApiError('Sesión expirada. Por favor, inicia sesión nuevamente', 401);
        }
      } else {
        // Endpoint público con 401 - simplemente lanzar error sin redirigir
        throw new ApiError(data.message || 'No autorizado', 401);
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

