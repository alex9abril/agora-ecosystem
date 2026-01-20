/**
 * Contexto de autenticación
 * Maneja el estado de autenticación global de la aplicación
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { authService, AuthResponse } from '@/lib/auth';
import { 
  setAuthToken, 
  getAuthToken, 
  setRefreshToken, 
  getRefreshToken, 
  setUser as setUserInStorage, 
  getUser, 
  clearAuth,
  hasAuth 
} from '@/lib/storage';

// Importar SelectedBusinessContext para detectar roles operativos
let selectedBusinessContext: any = null;
try {
  // Intentar importar dinámicamente para evitar dependencias circulares
  const SelectedBusinessContextModule = require('@/contexts/SelectedBusinessContext');
  selectedBusinessContext = SelectedBusinessContextModule;
} catch (e) {
  // Si no está disponible, no pasa nada
}

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Detectar si el usuario tiene un rol operativo (necesita sesión más larga)
  // El rol del negocio (operations_staff, kitchen_staff) se obtiene de SelectedBusinessContext
  const isOperationalRole = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Primero, verificar si estamos en rutas operativas (más rápido)
    const path = window.location.pathname;
    if (path.startsWith('/kitchen') || path.startsWith('/operations')) {
      return true;
    }
    
    // Si no estamos en rutas operativas, verificar el rol del negocio seleccionado
    // Esto requiere acceso al contexto, pero lo hacemos de forma segura
    try {
      // Intentar obtener el negocio seleccionado del localStorage
      const businessDataStr =
        localStorage.getItem('agora_selected_business_data') ||
        localStorage.getItem('localia_selected_business_data');
      if (businessDataStr) {
        const businessData = JSON.parse(businessDataStr);
        // El rol no está en businessData, pero podemos inferir por la ruta
        // O mejor, usar el hook cuando esté disponible
        return false;
      }
    } catch (e) {
      // Si hay error, no es operativo
    }
    
    return false;
  };

  // Manejar expiración de sesión
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSessionExpired = () => {
      console.log('[Auth] Sesión expirada, redirigiendo al login...');
      setToken(null);
      setUser(null);
      clearAuth();
      
      // Redirigir al login
      router.push('/auth/login?expired=true');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [router]);

  // Refresh automático más agresivo para roles operativos
  useEffect(() => {
    if (typeof window === 'undefined' || !token || !user) return;

    const isOperational = isOperationalRole();
    
    // Para roles operativos, refrescar cada 30 minutos (antes de que expire)
    // Para otros roles, refrescar cada 1 hora
    const refreshInterval = isOperational ? 30 * 60 * 1000 : 60 * 60 * 1000;

    const intervalId = setInterval(async () => {
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          console.log(`[Auth] Refrescando token automáticamente (rol: ${isOperational ? 'operativo' : 'normal'})...`);
          const refreshResponse = await authService.refreshToken(refreshToken);
          setToken(refreshResponse.accessToken);
          setAuthToken(refreshResponse.accessToken);
          setRefreshToken(refreshResponse.refreshToken);
          
          // Actualizar perfil
          const profile = await authService.getProfile(refreshResponse.accessToken);
          setUser(profile);
          setUserInStorage(profile);
          console.log('[Auth] Token refrescado exitosamente');
        }
      } catch (error: any) {
        console.error('[Auth] Error en refresh automático:', error);
        // Si falla el refresh, no hacer nada todavía (esperar a que expire naturalmente)
      }
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [token, user]);

  // Cargar token y usuario desde localStorage al iniciar
  useEffect(() => {
    const initializeAuth = () => {
      console.log('[Auth] Inicializando autenticación...');
      
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        console.log('[Auth] No estamos en el cliente, saltando inicialización');
        setLoading(false);
        return;
      }

      try {
        // Leer directamente de localStorage para evitar problemas de timing
        const tokenKey = 'auth_token';
        const userKey = 'auth_user';
        const refreshKey = 'auth_refresh_token';
        
        const storedToken = localStorage.getItem(tokenKey);
        const storedUserStr = localStorage.getItem(userKey);
        const storedRefreshToken = localStorage.getItem(refreshKey);
        
        let storedUser = null;
        if (storedUserStr) {
          try {
            storedUser = JSON.parse(storedUserStr);
          } catch (e) {
            console.error('[Auth] Error parseando usuario:', e);
          }
        }

        console.log('[Auth] Datos recuperados directamente de localStorage:', {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          hasRefreshToken: !!storedRefreshToken,
          tokenLength: storedToken?.length || 0,
        });

        if (storedToken && storedUser) {
          console.log('[Auth] Restaurando sesión desde localStorage');
          // Restaurar estado inmediatamente para evitar flash de login
          setToken(storedToken);
          setUser(storedUser);
          setLoading(false); // Marcar como cargado inmediatamente
          
          // Verificar que el token sigue siendo válido (en background, sin bloquear)
          // Si falla, intentamos refrescar, pero NO limpiamos la sesión inmediatamente
          authService.getProfile(storedToken)
            .then((profile) => {
              console.log('[Auth] Token válido, perfil actualizado');
              setUser(profile); // Actualizar estado con datos frescos
              setUserInStorage(profile); // Actualizar en storage
            })
            .catch((error: any) => {
              console.log('[Auth] Error verificando token:', error?.statusCode || error?.message);
              
              // IMPORTANTE: No limpiar la sesión automáticamente
              // Solo intentar refrescar si es un error 401 (no autorizado)
              // Si es un error de red u otro, mantenemos la sesión
              if (error?.statusCode === 401 && storedRefreshToken) {
                console.log('[Auth] Token expirado, intentando refrescar...');
                authService.refreshToken(storedRefreshToken)
                  .then((refreshResponse) => {
                    console.log('[Auth] Token refrescado exitosamente');
                    setToken(refreshResponse.accessToken);
                    setAuthToken(refreshResponse.accessToken);
                    setRefreshToken(refreshResponse.refreshToken);
                    
                    // Obtener perfil con el nuevo token
                    return authService.getProfile(refreshResponse.accessToken);
                  })
                  .then((profile) => {
                    setUser(profile);
                    setUserInStorage(profile);
                  })
                  .catch((refreshError: any) => {
                    console.error('[Auth] Error al refrescar token:', refreshError?.statusCode || refreshError?.message);
                    // Si el refresh falla completamente, la sesión expiró
                    if (refreshError?.statusCode === 401) {
                      console.log('[Auth] Refresh falló con 401, sesión expirada');
                      window.dispatchEvent(new CustomEvent('auth:session-expired'));
                    } else {
                      // Otro error, mantener sesión
                      console.log('[Auth] Refresh falló, pero manteniendo sesión en localStorage');
                    }
                  });
              } else {
                // Si es otro tipo de error (red, 500, endpoint no existe, etc), mantener la sesión
                console.log('[Auth] Error no crítico, manteniendo sesión. El token puede ser válido pero el endpoint no responde.');
              }
            });
        } else {
          console.log('[Auth] No hay sesión guardada en localStorage');
          setLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error inicializando autenticación:', error);
        setLoading(false);
      }
    };

    // Ejecutar inmediatamente
    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Iniciando sesión...');
      const response: AuthResponse = await authService.signIn({ email, password });
      
      console.log('[Auth] Sesión iniciada exitosamente', {
        hasAccessToken: !!response.accessToken,
        hasRefreshToken: !!response.refreshToken,
        hasUser: !!response.user,
        accessTokenLength: response.accessToken?.length || 0,
      });
      
      if (!response.accessToken) {
        console.error('[Auth] ERROR: No se recibió accessToken en la respuesta');
        throw new Error('No se recibió token de acceso del servidor');
      }
      
      setToken(response.accessToken);
      setUser(response.user);
      
      // Guardar en localStorage
      setAuthToken(response.accessToken);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      setUserInStorage(response.user);
      
      console.log('[Auth] Datos guardados en localStorage');
      
      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('[Auth] Error al iniciar sesión:', error);
      throw error;
    }
  };

  const signUp = async (data: any) => {
    try {
      const response: AuthResponse = await authService.signUp(data);
      
      // Solo guardar sesión si el usuario ya confirmó su email (tiene session)
      if (response.session && response.accessToken) {
        setToken(response.accessToken);
        setUser(response.user);
        
        // Guardar en localStorage
        setAuthToken(response.accessToken);
        if (response.refreshToken) {
          setRefreshToken(response.refreshToken);
        }
        setUserInStorage(response.user);
        
        // Redirigir al dashboard solo si el email ya está confirmado
        router.push('/dashboard');
      }
      
      // Retornar la respuesta para que el componente pueda manejar el caso de email no confirmado
      return response;
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (token) {
        await authService.signOut(token);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      // Limpiar estado y sessionStorage
      setToken(null);
      setUser(null);
      clearAuth();
      
      // Redirigir al login
      router.push('/auth/login');
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const profile = await authService.getProfile(token);
      setUser(profile); // Actualizar estado
      setUserInStorage(profile); // Actualizar en storage
    } catch (error: any) {
      console.error('Error al refrescar usuario:', error);
      
      // Si el token expiró, intentar refrescar
      const refreshToken = getRefreshToken();
      if (refreshToken && error?.statusCode === 401) {
        try {
          const refreshResponse = await authService.refreshToken(refreshToken);
          setToken(refreshResponse.accessToken);
          setAuthToken(refreshResponse.accessToken);
          setRefreshToken(refreshResponse.refreshToken);
          
          const profile = await authService.getProfile(refreshResponse.accessToken);
          setUser(profile); // Actualizar estado
          setUserInStorage(profile); // Actualizar en storage
        } catch (refreshError: any) {
          // Refresh falló, verificar si es 401 (sesión expirada)
          if (refreshError?.statusCode === 401) {
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
          } else {
            signOut();
          }
        }
      } else {
        // No hay refresh token o error diferente, cerrar sesión
        if (error?.statusCode === 401) {
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        } else {
          signOut();
        }
      }
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

