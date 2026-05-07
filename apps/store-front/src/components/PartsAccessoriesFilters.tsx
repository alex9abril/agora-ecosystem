import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchSubcategories,
  selectCategoriesInitialized,
  selectCategoriesLoading,
  selectRootCategories,
} from '@/store/slices/categoriesSlice';

type Props = {
  className?: string;
  title?: string;
};

function buildNextQuery(
  currentQuery: Record<string, any>,
  nextCategoryId: string | null,
): Record<string, any> {
  const query = { ...currentQuery };

  if (Array.isArray(query.categoryId)) query.categoryId = query.categoryId[0];
  if (Array.isArray(query.collectionId)) query.collectionId = query.collectionId[0];
  if (Array.isArray(query.search)) query.search = query.search[0];

  if (nextCategoryId) query.categoryId = nextCategoryId;
  else delete query.categoryId;

  // Evitar combinaciones confusas: categoría + colección
  delete query.collectionId;

  return query;
}

export default function PartsAccessoriesFilters({
  className = '',
  title = 'Partes y accesorios',
}: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const rootCategories = useAppSelector(selectRootCategories);
  const loading = useAppSelector(selectCategoriesLoading);
  const initialized = useAppSelector(selectCategoriesInitialized);
  const subcategoriesByParent = useAppSelector((s) => s.categories.subcategoriesByParent);

  const selectedCategoryIdRaw = router.query.categoryId;
  const selectedCategoryId =
    typeof selectedCategoryIdRaw === 'string'
      ? selectedCategoryIdRaw
      : Array.isArray(selectedCategoryIdRaw)
        ? selectedCategoryIdRaw[0]
        : '';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedRootIds, setExpandedRootIds] = useState<Set<string>>(() => new Set());
  const [expandedChildIds, setExpandedChildIds] = useState<Set<string>>(() => new Set());

  const filteredRoots = useMemo(() => {
    const list = Array.isArray(rootCategories) ? rootCategories : [];
    return list;
  }, [rootCategories]);

  const goToCategory = async (categoryId: string | null) => {
    await router.push(
      { pathname: '/products', query: buildNextQuery(router.query as any, categoryId) },
      undefined,
      { shallow: true },
    );
  };

  const ensureSubcategories = async (parentId: string) => {
    if (!initialized) return;
    const existing = subcategoriesByParent?.[parentId];
    if (Array.isArray(existing) && existing.length > 0) return;
    try {
      await dispatch(fetchSubcategories(parentId)).unwrap();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!selectedCategoryId) return;

    const roots = Array.isArray(rootCategories) ? rootCategories : [];
    const isRoot = roots.some((r) => r.id === selectedCategoryId);
    if (isRoot) {
      setExpandedRootIds((prev) => {
        if (prev.has(selectedCategoryId)) return prev;
        const next = new Set(prev);
        next.add(selectedCategoryId);
        return next;
      });
      void ensureSubcategories(selectedCategoryId);
      return;
    }

    // Intentar expandir el root que contiene la categoría seleccionada (si ya está cacheado).
    for (const root of roots) {
      const subcats = subcategoriesByParent?.[root.id] || [];
      if (subcats.some((c) => c.id === selectedCategoryId)) {
        setExpandedRootIds((prev) => {
          const next = new Set(prev);
          next.add(root.id);
          return next;
        });
        void ensureSubcategories(root.id);
        break;
      }
    }
  }, [selectedCategoryId, rootCategories, subcategoriesByParent]);

  const toggleRootExpanded = (rootId: string) => {
    setExpandedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
    void ensureSubcategories(rootId);
  };

  const toggleChildExpanded = (categoryId: string) => {
    setExpandedChildIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
    void ensureSubcategories(categoryId);
  };

  const content = (
    <div>
      <nav className={`py-2 ${className}`} aria-label="Filtros de categorías">
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">Comprar todas las partes y accesorios</p>
        </div>

      <button
        type="button"
        onClick={() => {
          setMobileOpen(false);
          void goToCategory(null);
        }}
        className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-colors group text-left ${
          !selectedCategoryId ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="flex-1 font-medium">Todos los productos</span>
        <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <div className="px-6 py-3 border-t border-gray-200 mt-2">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
      </div>

      {(!initialized || loading) && (
        <div className="px-6 py-3 text-sm text-gray-500">Cargando categorías...</div>
      )}

      {initialized && !loading && filteredRoots.length === 0 && (
        <div className="px-6 py-3 text-sm text-gray-500">No hay categorías que coincidan.</div>
      )}

      {filteredRoots.map((root) => {
        const isExpanded = expandedRootIds.has(root.id);
        const subcats = subcategoriesByParent?.[root.id] || [];
        return (
          <div key={root.id}>
            <button
              type="button"
              onClick={() => toggleRootExpanded(root.id)}
              className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group text-left"
              aria-expanded={isExpanded}
            >
              <span className="flex-1 font-medium">{root.name}</span>
              <ChevronRightIcon
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void goToCategory(root.id);
                  }}
                  className={`w-full flex items-center gap-3 pl-10 pr-6 py-2 text-sm transition-colors text-left ${
                    root.id === selectedCategoryId
                      ? 'bg-toyota-red/5 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex-1 font-medium">{`Todo ${root.name}`}</span>
                </button>

                {initialized && !loading && subcats.length === 0 && (
                  <div className="pl-10 pr-6 py-2 text-sm text-gray-500">Sin subcategorías</div>
                )}

                {subcats.map((sc) => (
                  <div key={sc.id}>
                    <button
                      type="button"
                      onClick={() => toggleChildExpanded(sc.id)}
                      className={`w-full flex items-center gap-3 pl-10 pr-6 py-2.5 text-sm transition-colors group text-left ${
                        sc.id === selectedCategoryId
                          ? 'bg-toyota-red/5 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      aria-expanded={expandedChildIds.has(sc.id)}
                      aria-current={sc.id === selectedCategoryId ? 'page' : undefined}
                    >
                      <span className="flex-1 font-medium">{sc.name}</span>
                      <ChevronRightIcon
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          expandedChildIds.has(sc.id) ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {expandedChildIds.has(sc.id) && (
                      <div className="pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileOpen(false);
                            void goToCategory(sc.id);
                          }}
                          className={`w-full flex items-center gap-3 pl-14 pr-6 py-2 text-sm transition-colors text-left ${
                            sc.id === selectedCategoryId
                              ? 'bg-toyota-red/5 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="flex-1 font-medium">{`Todo ${sc.name}`}</span>
                        </button>

                        {(subcategoriesByParent?.[sc.id] || []).length === 0 && initialized && !loading && (
                          <div className="pl-14 pr-6 py-2 text-sm text-gray-500">
                            Sin subcategorías
                          </div>
                        )}

                        {(subcategoriesByParent?.[sc.id] || []).map((ssc) => (
                          <button
                            key={ssc.id}
                            type="button"
                            onClick={() => {
                              setMobileOpen(false);
                              void goToCategory(ssc.id);
                            }}
                            className={`w-full flex items-center gap-3 pl-14 pr-6 py-2.5 text-sm transition-colors group text-left ${
                              ssc.id === selectedCategoryId
                                ? 'bg-toyota-red/5 text-gray-900'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-current={ssc.id === selectedCategoryId ? 'page' : undefined}
                          >
                            <span className="flex-1 font-medium">{ssc.name}</span>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      </nav>
    </div>
  );

  return (
    <div>
      <div className="md:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm"
        >
          <span className="text-sm font-medium text-gray-900">Filtrar por categoría</span>
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar filtros"
            />
            <div className="absolute left-0 top-0 bottom-0 w-[90%] max-w-sm bg-white shadow-xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Filtros</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <CloseIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {content}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {content}
      </div>
    </div>
  );
}
