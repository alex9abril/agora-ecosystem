import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Repartidor {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_description?: string;
  license_plate?: string;
  is_available: boolean;
  is_verified: boolean;
  is_active: boolean;
  is_green_repartidor: boolean;
  total_deliveries: number;
  rating_average: number | string | null;
  total_reviews: number;
  longitude?: number;
  latitude?: number;
  last_location_update?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

interface RepartidoresResponse {
  data: Repartidor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Statistics {
  total: number;
  online: number;
  offline: number;
  inactive: number;
  verified: number;
  green: number;
}

export default function RepartidoresPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [onlineRepartidores, setOnlineRepartidores] = useState<Repartidor[]>([]);
  const [otherRepartidores, setOtherRepartidores] = useState<Repartidor[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedRepartidor, setSelectedRepartidor] = useState<Repartidor | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    isActive: undefined as boolean | undefined,
    isAvailable: undefined as boolean | undefined,
    isVerified: undefined as boolean | undefined,
    isGreen: undefined as boolean | undefined,
    vehicleType: '',
    search: '',
  });

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await apiRequest<Statistics>('/repartidores/statistics', {
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

  // Cargar repartidores en línea
  useEffect(() => {
    const loadOnlineRepartidores = async () => {
      if (!token) return;

      try {
        const params = new URLSearchParams();
        params.append('isAvailable', 'true');
        params.append('isActive', 'true');
        params.append('limit', '100'); // Mostrar todos los en línea

        const response = await apiRequest<RepartidoresResponse>(
          `/repartidores?${params.toString()}`,
          { method: 'GET' }
        );
        setOnlineRepartidores(response.data || []);
      } catch (error) {
        console.error('Error cargando repartidores en línea:', error);
        setOnlineRepartidores([]);
      }
    };

    loadOnlineRepartidores();
  }, [token]);

  // Cargar otros repartidores (offline, inactivos, etc.)
  useEffect(() => {
    const loadOtherRepartidores = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        
        // Filtrar para excluir los que están en línea
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.isAvailable !== undefined) {
          params.append('isAvailable', filters.isAvailable.toString());
        }
        if (filters.isVerified !== undefined) {
          params.append('isVerified', filters.isVerified.toString());
        }
        if (filters.isGreen !== undefined) {
          params.append('isGreen', filters.isGreen.toString());
        }
        if (filters.vehicleType) {
          params.append('vehicleType', filters.vehicleType);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<RepartidoresResponse>(
          `/repartidores?${params.toString()}`,
          { method: 'GET' }
        );
        
        // Filtrar para excluir los que están en línea (is_available = true AND is_active = true)
        const filtered = (response.data || []).filter(
          (r) => !(r.is_available && r.is_active)
        );
        setOtherRepartidores(filtered);
      } catch (error) {
        console.error('Error cargando repartidores:', error);
        setOtherRepartidores([]);
      } finally {
        setLoading(false);
      }
    };

    loadOtherRepartidores();
  }, [token, filters]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setUpdating(id);
    try {
      await apiRequest(`/repartidores/${id}/status`, {
        method: 'PATCH',
        data: { isActive: !currentStatus },
      });
      
      // Recargar ambas listas
      setOnlineRepartidores((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r))
      );
      setOtherRepartidores((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r))
      );
      
      // Recargar estadísticas
      const stats = await apiRequest<Statistics>('/repartidores/statistics', {
        method: 'GET',
      });
      setStatistics(stats);
    } catch (error) {
      console.error('Error actualizando estado:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      bicycle: 'Bicicleta',
      motorcycle: 'Motocicleta',
      car: 'Automóvil',
      scooter: 'Scooter',
      electric: 'Eléctrico',
    };
    return labels[type] || type;
  };

  return (
    <>
      <Head>
        <title>Repartidores - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-sm font-normal text-gray-900">Repartidores</h1>
            <p className="mt-1 text-xs text-gray-500">
              Gestiona los repartidores de la plataforma
            </p>
          </div>

          {/* Estadísticas */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-normal text-gray-900 mt-1">{statistics.total}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">En Línea</p>
                <p className="text-lg font-normal text-green-600 mt-1">{statistics.online}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">Offline</p>
                <p className="text-lg font-normal text-gray-600 mt-1">{statistics.offline}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">Inactivos</p>
                <p className="text-lg font-normal text-red-600 mt-1">{statistics.inactive}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">Verificados</p>
                <p className="text-lg font-normal text-gray-900 mt-1">{statistics.verified}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">Ecológicos</p>
                <p className="text-lg font-normal text-green-600 mt-1">{statistics.green}</p>
              </div>
            </div>
          )}

          {/* Tabla 1: Repartidores en Línea */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-normal text-gray-900">
                Repartidores en Línea ({onlineRepartidores.length})
              </h2>
            </div>
            {onlineRepartidores.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-600">No hay repartidores en línea</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Repartidor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Vehículo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Entregas
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Calificación
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {onlineRepartidores.map((repartidor) => (
                      <tr
                        key={repartidor.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/delivery-drivers/${repartidor.id}`)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-normal text-gray-900">
                                {repartidor.user?.first_name} {repartidor.user?.last_name}
                              </p>
                              {repartidor.is_verified && (
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  title="Verificado"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            {repartidor.user?.phone && (
                              <p className="text-xs text-gray-500">{repartidor.user.phone}</p>
                            )}
                            {repartidor.rating_average != null && repartidor.total_reviews > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < Math.round(Number(repartidor.rating_average))
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                                <span className="text-xs text-gray-600 ml-0.5">
                                  {Number(repartidor.rating_average).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-xs text-gray-900">
                              {getVehicleTypeLabel(repartidor.vehicle_type)}
                            </p>
                            {repartidor.vehicle_description && (
                              <p className="text-xs text-gray-500">{repartidor.vehicle_description}</p>
                            )}
                            {repartidor.is_green_repartidor && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 mt-1">
                                🌱 Ecológico
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">
                            {repartidor.total_deliveries || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600">
                              {repartidor.rating_average != null 
                                ? Number(repartidor.rating_average).toFixed(1) 
                                : '0.0'}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({repartidor.total_reviews || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {repartidor.latitude && repartidor.longitude ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepartidor(repartidor);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              title="Ver ubicación"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                repartidor.is_available && repartidor.is_active
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            ></div>
                            <span className="text-xs text-gray-600">
                              {repartidor.is_available && repartidor.is_active ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabla 2: Otros Repartidores con Filtros */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-normal text-gray-900">
                  Otros Repartidores ({otherRepartidores.length})
                </h2>
              </div>
              
              {/* Filtros */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>

                <select
                  value={filters.isAvailable === undefined ? '' : filters.isAvailable.toString()}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isAvailable: e.target.value === '' ? undefined : e.target.value === 'true',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Disponibilidad</option>
                  <option value="true">Disponibles</option>
                  <option value="false">No disponibles</option>
                </select>

                <select
                  value={filters.isVerified === undefined ? '' : filters.isVerified.toString()}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isVerified: e.target.value === '' ? undefined : e.target.value === 'true',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Verificación</option>
                  <option value="true">Verificados</option>
                  <option value="false">No verificados</option>
                </select>

                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-xs text-gray-600">Cargando repartidores...</p>
              </div>
            ) : otherRepartidores.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-600">No se encontraron repartidores</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Repartidor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Vehículo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Entregas
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Calificación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {otherRepartidores.map((repartidor) => (
                      <tr
                        key={repartidor.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/delivery-drivers/${repartidor.id}`)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-normal text-gray-900">
                                {repartidor.user?.first_name} {repartidor.user?.last_name}
                              </p>
                              {repartidor.is_verified && (
                                <svg
                                  className="w-4 h-4 text-blue-600"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  title="Verificado"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            {repartidor.user?.phone && (
                              <p className="text-xs text-gray-500">{repartidor.user.phone}</p>
                            )}
                            {repartidor.rating_average != null && repartidor.total_reviews > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < Math.round(Number(repartidor.rating_average))
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                                <span className="text-xs text-gray-600 ml-0.5">
                                  {Number(repartidor.rating_average).toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-xs text-gray-900">
                              {getVehicleTypeLabel(repartidor.vehicle_type)}
                            </p>
                            {repartidor.vehicle_description && (
                              <p className="text-xs text-gray-500">{repartidor.vehicle_description}</p>
                            )}
                            {repartidor.is_green_repartidor && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 mt-1">
                                🌱 Ecológico
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">
                            {repartidor.total_deliveries || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600">
                              {repartidor.rating_average != null 
                                ? Number(repartidor.rating_average).toFixed(1) 
                                : '0.0'}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({repartidor.total_reviews || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                repartidor.is_available && repartidor.is_active
                                  ? 'bg-green-500'
                                  : 'bg-gray-400'
                              }`}
                            ></div>
                            <span className="text-xs text-gray-600">
                              {repartidor.is_available && repartidor.is_active ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {repartidor.latitude && repartidor.longitude ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepartidor(repartidor);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                              title="Ver ubicación"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(repartidor.id, repartidor.is_active);
                            }}
                            disabled={updating === repartidor.id}
                            className={`text-xs px-3 py-1 rounded-md transition-colors ${
                              repartidor.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updating === repartidor.id
                              ? '...'
                              : repartidor.is_active
                              ? 'Desactivar'
                              : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {!loading && otherRepartidores.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Página {filters.page} de {Math.ceil((statistics?.total || 0) / filters.limit)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={
                      filters.page >= Math.ceil((statistics?.total || 0) / filters.limit)
                    }
                    className="px-3 py-1 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Ubicación */}
        {selectedRepartidor && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedRepartidor(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-900">
                  Ubicación de {selectedRepartidor.user?.first_name} {selectedRepartidor.user?.last_name}
                </h3>
                <button
                  onClick={() => setSelectedRepartidor(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 py-4">
                {selectedRepartidor.latitude && selectedRepartidor.longitude ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Coordenadas</p>
                      <p className="text-xs text-gray-900 font-mono">
                        Lat: {Number(selectedRepartidor.latitude).toFixed(6)}, Lng:{' '}
                        {Number(selectedRepartidor.longitude).toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedRepartidor.latitude},${selectedRepartidor.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Abrir en Google Maps
                      </a>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <iframe
                        width="100%"
                        height="250"
                        frameBorder="0"
                        style={{ border: 0, borderRadius: '4px' }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedRepartidor.longitude) - 0.002},${Number(selectedRepartidor.latitude) - 0.002},${Number(selectedRepartidor.longitude) + 0.002},${Number(selectedRepartidor.latitude) + 0.002}&layer=mapnik&marker=${selectedRepartidor.latitude},${selectedRepartidor.longitude}`}
                        allowFullScreen
                      ></iframe>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${selectedRepartidor.latitude}&mlon=${selectedRepartidor.longitude}&zoom=18`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          Ver mapa más grande
                        </a>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No hay información de ubicación disponible</p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setSelectedRepartidor(null)}
                  className="px-4 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

