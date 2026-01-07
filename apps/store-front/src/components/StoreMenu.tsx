/**
 * Panel flotante lateral derecho para gestionar tiendas/sucursales
 * Similar al panel de vehículos pero del lado derecho
 * Muestra información de tienda o permite seleccionar una nueva
 */

import React, { useState, useEffect, useMemo } from 'react';
import { branchesService, BusinessResponse } from '@/lib/branches';
import { useStoreContext, Business } from '@/contexts/StoreContext';
import { useRouter } from 'next/router';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';

interface StoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CityState {
  city: string;
  state: string;
  count: number;
}

const STORAGE_KEY = 'selected_branch';

// Función helper para obtener la sucursal guardada
function getStoredBranch(): { 
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

export default function StoreMenu({ isOpen, onClose }: StoreMenuProps) {
  const router = useRouter();
  const { navigateToContext, contextType, groupId, branchId, brandId, branchData } = useStoreContext();
  const [view, setView] = useState<'store-details' | 'location' | 'stores'>('store-details');
  const [selectedStore, setSelectedStore] = useState<Business | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CityState | null>(null);
  const [locations, setLocations] = useState<CityState[]>([]);
  const [stores, setStores] = useState<Business[]>([]);
  const [allStores, setAllStores] = useState<Business[]>([]); // Todas las tiendas para filtrado
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos al abrir el panel
  useEffect(() => {
    if (isOpen) {
      // Si estamos en contexto de sucursal, mostrar directamente la sucursal actual
      if (contextType === 'sucursal' && branchData) {
        setSelectedStore(branchData);
        setView('store-details');
        return;
      }

      const stored = getStoredBranch();
      if (stored) {
        // Cargar información completa de la tienda
        loadStoreDetails(stored.slug);
      } else {
        // No hay tienda guardada, ir directamente a selección de ubicación
        setView('location');
        loadLocations();
      }
    }
  }, [isOpen, contextType, branchData]);

  // Cargar ubicaciones cuando se cambia a vista 'location'
  useEffect(() => {
    if (isOpen && view === 'location' && locations.length === 0) {
      loadLocations();
    }
  }, [isOpen, view]);

  // Cargar sucursales cuando se selecciona una ubicación
  useEffect(() => {
    if (isOpen && view === 'stores' && selectedLocation) {
      loadStoresByLocation(selectedLocation.city, selectedLocation.state);
    }
  }, [isOpen, view, selectedLocation]);

  // Filtrar tiendas según el query
  const filteredStores = useMemo(() => {
    if (!filterQuery.trim()) {
      return stores;
    }
    
    const query = filterQuery.toLowerCase();
    return stores.filter(store => 
      store.name.toLowerCase().includes(query) ||
      store.address?.toLowerCase().includes(query) ||
      store.city?.toLowerCase().includes(query) ||
      store.state?.toLowerCase().includes(query) ||
      store.phone?.includes(query)
    );
  }, [stores, filterQuery]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response: BusinessResponse;
      
      // Filtrar según el contexto
      if (contextType === 'grupo' && groupId) {
        response = await branchesService.getBranchesByGroup(groupId, {
          isActive: true,
          limit: 1000,
        });
      } else if (contextType === 'brand' && brandId) {
        response = await branchesService.getBranchesByBrand(brandId);
      } else {
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
      setAllStores(response.data); // Guardar todas las tiendas para filtrado
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
      setView('store-details');
    } catch (err: any) {
      console.error('Error cargando detalles de tienda:', err);
      // Si no se puede cargar, ir a selección de ubicación
      setView('location');
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
        response = await branchesService.getBranchesByGroup(groupId, {
          isActive: true,
          limit: 1000,
        });
      } else if (contextType === 'brand' && brandId) {
        response = await branchesService.getBranchesByBrand(brandId);
      } else {
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
      setAllStores(response.data); // Guardar todas las tiendas para referencia
    } catch (err: any) {
      console.error('Error cargando sucursales:', err);
      setError('Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: CityState) => {
    setSelectedLocation(location);
    setView('stores');
    setFilterQuery(''); // Limpiar filtro al cambiar de ubicación
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
    
    // Cerrar el panel
    onClose();
    
    // Recargar la página para aplicar el contexto
    router.reload();
  };

  const handleChangeStore = () => {
    setView('location');
    setSelectedStore(null);
    setSelectedLocation(null);
    setStores([]);
    setFilterQuery('');
    loadLocations();
  };

  const handleBack = () => {
    setView('location');
    setSelectedLocation(null);
    setStores([]);
    setFilterQuery('');
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
            {(view === 'stores' || view === 'location') && (
              <button
                onClick={view === 'stores' ? handleBack : handleChangeStore}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Volver"
              >
                <ArrowBackIcon className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <StoreIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">
              {view === 'store-details' 
                ? 'Mi Tienda Seleccionada' 
                : view === 'location' 
                ? 'Seleccionar Ubicación' 
                : 'Seleccionar Tienda'}
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">Cargando...</p>
            </div>
          ) : view === 'store-details' && selectedStore ? (
            /* Vista de detalles de tienda */
            <div className="px-6 py-4 space-y-4">
              {/* Información de la tienda */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  {selectedStore.logo_url && (
                    <img 
                      src={selectedStore.logo_url} 
                      alt={selectedStore.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {selectedStore.name}
                    </h3>
                    {selectedStore.description && (
                      <p className="text-sm text-gray-600">{selectedStore.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedStore.address && (
                    <div className="flex items-start gap-2">
                      <LocationOnIcon className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 mb-0.5">Dirección</p>
                        <p className="text-sm text-gray-600">{selectedStore.address}</p>
                        {selectedStore.city && selectedStore.state && (
                          <p className="text-xs text-gray-500 mt-1">
                            {selectedStore.city}, {selectedStore.state}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedStore.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-sm">📞</span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Teléfono</p>
                        <p className="text-sm text-gray-600">{selectedStore.phone}</p>
                      </div>
                    </div>
                  )}

                  {selectedStore.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-sm">✉️</span>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Email</p>
                        <p className="text-sm text-gray-600">{selectedStore.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa de geolocalización */}
              {selectedStore.latitude && selectedStore.longitude && (
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">Ubicación</h4>
                  </div>
                  <div className="h-48 w-full">
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
              <div className="space-y-2">
                {contextType !== 'sucursal' && (
                  <button
                    onClick={handleChangeStore}
                    className="w-full px-4 py-2.5 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                  >
                    Cambiar Tienda
                  </button>
                )}
                {contextType === 'sucursal' && (
                  <div className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-center font-medium text-sm">
                    No se puede cambiar la sucursal en este contexto
                  </div>
                )}
                <button
                  onClick={() => {
                    // Limpiar selección de tienda
                    localStorage.removeItem(STORAGE_KEY);
                    // Navegar al contexto global
                    router.push('/');
                    // Cerrar el panel
                    onClose();
                    // Recargar la página para aplicar cambios
                    router.reload();
                  }}
                  className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Comprar sin tienda
                </button>
              </div>
            </div>
          ) : view === 'location' ? (
            /* Vista de selección de ubicación */
            <div className="px-6 py-4 space-y-3">
              {locations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">No hay ubicaciones disponibles</p>
                </div>
              ) : (
                locations.map((location, index) => (
                  <button
                    key={`${location.city}-${location.state}-${index}`}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full text-left p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LocationOnIcon className="w-5 h-5 text-gray-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {location.city}, {location.state}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {location.count} {location.count === 1 ? 'sucursal disponible' : 'sucursales disponibles'}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-lg">→</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Vista de selección de tienda */
            <div className="px-6 py-4 space-y-3">
              {selectedLocation && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <LocationOnIcon className="w-4 h-4" />
                    {selectedLocation.city}, {selectedLocation.state}
                  </p>
                </div>
              )}

              {/* Input de filtro */}
              <div className="relative mb-3">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Buscar tienda..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-sm"
                />
              </div>

              {filteredStores.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-sm">
                    {filterQuery ? 'No se encontraron tiendas' : 'No hay sucursales disponibles en esta ubicación'}
                  </p>
                </div>
              ) : (
                filteredStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleStoreSelect(store)}
                    className="w-full text-left p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <StoreIcon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm mb-1">
                            {store.name}
                          </h3>
                          {store.address && (
                            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
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
                      <CheckCircleIcon className="w-4 h-4 text-gray-300 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

