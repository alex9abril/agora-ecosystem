/**
 * Diálogo para seleccionar tienda por ciudad/estado
 * Muestra primero las ciudades/estados disponibles, luego las sucursales
 */

import React, { useState, useEffect } from 'react';
import { branchesService, Business } from '@/lib/branches';
import { useStoreContext } from '@/contexts/StoreContext';
import { useRouter } from 'next/router';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface StoreSelectorDialogProps {
  open: boolean;
  onClose: () => void;
}

interface CityState {
  city: string;
  state: string;
  count: number;
}

const STORAGE_KEY = 'selected_branch';

// Función helper para obtener la sucursal guardada
export function getStoredBranch(): { 
  id: string; 
  slug: string; 
  name: string; 
  city?: string; 
  state?: string; 
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
} | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error leyendo sucursal guardada:', error);
  }
  
  return null;
}

export default function StoreSelectorDialog({ open, onClose }: StoreSelectorDialogProps) {
  const router = useRouter();
  const { navigateToContext, contextType, groupId, branchId, brandId, branchData } = useStoreContext();
  const [step, setStep] = useState<'store-details' | 'location' | 'stores'>('store-details');
  const [selectedStore, setSelectedStore] = useState<Business | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CityState | null>(null);
  const [locations, setLocations] = useState<CityState[]>([]);
  const [stores, setStores] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verificar si hay tienda guardada al abrir el diálogo
  useEffect(() => {
    if (open) {
      // Si estamos en contexto de sucursal, mostrar directamente la sucursal actual
      if (contextType === 'sucursal' && branchData) {
        setSelectedStore(branchData);
        setStep('store-details');
        return;
      }

      const stored = getStoredBranch();
      if (stored) {
        // Cargar información completa de la tienda
        loadStoreDetails(stored.slug);
      } else {
        // No hay tienda guardada, ir directamente a selección de ubicación
        setStep('location');
        loadLocations();
      }
    }
  }, [open, contextType, branchData]);

  // Cargar ubicaciones disponibles cuando se cambia a step 'location'
  useEffect(() => {
    if (open && step === 'location' && locations.length === 0) {
      loadLocations();
    }
  }, [open, step]);

  // Cargar sucursales cuando se selecciona una ubicación
  useEffect(() => {
    if (open && step === 'stores' && selectedLocation) {
      loadStoresByLocation(selectedLocation.city, selectedLocation.state);
    }
  }, [open, step, selectedLocation]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response: BusinessResponse;
      
      // Filtrar según el contexto
      if (contextType === 'grupo' && groupId) {
        // Solo sucursales del grupo
        response = await branchesService.getBranchesByGroup(groupId, {
          isActive: true,
          limit: 1000,
        });
      } else if (contextType === 'brand' && brandId) {
        // Solo sucursales que venden productos de la marca
        response = await branchesService.getBranchesByBrand(brandId);
      } else {
        // Contexto global: todas las sucursales
        response = await branchesService.getBranches({
          isActive: true,
          limit: 1000,
        });
      }

      // Agrupar por ciudad y estado
      const locationMap = new Map<string, CityState>();
      
      response.data.forEach((branch) => {
        if (branch.city && branch.state) {
          const key = `${branch.city}-${branch.state}`;
          if (locationMap.has(key)) {
            locationMap.get(key)!.count++;
          } else {
            locationMap.set(key, {
              city: branch.city,
              state: branch.state,
              count: 1,
            });
          }
        }
      });

      // Ordenar por estado, luego por ciudad
      const sortedLocations = Array.from(locationMap.values()).sort((a, b) => {
        if (a.state !== b.state) {
          return a.state.localeCompare(b.state);
        }
        return a.city.localeCompare(b.city);
      });

      setLocations(sortedLocations);
    } catch (err: any) {
      console.error('Error cargando ubicaciones:', err);
      setError('Error al cargar las ubicaciones disponibles');
    } finally {
      setLoading(false);
    }
  };

  const loadStoreDetails = async (slug: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const store = await branchesService.getBranchBySlug(slug);
      setSelectedStore(store);
      setStep('store-details');
    } catch (err: any) {
      console.error('Error cargando detalles de tienda:', err);
      // Si no se puede cargar, ir a selección de ubicación
      setStep('location');
      loadLocations();
    } finally {
      setLoading(false);
    }
  };

  const loadStoresByLocation = async (city: string, state: string) => {
    try {
      setLoading(true);
      setError(null);
      
      let response: BusinessResponse;
      
      // Filtrar según el contexto
      if (contextType === 'grupo' && groupId) {
        // Solo sucursales del grupo
        response = await branchesService.getBranchesByGroup(groupId, {
          isActive: true,
          limit: 1000,
        });
      } else if (contextType === 'brand' && brandId) {
        // Solo sucursales que venden productos de la marca
        response = await branchesService.getBranchesByBrand(brandId);
      } else {
        // Contexto global: todas las sucursales
        response = await branchesService.getBranches({
          isActive: true,
          limit: 1000,
        });
      }

      // Filtrar por ciudad/estado
      const filteredStores = response.data.filter(
        (branch) => branch.city === city && branch.state === state
      );

      setStores(filteredStores);
    } catch (err: any) {
      console.error('Error cargando sucursales:', err);
      setError('Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: CityState) => {
    setSelectedLocation(location);
    setStep('stores');
  };

  const handleStoreSelect = (store: Business) => {
    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: store.id,
      slug: store.slug,
      name: store.name,
      city: store.city,
      state: store.state,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      phone: store.phone,
      email: store.email,
    }));

    // Navegar a la sucursal
    navigateToContext('sucursal', store.slug);
    
    // Cerrar el diálogo
    onClose();
    
    // Recargar la página para aplicar el contexto
    router.reload();
  };

  const handleChangeStore = () => {
    setStep('location');
    setSelectedStore(null);
    setSelectedLocation(null);
    setStores([]);
    loadLocations();
  };

  const handleBack = () => {
    setStep('location');
    setSelectedLocation(null);
    setStores([]);
  };

  const handleClose = () => {
    setStep('store-details');
    setSelectedStore(null);
    setSelectedLocation(null);
    setStores([]);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {(step === 'stores' || step === 'location') && (
              <button
                onClick={step === 'stores' ? handleBack : handleChangeStore}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowBackIcon className="w-6 h-6" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'store-details' 
                ? 'Mi Tienda Seleccionada' 
                : step === 'location' 
                ? 'Seleccionar Ubicación' 
                : 'Seleccionar Tienda'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={step === 'location' ? loadLocations : step === 'stores' ? () => selectedLocation && loadStoresByLocation(selectedLocation.city, selectedLocation.state) : () => selectedStore && loadStoreDetails(selectedStore.slug)}
                className="mt-4 px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : step === 'store-details' && selectedStore ? (
            <div className="space-y-6">
              {/* Información de la tienda */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  {selectedStore.logo_url && (
                    <img 
                      src={selectedStore.logo_url} 
                      alt={selectedStore.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-black mb-2">
                      {selectedStore.name}
                    </h3>
                    {selectedStore.description && (
                      <p className="text-gray-600 mb-2">{selectedStore.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedStore.address && (
                    <div className="flex items-start gap-3">
                      <LocationOnIcon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Dirección</p>
                        <p className="text-gray-600">{selectedStore.address}</p>
                        {selectedStore.city && selectedStore.state && (
                          <p className="text-sm text-gray-500 mt-1">
                            {selectedStore.city}, {selectedStore.state}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedStore.phone && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">📞</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Teléfono</p>
                        <p className="text-gray-600">{selectedStore.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedStore.email && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">✉️</span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-gray-600">{selectedStore.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa de geolocalización */}
              {selectedStore.latitude && selectedStore.longitude && (
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">Ubicación</h4>
                  </div>
                  <div className="h-64 w-full">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${selectedStore.latitude},${selectedStore.longitude}&zoom=15`}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3">
                {contextType !== 'sucursal' && (
                  <button
                    onClick={handleChangeStore}
                    className="flex-1 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
                  >
                    Cambiar Tienda
                  </button>
                )}
                {contextType === 'sucursal' && (
                  <div className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 rounded-lg text-center font-medium">
                    No se puede cambiar la sucursal en este contexto
                  </div>
                )}
                <button
                  onClick={() => {
                    // Limpiar selección de tienda
                    localStorage.removeItem(STORAGE_KEY);
                    // Navegar al contexto global
                    router.push('/');
                    // Cerrar el diálogo
                    onClose();
                    // Recargar la página para aplicar cambios
                    router.reload();
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Comprar sin tienda
                </button>
              </div>
            </div>
          ) : step === 'location' ? (
            <div className="space-y-2">
              {locations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay ubicaciones disponibles</p>
                </div>
              ) : (
                locations.map((location, index) => (
                  <button
                    key={`${location.city}-${location.state}-${index}`}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LocationOnIcon className="w-6 h-6 text-gray-600" />
                        <div>
                          <h3 className="font-semibold text-black">
                            {location.city}, {location.state}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {location.count} {location.count === 1 ? 'sucursal disponible' : 'sucursales disponibles'}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xl">→</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedLocation && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <LocationOnIcon className="w-4 h-4 inline mr-1" />
                    {selectedLocation.city}, {selectedLocation.state}
                  </p>
                </div>
              )}
              {stores.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay sucursales disponibles en esta ubicación</p>
                </div>
              ) : (
                stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-black hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <StoreIcon className="w-6 h-6 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-black mb-1">
                            {store.name}
                          </h3>
                          {store.address && (
                            <p className="text-sm text-gray-600 mb-1">
                              {store.address}
                            </p>
                          )}
                          {store.phone && (
                            <p className="text-xs text-gray-500">
                              📞 {store.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <CheckCircleIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

