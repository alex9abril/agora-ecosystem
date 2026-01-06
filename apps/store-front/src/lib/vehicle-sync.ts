/**
 * Utilidades para sincronización de vehículos
 * Gestiona la sincronización entre vehículos de localStorage y vehículos de la cuenta
 */

import { UserVehicle, CreateUserVehicleDto } from './user-vehicles';
import { getStoredVehicle, setStoredVehicle } from './vehicle-storage';
import { userVehiclesService } from './user-vehicles';

export interface LocalVehicle {
  vehicle_brand_id: string;
  vehicle_model_id?: string | null;
  vehicle_year_id?: string | null;
  vehicle_spec_id?: string | null;
  nickname?: string | null;
  // Información relacionada (para mostrar)
  brand_name?: string;
  model_name?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  generation?: string | null;
  engine_code?: string | null;
  transmission_type?: string | null;
  drivetrain?: string | null;
  body_type?: string | null;
}

export interface VehicleSource {
  source: 'account' | 'local';
  vehicle: UserVehicle | LocalVehicle;
  isDefault?: boolean;
}

/**
 * Verifica si dos vehículos son iguales (duplicados)
 * Compara por brand_id, model_id, year_id y spec_id
 */
export function isVehicleDuplicate(
  vehicle1: UserVehicle | LocalVehicle,
  vehicle2: UserVehicle | LocalVehicle
): boolean {
  // Comparar brand_id (requerido)
  if (vehicle1.vehicle_brand_id !== vehicle2.vehicle_brand_id) {
    return false;
  }

  // Comparar model_id (pueden ser null)
  const model1 = vehicle1.vehicle_model_id || null;
  const model2 = vehicle2.vehicle_model_id || null;
  if (model1 !== model2) {
    return false;
  }

  // Comparar year_id (pueden ser null)
  const year1 = vehicle1.vehicle_year_id || null;
  const year2 = vehicle2.vehicle_year_id || null;
  if (year1 !== year2) {
    return false;
  }

  // Comparar spec_id (pueden ser null)
  const spec1 = vehicle1.vehicle_spec_id || null;
  const spec2 = vehicle2.vehicle_spec_id || null;
  if (spec1 !== spec2) {
    return false;
  }

  return true;
}

/**
 * Verifica si un vehículo local ya existe en la lista de vehículos de cuenta
 */
export function findDuplicateInAccount(
  localVehicle: LocalVehicle,
  accountVehicles: UserVehicle[]
): UserVehicle | null {
  return accountVehicles.find((accountVehicle) =>
    isVehicleDuplicate(localVehicle, accountVehicle)
  ) || null;
}

/**
 * Sincroniza vehículos de localStorage a la cuenta del usuario
 * Solo crea vehículos que no existen en la cuenta (sin duplicar)
 * 
 * @returns Array de vehículos creados en la cuenta
 */
export async function syncLocalVehiclesToAccount(): Promise<UserVehicle[]> {
  const localVehicle = getStoredVehicle();
  
  if (!localVehicle || !localVehicle.vehicle_brand_id) {
    return [];
  }

  try {
    // Obtener vehículos de la cuenta
    const accountVehicles = await userVehiclesService.getUserVehicles();
    
    // Verificar si el vehículo local ya existe en la cuenta
    const duplicate = findDuplicateInAccount(localVehicle, accountVehicles);
    
    if (duplicate) {
      // Ya existe, no crear duplicado
      console.log('[VehicleSync] Vehículo ya existe en cuenta, no se duplica:', duplicate.id);
      return [duplicate];
    }

    // No existe, crear en la cuenta
    const createDto: CreateUserVehicleDto = {
      vehicle_brand_id: localVehicle.vehicle_brand_id,
      vehicle_model_id: localVehicle.vehicle_model_id || undefined,
      vehicle_year_id: localVehicle.vehicle_year_id || undefined,
      vehicle_spec_id: localVehicle.vehicle_spec_id || undefined,
      nickname: localVehicle.nickname || undefined,
      is_default: accountVehicles.length === 0, // Si no hay vehículos, este será el predeterminado
    };

    const createdVehicle = await userVehiclesService.createUserVehicle(createDto);
    console.log('[VehicleSync] Vehículo sincronizado a cuenta:', createdVehicle.id);
    
    return [createdVehicle];
  } catch (error: any) {
    console.error('[VehicleSync] Error sincronizando vehículo:', error);
    throw error;
  }
}

/**
 * Obtiene todos los vehículos del usuario unificados (cuenta + local)
 * Elimina duplicados dando prioridad a los vehículos de la cuenta
 * 
 * @param accountVehicles Vehículos de la cuenta del usuario
 * @param includeLocal Si incluir vehículos locales (solo si no hay sesión o para mostrar ambos)
 * @returns Lista unificada de vehículos con su fuente
 */
export function getUnifiedVehicles(
  accountVehicles: UserVehicle[],
  includeLocal: boolean = false
): VehicleSource[] {
  const vehicles: VehicleSource[] = [];

  // Agregar vehículos de la cuenta (prioridad alta)
  accountVehicles.forEach((vehicle) => {
    vehicles.push({
      source: 'account',
      vehicle,
      isDefault: vehicle.is_default || false,
    });
  });

  // Si se incluyen vehículos locales, agregarlos solo si no están duplicados
  if (includeLocal) {
    const localVehicle = getStoredVehicle();
    if (localVehicle && localVehicle.vehicle_brand_id) {
      const duplicate = findDuplicateInAccount(localVehicle, accountVehicles);
      if (!duplicate) {
        // Solo agregar si no está duplicado
        vehicles.push({
          source: 'local',
          vehicle: localVehicle,
          isDefault: false,
        });
      }
    }
  }

  return vehicles;
}

/**
 * Obtiene el vehículo predeterminado unificado
 * Prioridad: cuenta predeterminado > cuenta primero > local
 */
export function getDefaultUnifiedVehicle(
  accountVehicles: UserVehicle[]
): VehicleSource | null {
  // Buscar predeterminado en cuenta
  const accountDefault = accountVehicles.find((v) => v.is_default);
  if (accountDefault) {
    return {
      source: 'account',
      vehicle: accountDefault,
      isDefault: true,
    };
  }

  // Si no hay predeterminado pero hay vehículos de cuenta, usar el primero
  if (accountVehicles.length > 0) {
    return {
      source: 'account',
      vehicle: accountVehicles[0],
      isDefault: false,
    };
  }

  // Si no hay vehículos de cuenta, usar el local (si existe)
  const localVehicle = getStoredVehicle();
  if (localVehicle && localVehicle.vehicle_brand_id) {
    return {
      source: 'local',
      vehicle: localVehicle,
      isDefault: false,
    };
  }

  return null;
}

/**
 * Limpia el vehículo de localStorage después de sincronización exitosa
 * Solo se debe llamar después de confirmar que la sincronización fue exitosa
 */
export function clearLocalVehicleAfterSync(): void {
  setStoredVehicle(null);
  console.log('[VehicleSync] Vehículo local limpiado después de sincronización');
}

