/**
 * Página de catálogo de productos - Contexto Global
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import CategoryBreadcrumbs from '@/components/CategoryBreadcrumbs';
import CategoryInfo from '@/components/CategoryInfo';
import { productsService } from '@/lib/products';
import { collectionsService } from '@/lib/collections';
import { useStoreContext } from '@/contexts/StoreContext';

export default function ProductsPage() {
  const router = useRouter();
  const { contextType } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryDescription, setCategoryDescription] = useState<string>('');
  const [collectionName, setCollectionName] = useState<string>('');
  const [collectionDescription, setCollectionDescription] = useState<string>('');
  const [filters, setFilters] = useState<any>({
    isAvailable: true,
  });

  useEffect(() => {
    if (!router.isReady) return;
    
    const { search, categoryId, collectionId } = router.query;
    const newFilters: any = {
      isAvailable: true,
    };
    
    if (search) {
      setSearchQuery(search as string);
      newFilters.search = search as string;
    } else {
      setSearchQuery('');
    }
    
    if (categoryId && typeof categoryId === 'string') {
      setCategoryFilter(categoryId);
      newFilters.categoryId = categoryId;
    } else {
      setCategoryFilter('');
      delete newFilters.categoryId;
    }

    if (collectionId && typeof collectionId === 'string') {
      setCollectionFilter(collectionId);
      newFilters.collectionId = collectionId;
    } else {
      setCollectionFilter('');
      delete newFilters.collectionId;
    }
    
    setFilters(newFilters);
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
    loadCollection();
    return () => {
      isActive = false;
    };
  }, [collectionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters = { ...filters };
    if (searchQuery.trim()) {
      newFilters.search = searchQuery.trim();
    } else {
      delete newFilters.search;
    }
    setFilters(newFilters);
  };

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

            {/* Título con nombre y descripción de categoría/colección */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {collectionFilter
                  ? (collectionName || 'Colección')
                  : categoryName || (categoryFilter ? 'Productos' : contextType === 'global' ? 'Todos los Productos' : contextType === 'grupo' ? 'Productos del Grupo' : contextType === 'sucursal' ? 'Productos de la Sucursal' : 'Productos')}
              </h1>
              {(collectionFilter ? collectionDescription : categoryDescription) && (
                <p className="text-gray-600 text-base max-w-2xl">
                  {collectionFilter ? collectionDescription : categoryDescription}
                </p>
              )}
            </div>

            {/* Layout: Panel lateral izquierdo + Productos en el centro */}
            <div className="flex gap-6">
              {/* Panel lateral izquierdo - Información de categoría */}
              {categoryFilter && (
                <aside className="w-64 flex-shrink-0">
                  <CategoryInfo 
                    categoryId={categoryFilter} 
                    onCategoryLoaded={(name, description) => {
                      setCategoryName(name);
                      setCategoryDescription(description || '');
                    }}
                  />
                </aside>
              )}

              {/* Contenido principal - Productos */}
              <div className="flex-1 min-w-0">
                {/* Grid de productos */}
                <ProductGrid filters={filters} />
              </div>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

