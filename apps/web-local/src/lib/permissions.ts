/**
 * Sistema de permisos basado en roles de negocio.
 * Para rol Operador, los permisos pueden derivarse de selectedBusiness.permissions (OperatorPermissions).
 */

import { BusinessRole } from './users';
import type { OperatorPermissions, TiendasKey } from './operator-permissions';
import { isOperatorRole, normalizeOperatorPermissions } from './operator-permissions';

// Re-exportar BusinessRole para que esté disponible desde este módulo
export type { BusinessRole };

export interface RolePermissions {
  /** Torre de control /dashboard (operadores con permiso explícito) */
  canViewDashboard: boolean;
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
  /** Acceso al módulo Tiendas */
  canManageTiendas: boolean;
  /** Acceso a sliders (personalizaciones) */
  canManageSliders: boolean;
  /** Acceso a colecciones (catálogo) */
  canManageCollections: boolean;
}

const fullPermissions: RolePermissions = {
  canViewDashboard: true,
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
  canManageTiendas: true,
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
    canViewDashboard: false,
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
    canManageTiendas: false,
    canManageSliders: false,
    canManageCollections: false,
  },
  kitchen_staff: {
    canViewDashboard: false,
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
    canManageTiendas: false,
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
  if (!anyTrue(p.modules) && !anyTrue(p.settings) && !anyTrue(p.tiendas)) return true;
  return false;
}

/**
 * Deriva RolePermissions para un operador desde OperatorPermissions (JSONB del backend).
 * Si permissions está vacío (operador legacy), se asume solo pedidos.
 * Si un módulo/setting no viene en permissions, se usa el valor por defecto del rol
 * (p. ej. operations_staff tiene canManageOrders: true) para no negar acceso por omisión.
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
    canViewDashboard: p.modules?.dashboard === undefined ? base.canViewDashboard : p.modules.dashboard === true,
    canManageProducts: p.modules?.products === undefined ? base.canManageProducts : p.modules.products === true,
    canManageClients: p.modules?.clients === undefined ? base.canManageClients : p.modules.clients === true,
    canManageOrders: p.modules?.orders === undefined ? base.canManageOrders : p.modules.orders === true,
    canViewReports: p.modules?.reports === undefined ? base.canViewReports : p.modules.reports === true,
    canManageSliders: p.modules?.sliders === undefined ? base.canManageSliders : p.modules.sliders === true,
    canManageTiendas: p.modules?.tiendas === undefined ? base.canManageTiendas : p.modules.tiendas === true,
    canManageCollections: p.modules?.collections === undefined ? base.canManageCollections : p.modules.collections === true,
    canManageSettings:
      p.settings && Object.keys(p.settings).length > 0
        ? Object.values(p.settings).some((v) => v === true)
        : base.canManageSettings,
    canManageUsers: p.settings?.users === undefined ? base.canManageUsers : p.settings.users === true,
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

  if (route === '/dashboard' || route.startsWith('/dashboard/')) return permissions.canViewDashboard;

  if (route.startsWith('/operations')) return permissions.canManageOrders;
  if (route.startsWith('/kitchen')) return permissions.canPrepareOrders;
  if (route.startsWith('/products')) return permissions.canManageProducts;
  if (route.startsWith('/clients')) return permissions.canManageClients;
  if (route.startsWith('/orders')) return permissions.canManageOrders;
  if (route.startsWith('/statistics')) return permissions.canViewReports;
  if (route.startsWith('/tiendas')) return permissions.canManageTiendas;
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
 * Verificar si puede acceder a una pestaña del módulo Tiendas.
 * tabId es el id del tab (resumen, configuracion, etc.); se mapea a tiendas_[tabId].
 */
export function canAccessTiendasTab(
  role: BusinessRole,
  tabId: string,
  operatorPermissions?: OperatorPermissions | Record<string, unknown> | null
): boolean {
  if (!isOperatorRole(role)) return true;
  if (!operatorPermissions) return false;
  const p = normalizeOperatorPermissions(operatorPermissions as Record<string, unknown>);
  const key = `tiendas_${tabId}` as TiendasKey;
  return p.tiendas?.[key] === true;
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
      return '/orders';
    case 'kitchen_staff':
      return '/kitchen';
    default:
      return '/dashboard';
  }
}

