/**
 * Página de catálogo de productos - Contexto Global
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import { productsService } from '@/lib/products';
import { useStoreContext } from '@/contexts/StoreContext';

export default function ProductsPage() {
  const router = useRouter();
  const { contextType } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [filters, setFilters] = useState<any>({
    isAvailable: true,
  });

  useEffect(() => {
    const { search, category } = router.query;
    if (search) {
      setSearchQuery(search as string);
      setFilters({ ...filters, search: search as string });
    }
    if (category) {
      setCategoryFilter(category as string);
      setFilters({ ...filters, categoryId: category as string });
    }
  }, [router.query]);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {contextType === 'global' 
              ? 'Todos los Productos'
              : contextType === 'grupo'
              ? 'Productos del Grupo'
              : 'Productos de la Sucursal'
            }
          </h1>

          {/* Barra de búsqueda */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Grid de productos */}
        <ProductGrid filters={filters} />
      </StoreLayout>
    </>
  );
}

