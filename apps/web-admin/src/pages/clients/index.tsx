import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_verified: boolean;
  profile_image_url?: string;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  last_sign_in_at?: string;
  total_orders: number;
  total_spent: number;
  avg_rating_given: number;
  total_reviews_given: number;
}

interface ClientsResponse {
  data: Client[];
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
  phone_verified: number;
  blocked: number;
}

export default function ClientsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    isActive: undefined as boolean | undefined,
    phoneVerified: undefined as boolean | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await apiRequest<Statistics>('/clients/statistics', {
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

  // Cargar clientes
  useEffect(() => {
    const loadClients = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.isActive !== undefined) {
          params.append('isActive', filters.isActive.toString());
        }
        if (filters.phoneVerified !== undefined) {
          params.append('phoneVerified', filters.phoneVerified.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<ClientsResponse>(
          `/clients?${params.toString()}`,
          {
            method: 'GET',
          }
        );

        setClients(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error cargando clientes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, [token, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset a página 1 cuando cambian los filtros
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Head>
        <title>Clientes - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-sm font-normal text-gray-900">Clientes</h1>
            <p className="text-xs text-gray-500 mt-1">
              Gestiona y visualiza información de los clientes de la plataforma
            </p>
          </div>

          {/* Estadísticas */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-normal text-gray-900 mt-1">
                  {statistics.total}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Activos</p>
                <p className="text-sm font-normal text-gray-900 mt-1">
                  {statistics.active}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Inactivos</p>
                <p className="text-sm font-normal text-gray-900 mt-1">
                  {statistics.inactive}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Teléfono Verificado</p>
                <p className="text-sm font-normal text-gray-900 mt-1">
                  {statistics.phone_verified}
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Bloqueados</p>
                <p className="text-sm font-normal text-gray-900 mt-1">
                  {statistics.blocked}
                </p>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Nombre, email o teléfono..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Estado
                </label>
                <select
                  value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                  onChange={(e) =>
                    handleFilterChange(
                      'isActive',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Teléfono Verificado
                </label>
                <select
                  value={filters.phoneVerified === undefined ? '' : filters.phoneVerified.toString()}
                  onChange={(e) =>
                    handleFilterChange(
                      'phoneVerified',
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )
                  }
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Verificados</option>
                  <option value="false">No Verificados</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() =>
                    setFilters({
                      page: 1,
                      limit: 20,
                      isActive: undefined,
                      phoneVerified: undefined,
                      search: '',
                    })
                  }
                  className="w-full px-4 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de clientes */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-gray-500">No se encontraron clientes</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Cliente
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Contacto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Pedidos
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Total Gastado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-normal text-gray-500">
                          Registro
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {client.profile_image_url ? (
                                <img
                                  src={client.profile_image_url}
                                  alt={`${client.first_name} ${client.last_name}`}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-gray-400"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-normal text-gray-900">
                                  {client.first_name} {client.last_name}
                                </p>
                                {client.email && (
                                  <p className="text-xs text-gray-500">{client.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              {client.phone && (
                                <p className="text-xs text-gray-900">{client.phone}</p>
                              )}
                              {client.phone_verified && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 mt-1">
                                  ✓ Verificado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="text-xs text-gray-900">
                                {client.total_orders} pedidos
                              </p>
                              {client.total_reviews_given > 0 && (
                                <p className="text-xs text-gray-500">
                                  {client.total_reviews_given} reseñas
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-gray-900">
                              {formatCurrency(client.total_spent)}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full w-fit ${
                                  client.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {client.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                              {client.is_blocked && (
                                <span className="inline-flex px-2 py-1 text-xs rounded-full w-fit bg-red-100 text-red-800">
                                  Bloqueado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs text-gray-500">
                              {formatDate(client.created_at)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {pagination.totalPages > 1 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                      {pagination.total} clientes
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                        }
                        disabled={pagination.page === 1}
                        className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                        }
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

