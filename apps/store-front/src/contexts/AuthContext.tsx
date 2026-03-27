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
import { getSupabaseBrowser } from '@/lib/supabase-browser';

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
    let cancelled = false;

    const finishSessionFromSupabaseTokens = async (
      accessToken: string,
      refreshTokenValue: string | null,
    ) => {
      if (cancelled) {
        return;
      }
      setToken(accessToken);
      setAuthToken(accessToken);
      if (refreshTokenValue) {
        setRefreshToken(refreshTokenValue);
      }
      try {
        const profile = await authService.getProfile(accessToken);
        if (!cancelled) {
          setUser(profile);
          setUserInStorage(profile);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        // PKCE (magic link moderno): ?code=... — debe intercambiarse antes que el resto
        const supabase = getSupabaseBrowser();
        const urlObj = new URL(window.location.href);
        const code = urlObj.searchParams.get('code');
        if (supabase && code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (!cancelled && !error && data.session) {
            urlObj.searchParams.delete('code');
            urlObj.searchParams.delete('state');
            const clean = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
            window.history.replaceState(null, '', clean);
            await finishSessionFromSupabaseTokens(
              data.session.access_token,
              data.session.refresh_token ?? null,
            );
            return;
          }
          if (!cancelled && error) {
            console.warn('[Auth] exchangeCodeForSession:', error.message);
            urlObj.searchParams.delete('code');
            urlObj.searchParams.delete('state');
            window.history.replaceState(null, `${urlObj.pathname}${urlObj.search}${urlObj.hash}`);
          }
        }

        // Enlaces mágicos implicit: #access_token=...&refresh_token=...
        const hash = window.location.hash || '';
        if (hash.startsWith('#') && hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.slice(1));
          const hashAccessToken = params.get('access_token');
          const hashRefreshToken = params.get('refresh_token');
          if (hashAccessToken) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            await finishSessionFromSupabaseTokens(
              hashAccessToken,
              hashRefreshToken,
            );
            return;
          }
        }

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
          if (cancelled) return;
          setToken(storedToken);
          setUser(storedUser);
          setLoading(false);

          authService
            .getProfile(storedToken)
            .then((profile) => {
              if (!cancelled) {
                setUser(profile);
                setUserInStorage(profile);
              }
            })
            .catch((error: any) => {
              if (error?.statusCode === 401 && getRefreshToken()) {
                authService
                  .refreshToken(getRefreshToken()!)
                  .then((refreshResponse) => {
                    if (cancelled) return;
                    setToken(refreshResponse.accessToken);
                    setAuthToken(refreshResponse.accessToken);
                    setRefreshToken(refreshResponse.refreshToken);
                    return authService.getProfile(refreshResponse.accessToken);
                  })
                  .then((profile) => {
                    if (!cancelled && profile) {
                      setUser(profile);
                      setUserInStorage(profile);
                    }
                  })
                  .catch(() => {
                    // Mantener sesión aunque falle el refresh
                  });
              }
            });
        } else {
          if (!cancelled) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('[Auth] Error inicializando autenticación:', error);
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const handleSessionExpired = () => {
      setToken(null);
      setUser(null);
      clearAuth();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      cancelled = true;
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response: AuthResponse = await authService.signIn({ email, password });
      // Normalizar tokens: el backend puede enviarlos en `accessToken` o dentro de `session`
      const accessToken = response.accessToken || response.session?.access_token || null;
      const refreshToken = response.refreshToken || response.session?.refresh_token || null;

      if (!accessToken) {
        console.error('❌ [AuthContext.signIn] No se recibió accessToken en la respuesta:', response);
        throw new Error('No se pudo iniciar sesión. Por favor, intenta de nuevo.');
      }

      setToken(accessToken);
      setUser(response.user);
      
      setAuthToken(accessToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
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
      // Esto permite que el login page use el parámetro redirect si existe
    } catch (error: any) {
      console.error('[Auth] Error al iniciar sesión:', error);
      throw error;
    }
  };

  const signUp = async (data: any) => {
    try {
      const response: AuthResponse = await authService.signUp(data);
      
      console.log('📥 [AuthContext.signUp] Respuesta recibida:', {
        hasUser: !!response.user,
        hasSession: !!response.session,
        hasAccessToken: !!response.accessToken,
        hasRefreshToken: !!response.refreshToken,
        sessionAccessToken: !!response.session?.access_token,
        sessionRefreshToken: !!response.session?.refresh_token,
        fullResponse: response,
      });

      if (response.needsEmailConfirmation) {
        return;
      }
      
      // Asegurar que tenemos accessToken y refreshToken
      const accessToken = response.accessToken || response.session?.access_token;
      const refreshToken = response.refreshToken || response.session?.refresh_token;
      
      // Si no hay token pero tenemos usuario, intentar iniciar sesión automáticamente
      if (!accessToken && response.user) {
        console.warn('⚠️ [AuthContext.signUp] No hay token en la respuesta, intentando iniciar sesión automáticamente...');
        try {
          const signInResponse = await authService.signIn({
            email: data.email,
            password: data.password,
          });
          if (signInResponse.accessToken) {
            setToken(signInResponse.accessToken);
            setUser(signInResponse.user);
            setAuthToken(signInResponse.accessToken);
            if (signInResponse.refreshToken) {
              setRefreshToken(signInResponse.refreshToken);
            }
            setUserInStorage(signInResponse.user);
            console.log('✅ [AuthContext.signUp] Sesión creada mediante signIn automático');
            return;
          }
        } catch (signInError: any) {
          console.error('❌ [AuthContext.signUp] Error al intentar iniciar sesión automáticamente:', signInError);
        }
      }
      
      if (!accessToken) {
        console.error('❌ [AuthContext.signUp] No se recibió accessToken en la respuesta:', response);
        throw new Error('No se pudo crear la sesión. Por favor, intenta iniciar sesión manualmente.');
      }
      
      setToken(accessToken);
      setUser(response.user);
      
      setAuthToken(accessToken);
      if (refreshToken) {
        setRefreshToken(refreshToken);
      }
      setUserInStorage(response.user);
      
      console.log('✅ [AuthContext.signUp] Sesión guardada correctamente:', {
        hasToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        userId: response.user?.id,
      });
      
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

