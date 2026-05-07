/**
 * Página de catálogo de productos - Contexto Global
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import CategoryBreadcrumbs from '@/components/CategoryBreadcrumbs';
import PartsAccessoriesFilters from '@/components/PartsAccessoriesFilters';
import { collectionsService } from '@/lib/collections';
import { categoriesService } from '@/lib/categories';
import { useStoreContext } from '@/contexts/StoreContext';

export default function ProductsPage() {
  const router = useRouter();
  const { contextType } = useStoreContext();

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [collectionFilter, setCollectionFilter] = useState<string>('');

  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionDescription, setCollectionDescription] = useState<string>('');

  const [filters, setFilters] = useState<any>({ isAvailable: true });

  useEffect(() => {
    if (!router.isReady) return;

    const { search, categoryId, collectionId } = router.query;
    const nextFilters: any = { isAvailable: true };

    if (typeof search === 'string' && search.trim()) {
      nextFilters.search = search;
    } else {
      delete nextFilters.search;
    }

    if (typeof categoryId === 'string' && categoryId) {
      setCategoryFilter(categoryId);
      nextFilters.categoryId = categoryId;
    } else {
      setCategoryFilter('');
      delete nextFilters.categoryId;
    }

    if (typeof collectionId === 'string' && collectionId) {
      setCollectionFilter(collectionId);
      nextFilters.collectionId = collectionId;
    } else {
      setCollectionFilter('');
      delete nextFilters.collectionId;
    }

    setFilters(nextFilters);
  }, [router.isReady, router.query]);

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

    void loadCollection();
    return () => {
      isActive = false;
    };
  }, [collectionFilter]);

  useEffect(() => {
    if (!categoryFilter) {
      setCategoryName('');
      setCategoryDescription('');
      return;
    }

    let isActive = true;
    const loadCategory = async () => {
      try {
        const data = await categoriesService.getCategoryById(categoryFilter);
        if (!isActive) return;
        setCategoryName(data.name || 'Productos');
        setCategoryDescription((data.description as any) || '');
      } catch (error) {
        console.error('Error cargando categoría:', error);
        if (!isActive) return;
        setCategoryName('Productos');
        setCategoryDescription('');
      }
    };

    void loadCategory();
    return () => {
      isActive = false;
    };
  }, [categoryFilter]);

  return (
    <>
      <Head>
        <title>Productos - Agora</title>
        <meta name="description" content="Catálogo de productos" />
      </Head>

      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-8">
            {categoryFilter && <CategoryBreadcrumbs categoryId={categoryFilter} />}

            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {collectionFilter
                  ? collectionName || 'Colección'
                  : categoryName ||
                    (categoryFilter
                      ? 'Productos'
                      : contextType === 'global'
                        ? 'Todos los Productos'
                        : contextType === 'grupo'
                          ? 'Productos del Grupo'
                          : contextType === 'sucursal'
                            ? 'Productos de la Sucursal'
                            : 'Productos')}
              </h1>
              {(collectionFilter ? collectionDescription : categoryDescription) && (
                <p className="text-gray-600 text-base max-w-2xl">
                  {collectionFilter ? collectionDescription : categoryDescription}
                </p>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <aside className="md:w-72 flex-shrink-0">
                <div className="space-y-4">
                  <PartsAccessoriesFilters />
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                <ProductGrid filters={filters} />
              </div>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}
