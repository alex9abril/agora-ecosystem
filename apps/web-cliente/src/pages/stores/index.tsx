/**
 * Página de listado de tiendas
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import StoreCard from '@/components/StoreCard';
import { useI18n } from '@/contexts/I18nContext';
import { storesService, Business } from '@/lib/stores';

export default function StoresPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [stores, setStores] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const search = router.query.search as string;
    if (search) {
      setSearchQuery(search);
    }
    loadStores();
  }, [router.query, selectedCategory, page]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await storesService.getStores({
        page,
        limit: 12,
        isActive: true,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });
      
      if (page === 1) {
        setStores(response.data || []);
      } else {
        setStores((prev) => [...prev, ...(response.data || [])]);
      }
      
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStores();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <>
      <Head>
        <title>{t('stores.title')} - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('stores.title')}
          </h1>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('stores.searchPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </form>
        </div>

        {loading && stores.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('stores.loading')}</p>
          </div>
        ) : stores.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? t('common.loading') : t('common.next')}
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('stores.noStores')}</p>
          </div>
        )}
      </MobileLayout>
    </>
  );
}

