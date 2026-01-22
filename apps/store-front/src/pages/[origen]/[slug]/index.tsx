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
import RecentlyViewedProducts from '@/components/RecentlyViewedProducts';
import CollectionsCarousel from '@/components/CollectionsCarousel';
import { useStoreContext } from '@/contexts/StoreContext';
import { landingSlidersService, LandingSlider } from '@/lib/landing-sliders';
import ContextualLink from '@/components/ContextualLink';
import { collectionsService, StoreCollection } from '@/lib/collections';

export default function StoreHomePage() {
  const router = useRouter();
  const { origen, slug } = router.query;
  const { contextType, groupData, branchData, groupId, branchId, isLoading, error } = useStoreContext();
  const [sliders, setSliders] = useState<SlideContent[]>([]);
  const [loadingSliders, setLoadingSliders] = useState(true);
  const [collections, setCollections] = useState<StoreCollection[]>([]);

  useEffect(() => {
    if (contextType === 'sucursal' && branchId && !isLoading) {
      loadCollections();
    } else {
      setCollections([]);
    }
  }, [contextType, branchId, isLoading]);

  useEffect(() => {
    // Cargar sliders solo cuando tengamos el ID correspondiente
    if (contextType === 'grupo' && groupId && !isLoading) {
      loadSliders();
    } else if (contextType === 'sucursal' && branchId && !isLoading) {
      loadSliders();
    }
  }, [contextType, isLoading, groupId, branchId]);

  const loadSliders = async () => {
    try {
      setLoadingSliders(true);
      
      // Obtener sliders según el contexto
      // Convertir null a undefined para cumplir con el tipo esperado por getActiveSliders
      const businessGroupId = contextType === 'grupo' ? (groupId ?? undefined) : undefined;
      const businessId = contextType === 'sucursal' ? (branchId ?? undefined) : undefined;

      // Validar que tengamos el ID necesario
      if (contextType === 'grupo' && !businessGroupId) {
        console.warn('⚠️ [loadSliders] No hay groupId disponible');
        setSliders([getDefaultSlider()]);
        return;
      }
      if (contextType === 'sucursal' && !businessId) {
        console.warn('⚠️ [loadSliders] No hay branchId disponible');
        setSliders([getDefaultSlider()]);
        return;
      }

      console.log('🔍 [loadSliders] Cargando sliders:', {
        contextType,
        businessGroupId,
        businessId,
        groupId,
        branchId,
        groupData: groupData?.id,
        branchData: branchData?.id,
      });

      const slidersData = await landingSlidersService.getActiveSliders(
        businessGroupId,
        businessId,
      );

      console.log('🔍 [loadSliders] Sliders recibidos del servicio:', slidersData);
      console.log('🔍 [loadSliders] Cantidad de sliders:', slidersData.length);

      // Convertir sliders del backend al formato de SlideContent
      const convertedSliders: SlideContent[] = slidersData.map((slider) => ({
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

      console.log('🔍 [loadSliders] Sliders convertidos:', convertedSliders);

      // Si no hay sliders, usar uno por defecto
      if (convertedSliders.length === 0) {
        console.log('⚠️ [loadSliders] No hay sliders, usando slider por defecto');
        convertedSliders.push(getDefaultSlider());
      }

      // Ordenar por display_order
      convertedSliders.sort((a, b) => {
        const aOrder = slidersData.find(s => s.id === a.id)?.display_order || 0;
        const bOrder = slidersData.find(s => s.id === b.id)?.display_order || 0;
        return aOrder - bOrder;
      });

      setSliders(convertedSliders);
    } catch (error) {
      console.error('❌ Error cargando sliders:', error);
      // Si hay error, usar slider por defecto
      setSliders([getDefaultSlider()]);
    } finally {
      setLoadingSliders(false);
    }
  };

  const loadCollections = async () => {
    if (!branchId) return;
    try {
      const response = await collectionsService.list(branchId);
      setCollections(response.data || []);
    } catch (error) {
      console.error('Error cargando colecciones:', error);
      setCollections([]);
    }
  };

  const getRedirectUrl = (slider: LandingSlider): string => {
    if (slider.redirect_type === 'url' && slider.redirect_url) {
      return slider.redirect_url;
    }
    if (slider.redirect_type === 'category' && slider.redirect_target_id) {
      return `/products?category=${slider.redirect_target_id}`;
    }
    if (slider.redirect_type === 'promotion' && slider.redirect_target_id) {
      return `/products?promotion=${slider.redirect_target_id}`;
    }
    if (slider.redirect_type === 'branch' && slider.redirect_target_id) {
      return `/sucursal/${slider.redirect_target_id}`;
    }
    return '/products';
  };

  const getDefaultSlider = (): SlideContent => {
    const storeData = contextType === 'grupo' ? groupData : branchData;
    const storeName = storeData?.name || 'Agora';
    const storeDescription = storeData?.description || '';

    return {
      id: 'default',
      gradientColors: ['#ef4444', '#dc2626', '#991b1b'],
      decorativeElements: true,
      overlay: {
        position: 'left',
        badge: 'BIENVENIDO',
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
    };
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
            {loadingSliders ? (
              <div className="w-full h-[810px] bg-gray-200 animate-pulse flex items-center justify-center">
                <p className="text-gray-500">Cargando sliders...</p>
              </div>
            ) : (
              <PromotionalSlider
                slides={sliders}
                autoPlay={true}
                autoPlayInterval={5000}
                height="810px"
              />
            )}

            {/* Tarjetas Inteligentes */}
            {/* TODO: Rehabilitar SmartCategoryCards cuando se requiera */}
            {false && <SmartCategoryCards />}

            {/* Contenido con contenedor */}
            <div className="max-w-7xl mx-auto px-4 py-6">

            <RecentlyViewedProducts />

            {collections.length > 0 && (
              <CollectionsCarousel collections={collections} />
            )}

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

