/**
 * Diálogo para seleccionar y gestionar vehículos del usuario
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleBrandsService, VehicleBrand } from '@/lib/vehicle-brands';
import { userVehiclesService, UserVehicle, CreateUserVehicleDto } from '@/lib/user-vehicles';
import { apiRequest } from '@/lib/api';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import cocheIcon from '@/images/iconos/coche.png';

interface VehicleSelectorDialogProps {
  open: boolean;
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

import { getStoredVehicle, setStoredVehicle, getSelectedVehicle, setSelectedVehicle as setSelectedVehicleStorage } from '@/lib/vehicle-storage';

export default function VehicleSelectorDialog({ open, onClose, onVehicleSelected }: VehicleSelectorDialogProps) {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<'list' | 'select'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Datos de catálogo
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<VehicleYear[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  
  // Vehículos del usuario
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [storedVehicleState, setStoredVehicleState] = useState<any | null>(null);
  const [selectedVehicleState, setSelectedVehicleState] = useState<any | null>(null);
  
  // Vehículo en proceso de selección
  const [selectedVehicle, setSelectedVehicle] = useState<CreateUserVehicleDto>({
    vehicle_brand_id: '',
  });
  const [nickname, setNickname] = useState('');

  // Cargar datos al abrir el diálogo
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar marcas
      const brandsData = await vehicleBrandsService.getBrands();
      setBrands(brandsData);

      // Cargar vehículos según el estado de autenticación
      if (isAuthenticated) {
        const vehicles = await userVehiclesService.getUserVehicles();
        setUserVehicles(vehicles);
        
        // Verificar si hay un vehículo seleccionado (para usuarios autenticados, el predeterminado está seleccionado)
        const defaultVehicle = vehicles.find(v => v.is_default);
        if (defaultVehicle) {
          setSelectedVehicleState(defaultVehicle);
        } else {
          setSelectedVehicleState(null);
        }
      } else {
        // Si no está autenticado, cargar del localStorage (vehículo guardado, no necesariamente seleccionado)
        const stored = getStoredVehicle();
        setStoredVehicleState(stored);
        
        // Verificar si hay un vehículo seleccionado (puede ser diferente del guardado)
        const selected = getSelectedVehicle();
        setSelectedVehicleState(selected);
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

  const handleSave = async () => {
    if (!selectedVehicle.vehicle_brand_id) {
      setError('Por favor selecciona al menos la marca del vehículo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Construir objeto de datos limpiando campos vacíos
      // Solo incluir campos que tengan valores válidos (no vacíos)
      const vehicleData: CreateUserVehicleDto = {
        vehicle_brand_id: selectedVehicle.vehicle_brand_id.trim(),
      };

      // Solo agregar campos opcionales si tienen valores válidos (no vacíos)
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
      
      // Solo establecer como predeterminado si es el primer vehículo (no hay vehículos existentes)
      // Si ya hay vehículos, el nuevo NO será predeterminado (no incluir is_default o establecerlo como false)
      if (isAuthenticated) {
        // Solo establecer como predeterminado si es el primer vehículo
        if (userVehicles.length === 0) {
          vehicleData.is_default = true;
        }
        // Si ya hay vehículos, no incluir is_default (será false por defecto en el backend)
      } else {
        // Para usuarios no autenticados, solo si no hay vehículo guardado
        if (storedVehicleState === null) {
          vehicleData.is_default = true;
        }
        // Si ya hay vehículo guardado, no incluir is_default
      }

      if (isAuthenticated) {
        // Guardar en la base de datos
        const newVehicle = await userVehiclesService.createUserVehicle(vehicleData);
        await loadData(); // Recargar lista
        setStep('list');
        if (onVehicleSelected) {
          onVehicleSelected(newVehicle);
        }
      } else {
        // Guardar en localStorage
        const vehicleToStore = {
          ...vehicleData,
          brand_name: brands.find(b => b.id === vehicleData.vehicle_brand_id)?.name,
          model_name: models.find(m => m.id === vehicleData.vehicle_model_id)?.name,
          year_start: years.find(y => y.id === vehicleData.vehicle_year_id)?.year_start,
          year_end: years.find(y => y.id === vehicleData.vehicle_year_id)?.year_end,
          generation: years.find(y => y.id === vehicleData.vehicle_year_id)?.generation,
        };
        setStoredVehicleState(vehicleToStore);
        setStoredVehicle(vehicleToStore); // Guardar en localStorage usando la función helper
        setSelectedVehicleState(vehicleToStore); // También establecer como seleccionado
        setStep('list');
        if (onVehicleSelected) {
          onVehicleSelected(vehicleToStore as any);
        }
      }
    } catch (err: any) {
      console.error('Error guardando vehículo:', err);
      setError(err.message || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = async (vehicle: UserVehicle | any) => {
    if (isAuthenticated && 'id' in vehicle) {
      // Establecer como predeterminado si no lo es
      if (!vehicle.is_default) {
        try {
          await userVehiclesService.setDefaultVehicle(vehicle.id);
          await loadData();
        } catch (err: any) {
          console.error('Error estableciendo vehículo predeterminado:', err);
        }
      }
      // Actualizar estado local
      setSelectedVehicleState(vehicle);
    } else {
      // Vehículo de localStorage
      setStoredVehicleState(vehicle);
      setStoredVehicle(vehicle); // Guardar en localStorage (permanente)
      // Actualizar estado local
      setSelectedVehicleState(vehicle);
    }
    
    // Establecer como seleccionado en localStorage (para ambos casos: autenticado y no autenticado)
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
    // Solo deseleccionar el vehículo para comprar, NO eliminarlo
    // Para usuarios autenticados: los vehículos siguen en la BD, solo no hay uno seleccionado
    // Para usuarios no autenticados: el vehículo sigue en localStorage (STORAGE_KEY), solo no está activo (SELECTED_KEY)
    
    // Limpiar solo la selección actual (no eliminar de localStorage)
    // Mantener el vehículo guardado pero deseleccionarlo para comprar
    setSelectedVehicleStorage(null); // Usar la función helper para limpiar SELECTED_KEY en localStorage
    setSelectedVehicleState(null); // Actualizar estado local
    
    // Notificar al componente padre que se deseleccionó el vehículo
    if (onVehicleSelected) {
      onVehicleSelected(null);
    }
    
    // Disparar evento de storage para que otros componentes se actualicen
    if (typeof window !== 'undefined') {
      const SELECTED_KEY = 'user_vehicle_selected';
      const DESELECTED_MARKER = '__deselected__';
      window.dispatchEvent(new StorageEvent('storage', {
        key: SELECTED_KEY,
        newValue: DESELECTED_MARKER,
        oldValue: localStorage.getItem(SELECTED_KEY),
      }));
    }
    
    // Cerrar el diálogo
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'list' ? 'Mis Vehículos' : 'Agregar Vehículo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primera columna: Imagen y mensaje */}
              <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
                <div className="mb-6">
                  <Image
                    src={cocheIcon}
                    alt="Agregar vehículo"
                    width={200}
                    height={200}
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                  Agrega tu Vehículo
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  Selecciona tu vehículo para ver productos compatibles y personalizar tu experiencia de compra.
                </p>
              </div>

              {/* Segunda columna: Lista de vehículos */}
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Cargando...</div>
                ) : (
                  <>
                    {/* Vehículos del usuario (si está autenticado) */}
                    {isAuthenticated && userVehicles.length > 0 && (
                      <div className="space-y-2">
                        {userVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              vehicle.is_default
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleSelectVehicle(vehicle)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <DirectionsCarIcon className="w-5 h-5 text-gray-600" />
                                  <span className="font-semibold text-gray-900 uppercase">
                                    {getVehicleDisplayName(vehicle)}
                                  </span>
                                  {vehicle.is_default && (
                                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                      Predeterminado
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 text-sm text-gray-600">
                                  {vehicle.brand_name}
                                  {vehicle.model_name && ` ${vehicle.model_name}`}
                                  {vehicle.year_start && ` ${vehicle.year_start}`}
                                  {vehicle.year_end && `-${vehicle.year_end}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {vehicle.is_default && (
                                  <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVehicle(vehicle.id);
                                  }}
                                  className="p-2 text-red-500 hover:text-red-700 transition-colors"
                                >
                                  <DeleteIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vehículo de localStorage (si no está autenticado) */}
                    {!isAuthenticated && storedVehicleState && (
                      <div 
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedVehicleState 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        onClick={() => handleSelectVehicle(storedVehicleState)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <DirectionsCarIcon className="w-5 h-5 text-gray-600" />
                              <span className="font-semibold text-gray-900 uppercase">
                                {getVehicleDisplayName(storedVehicleState)}
                              </span>
                              {selectedVehicleState && (
                                <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                                  Vehículo Actual
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {storedVehicleState.brand_name}
                              {storedVehicleState.model_name && ` ${storedVehicleState.model_name}`}
                              {storedVehicleState.year_start && ` ${storedVehicleState.year_start}`}
                              {storedVehicleState.year_end && `-${storedVehicleState.year_end}`}
                            </div>
                          </div>
                          {selectedVehicleState && (
                            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mensaje si no hay vehículos */}
                    {isAuthenticated && userVehicles.length === 0 && !storedVehicleState && (
                      <div className="text-center py-8 text-gray-500">
                        <DirectionsCarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No tienes vehículos agregados</p>
                        <p className="text-sm mt-2">Agrega uno para ver productos compatibles</p>
                      </div>
                    )}

                    {/* Opción para comprar sin auto - Solo si hay vehículos */}
                    {(isAuthenticated && userVehicles.length > 0) || storedVehicleState ? (
                      <button
                        onClick={handleRemoveVehicle}
                        className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="text-gray-700 font-medium">Comprar sin auto</span>
                      </button>
                    ) : null}

                    {/* Botón para agregar nuevo vehículo - Al final de la segunda columna */}
                    <button
                      onClick={() => {
                        setStep('select');
                        setSelectedVehicle({ vehicle_brand_id: '' });
                        setNickname('');
                        setError(null);
                      }}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <AddIcon className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-600">Agregar Nuevo Vehículo</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Nombre personalizado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre personalizado (opcional)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ej: Mi Corolla, Auto de trabajo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                />
              </div>

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedVehicle.vehicle_brand_id}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                >
                  <option value="">Selecciona una marca</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modelo */}
              {selectedVehicle.vehicle_brand_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <select
                    value={selectedVehicle.vehicle_model_id || ''}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                  >
                    <option value="">Selecciona un modelo</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Año */}
              {selectedVehicle.vehicle_model_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año
                  </label>
                  <select
                    value={selectedVehicle.vehicle_year_id || ''}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                  >
                    <option value="">Selecciona un año</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year_start}
                        {year.year_end ? `-${year.year_end}` : '+'}
                        {year.generation && ` (${year.generation})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Especificaciones */}
              {selectedVehicle.vehicle_year_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especificaciones
                  </label>
                  <select
                    value={selectedVehicle.vehicle_spec_id || ''}
                    onChange={(e) => handleSpecChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                  >
                    <option value="">Selecciona especificaciones (opcional)</option>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          {step === 'select' && (
            <>
              <button
                onClick={() => {
                  setStep('list');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !selectedVehicle.vehicle_brand_id}
                className="px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar Vehículo'}
              </button>
            </>
          )}
          {step === 'list' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

