/**
 * Carrusel de productos de la misma categoría (estilo colecciones).
 * Muestra 4 productos por vista en desktop, con navegación anterior/siguiente y puntos.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Product } from '@/lib/products';
import { useStoreContext } from '@/contexts/StoreContext';
import { useResolvedProductPrices } from '@/hooks/useResolvedProductPrices';
import { getProductBasePrice } from '@/lib/price-display';
import ProductCard from './ProductCard';

interface SimilarProductsCarouselProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

const ITEMS_PER_VIEW_DESKTOP = 4;

export default function SimilarProductsCarousel({
  products,
  title = 'Productos de la misma categoría',
  subtitle = 'Otros productos que podrían interesarte.',
}: SimilarProductsCarouselProps) {
  const { contextType, branchId } = useStoreContext();
  const [itemsPerView, setItemsPerView] = useState(ITEMS_PER_VIEW_DESKTOP);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const updateItems = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1);
      } else if (width < 1024) {
        setItemsPerView(2);
      } else {
        setItemsPerView(ITEMS_PER_VIEW_DESKTOP);
      }
    };
    updateItems();
    window.addEventListener('resize', updateItems);
    return () => window.removeEventListener('resize', updateItems);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
  }, [itemsPerView, products.length]);

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(products.length / itemsPerView));
  }, [products.length, itemsPerView]);

  const startIndex = currentIndex * itemsPerView;
  const visible = useMemo(
    () => products.slice(startIndex, startIndex + itemsPerView),
    [products, startIndex, itemsPerView],
  );
  const getBasePrice = useCallback(
    (product: Product, currentContextType: typeof contextType) =>
      getProductBasePrice(product, currentContextType),
    [],
  );
  const getBusinessId = useCallback((product: Product) => product.business_id, []);
  const { resolvedPrices, isPricePending } = useResolvedProductPrices({
    items: visible,
    contextType,
    branchId,
    getBasePrice,
    getBusinessId,
  });

  if (products.length === 0) {
    return null;
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pages);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + pages) % pages);
  };

  return (
    <div className="pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-base text-gray-600">{subtitle}</p>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${itemsPerView}, minmax(0, 1fr))`,
          }}
        >
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              overridePrice={resolvedPrices[p.id]}
              pricePending={isPricePending(p.id)}
            />
          ))}
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={goToPrevious}
              className="flex items-center justify-center w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full transition-all"
              aria-label="Anterior"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
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
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
