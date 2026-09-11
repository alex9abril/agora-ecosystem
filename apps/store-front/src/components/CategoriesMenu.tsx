/**
 * Menú de categorías — panel lateral estilo Parts Center Online (megamenu).
 * Drill-down de categorías + bloque Popular con tiles de imagen.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProductCategory, categoriesService } from '@/lib/categories';
import { collectionsService, StoreCollection } from '@/lib/collections';
import { productsService } from '@/lib/products';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { store } from '@/store';
import {
  selectRootCategories,
  selectSubcategories,
  selectCategoriesLoading,
  selectCategoriesInitialized,
  fetchSubcategories,
} from '@/store/slices/categoriesSlice';
import ContextualLink from './ContextualLink';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';

interface CategoriesMenuProps {
  className?: string;
  onCategoryClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface CategoryWithChildren extends ProductCategory {
  children?: CategoryWithChildren[];
}

interface PopularTile {
  id: string;
  name: string;
  link: string;
  imageUrl?: string | null;
}

const STORAGE_KEY = 'recent_categories';

export default function CategoriesMenu({
  className = '',
  onCategoryClick,
  isOpen = true,
  onClose,
}: CategoriesMenuProps) {
  const router = useRouter();
  const { contextType, getContextualUrl, branchId, groupId, brandId } = useStoreContext();
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();

  const rootCategoriesFromRedux = useAppSelector(selectRootCategories);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  const categoriesInitialized = useAppSelector(selectCategoriesInitialized);
  const subcategoriesByParent = useAppSelector((state) => state.categories.subcategoriesByParent);

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductCategory | null>(null);
  const [subSubcategories, setSubSubcategories] = useState<Record<string, ProductCategory[]>>({});
  const [recentCategories, setRecentCategories] = useState<ProductCategory[]>([]);
  const [collections, setCollections] = useState<StoreCollection[]>([]);
  const [popularTiles, setPopularTiles] = useState<PopularTile[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  const rootCategories: CategoryWithChildren[] = useMemo(
    () => rootCategoriesFromRedux.map((cat) => ({ ...cat, children: [] })),
    [rootCategoriesFromRedux],
  );

  const subcategories = useAppSelector((state) =>
    selectedCategory ? selectSubcategories(state, selectedCategory.id) : [],
  );

  const saveRecentCategory = (category: ProductCategory) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let recent: ProductCategory[] = stored ? JSON.parse(stored) : [];
      recent = recent.filter((cat) => cat.id !== category.id);
      recent.unshift(category);
      recent = recent.slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
      setRecentCategories(recent);
    } catch (error) {
      console.error('Error guardando categoría reciente:', error);
    }
  };

  const loadRecentCategories = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setRecentCategories(JSON.parse(stored));
    } catch (error) {
      console.error('Error cargando categorías recientes:', error);
    }
  };

  useEffect(() => {
    loadRecentCategories();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const { categoryId } = router.query;
    if (categoryId && typeof categoryId === 'string') {
      categoriesService
        .getCategoryById(categoryId)
        .then(saveRecentCategory)
        .catch((error) => console.error('Error cargando categoría desde URL:', error));
    }
  }, [router.isReady, router.query.categoryId]);

  useEffect(() => {
    if (!isOpen) return;
    if (contextType !== 'sucursal' || !branchId) {
      setCollections([]);
      return;
    }
    let active = true;
    collectionsService
      .list(branchId)
      .then((response) => {
        if (active) setCollections(response.data || []);
      })
      .catch(() => {
        if (active) setCollections([]);
      });
    return () => {
      active = false;
    };
  }, [isOpen, contextType, branchId]);

  // Popular: hasta 4 tiles con imagen de producto (recientes o primeras categorías)
  useEffect(() => {
    if (!isOpen || !categoriesInitialized) return;
    const sources =
      recentCategories.length > 0
        ? recentCategories.slice(0, 4)
        : rootCategories.slice(0, 4);
    if (sources.length === 0) {
      setPopularTiles([]);
      return;
    }

    let cancelled = false;
    setLoadingPopular(true);

    Promise.all(
      sources.map(async (cat) => {
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
          return {
            id: cat.id,
            name: cat.name,
            link: `/products?categoryId=${cat.id}`,
            imageUrl: product?.primary_image_url || product?.image_url || cat.icon_url || null,
          } as PopularTile;
        } catch {
          return {
            id: cat.id,
            name: cat.name,
            link: `/products?categoryId=${cat.id}`,
            imageUrl: cat.icon_url || null,
          } as PopularTile;
        }
      }),
    ).then((tiles) => {
      if (!cancelled) {
        setPopularTiles(tiles);
        setLoadingPopular(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    categoriesInitialized,
    recentCategories,
    rootCategories,
    branchId,
    groupId,
    brandId,
  ]);

  useEffect(() => {
    if (selectedCategory && categoriesInitialized) {
      const state = store.getState();
      const current = selectSubcategories(state, selectedCategory.id);
      if (current.length === 0) dispatch(fetchSubcategories(selectedCategory.id));
    } else {
      setSubSubcategories({});
    }
  }, [selectedCategory, categoriesInitialized, dispatch]);

  useEffect(() => {
    if (subcategories.length === 0) return;
    const load = async () => {
      const map: Record<string, ProductCategory[]> = {};
      for (const subcat of subcategories) {
        try {
          const state = store.getState();
          const existing = selectSubcategories(state, subcat.id);
          if (existing.length > 0) {
            map[subcat.id] = existing;
          } else {
            await dispatch(fetchSubcategories(subcat.id));
            const loaded = selectSubcategories(store.getState(), subcat.id);
            if (loaded.length > 0) map[subcat.id] = loaded;
          }
        } catch (err) {
          console.error('Error cargando sub-subcategorías:', err);
        }
      }
      setSubSubcategories(map);
    };
    load();
  }, [subcategories, dispatch]);

  // Reset drill-down al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    }
  }, [isOpen]);

  const handleCategoryClick = (category: ProductCategory, event?: React.MouseEvent) => {
    if (event) event.preventDefault();
    setSelectedCategory(category);
    setSelectedSubcategory(null);
  };

  const handleSubcategoryClick = (subcategory: ProductCategory, event?: React.MouseEvent) => {
    const subSubcats = subSubcategories[subcategory.id] || [];
    if (subSubcats.length > 0 && event) {
      event.preventDefault();
      setSelectedSubcategory(subcategory);
    } else {
      navigateToCategory(subcategory);
    }
  };

  const navigateToCategory = (category: ProductCategory) => {
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    router.push({ pathname: urlObj.pathname, query: queryParams }, undefined, { shallow: false });
    onCategoryClick?.();
  };

  const closeAfterNav = () => onCategoryClick?.();

  if (!isOpen) return null;

  const rowClass =
    'w-full flex items-center justify-between gap-3 px-5 py-3.5 text-[15px] text-neutral-900 hover:bg-[#f6f6f6] transition-colors text-left';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />

      <div
        className={`fixed left-0 top-0 bottom-0 w-[min(100vw,420px)] bg-white shadow-2xl z-50 overflow-hidden flex flex-col ${className}`}
        role="dialog"
        aria-label="Menú de categorías"
      >
        {/* Header sticky estilo megamenu */}
        <div className="flex-shrink-0 border-b border-neutral-200 bg-white">
          <div className="flex items-start justify-between px-5 pt-5 pb-2">
            <div className="min-w-0 flex-1 pr-3">
              {!isAuthenticated && (
                <ContextualLink
                  href="/auth/login"
                  onClick={closeAfterNav}
                  className="inline-flex items-center gap-1.5 text-[15px] text-neutral-900 underline underline-offset-2 hover:no-underline mb-4"
                >
                  <PersonOutlineIcon className="w-4 h-4" />
                  Inicia sesión o crea una cuenta
                </ContextualLink>
              )}
              <h2 className="font-display text-[28px] md:text-[32px] font-semibold text-neutral-900 leading-tight tracking-tight">
                Partes y Accesorios
              </h2>
              <ContextualLink
                href="/products"
                onClick={closeAfterNav}
                className="inline-block mt-1 text-[15px] text-neutral-700 underline underline-offset-2 hover:no-underline"
              >
                Comprar todas las partes y accesorios
              </ContextualLink>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-1 -mt-1 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <CloseIcon className="w-5 h-5 text-neutral-800" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {/* Vista raíz */}
          <div
            className={`absolute inset-0 overflow-y-auto transition-transform duration-300 ease-in-out ${
              selectedCategory ? '-translate-x-full' : 'translate-x-0'
            }`}
            style={{ zIndex: selectedCategory ? 1 : 10 }}
          >
            {categoriesLoading && rootCategories.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-neutral-500">
                Cargando categorías...
              </div>
            ) : (
              <nav className="pb-8" aria-label="Menú principal">
                {/* Popular */}
                {(loadingPopular || popularTiles.length > 0) && (
                  <div className="px-5 pt-5 pb-2">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500 mb-3">
                      Popular
                    </h3>
                    {loadingPopular && popularTiles.length === 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="aspect-[5/4] bg-[#f3f3f3] rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {popularTiles.map((tile) => (
                          <ContextualLink
                            key={tile.id}
                            href={tile.link}
                            onClick={closeAfterNav}
                            className="group block"
                          >
                            <div className="aspect-[5/4] bg-[#f3f3f3] rounded-lg overflow-hidden flex items-center justify-center p-3">
                              {tile.imageUrl ? (
                                <img
                                  src={tile.imageUrl}
                                  alt=""
                                  className="max-h-full max-w-full object-contain group-hover:scale-[1.03] transition-transform"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-xs text-neutral-400">Sin imagen</span>
                              )}
                            </div>
                            <p className="mt-2 text-[14px] font-semibold text-neutral-900 leading-snug group-hover:underline">
                              {tile.name}
                            </p>
                          </ContextualLink>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Shop Categories */}
                <div className="px-5 pt-6 pb-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                    Comprar categorías
                  </h3>
                </div>
                <ul className="border-t border-neutral-100">
                  <li className="border-b border-neutral-100">
                    <ContextualLink
                      href="/products"
                      onClick={closeAfterNav}
                      className={rowClass}
                    >
                      <span className="font-semibold">Todos los productos</span>
                      <ChevronRightIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    </ContextualLink>
                  </li>
                  {rootCategories.map((category) => {
                    const hasChildren = categoriesInitialized
                      ? (subcategoriesByParent?.[category.id]?.length ?? 0) > 0
                      : true;
                    return (
                      <li key={category.id} className="border-b border-neutral-100">
                        <button
                          type="button"
                          onClick={(e) => handleCategoryClick(category, e)}
                          className={rowClass}
                        >
                          <span className="font-medium">{category.name}</span>
                          {hasChildren && (
                            <ChevronRightIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Colecciones */}
                {collections.length > 0 && (
                  <>
                    <div className="px-5 pt-6 pb-2">
                      <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                        Colecciones destacadas
                      </h3>
                    </div>
                    <ul className="border-t border-neutral-100">
                      {collections.map((collection) => (
                        <li key={collection.id} className="border-b border-neutral-100">
                          <ContextualLink
                            href={`/products?collectionId=${collection.id}`}
                            onClick={closeAfterNav}
                            className={rowClass}
                          >
                            <span className="font-medium">{collection.name}</span>
                            <ChevronRightIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          </ContextualLink>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Ayuda */}
                <div className="px-5 pt-6 pb-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
                    Ayuda y soporte
                  </h3>
                </div>
                <ul className="border-t border-neutral-100">
                  <li className="border-b border-neutral-100">
                    <ContextualLink href="/orders" onClick={closeAfterNav} className={rowClass}>
                      <span>Seguir un pedido</span>
                    </ContextualLink>
                  </li>
                  <li className="border-b border-neutral-100">
                    <ContextualLink href="/profile" onClick={closeAfterNav} className={rowClass}>
                      <span>Mi cuenta</span>
                    </ContextualLink>
                  </li>
                </ul>
              </nav>
            )}
          </div>

          {/* Subcategorías */}
          {selectedCategory && !selectedSubcategory && (
            <div
              className="absolute inset-0 overflow-y-auto translate-x-0 bg-white"
              style={{ zIndex: 20 }}
            >
              <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-[15px] text-neutral-900 underline underline-offset-2 hover:no-underline mb-3"
                >
                  <ArrowBackIcon className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-neutral-900 leading-tight">
                    {selectedCategory.name}
                  </h2>
                  <ContextualLink
                    href={`/products?categoryId=${selectedCategory.id}`}
                    className="text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:no-underline whitespace-nowrap"
                    onClick={closeAfterNav}
                  >
                    Ver todo
                  </ContextualLink>
                </div>
              </div>

              <div className="py-1">
                {subcategories.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-neutral-500">
                    Cargando subcategorías...
                  </div>
                ) : (
                  <ul>
                    <li className="border-b border-neutral-100">
                      <button
                        type="button"
                        onClick={() => navigateToCategory(selectedCategory)}
                        className={rowClass}
                      >
                        <span className="font-semibold">Todo {selectedCategory.name}</span>
                      </button>
                    </li>
                    {subcategories.map((subcategory) => {
                      const hasSub = (subSubcategories[subcategory.id] || []).length > 0;
                      return (
                        <li key={subcategory.id} className="border-b border-neutral-100">
                          <button
                            type="button"
                            onClick={(e) => handleSubcategoryClick(subcategory, e)}
                            className={rowClass}
                          >
                            <span className="font-medium">{subcategory.name}</span>
                            {hasSub && (
                              <ChevronRightIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Nivel 3 */}
          {selectedSubcategory && (
            <div className="absolute inset-0 overflow-y-auto translate-x-0 bg-white" style={{ zIndex: 30 }}>
              <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory(null)}
                  className="inline-flex items-center gap-1.5 text-[15px] text-neutral-900 underline underline-offset-2 hover:no-underline mb-3"
                >
                  <ArrowBackIcon className="w-4 h-4" />
                  Atrás
                </button>
                <div className="flex items-end justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold text-neutral-900 leading-tight">
                    {selectedSubcategory.name}
                  </h2>
                  <ContextualLink
                    href={`/products?categoryId=${selectedSubcategory.id}`}
                    className="text-[13px] font-medium text-neutral-700 underline underline-offset-2 hover:no-underline whitespace-nowrap"
                    onClick={closeAfterNav}
                  >
                    Ver todo
                  </ContextualLink>
                </div>
              </div>

              <ul className="py-1">
                <li className="border-b border-neutral-100">
                  <button
                    type="button"
                    onClick={() => navigateToCategory(selectedSubcategory)}
                    className={rowClass}
                  >
                    <span className="font-semibold">Todo {selectedSubcategory.name}</span>
                  </button>
                </li>
                {(subSubcategories[selectedSubcategory.id] || []).map((subSubcat) => (
                  <li key={subSubcat.id} className="border-b border-neutral-100">
                    <button
                      type="button"
                      onClick={() => navigateToCategory(subSubcat)}
                      className={rowClass}
                    >
                      <span className="font-medium">{subSubcat.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
