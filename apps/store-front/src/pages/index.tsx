/**
 * Página de inicio - Contexto Global
 * Muestra productos de todas las sucursales
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import StoreLayout from '@/components/layout/StoreLayout';
import PromotionalSlider, { SlideContent } from '@/components/PromotionalSlider';
import CollectionsCarousel from '@/components/CollectionsCarousel';
import BrandsCarousel from '@/components/BrandsCarousel';
import RecentlyViewedProducts from '@/components/RecentlyViewedProducts';
import ProductGrid from '@/components/ProductGrid';
import { useStoreContext } from '@/contexts/StoreContext';
import { collectionsService, StoreCollection } from '@/lib/collections';
import { landingSlidersService, LandingSlider } from '@/lib/landing-sliders';

const getDefaultGlobalSlides = (): SlideContent[] => [
  {
    id: '1',
    gradientColors: ['#8b5cf6', '#4c1d95', '#1e1b4b'],
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
      { url: 'https://via.placeholder.com/200x200/8b5cf6/ffffff?text=Producto+1', alt: 'Producto 1', position: { right: '10%', top: '20%' }, size: '180px', rotation: -5 },
      { url: 'https://via.placeholder.com/200x200/ec4899/ffffff?text=Producto+2', alt: 'Producto 2', position: { right: '5%', bottom: '15%' }, size: '150px', rotation: 8 },
    ],
  },
  {
    id: '2',
    gradientColors: ['#f97316', '#ea580c', '#9a3412'],
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
    gradientColors: ['#06b6d4', '#0891b2', '#0e7490'],
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
];

function getRedirectUrl(slider: LandingSlider): string {
  if (slider.redirect_type === 'url' && slider.redirect_url) return slider.redirect_url;
  if (slider.redirect_type === 'category' && slider.redirect_target_id) return `/products?category=${slider.redirect_target_id}`;
  if (slider.redirect_type === 'promotion' && slider.redirect_target_id) return `/products?promotion=${slider.redirect_target_id}`;
  if (slider.redirect_type === 'branch' && slider.redirect_target_id) return `/sucursal/${slider.redirect_target_id}`;
  return '/products';
}

export default function HomePage() {
  const { contextType, branchId } = useStoreContext();
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [globalSliders, setGlobalSliders] = useState<SlideContent[]>(getDefaultGlobalSlides());

  useEffect(() => {
    if (contextType === 'global') {
      landingSlidersService.getActiveSliders().then((slidersData) => {
        if (slidersData.length > 0) {
          const converted: SlideContent[] = slidersData.map((slider) => ({
            id: slider.id,
            imageUrl: slider.content?.imageUrl,
            backgroundColor: slider.content?.backgroundColor || '#f3f4f6',
            overlay: {
              position: slider.content?.overlay?.position || 'left',
              title: slider.content?.overlay?.title,
              subtitle: slider.content?.overlay?.subtitle,
              description: slider.content?.overlay?.description,
              ctaText: slider.content?.overlay?.ctaText,
              ctaLink: slider.content?.overlay?.ctaLink || getRedirectUrl(slider),
            },
            decorativeElements: true,
          }));
          converted.sort((a, b) => {
            const aOrder = slidersData.find((s) => s.id === a.id)?.display_order ?? 0;
            const bOrder = slidersData.find((s) => s.id === b.id)?.display_order ?? 0;
            return aOrder - bOrder;
          });
          setGlobalSliders(converted);
        }
      }).catch(() => {});
    }
  }, [contextType]);

  useEffect(() => {
    if (contextType === 'sucursal' && branchId) {
      collectionsService.list(branchId).then((res) => setCollections(res.data || [])).catch(() => setCollections([]));
    } else {
      setCollections([]);
    }
  }, [contextType, branchId]);

  return (
    <>
      <Head>
        <title>Agora - Marketplace</title>
        <meta name="description" content="Marketplace con productos de todas las sucursales" />
      </Head>
      <StoreLayout>
        {/* Slider Promocional: global desde API o fallback por defecto */}
        <PromotionalSlider
          slides={globalSliders}
          autoPlay={true}
          autoPlayInterval={5000}
          height="450px"
        />

        {/* Carrusel de Colecciones */}
        <CollectionsCarousel collections={collections} />

        <div className="max-w-7xl mx-auto px-4 py-6">
          <BrandsCarousel />
          <RecentlyViewedProducts />
          {contextType === 'global' && (
            <section className="mt-12">
              <h2 className="text-2xl font-semibold mb-6">Todos los Productos</h2>
              <ProductGrid />
            </section>
          )}
        </div>
      </StoreLayout>
    </>
  );
}
