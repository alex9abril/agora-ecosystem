import React, { useEffect, useMemo, useState } from 'react';
import { StoreCollection } from '@/lib/collections';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContextualLink from '@/components/ContextualLink';

interface CollectionsCarouselProps {
  collections: StoreCollection[];
}

export default function CollectionsCarousel({ collections }: CollectionsCarouselProps) {
  const [itemsPerView, setItemsPerView] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const updateItems = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1);
      } else if (width < 1024) {
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
  }, [itemsPerView, collections.length]);

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(collections.length / itemsPerView));
  }, [collections.length, itemsPerView]);

  if (collections.length === 0) {
    return null;
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pages);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + pages) % pages);
  };

  const startIndex = currentIndex * itemsPerView;
  const visible = collections.slice(startIndex, startIndex + itemsPerView);

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Colecciones</h2>
          <p className="text-base text-gray-600">
            Descubre selecciones especiales para encontrar lo que mejor se adapta a ti.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {visible.map((collection) => (
            <ContextualLink key={collection.id} href={`/products?collectionId=${collection.id}`}>
              <div className="space-y-2">
                {collection.image_url ? (
                  <img
                    src={collection.image_url}
                    alt={collection.name}
                    className="h-96 w-full rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <div className="h-96 w-full rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                    <svg
                      className="h-10 w-10"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5h18v14H3z M8 13l2-2 3 3 2-2 4 4"
                      />
                    </svg>
                  </div>
                )}
                <p className="text-base font-semibold text-gray-900">{collection.name}</p>
              </div>
            </ContextualLink>
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
