/**
 * Página de catálogo de productos con contexto (grupo/sucursal)
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import CategoryBreadcrumbs from '@/components/CategoryBreadcrumbs';
import CategoryInfo from '@/components/CategoryInfo';
import { useStoreContext } from '@/contexts/StoreContext';
import ContextualLink from '@/components/ContextualLink';
import { collectionsService } from '@/lib/collections';
import { parseCatalogFilters } from '@/lib/catalog-filters';

export default function ContextualProductsPage() {
  const router = useRouter();
  const { contextType, groupData, branchData, branchId, isLoading, error } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [uncategorizedFilter, setUncategorizedFilter] = useState(false);
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionDescription, setCollectionDescription] = useState<string>('');
  const catalogFilters = useMemo(
    () => (router.isReady ? parseCatalogFilters(router.query) : {}),
    [router.isReady, router.query],
  );
  const filters = useMemo(
    () => ({
      isAvailable: true,
      ...catalogFilters,
    }),
    [catalogFilters],
  );

  useEffect(() => {
    if (!router.isReady) return;
    setSearchQuery(catalogFilters.search || '');
    setCategoryFilter(catalogFilters.categoryId || '');
    setUncategorizedFilter(Boolean(catalogFilters.uncategorized));
    if (!catalogFilters.categoryId) {
      setCategoryName('');
      setCategoryDescription('');
    }
    setCollectionFilter(catalogFilters.collectionId || '');
  }, [router.isReady, catalogFilters]);

  useEffect(() => {
    if (!collectionFilter) {
      setCollectionName('');
      setCollectionDescription('');
      return;
    }
    if (!branchId) {
      return;
    }
    let isActive = true;
    const loadCollection = async () => {
      try {
        const response = await collectionsService.list(branchId);
        const match = response.data?.find((item) => item.id === collectionFilter);
        const name = match?.name || 'Colección';
        if (!isActive) return;
        setCollectionName(name);
        setCollectionDescription(match?.description || `Explora productos seleccionados de ${name}.`);
      } catch (err) {
        console.error('Error cargando colección:', err);
        if (!isActive) return;
        setCollectionName('Colección');
        setCollectionDescription('Explora productos seleccionados para ti.');
      }
    };

    loadCollection();
    return () => {
      isActive = false;
    };
  }, [collectionFilter, branchId]);

  const storeName = contextType === 'grupo' ? groupData?.name : branchData?.name || 'Agora';
  const headerTitle = collectionFilter
    ? (collectionName || 'Colección')
    : categoryName || (categoryFilter ? 'Productos' : 'Todos los productos');
  const headerDescription = collectionFilter ? collectionDescription : categoryDescription;

  return (
    <>
      <Head>
        <title>Productos - {storeName} - Agora</title>
        <meta name="description" content={`Productos de ${storeName}`} />
      </Head>
      <StoreLayout>
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="mb-8">
              {/* Breadcrumbs de categoría */}
              {categoryFilter && (
                <CategoryBreadcrumbs categoryId={categoryFilter} />
              )}

              {!categoryFilter && !collectionFilter && (
                <div className="text-sm text-gray-500 mb-4">
                  <ContextualLink href="/" className="hover:text-gray-700">
                    Inicio
                  </ContextualLink>
                  <span className="mx-2">/</span>
                  <span className="text-gray-900">Productos</span>
                </div>
              )}

              {collectionFilter && (
                <div className="text-sm text-gray-500 mb-4">
                  <ContextualLink href="/" className="hover:text-gray-700">
                    Inicio
                  </ContextualLink>
                  <span className="mx-2">/</span>
                  <ContextualLink href="/products" className="hover:text-gray-700">
                    Productos
                  </ContextualLink>
                  <span className="mx-2">/</span>
                  <span className="text-gray-900">{collectionName || 'Colección'}</span>
                </div>
              )}

              {/* Título con nombre y descripción de categoría/colección */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {headerTitle}
                </h1>
                {headerDescription && (
                  <p className="text-gray-600 text-base max-w-2xl">{headerDescription}</p>
                )}
                {!categoryFilter && !collectionFilter && !headerDescription && (
                  <p className="text-gray-600 text-base max-w-2xl">
                    Catálogo completo de la sucursal, incluidas las partes aún sin categoría. Usa el menú de la izquierda para filtrar.
                  </p>
                )}
              </div>

              {/* Layout: Panel lateral izquierdo + Productos en el centro */}
              <div className="flex gap-6">
                <aside className="w-full md:w-72 flex-shrink-0">
                  <CategoryInfo
                    categoryId={categoryFilter || undefined}
                    onCategoryLoaded={(name, description) => {
                      setCategoryName(name);
                      setCategoryDescription(description || '');
                    }}
                  />
                </aside>

                {/* Contenido principal - Productos */}
                <div className="flex-1 min-w-0">
                  <ProductGrid filters={filters} showPagination />
                </div>
              </div>
            </div>
          </div>
        )}
      </StoreLayout>
    </>
  );
}

