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
      
      router.push('/');
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
      
      router.push('/');
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
      router.push('/');
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

