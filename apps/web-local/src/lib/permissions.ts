/**
 * Sistema de permisos basado en roles de negocio
 */

import { BusinessRole } from './users';

// Re-exportar BusinessRole para que esté disponible desde este módulo
export type { BusinessRole };

export interface RolePermissions {
  canManageProducts: boolean;
  canManagePrices: boolean;
  canManagePromotions: boolean;
  canManageOrders: boolean;
  canAcceptOrders: boolean;
  canPrepareOrders: boolean;
  canManageDeliveries: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<BusinessRole, RolePermissions> = {
  superadmin: {
    canManageProducts: true,
    canManagePrices: true,
    canManagePromotions: true,
    canManageOrders: true,
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  admin: {
    canManageProducts: true,
    canManagePrices: true,
    canManagePromotions: true,
    canManageOrders: true,
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: true,
    canManageSettings: false, // ❌ NO puede acceder a configuración
    canManageUsers: false,     // ❌ NO puede gestionar usuarios
  },
  operations_staff: {
    canManageProducts: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,     // ✅ Solo órdenes
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  kitchen_staff: {
    canManageProducts: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,     // ✅ Solo órdenes aceptadas/preparación
    canAcceptOrders: false,     // ❌ NO puede aceptar
    canPrepareOrders: true,    // ✅ Solo preparar
    canManageDeliveries: false,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};

/**
 * Obtener permisos de un rol
 */
export function getRolePermissions(role: BusinessRole): RolePermissions {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.operations_staff;
}

/**
 * Verificar si un rol tiene un permiso específico
 */
export function hasPermission(
  role: BusinessRole,
  permission: keyof RolePermissions
): boolean {
  const permissions = getRolePermissions(role);
  return permissions[permission] || false;
}

/**
 * Verificar si un rol puede acceder a una ruta
 */
export function canAccessRoute(role: BusinessRole, route: string): boolean {
  const permissions = getRolePermissions(role);

  // Rutas de Operations Staff
  if (route.startsWith('/operations')) {
    return permissions.canManageOrders;
  }

  // Rutas de Kitchen Staff
  if (route.startsWith('/kitchen')) {
    return permissions.canPrepareOrders;
  }

  // Rutas de productos
  if (route.startsWith('/products')) {
    return permissions.canManageProducts;
  }

  // Rutas de configuración
  if (route.startsWith('/settings') || route.startsWith('/config')) {
    return permissions.canManageSettings;
  }

  // Rutas de usuarios
  if (route.startsWith('/users') || route.startsWith('/staff')) {
    return permissions.canManageUsers;
  }

  // Rutas de órdenes (admin)
  if (route.startsWith('/orders')) {
    return permissions.canManageOrders;
  }

  // Por defecto, permitir acceso
  return true;
}

/**
 * Obtener la ruta de inicio según el rol
 */
export function getDefaultRouteForRole(role: BusinessRole): string {
  switch (role) {
    case 'superadmin':
    case 'admin':
      return '/dashboard';
    case 'operations_staff':
      return '/operations';
    case 'kitchen_staff':
      return '/kitchen';
    default:
      return '/dashboard';
  }
}

