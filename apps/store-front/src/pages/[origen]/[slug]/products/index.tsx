/**
 * Página de catálogo de productos con contexto (grupo/sucursal)
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import { useStoreContext } from '@/contexts/StoreContext';

export default function ContextualProductsPage() {
  const router = useRouter();
  const { contextType, groupData, branchData, isLoading, error } = useStoreContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({
    isAvailable: true,
  });

  useEffect(() => {
    const { search } = router.query;
    if (search) {
      setSearchQuery(search as string);
      setFilters({ ...filters, search: search as string });
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

  const storeName = contextType === 'grupo' ? groupData?.name : branchData?.name || 'Agora';

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
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                Productos de {storeName}
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
                    className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Buscar
                  </button>
                </div>
              </form>
            </div>

            {/* Grid de productos */}
            <ProductGrid filters={filters} />
          </>
        )}
      </StoreLayout>
    </>
  );
}

