/**
 * Catálogo de permisos granulares para rol Operador.
 * Una sola fuente de verdad para módulos, settings y tipos.
 */

export const MODULE_KEYS = [
  'products',
  'clients',
  'orders',
  'sliders',
  'collections',
  'reports',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const SETTINGS_KEYS = [
  'store',
  'branches',
  'branches_taxes',
  'branches_integrations_karlopay',
  'branches_integrations_karbot',
  'branches_notifications',
  'wallet',
  'vehicle',
  'emails',
  'users',
  'permissions_groups',
  'channel_stores',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export interface OperatorPermissions {
  modules?: Partial<Record<ModuleKey, boolean>>;
  settings?: Partial<Record<SettingsKey, boolean>>;
}

const emptyModules: Record<ModuleKey, boolean> = {
  products: false,
  clients: false,
  orders: false,
  sliders: false,
  collections: false,
  reports: false,
};

const emptySettings: Record<SettingsKey, boolean> = {
  store: false,
  branches: false,
  branches_taxes: false,
  branches_integrations_karlopay: false,
  branches_integrations_karbot: false,
  branches_notifications: false,
  wallet: false,
  vehicle: false,
  emails: false,
  users: false,
  permissions_groups: false,
  channel_stores: false,
};

export const EMPTY_OPERATOR_PERMISSIONS: OperatorPermissions = {
  modules: { ...emptyModules },
  settings: { ...emptySettings },
};

/** Labels para UI (módulos) */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  products: 'Productos',
  clients: 'Clientes',
  orders: 'Pedidos',
  sliders: 'Sliders',
  collections: 'Colecciones',
  reports: 'Estadísticas / Reportes',
};

/** Labels para UI (settings) */
export const SETTINGS_LABELS: Record<SettingsKey, string> = {
  store: 'Datos de la tienda',
  branches: 'Sucursales',
  branches_taxes: 'Impuestos (por sucursal)',
  branches_integrations_karlopay: 'Integración Karlopay',
  branches_integrations_karbot: 'Integración Karbot',
  branches_notifications: 'Notificaciones (por sucursal)',
  wallet: 'Monedero electrónico',
  vehicle: 'Vehículos',
  emails: 'Correos',
  users: 'Usuarios y permisos',
  permissions_groups: 'Grupos de permisos',
  channel_stores: 'Tiendas por grupo/marca',
};

/**
 * Normaliza un objeto permissions del backend al formato OperatorPermissions.
 */
export function normalizeOperatorPermissions(
  raw: Record<string, unknown> | null | undefined
): OperatorPermissions {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_OPERATOR_PERMISSIONS;
  }
  const modules = (raw.modules as Partial<Record<ModuleKey, boolean>>) || {};
  const settings = (raw.settings as Partial<Record<SettingsKey, boolean>>) || {};
  return {
    modules: { ...emptyModules, ...modules },
    settings: { ...emptySettings, ...settings },
  };
}

/**
 * Indica si el rol del backend se considera "operador" (permisos granulares).
 */
export function isOperatorRole(
  role: string
): role is 'operations_staff' | 'kitchen_staff' {
  return role === 'operations_staff' || role === 'kitchen_staff';
}

/**
 * Indica si el rol del backend se considera "administrador" (acceso pleno en app).
 */
export function isAdministratorRole(role: string): boolean {
  return role === 'superadmin' || role === 'admin';
}
