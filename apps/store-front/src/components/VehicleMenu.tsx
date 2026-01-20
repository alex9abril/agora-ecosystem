/**
 * Panel flotante lateral derecho para gestionar vehículos
 * Similar al panel de categorías pero del lado derecho
 * Muestra automáticamente el formulario si no hay vehículos, o la lista si ya hay vehículos
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleBrandsService, VehicleBrand } from '@/lib/vehicle-brands';
import { userVehiclesService, UserVehicle, CreateUserVehicleDto } from '@/lib/user-vehicles';
import { apiRequest } from '@/lib/api';
import { branchesService } from '@/lib/branches';
import { useStoreContext } from '@/contexts/StoreContext';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import cocheIcon from '@/images/iconos/coche.png';
import { getStoredVehicle, setStoredVehicle, getSelectedVehicle, setSelectedVehicle as setSelectedVehicleStorage } from '@/lib/vehicle-storage';

// Función helper para eliminar completamente un vehículo local
const removeLocalVehicle = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('user_vehicle');
    localStorage.removeItem('user_vehicle_selected');
  } catch (error) {
    console.error('Error eliminando vehículo local:', error);
  }
};
import { getUnifiedVehicles, VehicleSource } from '@/lib/vehicle-sync';

interface VehicleMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleSelected?: (vehicle: UserVehicle | null) => void;
}

interface VehicleModel {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface VehicleYear {
  id: string;
  model_id: string;
  year_start: number;
  year_end: number | null;
  generation: string | null;
  is_active: boolean;
}

interface VehicleSpec {
  id: string;
  year_id: string;
  engine_code: string | null;
  engine_displacement: string | null;
  engine_cylinders: number | null;
  transmission_type: string | null;
  transmission_speeds: number | null;
  drivetrain: string | null;
  body_type: string | null;
  is_active: boolean;
}

export default function VehicleMenu({ isOpen, onClose, onVehicleSelected }: VehicleMenuProps) {
  const { isAuthenticated } = useAuth();
  const { contextType, branchId } = useStoreContext();
  const [view, setView] = useState<'list' | 'form'>('list'); // 'list' para lista de vehículos, 'form' para formulario
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Datos de catálogo
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [allowedBrandIds, setAllowedBrandIds] = useState<string[] | null>(null);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<VehicleYear[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  
  // Vehículos del usuario
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [unifiedVehicles, setUnifiedVehicles] = useState<VehicleSource[]>([]);
  const [storedVehicleState, setStoredVehicleState] = useState<any | null>(null);
  const [selectedVehicleState, setSelectedVehicleState] = useState<any | null>(null);
  
  // Vehículo en proceso de selección
  const [selectedVehicle, setSelectedVehicle] = useState<CreateUserVehicleDto>({
    vehicle_brand_id: '',
  });
  const [nickname, setNickname] = useState('');
  const displayBrands = allowedBrandIds
    ? brands.filter((brand) => allowedBrandIds.includes(brand.id))
    : brands;
  const singleBrandId = displayBrands.length === 1 ? displayBrands[0].id : null;

  // Cargar datos al abrir el panel
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, isAuthenticated]);

  // Determinar qué vista mostrar automáticamente solo cuando se abre el panel
  useEffect(() => {
    if (isOpen) {
      if (unifiedVehicles.length === 0 && !loading) {
        // Si no hay vehículos, mostrar formulario automáticamente
        setView('form');
      } else if (unifiedVehicles.length > 0) {
        // Si hay vehículos, mostrar lista (solo cuando se abre el panel)
        setView('list');
      }
    }
  }, [isOpen]); // Solo ejecutar cuando se abre/cierra el panel

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar marcas
      const brandsData = await vehicleBrandsService.getBrands();
      setBrands(brandsData);

      // Si estamos en contexto de sucursal, limitar marcas a las asignadas
      if (contextType === 'sucursal' && branchId) {
        try {
          const branchBrands = await branchesService.getBranchVehicleBrands(branchId);
          if (branchBrands.length > 0) {
            setAllowedBrandIds(branchBrands.map((brand) => brand.brand_id));
          } else {
            setAllowedBrandIds(null);
          }
        } catch (err: any) {
          console.warn('Error obteniendo marcas de la sucursal:', err);
          setAllowedBrandIds(null);
        }
      } else {
        setAllowedBrandIds(null);
      }

      // Cargar vehículos según el estado de autenticación
      if (isAuthenticated) {
        const vehicles = await userVehiclesService.getUserVehicles();
        setUserVehicles(vehicles);
        
        // Obtener vehículos unificados (cuenta + local, sin duplicar)
        const unified = getUnifiedVehicles(vehicles, true);
        setUnifiedVehicles(unified);
        
        // Verificar si hay un vehículo seleccionado
        const defaultVehicle = vehicles.find(v => v.is_default);
        if (defaultVehicle) {
          setSelectedVehicleState(defaultVehicle);
        } else if (unified.length > 0) {
          setSelectedVehicleState(unified[0].vehicle);
        } else {
          setSelectedVehicleState(null);
        }
      } else {
        // Para usuarios no autenticados, cargar vehículo de localStorage
        const stored = getStoredVehicle();
        const selected = getSelectedVehicle();
        const vehicleToUse = selected || stored;
        
        setStoredVehicleState(vehicleToUse);
        setSelectedVehicleState(vehicleToUse);
        
        // Crear lista unificada con el vehículo local (si existe)
        if (vehicleToUse && vehicleToUse.vehicle_brand_id) {
          setUnifiedVehicles([{
            source: 'local',
            vehicle: vehicleToUse,
            isDefault: false,
          }]);
        } else {
          setUnifiedVehicles([]);
        }
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = async (brandId: string) => {
    setSelectedVehicle({
      vehicle_brand_id: brandId || '',
      vehicle_model_id: '',
      vehicle_year_id: '',
      vehicle_spec_id: '',
    });
    setModels([]);
    setYears([]);
    setSpecs([]);
    
    if (brandId) {
      try {
        const modelsData = await apiRequest<VehicleModel[]>(`/catalog/vehicles/brands/${brandId}/models`);
        setModels(modelsData);
      } catch (err: any) {
        console.error('Error cargando modelos:', err);
        setError('Error al cargar los modelos');
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedVehicle({
      ...selectedVehicle,
      vehicle_model_id: modelId || '',
      vehicle_year_id: '',
      vehicle_spec_id: '',
    });
    setYears([]);
    setSpecs([]);
    
    if (modelId) {
      try {
        const yearsData = await apiRequest<VehicleYear[]>(`/catalog/vehicles/models/${modelId}/years`);
        setYears(yearsData);
      } catch (err: any) {
        console.error('Error cargando años:', err);
        setError('Error al cargar los años');
      }
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedVehicle({
      ...selectedVehicle,
      vehicle_year_id: yearId || '',
      vehicle_spec_id: '',
    });
    setSpecs([]);
    
    if (yearId) {
      try {
        const specsData = await apiRequest<VehicleSpec[]>(`/catalog/vehicles/years/${yearId}/specs`);
        setSpecs(specsData);
      } catch (err: any) {
        console.error('Error cargando especificaciones:', err);
        setError('Error al cargar las especificaciones');
      }
    }
  };

  const handleSpecChange = (specId: string) => {
    setSelectedVehicle({
      ...selectedVehicle,
      vehicle_spec_id: specId,
    });
  };

  useEffect(() => {
    if (!singleBrandId) return;
    if (selectedVehicle.vehicle_brand_id === singleBrandId) return;
    handleBrandChange(singleBrandId);
  }, [singleBrandId, selectedVehicle.vehicle_brand_id, handleBrandChange]);

  const handleSave = async () => {
    if (!selectedVehicle.vehicle_brand_id) {
      setError('Por favor selecciona al menos la marca del vehículo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const vehicleData: CreateUserVehicleDto = {
        vehicle_brand_id: selectedVehicle.vehicle_brand_id.trim(),
      };

      if (selectedVehicle.vehicle_model_id && selectedVehicle.vehicle_model_id.trim()) {
        vehicleData.vehicle_model_id = selectedVehicle.vehicle_model_id.trim();
      }
      
      if (selectedVehicle.vehicle_year_id && selectedVehicle.vehicle_year_id.trim()) {
        vehicleData.vehicle_year_id = selectedVehicle.vehicle_year_id.trim();
      }
      
      if (selectedVehicle.vehicle_spec_id && selectedVehicle.vehicle_spec_id.trim()) {
        vehicleData.vehicle_spec_id = selectedVehicle.vehicle_spec_id.trim();
      }
      
      if (nickname && nickname.trim()) {
        vehicleData.nickname = nickname.trim();
      }
      
      if (isAuthenticated) {
        if (userVehicles.length === 0) {
          vehicleData.is_default = true;
        }
      } else {
        if (storedVehicleState === null) {
          vehicleData.is_default = true;
        }
      }

      if (isAuthenticated) {
        const newVehicle = await userVehiclesService.createUserVehicle(vehicleData);
        // Recargar datos para actualizar la lista
        await loadData();
        // Cambiar a vista de lista
        setView('list');
        if (onVehicleSelected) {
          onVehicleSelected(newVehicle);
        }
      } else {
        const vehicleToStore = {
          ...vehicleData,
          brand_name: brands.find(b => b.id === vehicleData.vehicle_brand_id)?.name,
          model_name: models.find(m => m.id === vehicleData.vehicle_model_id)?.name,
          year_start: years.find(y => y.id === vehicleData.vehicle_year_id)?.year_start,
          year_end: years.find(y => y.id === vehicleData.vehicle_year_id)?.year_end,
          generation: years.find(y => y.id === vehicleData.vehicle_year_id)?.generation,
        };
        // Guardar en localStorage
        setStoredVehicle(vehicleToStore);
        setSelectedVehicleStorage(vehicleToStore);
        
        // Actualizar estados locales
        setStoredVehicleState(vehicleToStore);
        setSelectedVehicleState(vehicleToStore);
        
        // Actualizar unifiedVehicles manualmente para que se muestre inmediatamente
        const newUnifiedVehicles: VehicleSource[] = [{
          source: 'local',
          vehicle: vehicleToStore,
          isDefault: true,
        }];
        setUnifiedVehicles(newUnifiedVehicles);
        
        // Cambiar a vista de lista
        setView('list');
        
        if (onVehicleSelected) {
          onVehicleSelected(vehicleToStore as any);
        }
      }
      
      // Limpiar formulario
      setSelectedVehicle({ vehicle_brand_id: '' });
      setNickname('');
      setModels([]);
      setYears([]);
      setSpecs([]);
      setError(null);
    } catch (err: any) {
      console.error('Error guardando vehículo:', err);
      setError(err.message || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = async (vehicle: UserVehicle | any) => {
    if (isAuthenticated && 'id' in vehicle) {
      if (!vehicle.is_default) {
        try {
          await userVehiclesService.setDefaultVehicle(vehicle.id);
          await loadData();
        } catch (err: any) {
          console.error('Error estableciendo vehículo predeterminado:', err);
        }
      }
      setSelectedVehicleState(vehicle);
    } else {
      setStoredVehicleState(vehicle);
      setStoredVehicle(vehicle);
      setSelectedVehicleState(vehicle);
    }
    
    setSelectedVehicleStorage(vehicle);
    
    if (onVehicleSelected) {
      onVehicleSelected(vehicle);
    }
    onClose();
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este vehículo?')) {
      return;
    }

    try {
      setLoading(true);
      await userVehiclesService.deleteUserVehicle(vehicleId);
      await loadData();
    } catch (err: any) {
      console.error('Error eliminando vehículo:', err);
      setError('Error al eliminar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveVehicle = () => {
    setSelectedVehicleStorage(null);
    setSelectedVehicleState(null);
    
    if (onVehicleSelected) {
      onVehicleSelected(null);
    }
    
    if (typeof window !== 'undefined') {
      const SELECTED_KEY = 'user_vehicle_selected';
      const DESELECTED_MARKER = '__deselected__';
      window.dispatchEvent(new StorageEvent('storage', {
        key: SELECTED_KEY,
        newValue: DESELECTED_MARKER,
        oldValue: localStorage.getItem(SELECTED_KEY),
      }));
    }
    
    onClose();
  };

  const getVehicleDisplayName = (vehicle: UserVehicle | any): string => {
    if (vehicle.nickname) {
      return vehicle.nickname;
    }
    
    const parts: string[] = [];
    if (vehicle.brand_name) parts.push(vehicle.brand_name);
    if (vehicle.model_name) parts.push(vehicle.model_name);
    if (vehicle.year_start) {
      if (vehicle.year_end) {
        parts.push(`${vehicle.year_start}-${vehicle.year_end}`);
      } else {
        parts.push(`${vehicle.year_start}+`);
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Vehículo sin nombre';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay oscuro de fondo */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel flotante lateral derecho */}
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header del panel */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <DirectionsCarIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">
              {view === 'list' ? 'Mis Vehículos' : 'Agregar Vehículo'}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cerrar menú"
            >
              <CloseIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {loading && view === 'list' ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Cargando...</p>
            </div>
          ) : view === 'list' ? (
            <>
              {/* Subtítulo */}
              {selectedVehicleState && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    Actualmente comprando para: <span className="font-medium text-gray-900">{getVehicleDisplayName(selectedVehicleState)}</span>
                  </p>
                </div>
              )}

              {/* Lista de vehículos */}
              <div className="px-6 py-4 space-y-3">
                {unifiedVehicles.length > 0 ? (
                  <>
                    {unifiedVehicles.map((vehicleSource) => {
                      const vehicle = vehicleSource.vehicle;
                      
                      let isSelected = false;
                      if (selectedVehicleState) {
                        if ('id' in vehicle && 'id' in selectedVehicleState) {
                          isSelected = vehicle.id === selectedVehicleState.id;
                        } else if (!('id' in vehicle) && !('id' in selectedVehicleState)) {
                          isSelected = 
                            vehicle.vehicle_brand_id === selectedVehicleState.vehicle_brand_id &&
                            (vehicle.vehicle_model_id || null) === (selectedVehicleState.vehicle_model_id || null) &&
                            (vehicle.vehicle_year_id || null) === (selectedVehicleState.vehicle_year_id || null) &&
                            (vehicle.vehicle_spec_id || null) === (selectedVehicleState.vehicle_spec_id || null);
                        }
                      }
                      
                      const isDefault = vehicleSource.isDefault || 
                        ('is_default' in vehicle && vehicle.is_default);
                      
                      return (
                        <div
                          key={'id' in vehicle ? vehicle.id : `local-${vehicle.vehicle_brand_id}`}
                          className={`relative p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400 bg-white'
                          }`}
                          onClick={() => handleSelectVehicle(vehicle)}
                        >
                          {/* Check en la esquina superior derecha */}
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between gap-3 pr-8">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {getVehicleDisplayName(vehicle)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {vehicle.brand_name}
                                {vehicle.model_name && ` ${vehicle.model_name}`}
                                {vehicle.year_start && ` ${vehicle.year_start}`}
                                {vehicle.year_end && `-${vehicle.year_end}`}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {isDefault && (
                                  <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-medium rounded">
                                    Predeterminado
                                  </span>
                                )}
                                {vehicleSource.source === 'local' && (
                                  <span className="px-2 py-0.5 bg-gray-500 text-white text-xs font-medium rounded">
                                    Local
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Botón de eliminar - visible para vehículos de cuenta o locales */}
                          <div className="absolute bottom-3 right-3">
                            {(isAuthenticated && vehicleSource.source === 'account' && 'id' in vehicle) || 
                             (vehicleSource.source === 'local') ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (isAuthenticated && vehicleSource.source === 'account' && 'id' in vehicle) {
                                    handleDeleteVehicle(vehicle.id);
                                  } else if (vehicleSource.source === 'local') {
                                    // Eliminar vehículo local
                                    if (confirm('¿Estás seguro de que deseas eliminar este vehículo?')) {
                                      // Eliminar completamente del localStorage
                                      removeLocalVehicle();
                                      
                                      // Limpiar estados
                                      setStoredVehicleState(null);
                                      setSelectedVehicleState(null);
                                      
                                      // Recargar datos
                                      await loadData();
                                      
                                      // Notificar al componente padre
                                      if (onVehicleSelected) {
                                        onVehicleSelected(null);
                                      }
                                      
                                      // Disparar evento para que otros componentes se actualicen
                                      if (typeof window !== 'undefined') {
                                        const SELECTED_KEY = 'user_vehicle_selected';
                                        const DESELECTED_MARKER = '__deselected__';
                                        window.dispatchEvent(new StorageEvent('storage', {
                                          key: SELECTED_KEY,
                                          newValue: DESELECTED_MARKER,
                                          oldValue: localStorage.getItem(SELECTED_KEY),
                                        }));
                                        
                                        // También disparar evento para el vehículo guardado
                                        window.dispatchEvent(new StorageEvent('storage', {
                                          key: 'user_vehicle',
                                          newValue: null,
                                          oldValue: localStorage.getItem('user_vehicle'),
                                        }));
                                      }
                                    }
                                  }
                                }}
                                className="p-1 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
                                title="Eliminar vehículo"
                              >
                                <DeleteIcon className="w-4 h-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Botón para comprar sin auto */}
                    <button
                      onClick={handleRemoveVehicle}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm text-gray-700 font-medium"
                    >
                      Comprar sin auto
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DirectionsCarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No tienes vehículos agregados</p>
                    <p className="text-xs mt-2">Agrega uno para ver productos compatibles</p>
                  </div>
                )}

                {/* Botón para agregar nuevo vehículo */}
                <button
                  onClick={() => {
                    setView('form');
                    setSelectedVehicle({ vehicle_brand_id: '' });
                    setNickname('');
                    setError(null);
                  }}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-900"
                >
                  <AddIcon className="w-5 h-5" />
                  Agregar Nuevo Vehículo
                </button>
              </div>
            </>
          ) : (
            /* Vista de formulario */
            <div className="px-6 py-4 space-y-4">
              {/* Botón de regresar */}
              {unifiedVehicles.length > 0 && (
                <button
                  onClick={() => {
                    setView('list');
                    setError(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
                >
                  <ArrowBackIcon className="w-4 h-4" />
                  Volver a la lista
                </button>
              )}

              {/* Subtítulo */}
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Agrega tu vehículo para navegar por partes que encajen.
                </p>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                {/* Nombre personalizado */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nombre personalizado (opcional)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ej: Mi Corolla, Auto de trabajo"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Marca */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Marca <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedVehicle.vehicle_brand_id}
                      onChange={(e) => handleBrandChange(e.target.value)}
                      disabled={!!singleBrandId}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-900 appearance-none pr-10 disabled:bg-gray-100 disabled:text-gray-700"
                    >
                      {!singleBrandId && <option value="">Marca</option>}
                      {displayBrands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Modelo */}
                {selectedVehicle.vehicle_brand_id && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Modelo
                    </label>
                    <div className="relative">
                      <select
                        value={selectedVehicle.vehicle_model_id || ''}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-900 appearance-none pr-10"
                      >
                        <option value="">Modelo</option>
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Año y Especificaciones en fila cuando ambos están disponibles */}
                {selectedVehicle.vehicle_model_id ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Año */}
                    {selectedVehicle.vehicle_model_id && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Año
                        </label>
                        <div className="relative">
                          <select
                            value={selectedVehicle.vehicle_year_id || ''}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-900 appearance-none pr-10"
                          >
                            <option value="">Año</option>
                            {years.map((year) => (
                              <option key={year.id} value={year.id}>
                                {year.year_start}
                                {year.year_end ? `-${year.year_end}` : '+'}
                                {year.generation && ` (${year.generation})`}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Especificaciones (Engine/Driveline) */}
                    {selectedVehicle.vehicle_year_id ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Especificaciones
                        </label>
                        <div className="relative">
                          <select
                            value={selectedVehicle.vehicle_spec_id || ''}
                            onChange={(e) => handleSpecChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm text-gray-900 appearance-none pr-10"
                          >
                            <option value="">Driveline</option>
                            {specs.map((spec) => (
                              <option key={spec.id} value={spec.id}>
                                {[
                                  spec.engine_code,
                                  spec.engine_displacement,
                                  spec.transmission_type,
                                  spec.drivetrain,
                                ]
                                  .filter(Boolean)
                                  .join(' - ')}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Especificaciones
                        </label>
                        <div className="relative">
                          <select
                            disabled
                            className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 appearance-none pr-10 cursor-not-allowed"
                          >
                            <option value="">Driveline</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Año solo cuando no hay modelo seleccionado */
                  selectedVehicle.vehicle_brand_id && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Año
                      </label>
                      <div className="relative">
                        <select
                          disabled
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 appearance-none pr-10 cursor-not-allowed"
                        >
                          <option value="">Año</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Botón de guardar */}
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading || !selectedVehicle.vehicle_brand_id}
                    className="w-full px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {loading ? 'Guardando...' : 'Agregar Vehículo'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

