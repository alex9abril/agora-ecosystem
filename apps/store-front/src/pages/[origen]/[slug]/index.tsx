/**
 * Página de inicio para grupo o sucursal
 * Muestra productos del grupo o sucursal específica
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import { useStoreContext } from '@/contexts/StoreContext';
import { productsService } from '@/lib/products';
import ContextualLink from '@/components/ContextualLink';

export default function StoreHomePage() {
  const router = useRouter();
  const { origen, slug } = router.query;
  const { contextType, groupData, branchData, isLoading, error } = useStoreContext();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contextType !== 'global' && !isLoading) {
      loadFeaturedProducts();
    }
  }, [contextType, isLoading]);

  const loadFeaturedProducts = async () => {
    try {
      setLoading(true);
      
      const params: any = {
        page: 1,
        limit: 8,
        isAvailable: true,
        isFeatured: true,
      };

      if (contextType === 'grupo' && groupData) {
        // Cargar productos del grupo - necesitamos obtener las sucursales del grupo primero
        // Por ahora cargamos productos destacados generales
        const response = await productsService.getProducts(params);
        setFeaturedProducts(response.data || []);
      } else if (contextType === 'sucursal' && branchData) {
        params.branchId = branchData.id;
        const response = await productsService.getProducts(params);
        setFeaturedProducts(response.data || []);
      }
    } catch (error) {
      console.error('Error cargando productos destacados:', error);
    } finally {
      setLoading(false);
    }
  };

  const storeData = contextType === 'grupo' ? groupData : branchData;
  const storeName = storeData?.name || 'Agora';
  const storeDescription = storeData?.description || '';

  return (
    <>
      <Head>
        <title>{storeName} - Agora</title>
        <meta name="description" content={storeDescription || `Productos de ${storeName}`} />
      </Head>
      <StoreLayout>
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <ContextualLink href="/" className="text-black hover:text-gray-700">
              Volver al inicio
            </ContextualLink>
          </div>
        ) : (
          <>
            {/* Hero Section Personalizado */}
            <div className="mb-12">
              {storeData?.logo_url && (
                <img 
                  src={storeData.logo_url} 
                  alt={storeName} 
                  className="h-24 w-24 object-contain mb-4"
                />
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {storeName}
              </h1>
              {storeDescription && (
                <p className="text-lg text-gray-600 mb-6">
                  {storeDescription}
                </p>
              )}
              {contextType === 'sucursal' && branchData && (
                <div className="text-gray-600 space-y-1">
                  {branchData.address && <p>📍 {branchData.address}</p>}
                  {branchData.phone && <p>📞 {branchData.phone}</p>}
                  {branchData.email && <p>✉️ {branchData.email}</p>}
                </div>
              )}
            </div>

            {/* Productos Destacados */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Productos Destacados</h2>
                <ContextualLink href="/products" className="text-black hover:text-gray-700 text-sm font-medium">
                  Ver todos
                </ContextualLink>
              </div>
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Cargando productos...</p>
                </div>
              ) : (
                <ProductGrid filters={{ isFeatured: true }} />
              )}
            </section>

            {/* Todos los Productos */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Todos los Productos</h2>
              <ProductGrid />
            </section>
          </>
        )}
      </StoreLayout>
    </>
  );
}

