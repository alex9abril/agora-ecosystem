/**
 * Página de inicio - Contexto Global
 * Muestra productos de todas las sucursales
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import BranchSelector from '@/components/BranchSelector';
import { productsService } from '@/lib/products';
import { branchesService } from '@/lib/branches';
import { businessGroupsService } from '@/lib/business-groups';
import { useStoreContext } from '@/contexts/StoreContext';
import ContextualLink from '@/components/ContextualLink';

export default function HomePage() {
  const { contextType } = useStoreContext();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [featuredGroups, setFeaturedGroups] = useState<any[]>([]);
  const [featuredBranches, setFeaturedBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Cargar productos destacados
      const productsResponse = await productsService.getProducts({
        page: 1,
        limit: 8,
        isAvailable: true,
        isFeatured: true,
      });
      
      // Cargar grupos destacados
      const groupsResponse = await businessGroupsService.getGroups({
        page: 1,
        limit: 6,
        isActive: true,
      });
      
      // Cargar sucursales destacadas
      const branchesResponse = await branchesService.getBranches({
        page: 1,
        limit: 6,
        isActive: true,
      });

      setFeaturedProducts(productsResponse.data || []);
      setFeaturedGroups(groupsResponse.data || []);
      setFeaturedBranches(branchesResponse.data || []);
    } catch (error) {
      console.error('Error cargando datos del home:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Agora - Marketplace</title>
        <meta name="description" content="Marketplace con productos de todas las sucursales" />
      </Head>
      <StoreLayout>
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido a Agora
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Encuentra productos de todas las sucursales en un solo lugar
          </p>
          
          {/* Selector de sucursal */}
          <div className="mb-8">
            <button
              onClick={() => setShowBranchSelector(!showBranchSelector)}
              className="px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
            >
              {showBranchSelector ? 'Ocultar' : 'Seleccionar'} Sucursal
            </button>
            
            {showBranchSelector && (
              <div className="mt-4">
                <BranchSelector />
              </div>
            )}
          </div>
        </div>

        {/* Grupos Empresariales */}
        {featuredGroups.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Grupos Empresariales</h2>
              <ContextualLink href="/grupos" className="text-black hover:text-gray-700 text-sm font-medium">
                Ver todos
              </ContextualLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredGroups.map((group) => (
                <ContextualLink key={group.id} href={`/grupo/${group.slug}`}>
                  <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    {group.logo_url && (
                      <img src={group.logo_url} alt={group.name} className="h-16 w-16 object-contain mb-4" />
                    )}
                    <h3 className="text-lg font-semibold mb-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                </ContextualLink>
              ))}
            </div>
          </section>
        )}

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
      </StoreLayout>
    </>
  );
}
