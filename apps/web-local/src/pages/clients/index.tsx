import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { clientsService, Client, ClientFilters } from '@/lib/clients';
import Link from 'next/link';

const PAGE_SIZE_STORAGE_KEY = 'clients_page_size';
const CURRENT_PAGE_STORAGE_KEY = 'clients_current_page';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const CLIENTS_ROUTE_PREFIX = '/clients';

export default function ClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedPage = localStorage.getItem(CURRENT_PAGE_STORAGE_KEY);
      const parsedPage = storedPage ? parseInt(storedPage, 10) : NaN;
      if (parsedPage > 0) {
        return parsedPage;
      }
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedPageSize = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      const parsedPageSize = storedPageSize ? parseInt(storedPageSize, 10) : NaN;
      if (PAGE_SIZE_OPTIONS.includes(parsedPageSize)) {
        return parsedPageSize;
      }
    }
    return DEFAULT_PAGE_SIZE;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [isBlockedFilter, setIsBlockedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadClients(page, pageSize);
  }, [page, pageSize, searchTerm, isActiveFilter, isBlockedFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, page.toString());
    }
  }, [page]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, pageSize.toString());
    }
  }, [pageSize]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window === 'undefined') return;
      if (!url.startsWith(CLIENTS_ROUTE_PREFIX)) {
        localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
        localStorage.removeItem(CURRENT_PAGE_STORAGE_KEY);
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const loadClients = async (pageToLoad: number = page, limit: number = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: ClientFilters = {
        page: pageToLoad,
        limit,
        sortBy,
        sortOrder,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (isActiveFilter !== 'all') {
        filters.is_active = isActiveFilter === 'active';
      }

      if (isBlockedFilter !== 'all') {
        filters.is_blocked = isBlockedFilter === 'blocked';
      }

      const response = await clientsService.getClients(filters);
      setClients(response.data);
      setTotalPages(response.pagination.totalPages || 0);
      setTotal(response.pagination.total || 0);
      setPage(response.pagination.page || pageToLoad);
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
      setError(err.message || 'Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput.trim());
  };

  return (
    <LocalLayout>
      <Head>
        <title>Clientes - AGORA</title>
      </Head>

      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'No hay clientes registrados'}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={isActiveFilter}
                onChange={(e) => {
                  setIsActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
              <select
                value={isBlockedFilter}
                onChange={(e) => {
                  setIsBlockedFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todos</option>
                <option value="blocked">Bloqueados</option>
                <option value="unblocked">No bloqueados</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="created_at-desc">Más recientes</option>
                <option value="created_at-asc">Más antiguos</option>
                <option value="total_spent-desc">Mayor gasto</option>
                <option value="total_spent-asc">Menor gasto</option>
                <option value="total_orders-desc">Más pedidos</option>
                <option value="total_orders-asc">Menos pedidos</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Lista de clientes */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : clients.length > 0 ? (
          <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Gastado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {client.profile_image_url ? (
                            <img
                              src={client.profile_image_url}
                              alt={`${client.first_name} ${client.last_name}`}
                              className="h-10 w-10 rounded-full object-cover mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-semibold text-indigo-600">
                                {client.first_name[0]}{client.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                            {client.avg_rating_given > 0 && (
                              <div className="text-xs text-gray-500">
                                ⭐ {client.avg_rating_given.toFixed(1)} ({client.total_reviews_given} reseñas)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.email}</div>
                        {client.phone && (
                          <div className="text-xs text-gray-500">
                            {client.phone}
                            {client.phone_verified && (
                              <span className="ml-1 text-green-600">✓</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.total_orders}</div>
                        <div className="text-xs text-gray-500">
                          {client.completed_orders} completados
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(client.total_spent)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {client.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactivo
                            </span>
                          )}
                          {client.is_blocked && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {clients.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} de {total} clientes
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Mostrar:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Primera página"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Página anterior"
                    >
                      «
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700">
                      Página {page} de {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Página siguiente"
                    >
                      »
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Última página"
                    >
                      »»
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || isActiveFilter !== 'all' || isBlockedFilter !== 'all'
                ? 'No se encontraron clientes con los filtros aplicados'
                : 'Aún no hay clientes registrados en el sistema'}
            </p>
          </div>
        )}
      </div>
    </LocalLayout>
  );
}

