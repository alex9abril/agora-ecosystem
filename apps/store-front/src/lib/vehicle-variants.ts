/**
 * Cliente para listar/buscar variantes de vehículo (catalog.vehicle_variants)
 */

import { apiRequest } from './api';

export interface VehicleVariant {
  id: string;
  make: string;
  model: string;
  year: number;
  body_trim: string | null;
  engine_transmission: string | null;
}

export interface GetVehicleVariantsParams {
  q?: string;
  make?: string;
  model?: string;
  year?: number;
  body_trim?: string | null;
  engine_transmission?: string | null;
  limit?: number;
}

/**
 * Marcas distintas para desplegable
 */
export async function getVariantMakes(): Promise<string[]> {
  try {
    const data = await apiRequest<string[]>('/catalog/vehicles/variants/makes', { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo marcas:', error);
    return [];
  }
}

/**
 * Modelos distintos por marca
 */
export async function getVariantModels(make: string): Promise<string[]> {
  if (!make) return [];
  try {
    const data = await apiRequest<string[]>(`/catalog/vehicles/variants/models?make=${encodeURIComponent(make)}`, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo modelos:', error);
    return [];
  }
}

/**
 * Años distintos por marca y modelo
 */
export async function getVariantYears(make: string, model: string): Promise<number[]> {
  if (!make || !model) return [];
  try {
    const data = await apiRequest<number[]>(
      `/catalog/vehicles/variants/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
      { method: 'GET' }
    );
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo años:', error);
    return [];
  }
}

/**
 * Body trim distintos por make, model, year
 */
export async function getVariantBodyTrims(make: string, model: string, year: number): Promise<(string | null)[]> {
  if (!make || !model || year == null) return [];
  try {
    const data = await apiRequest<(string | null)[]>(
      `/catalog/vehicles/variants/body-trims?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`,
      { method: 'GET' }
    );
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo body trims:', error);
    return [];
  }
}

/**
 * Engine/transmission distintos por make, model, year y opcional body_trim
 */
export async function getVariantEngineTransmissions(
  make: string,
  model: string,
  year: number,
  bodyTrim?: string | null
): Promise<(string | null)[]> {
  if (!make || !model || year == null) return [];
  try {
    const params = new URLSearchParams({ make, model, year: String(year) });
    if (bodyTrim != null && bodyTrim !== '') params.set('bodyTrim', bodyTrim);
    const data = await apiRequest<(string | null)[]>(
      `/catalog/vehicles/variants/engine-transmissions?${params.toString()}`,
      { method: 'GET' }
    );
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo engine/transmission:', error);
    return [];
  }
}

/**
 * Obtener variantes de vehículo con filtros opcionales (para resolver variante por make/model/year/body_trim/engine_transmission)
 */
export async function getVehicleVariants(
  params: GetVehicleVariantsParams = {}
): Promise<VehicleVariant[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.q != null && params.q !== '') searchParams.set('q', params.q);
    if (params.make != null && params.make !== '') searchParams.set('make', params.make);
    if (params.model != null && params.model !== '') searchParams.set('model', params.model);
    if (params.year != null) searchParams.set('year', String(params.year));
    if (params.body_trim != null && params.body_trim !== '') searchParams.set('body_trim', params.body_trim);
    if (params.engine_transmission != null && params.engine_transmission !== '') searchParams.set('engine_transmission', params.engine_transmission);
    if (params.limit != null) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const url = `/catalog/vehicles/variants${query ? `?${query}` : ''}`;
    const data = await apiRequest<VehicleVariant[]>(url, { method: 'GET' });
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error('[VehicleVariants] Error obteniendo variantes:', error);
    return [];
  }
}
