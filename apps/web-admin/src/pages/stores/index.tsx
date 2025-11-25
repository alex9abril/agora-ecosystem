import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Business {
  id: string;
  name: string;
  legal_name?: string;
  description?: string;
  category: string;
  is_active: boolean;
  is_verified: boolean;
  rating_average: number | string | null; // Puede venir como string desde PostgreSQL
  total_reviews: number;
  total_orders: number;
  phone?: string;
  email?: string;
  created_at: string;
  longitude?: number;
  latitude?: number;
  owner?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface BusinessesResponse {
  data: Business[];
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
  categories: Array<{ name: string; count: number }>;
}

export default function StoresPage() {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    isActive: undefined as boolean | undefined,
    category: '',
    search: '',
  });

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await apiRequest<Statistics>('/businesses/statistics', {
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

  // Cargar negocios
  useEffect(() => {
    const loadBusinesses = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.category) {
          params.append('category', filters.category);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<BusinessesResponse>(
          `/businesses?${params.toString()}`,
          { method: 'GET' }
        );

        setBusinesses(response.data || []);
      } catch (error) {
        console.error('Error cargando negocios:', error);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, [token, filters]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!token) return;

    setUpdating(id);
    try {
      const response = await apiRequest<Business>(`/businesses/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      // Actualizar el negocio en la lista
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: response.is_active } : b))
      );

      // Actualizar estadísticas
      if (statistics) {
        setStatistics({
          ...statistics,
          active: currentStatus ? statistics.active - 1 : statistics.active + 1,
          inactive: currentStatus ? statistics.inactive + 1 : statistics.inactive - 1,
        });
      }
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado del negocio');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <Head>
        <title>Tiendas - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 mb-2">Gestión de Tiendas</h1>
            <p className="text-xs text-gray-600">
              Administra y monitorea todos los negocios registrados en la plataforma
            </p>
          </div>

          {/* Estadísticas */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-600 mb-1">Total Tiendas</p>
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
                <p className="text-xs text-gray-600 mb-1">Categorías</p>
                <p className="text-lg font-normal text-gray-900">
                  {statistics.categories.length}
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-xs text-gray-700 mb-1">Buscar</label>
                <input
                  type="text"
                  placeholder="Nombre del negocio..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value, page: 1 })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs text-gray-700 mb-1">Estado</label>
                <select
                  value={
                    filters.isActive === undefined
                      ? 'all'
                      : filters.isActive
                      ? 'active'
                      : 'inactive'
                  }
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      isActive:
                        e.target.value === 'all'
                          ? undefined
                          : e.target.value === 'active',
                      page: 1,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs text-gray-700 mb-1">Categoría</label>
                <input
                  type="text"
                  placeholder="Ej: Restaurante"
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value, page: 1 })
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Limpiar filtros */}
              <div className="flex items-end">
                <button
                  onClick={() =>
                    setFilters({
                      page: 1,
                      limit: 20,
                      isActive: undefined,
                      category: '',
                      search: '',
                    })
                  }
                  className="w-full px-4 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de negocios */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-xs text-gray-600">Cargando tiendas...</p>
              </div>
            ) : businesses.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-600">No se encontraron tiendas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Negocio
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Propietario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-normal text-gray-700 uppercase tracking-wider">
                        Pedidos
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
                    {businesses.map((business) => (
                      <tr key={business.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-xs font-normal text-gray-900">
                              {business.name}
                            </p>
                            {business.legal_name && (
                              <p className="text-xs text-gray-500">
                                {business.legal_name}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">{business.category}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-xs text-gray-900">
                              {business.owner?.first_name} {business.owner?.last_name}
                            </p>
                            {business.owner?.email && (
                              <p className="text-xs text-gray-500">
                                {business.owner.email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-600">
                            {business.total_orders || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-xs text-gray-600">
                              {business.rating_average != null 
                                ? Number(business.rating_average).toFixed(1) 
                                : '0.0'}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({business.total_reviews || 0})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              business.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {business.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {business.latitude && business.longitude ? (
                            <button
                              onClick={() => setSelectedBusiness(business)}
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
                            onClick={() =>
                              handleToggleStatus(business.id, business.is_active)
                            }
                            disabled={updating === business.id}
                            className={`text-xs px-3 py-1 rounded-md transition-colors ${
                              business.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {updating === business.id
                              ? '...'
                              : business.is_active
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
            {!loading && businesses.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  Página {filters.page} de{' '}
                  {Math.ceil((statistics?.total || 0) / filters.limit)}
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
        {selectedBusiness && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setSelectedBusiness(null)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-normal text-gray-900">
                  Ubicación de {selectedBusiness.name}
                </h3>
                <button
                  onClick={() => setSelectedBusiness(null)}
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
                {selectedBusiness.latitude && selectedBusiness.longitude ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Coordenadas</p>
                      <p className="text-xs text-gray-900 font-mono">
                        Lat: {Number(selectedBusiness.latitude).toFixed(6)}, Lng:{' '}
                        {Number(selectedBusiness.longitude).toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <a
                        href={`https://www.google.com/maps?q=${selectedBusiness.latitude},${selectedBusiness.longitude}`}
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
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(selectedBusiness.longitude) - 0.002},${Number(selectedBusiness.latitude) - 0.002},${Number(selectedBusiness.longitude) + 0.002},${Number(selectedBusiness.latitude) + 0.002}&layer=mapnik&marker=${selectedBusiness.latitude},${selectedBusiness.longitude}`}
                        allowFullScreen
                      ></iframe>
                      <p className="text-xs text-gray-400 mt-1 text-center">
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${selectedBusiness.latitude}&mlon=${selectedBusiness.longitude}&zoom=18`}
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
                  onClick={() => setSelectedBusiness(null)}
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

