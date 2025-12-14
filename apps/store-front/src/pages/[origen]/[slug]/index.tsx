/**
 * Página de inicio para grupo o sucursal
 * Muestra productos del grupo o sucursal específica
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import PromotionalSlider, { SlideContent } from '@/components/PromotionalSlider';
import CategoryCardsSlider from '@/components/CategoryCardsSlider';
import SmartCategoryCards from '@/components/SmartCategoryCards';
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
            {/* Slider Promocional Full Width */}
            <PromotionalSlider
              slides={[
                {
                  id: '1',
                  gradientColors: ['#ef4444', '#dc2626', '#991b1b'],
                  decorativeElements: true,
                  overlay: {
                    position: 'left',
                    badge: 'OFERTA ESPECIAL',
                    badgePosition: 'top-left',
                    badgeColor: '#ec4899',
                    title: `BIENVENIDO A`,
                    titleHighlight: storeName.toUpperCase(),
                    subtitle: 'Ofertas exclusivas para ti',
                    description: storeDescription || 'Encuentra los mejores productos',
                    ctaText: 'Ver productos',
                    ctaLink: '/products',
                    ctaColor: 'bg-white text-gray-900',
                  },
                },
                {
                  id: '2',
                  gradientColors: ['#3b82f6', '#2563eb', '#1e40af'],
                  decorativeElements: true,
                  overlay: {
                    position: 'center',
                    title: 'ENVÍO GRATIS',
                    subtitle: 'En tu primera compra',
                    description: 'Aprovecha envíos gratuitos en todos tus pedidos',
                    ctaText: 'Comprar ahora',
                    ctaLink: '/products',
                    ctaColor: 'bg-white text-gray-900',
                  },
                },
                {
                  id: '3',
                  gradientColors: ['#10b981', '#059669', '#047857'],
                  decorativeElements: true,
                  overlay: {
                    position: 'right',
                    title: 'PRODUCTOS DESTACADOS',
                    subtitle: 'Lo más vendido',
                    description: 'Encuentra los productos más populares',
                    ctaText: 'Ver destacados',
                    ctaLink: '/products?isFeatured=true',
                    ctaColor: 'bg-white text-gray-900',
                  },
                },
                {
                  id: '4',
                  gradientColors: ['#ec4899', '#db2777', '#be185d'],
                  decorativeElements: true,
                  overlay: {
                    position: 'center',
                    title: 'HASTA 30% OFF',
                    subtitle: 'En productos seleccionados',
                    description: 'Aprovecha nuestras mejores ofertas',
                    ctaText: 'Ver ofertas',
                    ctaLink: '/products',
                    ctaColor: 'bg-white text-gray-900',
                  },
                },
                {
                  id: '5',
                  gradientColors: ['#6366f1', '#4f46e5', '#4338ca'],
                  decorativeElements: true,
                  overlay: {
                    position: 'left',
                    title: 'COMPRA Y RECOGE',
                    subtitle: 'En tu tienda más cercana',
                    description: 'Compra en línea y recoge en la sucursal',
                    ctaText: 'Ver más',
                    ctaLink: '/products',
                    ctaColor: 'bg-white text-gray-900',
                  },
                },
              ]}
              autoPlay={true}
              autoPlayInterval={5000}
              height="450px"
            />

            {/* Tarjetas Inteligentes */}
            <SmartCategoryCards />

            {/* Contenido con contenedor */}
            <div className="max-w-7xl mx-auto px-4 py-6">

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
            </div>
          </>
        )}
      </StoreLayout>
    </>
  );
}

