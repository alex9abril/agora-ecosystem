/**
 * Categorías principales — layout estilo Parts Center Online:
 * tile gris claro + foto de producto centrada + nombre abajo en negrita.
 */

import React, { useEffect, useMemo, useState } from 'react';
import ContextualLink from './ContextualLink';
import { ProductCategory } from '@/lib/categories';
import { productsService } from '@/lib/products';
import { useAppSelector } from '@/store/hooks';
import { selectRootCategories, selectCategoriesInitialized } from '@/store/slices/categoriesSlice';
import { useStoreContext } from '@/contexts/StoreContext';
import { getCategoryIconFromData } from '@/lib/category-icons';

interface TopCategoriesSectionProps {
  className?: string;
  maxItems?: number;
  title?: string;
  description?: string;
}

interface CategoryTile {
  id: string;
  name: string;
  link: string;
  categoryData: ProductCategory;
  imageUrl?: string | null;
}

export default function TopCategoriesSection({
  className = '',
  maxItems = 10,
  title = 'Categorías principales',
  description = 'Dale a tu vehículo el cuidado que merece. Explora nuestras categorías más populares.',
}: TopCategoriesSectionProps) {
  const rootCategories = useAppSelector(selectRootCategories);
  const categoriesInitialized = useAppSelector(selectCategoriesInitialized);
  const { branchId, groupId, brandId } = useStoreContext();
  const [tiles, setTiles] = useState<CategoryTile[]>([]);
  const [loading, setLoading] = useState(true);

  const baseCategories = useMemo(
    () =>
      rootCategories.slice(0, maxItems).map((cat: ProductCategory) => ({
        id: cat.id,
        name: cat.name,
        link: `/products?categoryId=${cat.id}`,
        categoryData: cat,
      })),
    [rootCategories, maxItems],
  );

  useEffect(() => {
    if (!categoriesInitialized) return;
    if (baseCategories.length === 0) {
      setTiles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const withImages = await Promise.all(
          baseCategories.map(async (cat) => {
            if (cat.categoryData.icon_url) {
              return { ...cat, imageUrl: cat.categoryData.icon_url };
            }
            try {
              const res = await productsService.getProducts({
                categoryId: cat.id,
                branchId: branchId || undefined,
                groupId: groupId || undefined,
                brandId: brandId || undefined,
                limit: 1,
                page: 1,
                isAvailable: true,
              });
              const product = res.data?.[0];
              const imageUrl = product?.primary_image_url || product?.image_url || null;
              return { ...cat, imageUrl };
            } catch {
              return {
                ...cat,
                imageUrl: null,
              };
            }
          }),
        );
        if (!cancelled) setTiles(withImages);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [baseCategories, categoriesInitialized, branchId, groupId, brandId]);

  if (!categoriesInitialized || loading) {
    return (
      <section className={`py-12 md:py-14 ${className}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-8 w-64 bg-neutral-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-full max-w-xl bg-neutral-100 animate-pulse rounded mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[5/4] bg-[#f3f3f3] animate-pulse rounded-md" />
                <div className="h-4 w-3/4 bg-neutral-200 animate-pulse rounded mt-3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (tiles.length === 0) return null;

  return (
    <section className={`py-12 md:py-14 bg-white ${className}`} aria-label={title}>
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="font-display text-[28px] md:text-[32px] font-semibold text-neutral-900 leading-tight mb-2">
          {title}
        </h2>
        <p className="text-[15px] md:text-base text-neutral-600 mb-8 md:mb-10 max-w-2xl">
          {description}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-y-10">
          {tiles.map((category) => (
            <ContextualLink
              key={category.id}
              href={category.link}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-md"
            >
              {/* Contenedor gris claro — estilo TPCO */}
              <div className="relative aspect-[5/4] bg-[#f3f3f3] rounded-md overflow-hidden">
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-400 [&_svg]:!w-12 [&_svg]:!h-12 md:[&_svg]:!w-14 md:[&_svg]:!h-14">
                    {getCategoryIconFromData({
                      name: category.categoryData.name,
                      icon_url: undefined,
                      mui_icon_name: undefined,
                    })}
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-[15px] md:text-base font-bold text-neutral-900 leading-snug group-hover:underline underline-offset-2">
                {category.name}
              </h3>
            </ContextualLink>
          ))}
        </div>
      </div>
    </section>
  );
}
