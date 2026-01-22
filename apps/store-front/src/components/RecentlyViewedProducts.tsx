import React, { useEffect, useMemo, useState } from 'react';
import ContextualLink from './ContextualLink';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatPrice } from '@/lib/format';

type RecentlyViewedProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price?: number | null;
  branch_price?: number | null;
  image_url?: string | null;
  primary_image_url?: string | null;
};

const STORAGE_KEY = 'recently_viewed_products';

export default function RecentlyViewedProducts() {
  const { contextType } = useStoreContext();
  const [items, setItems] = useState<RecentlyViewedProduct[]>([]);
  const [itemsPerView, setItemsPerView] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch (error) {
      console.error('Error leyendo productos vistos recientemente:', error);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const updateItems = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1);
      } else if (width < 1024) {
        setItemsPerView(2);
      } else if (width < 1280) {
        setItemsPerView(3);
      } else {
        setItemsPerView(5);
      }
    };
    updateItems();
    window.addEventListener('resize', updateItems);
    return () => window.removeEventListener('resize', updateItems);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [itemsPerView, items.length]);

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / itemsPerView));
  }, [items.length, itemsPerView]);

  const startIndex = currentIndex * itemsPerView;
  const visibleItems = items.slice(startIndex, startIndex + itemsPerView);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pages);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + pages) % pages);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Vistos recientemente</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {visibleItems.map((product) => {
          const displayPrice =
            contextType === 'sucursal' && product.branch_price !== undefined && product.branch_price !== null
              ? product.branch_price
              : product.price;
          const displayImage = product.primary_image_url || product.image_url;

          return (
            <ContextualLink key={product.id} href={`/products/${product.id}`} className="group h-full">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
                <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={product.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="text-gray-300">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  {product.sku && <div className="text-[10px] text-gray-400 mb-1">#{product.sku}</div>}
                  <div className="text-sm font-semibold text-gray-900 mb-1">
                    {displayPrice !== undefined && displayPrice !== null ? formatPrice(displayPrice) : '—'}
                  </div>
                  <div className="text-sm text-gray-700 line-clamp-2">{product.name}</div>
                </div>
              </div>
            </ContextualLink>
          );
        })}
      </div>
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={goToPrevious}
            className="flex items-center justify-center w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full transition-all"
            aria-label="Anterior"
          >
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`rounded-full transition-all ${
                  index === currentIndex ? 'bg-black w-8 h-2' : 'bg-gray-400 w-2 h-2'
                }`}
                aria-label={`Ir a la página ${index + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="flex items-center justify-center w-9 h-9 bg-black text-white rounded-full transition-all"
            aria-label="Siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
