/**
 * Página de inicio
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MobileLayout from '@/components/layout/MobileLayout';
import StoreCard from '@/components/StoreCard';
import { useI18n } from '@/contexts/I18nContext';
import { storesService, Business } from '@/lib/stores';
import { productsService, Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';

export default function HomePage() {
  const { t } = useI18n();
  const [featuredStores, setFeaturedStores] = useState<Business[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar tiendas destacadas (activas y verificadas)
      const storesResponse = await storesService.getStores({
        page: 1,
        limit: 6,
        isActive: true,
        sortBy: 'rating_average',
        sortOrder: 'desc',
      });
      
      // Cargar productos destacados
      const productsResponse = await productsService.getProducts({
        page: 1,
        limit: 8,
        isAvailable: true,
        isFeatured: true,
      });

      setFeaturedStores(storesResponse.data || []);
      setFeaturedProducts(productsResponse.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/stores?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      <Head>
        <title>{t('home.title')} - Localia</title>
        <meta name="description" content={t('home.subtitle')} />
      </Head>
      <MobileLayout>
        {/* Hero section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('home.title')}
          </h1>
          <p className="text-gray-600 mb-4">
            {t('home.subtitle')}
          </p>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors font-medium"
              >
                {t('common.search')}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Featured Stores */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('home.featuredStores')}</h2>
                <a
                  href="/stores"
                  className="text-black hover:text-gray-700 text-sm font-medium"
                >
                  {t('home.seeAll')}
                </a>
              </div>
              {featuredStores.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {featuredStores.map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t('stores.noStores')}
                </p>
              )}
            </section>

            {/* Featured Products */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{t('products.title')}</h2>
                <a
                  href="/products"
                  className="text-green-600 text-sm font-medium"
                >
                  {t('home.seeAll')}
                </a>
              </div>
              {featuredProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {t('products.noProducts')}
                </p>
              )}
            </section>
          </>
        )}
      </MobileLayout>
    </>
  );
}

