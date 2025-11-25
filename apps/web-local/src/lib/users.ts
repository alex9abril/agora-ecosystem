/**
 * Servicio para gestión de usuarios y permisos del negocio
 */

import { apiRequest } from './api';

export type BusinessRole = 'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff';

export interface BusinessUser {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  permissions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Información del usuario
  user_email?: string;
  first_name?: string;
  last_name?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface AssignUserData {
  user_id: string;
  role: BusinessRole;
  permissions?: Record<string, any>;
}

export interface UpdateUserRoleData {
  role: BusinessRole;
  permissions?: Record<string, any>;
}

export const usersService = {
  /**
   * Obtener todas las tiendas del superadmin
   */
  async getSuperadminBusinesses(): Promise<Array<{
    business_id: string;
    business_name: string;
    business_email: string;
    business_phone: string;
    business_address?: string;
    is_active: boolean;
    total_users: number;
    created_at: string;
  }>> {
    return apiRequest('/business-users/superadmin/businesses', {
      method: 'GET',
    });
  },

  /**
   * Obtener todos los usuarios de un negocio
   */
  async getBusinessUsers(businessId: string): Promise<BusinessUser[]> {
    return apiRequest(`/business-users/business/${businessId}`, {
      method: 'GET',
    });
  },

  /**
   * Obtener todos los usuarios de la cuenta del superadmin (todas sus tiendas)
   */
  async getSuperadminAccountUsers(): Promise<Array<BusinessUser & {
    business_name: string;
  }>> {
    return apiRequest('/business-users/superadmin/account/users', {
      method: 'GET',
    });
  },

  /**
   * Obtener usuarios disponibles para asignar a la cuenta del superadmin
   */
  async getAvailableUsersForSuperadminAccount(searchTerm?: string): Promise<Array<User & {
    is_already_assigned: boolean;
    assigned_businesses: string[];
    assigned_roles: BusinessRole[];
  }>> {
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return apiRequest(`/business-users/superadmin/account/available-users${params}`, {
      method: 'GET',
    });
  },

  /**
   * Remover usuario de todas las tiendas de la cuenta del superadmin
   */
  async removeUserFromSuperadminAccount(userId: string): Promise<void> {
    return apiRequest(`/business-users/superadmin/account/user/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtener usuarios disponibles para asignar
   */
  async getAvailableUsers(businessId: string, searchTerm?: string): Promise<Array<User & {
    is_already_assigned: boolean;
    assigned_role?: BusinessRole;
  }>> {
    const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return apiRequest(`/business-users/available/${businessId}${params}`, {
      method: 'GET',
    });
  },

  /**
   * Asignar usuario a un negocio
   */
  async assignUserToBusiness(
    businessId: string,
    data: AssignUserData
  ): Promise<BusinessUser> {
    return apiRequest(`/business-users/business/${businessId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Cambiar rol de usuario en un negocio
   */
  async changeUserRole(
    businessId: string,
    userId: string,
    data: UpdateUserRoleData
  ): Promise<BusinessUser> {
    return apiRequest(`/business-users/business/${businessId}/user/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remover usuario de un negocio
   */
  async removeUserFromBusiness(
    businessId: string,
    userId: string
  ): Promise<void> {
    return apiRequest(`/business-users/business/${businessId}/user/${userId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtener resumen de permisos de un usuario
   */
  async getUserBusinessesSummary(userId: string): Promise<Array<{
    business_id: string;
    business_name: string;
    role: BusinessRole;
    permissions: Record<string, any>;
    is_active: boolean;
    can_access: boolean;
    assigned_at: string;
  }>> {
    return apiRequest(`/business-users/user/${userId}/summary`, {
      method: 'GET',
    });
  },

  /**
   * Verificar si un email ya está registrado
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const result = await apiRequest<{ exists: boolean }>(`/business-users/check-email/${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      return result.exists;
    } catch (error: any) {
      console.error('Error verificando email:', error);
      return false; // En caso de error, permitir continuar
    }
  },

  /**
   * Crear un nuevo usuario y asignarlo a las tiendas del superadmin
   */
  async createUserForSuperadminAccount(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role: BusinessRole;
    businessIds?: string[];
  }): Promise<{
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
    };
    assignments: Array<{
      business_id: string;
      role: BusinessRole;
    }>;
    message: string;
    created_user?: any;
  }> {
    return apiRequest('/business-users/superadmin/account/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

