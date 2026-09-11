/**
 * Página de catálogo de productos - Contexto Global
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import CategoryBreadcrumbs from '@/components/CategoryBreadcrumbs';
import CategoryInfo from '@/components/CategoryInfo';
import { collectionsService } from '@/lib/collections';
import { parseCatalogFilters } from '@/lib/catalog-filters';

export default function ProductsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
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
    let isActive = true;
    const loadCollection = async () => {
      try {
        const data = await collectionsService.get(collectionFilter);
        if (!isActive) return;
        setCollectionName(data.name || 'Colección');
        setCollectionDescription(data.description || '');
      } catch (error) {
        console.error('Error cargando colección:', error);
        if (!isActive) return;
        setCollectionName('Colección');
        setCollectionDescription('');
      }
    };
    loadCollection();
    return () => {
      isActive = false;
    };
  }, [collectionFilter]);

  return (
    <>
      <Head>
        <title>Productos - Agora</title>
        <meta name="description" content="Catálogo de productos" />
      </Head>
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-8">
            {/* Breadcrumbs de categoría */}
            {categoryFilter && (
              <CategoryBreadcrumbs categoryId={categoryFilter} />
            )}

            {!categoryFilter && !collectionFilter && (
              <div className="text-sm text-gray-500 mb-4">
                <span className="text-gray-900">Productos</span>
              </div>
            )}

            {/* Título con nombre y descripción de categoría/colección */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {collectionFilter
                  ? (collectionName || 'Colección')
                  : categoryName || (categoryFilter ? 'Productos' : 'Todos los productos')}
              </h1>
              {(collectionFilter ? collectionDescription : categoryDescription) && (
                <p className="text-gray-600 text-base max-w-2xl">
                  {collectionFilter ? collectionDescription : categoryDescription}
                </p>
              )}
              {!categoryFilter && !collectionFilter && !categoryDescription && (
                <p className="text-gray-600 text-base max-w-2xl">
                  Catálogo completo, incluidas las partes aún sin categoría. Usa el menú de la izquierda para filtrar.
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
      </StoreLayout>
    </>
  );
}

