/**
 * Servicio de autenticación
 * Conecta con el backend API de autenticación
 */

import { apiRequest } from './api';

export interface SignUpData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'client' | 'repartidor' | 'local' | 'admin';
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    profile?: any;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  message?: string;
  needsEmailConfirmation?: boolean;
}

export interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

export interface PasswordUpdate {
  token: string;
  newPassword: string;
}

/**
 * Servicio de autenticación
 */
export const authService = {
  /**
   * Registrar un nuevo usuario
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Iniciar sesión
   */
  async signIn(data: SignInData): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // El backend retorna { success: true, data: { accessToken, refreshToken, ... } }
    // apiRequest ya extrae data, así que response ya es el objeto AuthResponse
    return response;
  },

  /**
   * Solicitar recuperación de contraseña
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string; success: boolean }> {
    const redirectTo =
      data.redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/reset-password` : undefined);
    return apiRequest('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ ...data, redirectTo }),
    });
  },

  /**
   * Actualizar contraseña con token
   */
  async updatePassword(data: PasswordUpdate): Promise<{ message: string; success: boolean }> {
    return apiRequest('/auth/password/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Refrescar token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Obtener perfil del usuario autenticado
   */
  async getProfile(token: string): Promise<any> {
    return apiRequest('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Cerrar sesión
   */
  async signOut(token: string): Promise<{ message: string; success: boolean }> {
    return apiRequest('/auth/signout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

