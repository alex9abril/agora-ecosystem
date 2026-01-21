import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import {
  productCollectionsService,
  CollectionProductRow,
  ProductCollection,
} from '@/lib/product-collections';
import { Product } from '@/lib/products';

export default function CollectionProductsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [collection, setCollection] = useState<ProductCollection | null>(null);
  const [products, setProducts] = useState<CollectionProductRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const branchName = useMemo(
    () => selectedBusiness?.business_name || 'sucursal',
    [selectedBusiness?.business_name],
  );

  useEffect(() => {
    if (!router.isReady || !id || typeof id !== 'string') {
      return;
    }

    const loadData = async () => {
      if (!selectedBusiness?.business_id) {
        return;
      }
      try {
        setLoading(true);
        setPageError(null);
        const [collectionData, productsResponse] = await Promise.all([
          productCollectionsService.get(id),
          productCollectionsService.listProducts(id, selectedBusiness.business_id),
        ]);
        setCollection(collectionData);
        setProducts(productsResponse.data || []);
      } catch (error: any) {
        setPageError(error?.message || 'No se pudieron cargar los productos de la colección');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [router.isReady, id, selectedBusiness?.business_id]);

  useEffect(() => {
    if (!selectedBusiness?.business_id) {
      setSearchResults([]);
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await productCollectionsService.searchAvailableProducts(
          selectedBusiness.business_id,
          trimmed,
          10,
        );
        const existingIds = new Set(products.map((item) => item.id));
        const filtered = (response.data || []).filter(
          (item) => !existingIds.has(item.id),
        );
        setSearchResults(filtered);
      } catch (error: any) {
        setPageError(error?.message || 'No se pudieron buscar productos');
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedBusiness?.business_id, products]);

  const hasSelection = selectedIds.size > 0;
  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const deleteLabel = hasSelection
    ? `Quitar ${selectedIds.size} producto${selectedIds.size === 1 ? '' : 's'}`
    : 'Quitar';

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && selectedIds.size < products.length;
    }
  }, [selectedIds, products.length]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(products.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleRemoveSelection = async () => {
    if (!hasSelection || !selectedBusiness?.business_id || !id || typeof id !== 'string') {
      return;
    }
    const confirmed = window.confirm(
      '¿Quieres quitar los productos seleccionados de esta colección?',
    );
    if (!confirmed) return;
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((productId) =>
          productCollectionsService.removeProduct(id, productId, selectedBusiness.business_id),
        ),
      );
      setProducts((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
    } catch (error: any) {
      setPageError(error?.message || 'No se pudo quitar el producto de la colección');
    }
  };

  const handleAddProduct = async (product: Product) => {
    if (!selectedBusiness?.business_id || !id || typeof id !== 'string') return;
    try {
      await productCollectionsService.addProduct(id, product.id, selectedBusiness.business_id);
      setProducts((prev) => [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku || undefined,
          price: product.price,
          is_available: product.is_available,
          image_url: product.image_url || null,
          status: 'active',
        },
      ]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      setPageError(error?.message || 'No se pudo agregar el producto a la colección');
    }
  };

  return (
    <LocalLayout>
      <Head>
        <title>{collection?.name || 'Colección'} | LOCALIA Local</title>
      </Head>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {collection?.name || 'Colección'}
            </h1>
            <p className="text-sm text-gray-600">
              Productos clasificados en {branchName}.
            </p>
          </div>
          <Link
            href="/catalog/collections"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            ← Volver
          </Link>
        </div>

        {pageError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        {!selectedBusiness?.business_id ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Selecciona una sucursal para gestionar los productos de la colección.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar producto a la colección
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Busca por nombre o SKU..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {searchLoading && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
                )}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleAddProduct(result)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {result.image_url ? (
                            <img
                              src={result.image_url}
                              alt={result.name}
                              className="h-9 w-9 rounded border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
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
                                  d="M3 5h18v14H3z M8 13l2-2 3 3 2-2 4 4"
                                />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{result.name}</p>
                            <p className="text-xs text-gray-500">
                              {result.sku ? `SKU: ${result.sku}` : 'Sin SKU'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {result.price !== undefined ? `$${Number(result.price).toFixed(2)}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {searchQuery.trim().length > 0 && searchResults.length === 0 && !searchLoading && (
                <p className="mt-2 text-xs text-gray-500">Sin resultados.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm text-gray-600">
                {hasSelection
                  ? `${selectedIds.size} seleccionado(s)`
                  : 'Selecciona productos para gestionar'}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasSelection}
                  onClick={handleRemoveSelection}
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
                <span className="ml-3 text-sm text-gray-600">Cargando productos...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500">
                No hay productos asignados a esta colección.
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
                        Imagen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Precio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Estado
                      </th>
                      {/* Sin columna de acciones */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {products.map((item) => (
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
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-10 w-10 rounded border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
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
                                  d="M3 5h18v14H3z M8 13l2-2 3 3 2-2 4 4"
                                />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <Link
                            href={`/products/${item.id}`}
                            className="font-medium text-gray-900 hover:text-gray-700"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {item.sku || '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {item.price !== undefined && item.price !== null
                            ? `$${Number(item.price).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <div
                              className={`mr-2 h-2 w-2 rounded-full ${
                                item.status === 'inactive' ? 'bg-gray-400' : 'bg-green-500'
                              }`}
                            ></div>
                            <span className="text-sm text-gray-600">
                              {item.status === 'inactive' ? 'Inactiva' : 'Activa'}
                            </span>
                          </div>
                        </td>
                        {/* Sin columna de acciones */}
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
