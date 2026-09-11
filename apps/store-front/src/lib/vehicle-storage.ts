/**
 * Utilidades para manejar el almacenamiento de vehículos en localStorage
 * Separado del componente para evitar problemas con SSR
 */

const STORAGE_KEY = 'user_vehicle'; // Vehículo guardado (permanente)
const SELECTED_KEY = 'user_vehicle_selected'; // Vehículo seleccionado/activo (puede ser null)

// Función helper para obtener el vehículo guardado en localStorage (permanente)
export function getStoredVehicle(): any | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error leyendo vehículo guardado:', error);
  }
  
  return null;
}

// Función helper para guardar el vehículo en localStorage (permanente)
export function setStoredVehicle(vehicle: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));
    // También establecer como seleccionado
    if (vehicle) {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(vehicle));
    }
  } catch (error) {
    console.error('Error guardando vehículo:', error);
  }
}

// Marcador especial para indicar que el vehículo fue deseleccionado intencionalmente
const DESELECTED_MARKER = '__deselected__';

// Función helper para obtener el vehículo seleccionado/activo
export function getSelectedVehicle(): any | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const selected = localStorage.getItem(SELECTED_KEY);
    if (selected) {
      // Si es el marcador de deseleccionado, retornar null
      if (selected === DESELECTED_MARKER) {
        return null;
      }
      return JSON.parse(selected);
    }
  } catch (error) {
    console.error('Error leyendo vehículo seleccionado:', error);
  }
  
  return null;
}

// Función helper para verificar si el vehículo fue deseleccionado intencionalmente
export function isVehicleDeselected(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const selected = localStorage.getItem(SELECTED_KEY);
    return selected === DESELECTED_MARKER;
  } catch (error) {
    return false;
  }
}

export function getVehicleVariantId(vehicle: any | null): string | undefined {
  if (!vehicle) return undefined;
  const id = vehicle.vehicle_variant_id || vehicle.vehicleVariantId;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

export function getVehicleMakeModelYear(
  vehicle: any | null,
): { make: string; model: string; year: number } | null {
  if (!vehicle) return null;
  const make = vehicle.make || vehicle.brand_name;
  const model = vehicle.model || vehicle.model_name;
  const year = Number(vehicle.year || vehicle.year_start);
  if (!make || !model || !Number.isFinite(year)) return null;
  return { make: String(make), model: String(model), year };
}

export function setSelectedVehicle(vehicle: any | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (vehicle) {
      localStorage.setItem(SELECTED_KEY, JSON.stringify(vehicle));
    } else {
      // En lugar de remover la clave, establecer un marcador para indicar deselección intencional
      localStorage.setItem(SELECTED_KEY, DESELECTED_MARKER);
    }
  } catch (error) {
    console.error('Error estableciendo vehículo seleccionado:', error);
  }
}

