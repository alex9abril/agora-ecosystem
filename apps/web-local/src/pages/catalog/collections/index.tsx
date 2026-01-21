import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productCollectionsService, ProductCollection } from '@/lib/product-collections';

export default function ProductCollectionsPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const branchName = useMemo(() => selectedBusiness?.business_name || 'sucursal', [selectedBusiness?.business_name]);

  useEffect(() => {
    if (selectedBusiness?.business_id) {
      void loadCollections();
    } else {
      setCollections([]);
    }
  }, [selectedBusiness?.business_id]);

  const loadCollections = async () => {
    if (!selectedBusiness?.business_id) return;
    try {
      setLoading(true);
      setPageError(null);
      const response = await productCollectionsService.list(selectedBusiness.business_id, {
        status: 'all',
      });
      setCollections(response.data);
    } catch (error: any) {
      setPageError(error?.message || 'No se pudieron cargar las colecciones');
    } finally {
      setLoading(false);
    }
  };

  const selectedCollections = collections.filter((item) => selectedIds.has(item.id));
  const allSelected = collections.length > 0 && selectedIds.size === collections.length;
  const hasSelection = selectedIds.size > 0;
  const hasActiveSelected = selectedCollections.some(
    (item) => (item.status || 'active') === 'active',
  );
  const hasInactiveSelected = selectedCollections.some(
    (item) => item.status === 'inactive',
  );
  const deleteLabel = hasSelection
    ? `Eliminar ${selectedIds.size} elemento${selectedIds.size === 1 ? '' : 's'}`
    : 'Eliminar';

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < collections.length;
    }
  }, [selectedIds, collections.length]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(collections.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const applyStatusToSelection = async (
    status: 'active' | 'inactive',
    options?: { removeFromList?: boolean },
  ) => {
    if (!hasSelection) return;
    try {
      setSaving(true);
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          productCollectionsService.update(id, { status }),
        ),
      );
      const selectedIdsSnapshot = new Set(selectedIds);
      setSelectedIds(new Set());
      if (options?.removeFromList) {
        setCollections((prev) =>
          prev.filter((item) => !selectedIdsSnapshot.has(item.id)),
        );
      } else {
        await loadCollections();
      }
    } catch (error: any) {
      setPageError(error?.message || 'No se pudo actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelection = async () => {
    if (!hasSelection) return;
    const confirmed = window.confirm(
      '¿Quieres eliminar las colecciones seleccionadas? Esta acción es irreversible.',
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => productCollectionsService.remove(id)));
      setSelectedIds(new Set());
      setCollections((prev) => prev.filter((item) => !ids.includes(item.id)));
    } catch (error: any) {
      setPageError(error?.message || 'No se pudo eliminar la colección');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LocalLayout>
      <Head>
        <title>Colecciones | LOCALIA Local</title>
      </Head>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Colecciones de productos</h1>
            <p className="text-sm text-gray-600">
              Gestiona colecciones internas para la sucursal {branchName}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/catalog/collections/new')}
            disabled={!selectedBusiness}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Nueva colección
          </button>
        </div>

        {pageError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {!selectedBusiness?.business_id ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Selecciona una sucursal para gestionar las colecciones de productos.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm text-gray-600">
                {hasSelection
                  ? `${selectedIds.size} seleccionada(s)`
                  : 'Selecciona colecciones para gestionar'}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {hasActiveSelected && (
                  <button
                    type="button"
                    disabled={!hasSelection || saving}
                    onClick={() => applyStatusToSelection('inactive')}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Poner en borrador
                  </button>
                )}
                {hasInactiveSelected && (
                  <button
                    type="button"
                    disabled={!hasSelection || saving}
                    onClick={() => applyStatusToSelection('active')}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Activar
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasSelection || saving}
                  onClick={handleDeleteSelection}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v2h6V4a1 1 0 00-1-1m-4 0h4"
                    />
                  </svg>
                  {deleteLabel}
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
                <span className="ml-3 text-sm text-gray-600">Cargando colecciones...</span>
              </div>
            ) : collections.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No hay colecciones para esta sucursal. Crea la primera para comenzar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Colección
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Productos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {collections.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <Link
                            href={`/catalog/collections/${item.id}/products`}
                            className="font-medium text-gray-900 hover:text-gray-700"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700">{item.slug}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{item.total_products ?? 0}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <div
                              className={`mr-2 h-2 w-2 rounded-full ${
                                item.status === 'inactive'
                                  ? 'bg-gray-400'
                                  : 'bg-green-500'
                              }`}
                            ></div>
                            <span className="text-sm text-gray-600">
                              {item.status === 'inactive' ? 'Inactiva' : 'Activa'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right text-sm">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/catalog/collections/${item.id}`)}
                              className="text-gray-900 hover:text-gray-700"
                            >
                              Editar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </LocalLayout>
  );
}
