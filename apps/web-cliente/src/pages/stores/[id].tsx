/**
 * Página de detalle de tienda
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import ProductCardHorizontal from '@/components/ProductCardHorizontal';
import { useI18n } from '@/contexts/I18nContext';
import { storesService, Business } from '@/lib/stores';
import { productsService, Product } from '@/lib/products';
import StarIcon from '@mui/icons-material/Star';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface CategoryGroup {
  category_id: string;
  category_name: string;
  display_order: number;
  products: Product[];
}

export default function StoreDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = router.query;
  const [store, setStore] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadStoreData();
    }
  }, [id]);

  const loadStoreData = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      const [storeData, productsData] = await Promise.all([
        storesService.getStore(id),
        storesService.getStoreProducts(id, { limit: 100 }), // Aumentar límite para obtener todos
      ]);

      setStore(storeData);
      const productsList = productsData.data || [];
      setProducts(productsList);

      // Agrupar productos por categoría
      const grouped = groupProductsByCategory(productsList);
      setCategories(grouped);
    } catch (error) {
      console.error('Error cargando tienda:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupProductsByCategory = (productsList: Product[]): CategoryGroup[] => {
    // Crear un mapa de categorías
    const categoryMap = new Map<string, CategoryGroup>();

    productsList.forEach((product) => {
      const categoryId = product.category_id || 'uncategorized';
      const categoryName = product.category_name || 'Sin categoría';
      const categoryDisplayOrder = product.category_display_order || 999;
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: categoryName,
          display_order: categoryDisplayOrder,
          products: [],
        });
      }

      const category = categoryMap.get(categoryId)!;
      category.products.push(product);
    });

    // Convertir a array
    const categoriesArray = Array.from(categoryMap.values());
    
    // Ordenar productos dentro de cada categoría por display_order
    categoriesArray.forEach((category) => {
      category.products.sort((a, b) => {
        const orderA = a.display_order || 0;
        const orderB = b.display_order || 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // Si tienen el mismo orden, ordenar alfabéticamente
        return a.name.localeCompare(b.name);
      });
    });

    // Ordenar categorías por display_order
    categoriesArray.sort((a, b) => {
      // Primero por display_order
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      // Si tienen el mismo orden, ordenar alfabéticamente
      return a.category_name.localeCompare(b.category_name);
    });

    return categoriesArray;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (!store) {
    return (
      <MobileLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">{t('stores.noStores')}</p>
        </div>
      </MobileLayout>
    );
  }

  const rating = typeof store.rating_average === 'string' 
    ? parseFloat(store.rating_average) 
    : store.rating_average || 0;

  return (
    <>
      <Head>
        <title>{store.name} - Localia</title>
      </Head>
      <MobileLayout>
        {/* Store header - Estilo app de delivery */}
        <div className="mb-6">
          {/* Botón de regresar */}
          <button
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
              <ArrowBackIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>

          {/* Hero image */}
          {store.image_url && (
            <div className="relative -mx-4 mb-4">
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden">
                <img
                  src={store.image_url}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>
          )}

          {/* Store info card */}
          <div className="bg-white rounded-2xl shadow-lg -mt-8 relative z-10 p-5 mb-6 border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{store.name}</h1>
                {store.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{store.description}</p>
                )}
              </div>
            </div>

            {/* Rating and status */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
              {rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center">
                    <StarIcon className="text-yellow-400 text-lg" />
                    <span className="font-bold text-gray-900 ml-1">{rating.toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    ({store.total_reviews} {t('stores.reviews')})
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  store.is_active ? 'bg-green-600 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  store.is_active ? 'text-black' : 'text-gray-500'
                }`}>
                  {store.is_active ? t('stores.open') : t('stores.closed')}
                </span>
              </div>
            </div>

            {/* Address */}
            {store.address_city && (
              <div className="flex items-start gap-2">
                <LocationOnIcon className="text-gray-400 text-lg mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{store.address_street}</p>
                  <p className="text-xs text-gray-500">{store.address_city}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Products grouped by category */}
        <section className="space-y-8">
          {categories.length > 0 ? (
            categories.map((category) => (
              <div key={category.category_id} className="category-section">
                {/* Category header */}
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-6 bg-green-600 rounded-full"></div>
                    <h2 className="text-2xl font-bold text-black">
                      {category.category_name}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-3">
                    {category.products.length} {category.products.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>

                {/* Products in category */}
                <div className="space-y-3">
                  {category.products.map((product) => (
                    <ProductCardHorizontal key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))
          ) : products.length > 0 ? (
            // Fallback: si no hay categorías pero hay productos, mostrarlos sin agrupar
            <div>
              <div className="mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-6 bg-green-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-black">
                    {t('products.title')}
                  </h2>
                </div>
              </div>
              <div className="space-y-3">
                {products.map((product) => (
                  <ProductCardHorizontal key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <RestaurantIcon className="text-6xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">{t('products.noProducts')}</p>
            </div>
          )}
        </section>
      </MobileLayout>
    </>
  );
}

