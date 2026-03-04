import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { clientsService, Client, ClientFilters } from '@/lib/clients';
import Link from 'next/link';
import { SkeletonTable } from '@/components/ui/Skeleton';

const PAGE_SIZE_STORAGE_KEY = 'clients_page_size';
const CURRENT_PAGE_STORAGE_KEY = 'clients_current_page';
const PAGE_SIZE_OPTIONS = [1, 10, 20, 50, 100];
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
    loadClients(page, pageSize, searchTerm);
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

  const loadClients = async (pageToLoad: number = page, limit: number = pageSize, searchValue: string = searchTerm) => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: ClientFilters = {
        page: pageToLoad,
        limit,
        sortBy,
        sortOrder,
      };

      if (searchValue) {
        filters.search = searchValue;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total > 0 ? `${total} cliente${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'No hay clientes registrados'}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={isActiveFilter}
                onChange={(e) => {
                  setIsActiveFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
          <SkeletonTable rows={10} cols={7} className="mt-0" />
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        ) : clients.length > 0 ? (
          <>
            <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-700/50">
                  <tr>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Gastado
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-1.5 text-left text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-4 py-1.5 text-right text-xs font-light text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="flex items-center">
                          {client.profile_image_url ? (
                            <img
                              src={client.profile_image_url}
                              alt={`${client.first_name} ${client.last_name}`}
                              className="h-8 w-8 rounded-full object-cover mr-2"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mr-2">
                              <span className="text-xs font-light text-indigo-600 dark:text-indigo-400">
                                {client.first_name[0]}{client.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-light text-gray-900 dark:text-gray-100">
                              {client.first_name} {client.last_name}
                            </div>
                            {client.avg_rating_given > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ⭐ {client.avg_rating_given.toFixed(1)} ({client.total_reviews_given} reseñas)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="text-xs font-light text-gray-900 dark:text-gray-100">{client.email}</div>
                        {client.phone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {client.phone}
                            {client.phone_verified && (
                              <span className="ml-1 text-green-600 dark:text-green-400">✓</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="text-xs font-light text-gray-900 dark:text-gray-100">{client.total_orders}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {client.completed_orders} completados
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="text-xs font-light text-gray-900 dark:text-gray-100">
                          {formatCurrency(client.total_spent)}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {client.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-light bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-light bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-300">
                              Inactivo
                            </span>
                          )}
                          {client.is_blocked && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-light bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
                              Bloqueado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-xs font-light text-gray-500 dark:text-gray-400">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-4 py-1.5 whitespace-nowrap text-right text-xs font-light">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          >
                            Ver detalles
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              const name = [client.first_name, client.last_name].filter(Boolean).join(' ').trim() || client.email;
                              if (typeof window !== 'undefined' && window.confirm(`¿Eliminar cliente "${name}"? Esta acción es temporal y no está conectada al backend.`)) {
                                // TODO: llamar a API delete cuando exista
                                console.warn('Eliminar cliente (no implementado):', client.id);
                              }
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            title="Eliminar (temporal)"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {clients.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-light text-gray-500 dark:text-gray-400">
                  Mostrando {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} de {total} clientes
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-light text-gray-500 dark:text-gray-400">Mostrar:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
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
                      className="px-2 py-1 text-xs font-light border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Primera página"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-2 py-1 text-xs font-light border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Página anterior"
                    >
                      «
                    </button>
                    <span className="px-3 py-1 text-xs font-light text-gray-700 dark:text-gray-300">
                      Página {page} de {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-2 py-1 text-xs font-light border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Página siguiente"
                    >
                      »
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                      className="px-2 py-1 text-xs font-light border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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

