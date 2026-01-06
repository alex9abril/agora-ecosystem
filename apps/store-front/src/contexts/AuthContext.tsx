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
} from '@/lib/storage';
import { userVehiclesService } from '@/lib/user-vehicles';
import { 
  syncLocalVehiclesToAccount,
  clearLocalVehicleAfterSync 
} from '@/lib/vehicle-sync';

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
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUserStr = localStorage.getItem('auth_user');
        
        let storedUser = null;
        if (storedUserStr) {
          try {
            storedUser = JSON.parse(storedUserStr);
          } catch (e) {
            console.error('[Auth] Error parseando usuario:', e);
          }
        }

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
          setLoading(false);
          
          // Verificar que el token sigue siendo válido (en background)
          authService.getProfile(storedToken)
            .then((profile) => {
              setUser(profile);
              setUserInStorage(profile);
            })
            .catch((error: any) => {
              if (error?.statusCode === 401 && getRefreshToken()) {
                authService.refreshToken(getRefreshToken()!)
                  .then((refreshResponse) => {
                    setToken(refreshResponse.accessToken);
                    setAuthToken(refreshResponse.accessToken);
                    setRefreshToken(refreshResponse.refreshToken);
                    return authService.getProfile(refreshResponse.accessToken);
                  })
                  .then((profile) => {
                    setUser(profile);
                    setUserInStorage(profile);
                  })
                  .catch(() => {
                    // Mantener sesión aunque falle el refresh
                  });
              }
            });
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('[Auth] Error inicializando autenticación:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const handleSessionExpired = () => {
      setToken(null);
      setUser(null);
      clearAuth();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authService.signIn({ email, password });
      
      setToken(response.accessToken);
      setUser(response.user);
      
      setAuthToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUserInStorage(response.user);
      
      // Sincronizar vehículo de localStorage a la base de datos si existe
      try {
        const syncedVehicles = await syncLocalVehiclesToAccount();
        if (syncedVehicles.length > 0) {
          // Limpiar localStorage solo después de sincronización exitosa
          clearLocalVehicleAfterSync();
          console.log('[Auth] Vehículo(s) sincronizado(s) desde localStorage:', syncedVehicles.length);
        }
        
        // Disparar evento para que los componentes sepan que los vehículos están listos
        // Esto permite que el Header y otros componentes carguen automáticamente los vehículos
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:vehicles-synced'));
        }
      } catch (vehicleError: any) {
        // Si falla la sincronización, NO limpiar localStorage para mantener los datos locales
        console.warn('[Auth] Error sincronizando vehículo (se mantiene en localStorage):', vehicleError);
        // Aún así disparar el evento para que se carguen los vehículos de la cuenta
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:vehicles-synced'));
        }
      }
      
      // No redirigir automáticamente - dejar que el componente que llama maneje la redirección
      // Esto permite que el login page use el parámetro redirect si existe
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
      
      setAuthToken(response.accessToken);
      if (response.refreshToken) {
        setRefreshToken(response.refreshToken);
      }
      setUserInStorage(response.user);
      
      // Sincronizar vehículo de localStorage a la base de datos si existe
      try {
        const syncedVehicles = await syncLocalVehiclesToAccount();
        if (syncedVehicles.length > 0) {
          // Limpiar localStorage solo después de sincronización exitosa
          clearLocalVehicleAfterSync();
          console.log('[Auth] Vehículo(s) sincronizado(s) desde localStorage:', syncedVehicles.length);
        }
        
        // Disparar evento para que los componentes sepan que los vehículos están listos
        // Esto permite que el Header y otros componentes carguen automáticamente los vehículos
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:vehicles-synced'));
        }
      } catch (vehicleError: any) {
        // Si falla la sincronización, NO limpiar localStorage para mantener los datos locales
        console.warn('[Auth] Error sincronizando vehículo (se mantiene en localStorage):', vehicleError);
        // Aún así disparar el evento para que se carguen los vehículos de la cuenta
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:vehicles-synced'));
        }
      }
      
      // No redirigir automáticamente - dejar que el componente que llama maneje la redirección
      // Esto permite que el checkout o register page manejen la redirección según el contexto
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
      setToken(null);
      setUser(null);
      clearAuth();
      
      // Mantener el contexto de tienda si existe en la URL actual
      // Verificar tanto router.asPath como window.location.pathname para capturar el contexto completo
      const currentPath = router.asPath.split('?')[0]; // Obtener path sin query params
      const windowPath = typeof window !== 'undefined' ? window.location.pathname.split('?')[0] : '';
      
      // Buscar contexto en ambas rutas
      const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/) || 
                          windowPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
      
      if (contextMatch) {
        // Mantener el contexto: redirigir a la home del contexto
        router.push(`/${contextMatch[1]}/${contextMatch[2]}`);
      } else {
        router.push('/');
      }
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const profile = await authService.getProfile(token);
      setUser(profile);
      setUserInStorage(profile);
    } catch (error: any) {
      const refreshToken = getRefreshToken();
      if (refreshToken && error?.statusCode === 401) {
        try {
          const refreshResponse = await authService.refreshToken(refreshToken);
          setToken(refreshResponse.accessToken);
          setAuthToken(refreshResponse.accessToken);
          setRefreshToken(refreshResponse.refreshToken);
          
          const profile = await authService.getProfile(refreshResponse.accessToken);
          setUser(profile);
          setUserInStorage(profile);
        } catch (refreshError) {
          signOut();
        }
      } else {
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

