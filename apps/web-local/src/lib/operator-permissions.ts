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

export const CAPABILITIES_KEYS = ['can_fulfill', 'can_assign_fulfillment'] as const;
export type CapabilityKey = (typeof CAPABILITIES_KEYS)[number];

export interface OperatorPermissions {
  modules?: Partial<Record<ModuleKey, boolean>>;
  settings?: Partial<Record<SettingsKey, boolean>>;
  capabilities?: Partial<Record<CapabilityKey, boolean>>;
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

const emptyCapabilities: Record<CapabilityKey, boolean> = {
  can_fulfill: false,
  can_assign_fulfillment: false,
};

export const EMPTY_OPERATOR_PERMISSIONS: OperatorPermissions = {
  modules: { ...emptyModules },
  settings: { ...emptySettings },
  capabilities: { ...emptyCapabilities },
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

/** Descripciones cortas para cada módulo (permiso) */
export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  products: 'Ver, crear y editar productos; precios y disponibilidad por sucursal.',
  clients: 'Consultar y gestionar clientes del negocio.',
  orders: 'Ver y gestionar pedidos (confirmar, surtir, cancelar según rol).',
  sliders: 'Gestionar banners y sliders de la tienda.',
  collections: 'Gestionar colecciones y catálogo.',
  reports: 'Ver estadísticas, reportes y dashboards.',
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

/** Descripciones cortas para cada área de configuración */
export const SETTINGS_DESCRIPTIONS: Record<SettingsKey, string> = {
  store: 'Nombre, dirección, horarios y datos generales de la tienda.',
  branches: 'Alta y edición de sucursales o distribuidores.',
  branches_taxes: 'Configurar impuestos por sucursal.',
  branches_integrations_karlopay: 'Configurar pagos con Karlopay por sucursal.',
  branches_integrations_karbot: 'Configurar integración Karbot por sucursal.',
  branches_notifications: 'Ajustar notificaciones por sucursal.',
  wallet: 'Configurar monedero electrónico del negocio.',
  vehicle: 'Gestionar marcas y modelos de vehículos (catálogo).',
  emails: 'Plantillas y configuración de correos.',
  users: 'Invitar usuarios y asignar permisos por tienda/sucursal.',
  permissions_groups: 'Crear y editar grupos de permisos.',
  channel_stores: 'Gestionar tiendas por grupo o por marca.',
};

/** Labels para UI (capabilities - surtir / asignar surtidores) */
export const CAPABILITIES_LABELS: Record<CapabilityKey, string> = {
  can_fulfill: 'Puede surtir pedidos',
  can_assign_fulfillment: 'Puede asignar pedidos a surtidores',
};

/** Descripciones cortas para cada capacidad */
export const CAPABILITIES_DESCRIPTIONS: Record<CapabilityKey, string> = {
  can_fulfill: 'Permite surtir pedidos confirmados, validar precios y disponibilidad en esta sucursal.',
  can_assign_fulfillment: 'Permite asignar pedidos a otros surtidores o marcar quién surte cada pedido.',
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
  const capabilities = (raw.capabilities as Partial<Record<CapabilityKey, boolean>>) || {};
  return {
    modules: { ...emptyModules, ...modules },
    settings: { ...emptySettings, ...settings },
    capabilities: { ...emptyCapabilities, ...capabilities },
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
