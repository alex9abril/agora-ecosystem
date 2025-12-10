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
      // Leer directamente de localStorage para evitar problemas de timing
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('[API] Token encontrado en localStorage, longitud:', token.length);
      } else {
        console.warn('[API] No se encontró token en localStorage');
      }
      return token;
    } catch (e) {
      console.error('[API] Error obteniendo token de storage:', e);
      return null;
    }
  }
  return null;
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
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  // Solo establecer Content-Type si no es FormData (el navegador lo establece automáticamente para FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Si hay token y no se especificó Authorization en headers, agregarlo
  if (authToken && !headers.Authorization && !(options.headers as HeadersInit)?.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
    console.log('[API] Token agregado al header Authorization');
  } else if (!authToken) {
    console.warn('[API] No hay token disponible para la petición a:', endpoint);
  }
  
  console.log('[API] Realizando petición:', {
    url,
    method: options.method || 'GET',
    hasAuth: !!authToken,
    hasAuthHeader: !!headers.Authorization,
  });
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: ApiResponse<T>;
  
  try {
    const text = await response.text();
    if (!text) {
      // Respuesta vacía
      throw new ApiError(
        'Respuesta vacía del servidor',
        response.status,
        { rawResponse: response }
      );
    }
    data = JSON.parse(text);
  } catch (jsonError) {
    // Si no se puede parsear JSON, puede ser un error de red o respuesta vacía
    console.error('[API] Error parseando respuesta:', jsonError);
    throw new ApiError(
      'Error al procesar la respuesta del servidor',
      response.status,
      { rawResponse: response, parseError: jsonError }
    );
  }

  if (!response.ok || !data.success) {
    const error = new ApiError(
      data.message || 'Error en la petición',
      data.statusCode || response.status,
      data
    );
    
    // Endpoints donde 404 es un caso esperado y no debe loguearse como error
    const expected404Endpoints = ['/businesses/my-business'];
    const isExpected404 = error.statusCode === 404 && expected404Endpoints.some(ep => endpoint.includes(ep));
    
    if (isExpected404) {
      // Solo loguear como info, no como error
      console.log('[API] Recurso no encontrado (esperado):', {
        endpoint,
        status: error.statusCode,
        message: error.message,
      });
    } else {
      // Otros errores se loguean normalmente
      console.error('[API] Error en petición:', {
        endpoint,
        status: error.statusCode,
        message: error.message,
        url,
        hasAuth: !!authToken,
      });
    }
    
    // Si es un error 401, limpiar el token y redirigir al login
    if (error.statusCode === 401) {
      console.warn('[API] Error 401 - Token inválido o expirado, limpiando sesión');
      if (typeof window !== 'undefined') {
        try {
          const { clearAuth } = require('./storage');
          clearAuth();
          
          // Disparar evento personalizado para que AuthContext maneje la redirección
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch (e) {
          console.error('[API] Error limpiando auth:', e);
        }
      }
    }
    
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

