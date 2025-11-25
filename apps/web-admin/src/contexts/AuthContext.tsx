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

interface AuthContextType {
  user: any | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
                    // NO limpiar automáticamente - mantener la sesión
                    // Solo limpiar si el usuario intenta hacer algo que requiere autenticación
                    console.log('[Auth] Refresh falló, pero manteniendo sesión en localStorage');
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

    // Escuchar evento de sesión expirada desde apiRequest
    const handleSessionExpired = () => {
      console.log('[Auth] Evento de sesión expirada recibido');
      setToken(null);
      setUser(null);
      clearAuth();
      // No redirigir aquí, apiRequest ya lo hace
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    // Cleanup
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Iniciando sesión...');
      const response: AuthResponse = await authService.signIn({ email, password });
      
      console.log('[Auth] Sesión iniciada exitosamente');
      setToken(response.accessToken);
      setUser(response.user);
      
      // Guardar en localStorage
      setAuthToken(response.accessToken);
      setRefreshToken(response.refreshToken);
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
      
      setToken(response.accessToken);
      setUser(response.user);
      
      // Guardar en sessionStorage
      setAuthToken(response.accessToken);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      setUserInStorage(response.user);
      
      // Redirigir al dashboard
      router.push('/dashboard');
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
        } catch (refreshError) {
          // Refresh falló, cerrar sesión
          signOut();
        }
      } else {
        // No hay refresh token o error diferente, cerrar sesión
        signOut();
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

