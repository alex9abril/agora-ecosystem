/**
 * Catálogo de permisos granulares para rol Operador.
 * Una sola fuente de verdad para módulos, settings y tipos.
 */

export const MODULE_KEYS = [
  'dashboard',
  'products',
  'clients',
  'orders',
  'tiendas',
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
  'branches_integrations_workflows',
  'branches_notifications',
  'wallet',
  'vehicle',
  'emails',
  'users',
  'permissions_groups',
  'channel_stores',
  'categories',
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

export const TIENDAS_KEYS = [
  'tiendas_resumen',
  'tiendas_configuracion',
  'tiendas_correos',
  'tiendas_personalizar',
  'tiendas_sliders',
  'tiendas_integraciones',
  'tiendas_colecciones',
] as const;

export type TiendasKey = (typeof TIENDAS_KEYS)[number];

export const CAPABILITIES_KEYS = ['can_fulfill', 'can_assign_fulfillment'] as const;
export type CapabilityKey = (typeof CAPABILITIES_KEYS)[number];

export interface OperatorPermissions {
  modules?: Partial<Record<ModuleKey, boolean>>;
  settings?: Partial<Record<SettingsKey, boolean>>;
  tiendas?: Partial<Record<TiendasKey, boolean>>;
  capabilities?: Partial<Record<CapabilityKey, boolean>>;
}

const emptyModules: Record<ModuleKey, boolean> = {
  dashboard: false,
  products: false,
  clients: false,
  orders: false,
  tiendas: false,
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
  branches_integrations_workflows: false,
  branches_notifications: false,
  wallet: false,
  vehicle: false,
  emails: false,
  users: false,
  permissions_groups: false,
  channel_stores: false,
  categories: false,
};

const emptyTiendas: Record<TiendasKey, boolean> = {
  tiendas_resumen: false,
  tiendas_configuracion: false,
  tiendas_correos: false,
  tiendas_personalizar: false,
  tiendas_sliders: false,
  tiendas_integraciones: false,
  tiendas_colecciones: false,
};

const emptyCapabilities: Record<CapabilityKey, boolean> = {
  can_fulfill: false,
  can_assign_fulfillment: false,
};

export const EMPTY_OPERATOR_PERMISSIONS: OperatorPermissions = {
  modules: { ...emptyModules },
  settings: { ...emptySettings },
  tiendas: { ...emptyTiendas },
  capabilities: { ...emptyCapabilities },
};

/** Labels para UI (módulos) */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  products: 'Productos',
  clients: 'Clientes',
  orders: 'Pedidos',
  tiendas: 'Tiendas',
  sliders: 'Sliders',
  collections: 'Colecciones',
  reports: 'Estadísticas / Reportes',
};

/** Descripciones cortas para cada módulo (permiso) */
export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  dashboard:
    'Torre de control: KPIs, embudo de pedidos, logística y actividad en tiempo casi real por sucursal.',
  products: 'Ver, crear y editar productos; precios y disponibilidad por sucursal.',
  clients: 'Consultar y gestionar clientes del negocio.',
  orders: 'Ver y gestionar pedidos (confirmar, surtir, cancelar según rol).',
  tiendas: 'Acceso al módulo de tiendas para ver y gestionar la tienda asignada.',
  sliders: 'Gestionar banners y sliders de la tienda.',
  collections: 'Gestionar colecciones y catálogo.',
  reports: 'Ver estadísticas y reportes (aparte del dashboard operativo).',
};

/** Labels para UI (settings) */
export const SETTINGS_LABELS: Record<SettingsKey, string> = {
  store: 'Datos de la tienda',
  branches: 'Sucursales',
  branches_taxes: 'Impuestos (por sucursal)',
  branches_integrations_karlopay: 'Integración Karlopay',
  branches_integrations_karbot: 'Integración Karbot',
  branches_integrations_workflows: 'Automatización (workflows / conectores)',
  branches_notifications: 'Notificaciones (por sucursal)',
  wallet: 'Monedero electrónico',
  vehicle: 'Vehículos',
  emails: 'Correos',
  users: 'Usuarios y permisos',
  permissions_groups: 'Grupos de permisos',
  channel_stores: 'Tiendas por grupo/marca',
  categories: 'Categorías',
};

/** Descripciones cortas para cada área de configuración */
export const SETTINGS_DESCRIPTIONS: Record<SettingsKey, string> = {
  store: 'Nombre, dirección, horarios y datos generales de la tienda.',
  branches: 'Alta y edición de sucursales o distribuidores.',
  branches_taxes: 'Configurar impuestos por sucursal.',
  branches_integrations_karlopay: 'Configurar pagos con Karlopay por sucursal.',
  branches_integrations_karbot: 'Configurar integración Karbot por sucursal.',
  branches_integrations_workflows: 'Flujos de integración y conectores MSSQL por sucursal.',
  branches_notifications: 'Ajustar notificaciones por sucursal.',
  wallet: 'Configurar monedero electrónico del negocio.',
  vehicle: 'Gestionar marcas y modelos de vehículos (catálogo).',
  emails: 'Plantillas y configuración de correos.',
  users: 'Invitar usuarios y asignar permisos por tienda/sucursal.',
  permissions_groups: 'Crear y editar grupos de permisos.',
  channel_stores: 'Gestionar tiendas por grupo o por marca.',
  categories: 'Gestionar categorías del catálogo y su imagen.',
};

/** Labels para UI (tiendas - pestañas dentro del módulo Tiendas) */
export const TIENDAS_LABELS: Record<TiendasKey, string> = {
  tiendas_resumen: 'Resumen',
  tiendas_configuracion: 'Configuración',
  tiendas_correos: 'Correos',
  tiendas_personalizar: 'Personalizar',
  tiendas_sliders: 'Sliders',
  tiendas_integraciones: 'Integraciones',
  tiendas_colecciones: 'Colecciones',
};

/** Descripciones cortas para cada pestaña del módulo Tiendas */
export const TIENDAS_DESCRIPTIONS: Record<TiendasKey, string> = {
  tiendas_resumen: 'Vista general de la tienda y accesos rápidos.',
  tiendas_configuracion: 'Configuración general, impuestos y notificaciones de la tienda.',
  tiendas_correos: 'Plantillas de correos electrónicos de la tienda.',
  tiendas_personalizar: 'Branding, logotipo e identidad visual de la tienda.',
  tiendas_sliders: 'Banners y sliders del storefront de la tienda.',
  tiendas_integraciones: 'Integraciones de pago y automatización (Karlopay, Karbot).',
  tiendas_colecciones: 'Colecciones de productos de la tienda.',
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
  const tiendas = (raw.tiendas as Partial<Record<TiendasKey, boolean>>) || {};
  const capabilities = (raw.capabilities as Partial<Record<CapabilityKey, boolean>>) || {};
  return {
    modules: { ...emptyModules, ...modules },
    settings: { ...emptySettings, ...settings },
    tiendas: { ...emptyTiendas, ...tiendas },
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
