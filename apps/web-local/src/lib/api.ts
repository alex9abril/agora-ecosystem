/**
 * Cliente API para comunicarse con el backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success?: boolean;
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
 * Obtener token de autenticacion desde storage
 */
function getAuthTokenFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    try {
      // Leer directamente de localStorage para evitar problemas de timing
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('[API] Token encontrado en localStorage, longitud:', token.length);
      } else {
        console.warn('[API] No se encontro token en localStorage');
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
  
  // Agregar token de autenticacion si esta disponible y no se especifico explicitamente
  const authToken = getAuthTokenFromStorage();
  
  // Construir headers como objeto mutable
  const headersObj: Record<string, string> = {};
  
  // Copiar headers existentes si es un objeto plano
  if (options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers) && !(options.headers instanceof Headers)) {
    Object.assign(headersObj, options.headers);
  }
  
  // Solo establecer Content-Type si no es FormData (el navegador lo establece automaticamente para FormData)
  if (!(options.body instanceof FormData)) {
    headersObj['Content-Type'] = 'application/json';
  }

  // Si hay token y no se especifico Authorization en headers, agregarlo
  const existingHeaders = options.headers;
  let hasExistingAuth = false;
  if (existingHeaders instanceof Headers) {
    hasExistingAuth = existingHeaders.has('Authorization');
  } else if (Array.isArray(existingHeaders)) {
    hasExistingAuth = existingHeaders.some(([key]) => key.toLowerCase() === 'authorization');
  } else if (existingHeaders && typeof existingHeaders === 'object') {
    hasExistingAuth = 'Authorization' in existingHeaders || 'authorization' in existingHeaders;
  }
  
  if (authToken && !hasExistingAuth) {
    headersObj['Authorization'] = `Bearer ${authToken}`;
    console.log('[API] Token agregado al header Authorization');
  } else if (!authToken) {
    console.warn('[API] No hay token disponible para la peticion a:', endpoint);
  }
  
  const headers: HeadersInit = headersObj;
  
  console.log('[API] Realizando peticion:', {
    url,
    method: options.method || 'GET',
    hasAuth: !!authToken,
    hasAuthHeader: !!headers.Authorization,
  });
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  let parsed: any = null;
  
  try {
    const text = await response.text();
    if (text) {
      parsed = JSON.parse(text);
    } else if (response.ok) {
      // Respuestas 204/empty exitosas (p. ej. DELETE) se consideran correctas
      return undefined as T;
    } else {
      throw new ApiError(
        'Respuesta vacia del servidor',
        response.status,
        { rawResponse: response }
      );
    }
  } catch (jsonError) {
    // Si no se puede parsear JSON, puede ser un error de red o respuesta vacia
    console.error('[API] Error parseando respuesta:', jsonError);
    throw new ApiError(
      'Error al procesar la respuesta del servidor',
      response.status,
      { rawResponse: response, parseError: jsonError }
    );
  }

  const hasSuccessFlag = parsed && Object.prototype.hasOwnProperty.call(parsed, 'success');
  if (!response.ok || (hasSuccessFlag && parsed?.success === false)) {
    const error = new ApiError(
      parsed?.message || 'Error en la peticion',
      parsed?.statusCode || response.status,
      parsed
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
      console.error('[API] Error en peticion:', {
        endpoint,
        status: error.statusCode,
        message: error.message,
        url,
        hasAuth: !!authToken,
      });
    }
    
    // Si es un error 401, limpiar el token y redirigir al login
    if (error.statusCode === 401) {
      console.warn('[API] Error 401 - Token invalido o expirado, limpiando sesion');
      if (typeof window !== 'undefined') {
        try {
          const { clearAuth } = require('./storage');
          clearAuth();
          
          // Disparar evento personalizado para que AuthContext maneje la redireccion
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } catch (e) {
          console.error('[API] Error limpiando auth:', e);
        }
      }
    }
    
    throw error;
  }

  const envelopeKeys = ['success', 'data', 'message', 'statusCode', 'timestamp'];
  const isEnvelopeOnly =
    parsed &&
    typeof parsed === 'object' &&
    Object.keys(parsed).every((k) => envelopeKeys.includes(k));

  if (isEnvelopeOnly && Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    return parsed.data as T;
  }

  return parsed as T;
}

/**
 * Cliente HTTP con autenticacion
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
