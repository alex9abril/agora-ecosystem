/**
 * Página de inicio - Contexto Global
 * Muestra productos de todas las sucursales
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StoreLayout from '@/components/layout/StoreLayout';
import ProductGrid from '@/components/ProductGrid';
import BranchSelector from '@/components/BranchSelector';
import PromotionalSlider, { SlideContent } from '@/components/PromotionalSlider';
import CategoryCardsSlider from '@/components/CategoryCardsSlider';
import SmartCategoryCards from '@/components/SmartCategoryCards';
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
        {/* Slider Promocional Full Width */}
        <PromotionalSlider
          slides={[
            {
              id: '1',
              gradientColors: ['#8b5cf6', '#4c1d95', '#1e1b4b'], // Gradiente púrpura como Mercado Libre
              decorativeElements: true,
              overlay: {
                position: 'left',
                badge: 'YA DISPONIBLE',
                badgePosition: 'top-left',
                badgeColor: '#ec4899',
                title: 'TU PRÓXIMO JUEGO COMIENZA CON UNA',
                titleHighlight: 'GIFT CARD',
                secondaryText: 'HASTA 15 MESES SIN INTERESES',
                ctaText: 'Ver ofertas',
                ctaLink: '/products?category=electronics',
                ctaColor: 'bg-white text-gray-900',
                termsText: 'Ver aquí T&C.',
              },
              productImages: [
                {
                  url: 'https://via.placeholder.com/200x200/8b5cf6/ffffff?text=Producto+1',
                  alt: 'Producto destacado 1',
                  position: { right: '10%', top: '20%' },
                  size: '180px',
                  rotation: -5,
                },
                {
                  url: 'https://via.placeholder.com/200x200/ec4899/ffffff?text=Producto+2',
                  alt: 'Producto destacado 2',
                  position: { right: '5%', bottom: '15%' },
                  size: '150px',
                  rotation: 8,
                },
              ],
            },
            {
              id: '2',
              gradientColors: ['#f97316', '#ea580c', '#9a3412'], // Gradiente naranja como Amazon
              decorativeElements: true,
              overlay: {
                position: 'center',
                badge: 'OFERTA GANADORA',
                badgePosition: 'top-center',
                badgeColor: '#dc2626',
                title: 'Hasta 55% + $120',
                subtitle: 'de descuento',
                description: 'Con código AGORA2024',
                secondaryText: 'Envíos gratis en tu primera compra',
                discountCode: 'AGORA2024',
                ctaText: 'Compra ahora',
                ctaLink: '/products',
                ctaColor: 'bg-white text-gray-900',
              },
            },
            {
              id: '3',
              gradientColors: ['#06b6d4', '#0891b2', '#0e7490'], // Gradiente teal
              decorativeElements: true,
              overlay: {
                position: 'right',
                title: 'Envío gratis',
                subtitle: 'Beneficio por ser tu primera compra',
                description: 'Aprovecha envíos gratuitos en todos tus pedidos',
                ctaText: 'Mostrar productos',
                ctaLink: '/products',
                ctaColor: 'bg-white text-gray-900',
              },
            },
            {
              id: '4',
              gradientColors: ['#10b981', '#059669', '#047857'], // Gradiente verde
              decorativeElements: true,
              overlay: {
                position: 'left',
                badge: 'NUEVO',
                badgePosition: 'top-left',
                badgeColor: '#22c55e',
                title: 'PRODUCTOS DESTACADOS',
                subtitle: 'Lo más vendido esta semana',
                description: 'Encuentra los productos más populares',
                ctaText: 'Ver productos',
                ctaLink: '/products?isFeatured=true',
                ctaColor: 'bg-white text-gray-900',
              },
            },
            {
              id: '5',
              gradientColors: ['#ec4899', '#db2777', '#be185d'], // Gradiente rosa
              decorativeElements: true,
              overlay: {
                position: 'center',
                title: 'HASTA 30% OFF',
                subtitle: 'En productos seleccionados',
                description: 'Aprovecha nuestras mejores ofertas',
                secondaryText: 'Válido hasta fin de mes',
                ctaText: 'Ver ofertas',
                ctaLink: '/products',
                ctaColor: 'bg-white text-gray-900',
              },
            },
            {
              id: '6',
              gradientColors: ['#6366f1', '#4f46e5', '#4338ca'], // Gradiente índigo
              decorativeElements: true,
              overlay: {
                position: 'right',
                title: 'COMPRA Y RECOGE',
                subtitle: 'En tu tienda más cercana',
                description: 'Compra en línea y recoge en la sucursal',
                ctaText: 'Seleccionar tienda',
                ctaLink: '/',
                ctaColor: 'bg-white text-gray-900',
              },
            },
          ]}
          autoPlay={true}
          autoPlayInterval={5000}
          height="450px"
        />

        {/* Slider de Categorías */}
        <SmartCategoryCards />

        {/* Contenido con contenedor */}
        <div className="max-w-7xl mx-auto px-4 py-6">

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
        </div>
      </StoreLayout>
    </>
  );
}
