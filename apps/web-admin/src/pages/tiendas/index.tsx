import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const STORE_TYPES: Record<string, string> = {
  global: 'Global (Agora)',
  group: 'Por grupo',
  branch: 'Por sucursal',
  group_brand: 'Grupo + marca',
  global_brand: 'Marca global',
};

const MANAGED_IN: Record<string, string> = {
  global: 'No (web-admin)',
  group: 'web-local',
  branch: 'web-local',
  group_brand: 'web-local',
  global_brand: 'No (cuenta marca)',
};

interface Store {
  id: string;
  type: string;
  business_group_id: string | null;
  business_id: string | null;
  vehicle_brand_id: string | null;
  slug: string | null;
  name: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TiendasResponse {
  data: Store[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function TiendasPage() {
  const { token } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    type: '',
    businessGroupId: '',
    isActive: undefined as boolean | undefined,
    search: '',
  });

  useEffect(() => {
    const loadStores = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.type) params.append('type', filters.type);
        if (filters.businessGroupId) params.append('businessGroupId', filters.businessGroupId);
        if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
        if (filters.search) params.append('search', filters.search);

        const response = await apiRequest<TiendasResponse>(
          `/stores?${params.toString()}`,
          { method: 'GET' }
        );
        setStores(response.data ?? []);
        setPagination(response.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch (error) {
        console.error('Error cargando tiendas:', error);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, [token, filters]);

  return (
    <>
      <Head>
        <title>Canales de venta (Tiendas) - LOCALIA Admin</title>
      </Head>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">
              Canales de venta (Tiendas)
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Listado de todos los canales de venta: global, por grupo, por sucursal, por grupo+marca y por marca global. El fulfillment siempre lo realiza la sucursal.
            </p>
          </div>

          {/* Filtros */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(STORE_TYPES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              value={filters.isActive === undefined ? '' : filters.isActive ? 'true' : 'false'}
              onChange={(e) => {
                const v = e.target.value;
                setFilters({
                  ...filters,
                  isActive: v === '' ? undefined : v === 'true',
                  page: 1,
                });
              }}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <input
              type="text"
              placeholder="Buscar por nombre o slug"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-2 min-w-[200px]"
            />
          </div>

          {/* Tabla */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Slug / path</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No hay tiendas que coincidan con los filtros.
                        </td>
                      </tr>
                    ) : (
                      stores.map((store) => (
                        <tr key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {STORE_TYPES[store.type] ?? store.type}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {store.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                            {store.slug ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs rounded ${
                                store.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {store.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {MANAGED_IN[store.type] ?? '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page <= 1}
                  className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= pagination.totalPages}
                  className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
