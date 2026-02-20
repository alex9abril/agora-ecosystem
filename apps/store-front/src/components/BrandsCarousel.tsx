/**
 * Carrusel de marcas (solo decorativo). Solo se muestra en contexto global.
 * La lista de marcas viene de public/logos/brands.json; cada entrada indica
 * nombre y archivo de logo en esa carpeta. Sin enlaces ni API de marcas.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';

export type LogoBrand = { name: string; logo: string };

const BRANDS_JSON = '/logos/brands.json';

export default function BrandsCarousel() {
  const { contextType } = useStoreContext();
  const [brands, setBrands] = useState<LogoBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsPerView, setItemsPerView] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (contextType !== 'global') return;
    setLoading(true);
    fetch(BRANDS_JSON)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => (Array.isArray(data) ? data : []))
      .catch(() => [])
      .then(setBrands)
      .finally(() => setLoading(false));
  }, [contextType]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateItems = () => {
      const width = window.innerWidth;
      if (width < 640) setItemsPerView(1);
      else if (width < 1024) setItemsPerView(2);
      else if (width < 1280) setItemsPerView(3);
      else setItemsPerView(5);
    };
    updateItems();
    window.addEventListener('resize', updateItems);
    return () => window.removeEventListener('resize', updateItems);
  }, []);

  useEffect(() => setCurrentIndex(0), [itemsPerView, brands.length]);

  const pages = useMemo(() => Math.max(1, Math.ceil(brands.length / itemsPerView)), [brands.length, itemsPerView]);
  const startIndex = currentIndex * itemsPerView;
  const visibleItems = brands.slice(startIndex, startIndex + itemsPerView);

  const goToNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % pages), [pages]);
  const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + pages) % pages);

  const AUTO_ADVANCE_MS = 5000;
  useEffect(() => {
    if (pages <= 1) return;
    const timer = setInterval(goToNext, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [pages, goToNext]);

  if (contextType !== 'global') return null;
  if (loading || brands.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {visibleItems.map((brand, idx) => (
          <div
            key={`${brand.name}-${idx}`}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col"
          >
            <div className="bg-gray-100 flex items-center justify-center overflow-hidden p-2 min-h-0">
              <img
                src={`/logos/${brand.logo}`}
                alt={brand.name}
                className="h-14 w-auto object-contain"
              />
            </div>
          </div>
        ))}
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
