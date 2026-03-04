/**
 * Sistema de permisos basado en roles de negocio.
 * Para rol Operador, los permisos pueden derivarse de selectedBusiness.permissions (OperatorPermissions).
 */

import { BusinessRole } from './users';
import type { OperatorPermissions } from './operator-permissions';
import { isOperatorRole, normalizeOperatorPermissions } from './operator-permissions';

// Re-exportar BusinessRole para que esté disponible desde este módulo
export type { BusinessRole };

export interface RolePermissions {
  canManageProducts: boolean;
  canManageClients: boolean;
  canManagePrices: boolean;
  canManagePromotions: boolean;
  canManageOrders: boolean;
  canAcceptOrders: boolean;
  canPrepareOrders: boolean;
  canManageDeliveries: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  /** Acceso a sliders (personalizaciones) */
  canManageSliders: boolean;
  /** Acceso a colecciones (catálogo) */
  canManageCollections: boolean;
}

const fullPermissions: RolePermissions = {
  canManageProducts: true,
  canManageClients: true,
  canManagePrices: true,
  canManagePromotions: true,
  canManageOrders: true,
  canAcceptOrders: true,
  canPrepareOrders: true,
  canManageDeliveries: true,
  canViewReports: true,
  canManageSettings: true,
  canManageUsers: true,
  canManageSliders: true,
  canManageCollections: true,
};

export const ROLE_PERMISSIONS: Record<BusinessRole, RolePermissions> = {
  superadmin: { ...fullPermissions },
  admin: {
    ...fullPermissions,
    canManageSettings: false,
    canManageUsers: false,
  },
  operations_staff: {
    canManageProducts: false,
    canManageClients: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,
    canAcceptOrders: true,
    canPrepareOrders: true,
    canManageDeliveries: true,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageSliders: false,
    canManageCollections: false,
  },
  kitchen_staff: {
    canManageProducts: false,
    canManageClients: false,
    canManagePrices: false,
    canManagePromotions: false,
    canManageOrders: true,
    canAcceptOrders: false,
    canPrepareOrders: true,
    canManageDeliveries: false,
    canViewReports: false,
    canManageSettings: false,
    canManageUsers: false,
    canManageSliders: false,
    canManageCollections: false,
  },
};

/**
 * Comprueba si permissions está vacío o sin módulos/settings definidos (operadores legacy).
 */
function isEmptyOperatorPermissions(op: OperatorPermissions | Record<string, unknown> | null | undefined): boolean {
  if (!op || typeof op !== 'object') return true;
  const p = op as OperatorPermissions;
  const hasModules = p.modules && Object.keys(p.modules).length > 0;
  const hasSettings = p.settings && Object.keys(p.settings).length > 0;
  const anyTrue = (obj: Record<string, boolean> | undefined) =>
    obj && Object.values(obj).some((v) => v === true);
  if (!anyTrue(p.modules) && !anyTrue(p.settings)) return true;
  return false;
}

/**
 * Deriva RolePermissions para un operador desde OperatorPermissions (JSONB del backend).
 * Si permissions está vacío (operador legacy), se asume solo pedidos.
 */
function rolePermissionsFromOperator(op: OperatorPermissions): RolePermissions {
  const p = normalizeOperatorPermissions(op as Record<string, unknown>);
  const base = ROLE_PERMISSIONS.operations_staff;
  const isLegacy = isEmptyOperatorPermissions(p);
  if (isLegacy) {
    return { ...base, canManageOrders: true };
  }
  return {
    ...base,
    canManageProducts: p.modules?.products === true,
    canManageClients: p.modules?.clients === true,
    canManageOrders: p.modules?.orders === true,
    canViewReports: p.modules?.reports === true,
    canManageSliders: p.modules?.sliders === true,
    canManageCollections: p.modules?.collections === true,
    canManageSettings:
      Object.values(p.settings || {}).some((v) => v === true) ?? false,
    canManageUsers: p.settings?.users === true,
  };
}

/**
 * Obtener permisos de un rol. Para operador, opcionalmente pasar permissions del negocio seleccionado.
 */
export function getRolePermissions(
  role: BusinessRole,
  operatorPermissions?: OperatorPermissions | Record<string, unknown> | null
): RolePermissions {
  const base = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.operations_staff;
  if (isOperatorRole(role) && operatorPermissions) {
    return rolePermissionsFromOperator(
      normalizeOperatorPermissions(
        operatorPermissions as Record<string, unknown>
      )
    );
  }
  return base;
}

/**
 * Verificar si un rol tiene un permiso específico. Para operador, pasar permissions del negocio.
 */
export function hasPermission(
  role: BusinessRole,
  permission: keyof RolePermissions,
  operatorPermissions?: OperatorPermissions | Record<string, unknown> | null
): boolean {
  const permissions = getRolePermissions(role, operatorPermissions);
  return permissions[permission] ?? false;
}

/**
 * Verificar si puede acceder a un área de settings (solo aplica para operador con permisos granulares).
 */
export function canAccessSettingsArea(
  role: BusinessRole,
  area: string,
  operatorPermissions?: OperatorPermissions | Record<string, unknown> | null
): boolean {
  if (!isOperatorRole(role)) {
    return role === 'superadmin' || role === 'admin';
  }
  if (!operatorPermissions) return false;
  const p = normalizeOperatorPermissions(operatorPermissions as Record<string, unknown>);
  return p.settings?.[area as keyof typeof p.settings] === true;
}

/**
 * Verificar si un rol puede acceder a una ruta. Para operador, pasar permissions del negocio.
 */
export function canAccessRoute(
  role: BusinessRole,
  route: string,
  operatorPermissions?: OperatorPermissions | Record<string, unknown> | null
): boolean {
  const permissions = getRolePermissions(role, operatorPermissions);

  if (route.startsWith('/operations')) return permissions.canManageOrders;
  if (route.startsWith('/kitchen')) return permissions.canPrepareOrders;
  if (route.startsWith('/products')) return permissions.canManageProducts;
  if (route.startsWith('/clients')) return permissions.canManageClients;
  if (route.startsWith('/orders')) return permissions.canManageOrders;
  if (route.startsWith('/statistics')) return permissions.canViewReports;
  if (route.startsWith('/sliders')) return permissions.canManageSliders;
  if (route.startsWith('/catalog')) return permissions.canManageCollections;
  if (route.startsWith('/settings') || route.startsWith('/config')) {
    return permissions.canManageSettings;
  }
  if (route.startsWith('/users') || route.startsWith('/staff')) {
    return permissions.canManageUsers;
  }

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

