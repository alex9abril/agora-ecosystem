import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

declare global {
  interface Window {
    google: any;
    initMap: () => void;
    __googleMapsLoaded?: boolean;
    __googleMapsLoading?: Promise<void>;
  }
}

interface ServiceRegion {
  id: string;
  name: string;
  description?: string;
  city: string;
  state: string;
  country: string;
  center_longitude: number;
  center_latitude: number;
  is_active: boolean;
  is_default: boolean;
  max_delivery_radius_meters: number;
  min_order_amount: number | string; // Puede venir como string desde PostgreSQL
  coverage_area_geojson?: string;
  created_at: string;
  updated_at: string;
}

interface ServiceRegionsResponse {
  data: ServiceRegion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Statistics {
  total: number;
  active: number;
  inactive: number;
  default_count: number;
}

export default function ZonesPage() {
  const { token } = useAuth();
  const [regions, setRegions] = useState<ServiceRegion[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<ServiceRegion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  
  // Estados para el modal de tiendas
  const [isBusinessesModalOpen, setIsBusinessesModalOpen] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const businessesMapRef = useRef<HTMLDivElement>(null);
  const businessesMapInstanceRef = useRef<any>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    isActive: undefined as boolean | undefined,
    isDefault: undefined as boolean | undefined,
    search: '',
  });

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await apiRequest<Statistics>('/service-regions/statistics', {
          method: 'GET',
        });
        setStatistics(response);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    };

    if (token) {
      loadStatistics();
    }
  }, [token]);

  // Cargar zonas
  useEffect(() => {
    const loadRegions = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.isDefault !== undefined) {
          params.append('isDefault', filters.isDefault.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<ServiceRegionsResponse>(
          `/service-regions?${params.toString()}`,
          { method: 'GET' }
        );
        setRegions(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error cargando zonas:', error);
        setRegions([]);
      } finally {
        setLoading(false);
      }
    };

    loadRegions();
  }, [token, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const openMapModal = (region: ServiceRegion) => {
    setSelectedRegion(region);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRegion(null);
    // Limpiar el mapa
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }
    // Limpiar el contenido del div del mapa
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
    }
  };

  const openBusinessesModal = async (region: ServiceRegion) => {
    setSelectedRegion(region);
    setIsBusinessesModalOpen(true);
    setLoadingBusinesses(true);
    
    try {
      const response = await apiRequest<any[]>(`/service-regions/${region.id}/businesses`, {
        method: 'GET',
      });
      setBusinesses(response);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
      setBusinesses([]);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const closeBusinessesModal = () => {
    setIsBusinessesModalOpen(false);
    setSelectedRegion(null);
    setBusinesses([]);
    if (businessesMapInstanceRef.current) {
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(businessesMapInstanceRef.current);
      }
      businessesMapInstanceRef.current = null;
    }
    if (businessesMapRef.current) {
      businessesMapRef.current.innerHTML = '';
    }
  };

  // Cargar Google Maps API
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Verificar API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                   (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    
    if (!apiKey) {
      console.error('[Zones] Google Maps API key no configurada');
      return;
    }

    // Verificar si ya está cargado
    if (window.google && window.google.maps) {
      window.__googleMapsLoaded = true;
      setIsMapLoaded(true);
      return;
    }

    // Si ya hay una carga en progreso, esperar a que termine
    if (window.__googleMapsLoading) {
      window.__googleMapsLoading
        .then(() => {
          if (window.google && window.google.maps) {
            window.__googleMapsLoaded = true;
            setIsMapLoaded(true);
          }
        })
        .catch(() => {
          console.error('[Zones] Error esperando carga de Google Maps');
        });
      return;
    }

    // Verificar si el script ya existe
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Si el script existe pero Google Maps no está cargado, esperar
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkInterval);
          window.__googleMapsLoaded = true;
          setIsMapLoaded(true);
        }
      }, 100);

      // Timeout después de 10 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google || !window.google.maps) {
          console.error('[Zones] Timeout esperando Google Maps');
        }
      }, 10000);
      return;
    }

    // Crear promesa para cargar Google Maps (singleton)
    const loadPromise = new Promise<void>((resolve, reject) => {
    // Crear y cargar el script
    const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✅ Google Maps API cargada');
        window.__googleMapsLoaded = true;
        resolve();
    };
    script.onerror = () => {
        window.__googleMapsLoading = undefined;
      console.error('❌ Error cargando Google Maps API');
        reject(new Error('Error al cargar Google Maps. Verifica tu API key.'));
    };
    document.head.appendChild(script);
    });

    // Guardar la promesa para que otros componentes puedan esperarla
    window.__googleMapsLoading = loadPromise;

    loadPromise
      .then(() => {
        setIsMapLoaded(true);
      })
      .catch((err) => {
        console.error('[Zones] Error cargando Google Maps:', err);
        window.__googleMapsLoading = undefined;
      });
  }, []);

  // Inicializar el mapa cuando el modal se abre y el mapa está cargado
  useEffect(() => {
    if (!isModalOpen || !selectedRegion || !isMapLoaded) {
      return;
    }

    // Verificar nuevamente que Google Maps esté disponible
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error('[Zones] Google Maps API no está disponible');
      return;
    }

    // Esperar a que el modal se renderice completamente y el ref esté disponible
    const initializeMap = () => {
      if (!mapRef.current) {
        console.log('[Zones] mapRef no disponible aún, reintentando...');
        setTimeout(initializeMap, 200);
        return;
      }

      // Verificar que el contenedor tenga dimensiones (importante para modales)
      const hasDimensions = mapRef.current.offsetHeight > 0 && mapRef.current.offsetWidth > 0;
      if (!hasDimensions) {
        console.log('[Zones] Contenedor sin dimensiones aún, reintentando...', {
          offsetHeight: mapRef.current.offsetHeight,
          offsetWidth: mapRef.current.offsetWidth,
        });
        setTimeout(initializeMap, 200);
      return;
    }

    const region = selectedRegion;
    const center = {
      lat: Number(region.center_latitude),
      lng: Number(region.center_longitude),
    };

    console.log('🗺️ Inicializando mapa para:', region.name, center);

      // Limpiar mapa anterior si existe
      if (mapInstanceRef.current) {
        // Limpiar listeners y referencias
        if (window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        }
        mapInstanceRef.current = null;
      }

      // Limpiar el contenido del div
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }

    // Crear el mapa
    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: 14,
      mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
    });

    mapInstanceRef.current = map;

      // Forzar resize del mapa después de un breve delay para asegurar que se renderice correctamente
      setTimeout(() => {
        if (map && window.google?.maps?.event) {
          window.google.maps.event.trigger(map, 'resize');
          console.log('[Zones] Resize del mapa disparado');
        }
      }, 100);

    // Parsear GeoJSON del polígono
    if (region.coverage_area_geojson) {
      try {
        let geojson = JSON.parse(region.coverage_area_geojson);
        console.log('📍 GeoJSON parseado:', geojson);
        console.log('📍 Tipo de GeoJSON:', geojson.type);

        // Google Maps requiere Feature o FeatureCollection
        // Si es un Polygon o MultiPolygon directo, envolverlo en un Feature
        if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
          console.log('📍 Envolviendo Polygon en Feature');
          geojson = {
            type: 'Feature',
            geometry: geojson,
            properties: {}
          };
        } else if (geojson.type === 'FeatureCollection' && geojson.features) {
          console.log('📍 Es FeatureCollection, OK');
        } else if (geojson.type === 'Feature') {
          console.log('📍 Es Feature, OK');
        } else {
          console.warn('📍 Formato desconocido, intentando envolver:', geojson.type);
          geojson = {
            type: 'Feature',
            geometry: geojson,
            properties: {}
          };
        }

        console.log('📍 GeoJSON final para Google Maps:', geojson);

        // Crear polígono desde GeoJSON usando Data layer
        if (window.google.maps.Data) {
          const dataLayer = new window.google.maps.Data();
          dataLayer.setMap(map);
          
          try {
            dataLayer.addGeoJson(geojson);
            console.log('✅ Polígono agregado al mapa correctamente');

            // Estilo del polígono
            dataLayer.setStyle({
              fillColor: '#4F46E5',
              fillOpacity: 0.2,
              strokeColor: '#4F46E5',
              strokeWeight: 2,
              strokeOpacity: 0.8,
            });

            // Ajustar el zoom para mostrar todo el polígono
            const bounds = new window.google.maps.LatLngBounds();
            dataLayer.forEach(function (feature: any) {
              const geometry = feature.getGeometry();
              if (geometry) {
                geometry.forEachLatLng(function (latLng: any) {
                  bounds.extend(latLng);
                });
              }
            });
            if (!bounds.isEmpty()) {
              map.fitBounds(bounds);
              console.log('✅ Zoom ajustado al polígono');
            } else {
              console.warn('⚠️ Bounds vacío, usando zoom por defecto');
            }
          } catch (addError) {
            console.error('❌ Error agregando GeoJSON al mapa:', addError);
            throw addError; // Re-lanzar para que caiga en el catch general
          }
        } else {
          throw new Error('Google Maps Data layer no disponible');
        }
      } catch (error) {
        console.error('❌ Error parseando/agregando GeoJSON:', error);
        console.error('❌ GeoJSON original:', region.coverage_area_geojson);

        // Si falla, mostrar un círculo aproximado basado en el radio
        const circle = new window.google.maps.Circle({
          strokeColor: '#EF4444',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#EF4444',
          fillOpacity: 0.2,
          map: map,
          center: center,
          radius: Number(region.max_delivery_radius_meters),
        });
        console.log('⭕ Mostrando círculo de fallback (radio):', region.max_delivery_radius_meters);
      }
    } else {
      // Si no hay GeoJSON, mostrar un círculo basado en el radio
      const circle = new window.google.maps.Circle({
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4F46E5',
        fillOpacity: 0.2,
        map: map,
        center: center,
        radius: Number(region.max_delivery_radius_meters),
      });
      console.log('⭕ Mostrando círculo de radio:', region.max_delivery_radius_meters);
    }

    // Marcador en el centro
    new window.google.maps.Marker({
      position: center,
      map: map,
      title: region.name,
    });

    console.log('✅ Mapa inicializado correctamente');
    };

    // Esperar un momento para que el modal se renderice completamente
    setTimeout(initializeMap, 300);
  }, [isModalOpen, selectedRegion, isMapLoaded]);

  // Inicializar el mapa de tiendas cuando el modal se abre
  useEffect(() => {
    if (!isBusinessesModalOpen || !selectedRegion || !isMapLoaded || loadingBusinesses || businesses.length === 0) {
      return;
    }

    // Verificar nuevamente que Google Maps esté disponible
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.error('[Zones] Google Maps API no está disponible');
      return;
    }

    // Esperar a que el modal se renderice completamente y el ref esté disponible
    const initializeBusinessesMap = () => {
      if (!businessesMapRef.current) {
        console.log('[Zones] businessesMapRef no disponible aún, reintentando...');
        setTimeout(initializeBusinessesMap, 200);
        return;
      }

      // Verificar que el contenedor tenga dimensiones
      const hasDimensions = businessesMapRef.current.offsetHeight > 0 && businessesMapRef.current.offsetWidth > 0;
      if (!hasDimensions) {
        console.log('[Zones] Contenedor sin dimensiones aún, reintentando...');
        setTimeout(initializeBusinessesMap, 200);
        return;
      }

      // Limpiar mapa anterior si existe
      if (businessesMapInstanceRef.current) {
        if (window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(businessesMapInstanceRef.current);
        }
        businessesMapInstanceRef.current = null;
      }

      // Limpiar el contenido del div
      if (businessesMapRef.current) {
        businessesMapRef.current.innerHTML = '';
      }

      // Calcular el centro basado en todas las tiendas
      const bounds = new window.google.maps.LatLngBounds();
      businesses.forEach((business) => {
        if (business.latitude && business.longitude) {
          bounds.extend({
            lat: Number(business.latitude),
            lng: Number(business.longitude),
          });
        }
      });

      // Si no hay tiendas con coordenadas, usar el centro de la zona
      let center;
      if (bounds.isEmpty()) {
        center = {
          lat: Number(selectedRegion.center_latitude),
          lng: Number(selectedRegion.center_longitude),
        };
      } else {
        center = bounds.getCenter();
      }

      // Crear el mapa
      const map = new window.google.maps.Map(businessesMapRef.current, {
        center: center,
        zoom: bounds.isEmpty() ? 14 : undefined,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      businessesMapInstanceRef.current = map;

      // Ajustar el zoom para mostrar todas las tiendas
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        // Ajustar el zoom máximo para evitar que se vea demasiado alejado
        const listener = window.google.maps.event.addListener(map, 'bounds_changed', () => {
          if (map.getZoom() && map.getZoom()! > 15) {
            map.setZoom(15);
          }
          window.google.maps.event.removeListener(listener);
        });
      }

      // Agregar marcadores para cada tienda
      businesses.forEach((business) => {
        if (business.latitude && business.longitude) {
          const marker = new window.google.maps.Marker({
            position: {
              lat: Number(business.latitude),
              lng: Number(business.longitude),
            },
            map: map,
            title: business.name,
            label: {
              text: business.name.charAt(0).toUpperCase(),
              color: '#ffffff',
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: business.is_active ? '#10B981' : '#EF4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });

          // Info window con información de la tienda
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${business.name}</h3>
                ${business.description ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${business.description}</p>` : ''}
                <p style="margin: 0 0 4px 0; font-size: 12px;"><strong>Categoría:</strong> ${business.category || 'N/A'}</p>
                <p style="margin: 0; font-size: 12px;">
                  <strong>Estado:</strong> 
                  <span style="color: ${business.is_active ? '#10B981' : '#EF4444'};">
                    ${business.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }
      });

      // Forzar resize del mapa
      setTimeout(() => {
        if (map && window.google?.maps?.event) {
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 100);

      console.log('✅ Mapa de tiendas inicializado correctamente');
    };

    // Esperar un momento para que el modal se renderice completamente
    setTimeout(initializeBusinessesMap, 300);
  }, [isBusinessesModalOpen, selectedRegion, isMapLoaded, loadingBusinesses, businesses]);

  const totalPages = pagination?.totalPages || 0;

  return (
    <AdminLayout>
      <Head>
        <title>Zonas de Servicio - LOCALIA Admin</title>
      </Head>

      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-lg font-normal text-gray-900 mb-2">Zonas de Servicio</h1>
          <p className="text-xs text-gray-600">
            Gestiona las zonas geográficas donde el servicio está disponible
          </p>
        </div>

        {/* Estadísticas */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Total de Zonas</p>
              <p className="text-lg font-normal text-gray-900">{statistics.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Activas</p>
              <p className="text-lg font-normal text-green-600">{statistics.active}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Inactivas</p>
              <p className="text-lg font-normal text-red-600">{statistics.inactive}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-600 mb-1">Por Defecto</p>
              <p className="text-lg font-normal text-blue-600">{statistics.default_count}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar zonas..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 max-w-xs"
          />
          <select
            value={filters.isActive === undefined ? '' : filters.isActive.toString()}
            onChange={(e) =>
              handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Estado</option>
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
          <select
            value={filters.isDefault === undefined ? '' : filters.isDefault.toString()}
            onChange={(e) =>
              handleFilterChange('isDefault', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Por Defecto</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </div>

        {/* Tabla de Zonas */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Zona
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Radio Máximo
                </th>
                <th className="px-4 py-3 text-left text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-xs font-normal text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-gray-500">
                    Cargando zonas...
                  </td>
                </tr>
              ) : regions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-xs text-gray-500">
                    No se encontraron zonas.
                  </td>
                </tr>
              ) : (
                regions.map((region) => (
                  <tr key={region.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-xs font-normal text-gray-900">{region.name}</p>
                        {region.description && (
                          <p className="text-xs text-gray-500 max-w-xs truncate">
                            {region.description}
                          </p>
                        )}
                        {region.is_default && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mt-1">
                            Por Defecto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-900">
                        {region.city}, {region.state}
                      </p>
                      <p className="text-xs text-gray-500">{region.country}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-900">
                        {(region.max_delivery_radius_meters / 1000).toFixed(1)} km
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          region.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {region.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-xs font-normal">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openMapModal(region)}
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                          title="Ver zona en mapa"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Ver Mapa
                        </button>
                        <button
                          onClick={() => openBusinessesModal(region)}
                          className="text-green-600 hover:text-green-800 inline-flex items-center gap-1"
                          title="Ver tiendas en mapa"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          Ver Tiendas
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={filters.page === 1}
              className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-700">
              Página {filters.page} de {totalPages}
            </span>
            <button
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={filters.page === totalPages}
              className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modal con Google Maps */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-normal leading-6 text-gray-900 mb-4"
                  >
                    {selectedRegion?.name} - Mapa de Cobertura
                  </Dialog.Title>

                  {selectedRegion && (
                    <div className="mt-4">
                      <div className="mb-4 text-xs text-gray-600">
                        <p>
                          <strong>Ubicación:</strong> {selectedRegion.city}, {selectedRegion.state}, {selectedRegion.country}
                        </p>
                        <p>
                          <strong>Radio máximo:</strong> {(selectedRegion.max_delivery_radius_meters / 1000).toFixed(1)} km
                        </p>
                        <p>
                          <strong>Monto mínimo:</strong> ${Number(selectedRegion.min_order_amount).toFixed(2)}
                        </p>
                      </div>

                      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <p className="text-xs text-gray-500">
                            Google Maps API Key no configurada. Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env
                          </p>
                        </div>
                      ) : !isMapLoaded ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-xs text-gray-500">Cargando mapa...</p>
                          </div>
                        </div>
                      ) : (
                        <div
                          ref={mapRef}
                          className="w-full h-[600px] rounded-lg border border-gray-200"
                          style={{ minHeight: '600px' }}
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={closeModal}
                    >
                      Cerrar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modal con Mapa de Tiendas */}
      <Transition appear show={isBusinessesModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeBusinessesModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-normal leading-6 text-gray-900 mb-4"
                  >
                    {selectedRegion?.name} - Tiendas Registradas
                  </Dialog.Title>

                  {selectedRegion && (
                    <div className="mt-4">
                      <div className="mb-4 text-xs text-gray-600">
                        <p>
                          <strong>Total de tiendas:</strong> {businesses.length}
                        </p>
                        <p>
                          <strong>Ubicación:</strong> {selectedRegion.city}, {selectedRegion.state}, {selectedRegion.country}
                        </p>
                      </div>

                      {loadingBusinesses ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-xs text-gray-500">Cargando tiendas...</p>
                          </div>
                        </div>
                      ) : !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <p className="text-xs text-gray-500">
                            Google Maps API Key no configurada. Agrega NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env
                          </p>
                        </div>
                      ) : !isMapLoaded ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-xs text-gray-500">Cargando mapa...</p>
                          </div>
                        </div>
                      ) : businesses.length === 0 ? (
                        <div className="w-full h-[600px] rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                          <p className="text-xs text-gray-500">No hay tiendas registradas en esta zona</p>
                        </div>
                      ) : (
                        <div
                          ref={businessesMapRef}
                          className="w-full h-[600px] rounded-lg border border-gray-200"
                          style={{ minHeight: '600px' }}
                        />
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-normal rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                      onClick={closeBusinessesModal}
                    >
                      Cerrar
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </AdminLayout>
  );
}

