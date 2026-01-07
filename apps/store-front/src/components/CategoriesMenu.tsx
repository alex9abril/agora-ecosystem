/**
 * Componente de menú de categorías
 * Panel flotante lateral izquierdo moderno estilo Toyota
 * Muestra categorías principales y subcategorías al hacer hover/clic
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { ProductCategory, categoriesService } from '@/lib/categories';
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
import CategoryIcon from '@mui/icons-material/Category';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getCategoryIconFromData } from '@/lib/category-icons';

interface CategoriesMenuProps {
  className?: string;
  onCategoryClick?: () => void; // Callback para cerrar el menú cuando se hace clic en una categoría
  isOpen?: boolean; // Control de apertura/cierre del panel
  onClose?: () => void; // Callback para cerrar el panel
}

interface CategoryWithChildren extends ProductCategory {
  children?: CategoryWithChildren[];
}

export default function CategoriesMenu({ className = '', onCategoryClick, isOpen = true, onClose }: CategoriesMenuProps) {
  const router = useRouter();
  const { contextType, getContextualUrl } = useStoreContext();
  const dispatch = useAppDispatch();
  
  // Obtener categorías desde Redux
  const rootCategoriesFromRedux = useAppSelector(selectRootCategories);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  const categoriesInitialized = useAppSelector(selectCategoriesInitialized);
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<ProductCategory | null>(null);
  const [subSubcategories, setSubSubcategories] = useState<Record<string, ProductCategory[]>>({});
  const [loadingSubSubcategories, setLoadingSubSubcategories] = useState<Record<string, boolean>>({});
  const [recentCategories, setRecentCategories] = useState<ProductCategory[]>([]);

  // Convertir categorías de Redux al formato con children
  const rootCategories: CategoryWithChildren[] = useMemo(() => 
    rootCategoriesFromRedux.map(cat => ({
      ...cat,
      children: [],
    })), [rootCategoriesFromRedux]
  );

  // Obtener subcategorías desde Redux
  const subcategories = useAppSelector((state) => 
    selectedCategory ? selectSubcategories(state, selectedCategory.id) : []
  );

  // No seleccionar automáticamente - el usuario debe hacer clic

  // Funciones para manejar categorías recientes en localStorage
  const STORAGE_KEY = 'recent_categories';

  const saveRecentCategory = (category: ProductCategory) => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let recent: ProductCategory[] = stored ? JSON.parse(stored) : [];
      
      // Remover la categoría si ya existe (para evitar duplicados)
      recent = recent.filter(cat => cat.id !== category.id);
      
      // Agregar la nueva categoría al inicio
      recent.unshift(category);
      
      // Mantener solo las últimas 5
      recent = recent.slice(0, 5);
      
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
      
      // Actualizar el estado
      setRecentCategories(recent);
    } catch (error) {
      console.error('Error guardando categoría reciente:', error);
    }
  };

  const loadRecentCategories = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const recent: ProductCategory[] = JSON.parse(stored);
        setRecentCategories(recent);
      }
    } catch (error) {
      console.error('Error cargando categorías recientes:', error);
    }
  };

  // Cargar categorías recientes al montar el componente
  useEffect(() => {
    loadRecentCategories();
  }, []);

  // Detectar categoryId en la URL y guardar como categoría reciente
  useEffect(() => {
    if (!router.isReady) return;
    
    const { categoryId } = router.query;
    
    if (categoryId && typeof categoryId === 'string') {
      // Cargar la categoría y guardarla como reciente
      const loadAndSaveCategory = async () => {
        try {
          const category = await categoriesService.getCategoryById(categoryId);
          saveRecentCategory(category);
        } catch (error) {
          console.error('Error cargando categoría desde URL:', error);
        }
      };
      
      loadAndSaveCategory();
    }
  }, [router.isReady, router.query.categoryId]);

  // Cargar subcategorías cuando se selecciona una categoría
  useEffect(() => {
    if (selectedCategory && categoriesInitialized) {
      // Verificar si ya tenemos las subcategorías en Redux
      const state = store.getState();
      const currentSubcategories = selectSubcategories(state, selectedCategory.id);
      
      if (currentSubcategories.length === 0) {
        dispatch(fetchSubcategories(selectedCategory.id));
      }
    } else {
      setSubSubcategories({});
    }
  }, [selectedCategory, categoriesInitialized, dispatch]);

  // Cargar sub-subcategorías cuando cambian las subcategorías
  useEffect(() => {
    if (subcategories.length > 0) {
      const loadSubSubcategories = async () => {
        const subSubcats: Record<string, ProductCategory[]> = {};
        
        for (const subcat of subcategories) {
          try {
            // Verificar si ya tenemos las sub-subcategorías en Redux
            const state = store.getState();
            const existing = selectSubcategories(state, subcat.id);
            
            if (existing.length > 0) {
              subSubcats[subcat.id] = existing;
            } else {
              // Cargar desde Redux (que hará la petición si no están en cache)
              await dispatch(fetchSubcategories(subcat.id));
              const updatedState = store.getState();
              const loaded = selectSubcategories(updatedState, subcat.id);
              if (loaded.length > 0) {
                subSubcats[subcat.id] = loaded;
              }
            }
          } catch (err) {
            console.error('Error cargando sub-subcategorías:', err);
          }
        }
        
        setSubSubcategories(subSubcats);
      };
      
      loadSubSubcategories();
    }
  }, [subcategories, dispatch]);

  const handleCategoryHover = (category: ProductCategory) => {
    setSelectedCategory(category);
  };

  const handleCategoryLeave = () => {
    // No limpiar inmediatamente para mejor UX
  };

  const handleCategoryClick = (category: ProductCategory, event?: React.MouseEvent) => {
    // Prevenir la navegación - solo seleccionar la categoría
    if (event) {
      event.preventDefault();
    }
    
    // NO guardar en categorías recientes aquí - solo se guarda cuando se accede por URL
    // Las categorías recientes son solo para accesos directos desde URL
    
    // Seleccionar la categoría para mostrar subcategorías
    setSelectedCategory(category);
    setSelectedSubcategory(null); // Resetear subcategoría seleccionada
  };

  const handleSubcategoryClick = (subcategory: ProductCategory, event?: React.MouseEvent) => {
    // Si tiene sub-subcategorías, mostrar vista de sub-subcategorías
    // Si no, navegar directamente
    const subSubcats = subSubcategories[subcategory.id] || [];
    
    if (subSubcats.length > 0 && event) {
      event.preventDefault();
      setSelectedSubcategory(subcategory);
    } else {
      // Navegar directamente si no hay sub-subcategorías
      handleSubcategoryNavigation(subcategory);
    }
  };

  const handleSubcategoryNavigation = (category: ProductCategory) => {
    // Construir la URL completa con query params usando getContextualUrl
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    
    // Parsear la URL para separar pathname y query
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const pathname = urlObj.pathname;
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Usar router.push con pathname y query explícitos
    router.push({
      pathname,
      query: queryParams,
    }, undefined, { shallow: false });
    
    // Cerrar el panel al navegar
    if (onCategoryClick) {
      onCategoryClick();
    }
  };


  // Mostrar loading solo si no hay categorías y están cargando
  if (categoriesLoading && rootCategories.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-4">
          <p className="text-gray-500 text-center">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  // Función para obtener un ícono basado en el nombre de la categoría
  // Usar el sistema dinámico de iconos
  const getCategoryIcon = (category: ProductCategory) => {
    return getCategoryIconFromData({
      name: category.name,
      icon_url: category.icon_url || undefined,
      mui_icon_name: undefined, // Se puede agregar al modelo de categoría si es necesario
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay oscuro de fondo */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel flotante lateral izquierdo */}
      <div className={`fixed left-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col transform transition-transform duration-300 ease-in-out ${className}`}>
        {/* Header del panel */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <MenuIcon className="w-6 h-6 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">Partes y Accesorios</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cerrar menú"
            >
              <CloseIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Subtítulo - Solo mostrar si no hay categoría seleccionada */}
        {!selectedCategory && !selectedSubcategory && (
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">Comprar todas las partes y accesorios</p>
          </div>
        )}

        {/* Contenido con navegación tipo páginas */}
        <div className="flex-1 overflow-hidden relative">
          {/* Vista de categorías principales */}
          <div 
            className={`absolute inset-0 overflow-y-auto transition-transform duration-300 ease-in-out ${
              selectedCategory ? '-translate-x-full' : 'translate-x-0'
            }`}
            style={{ zIndex: selectedCategory ? 1 : 10 }}
          >
            <nav className="py-2">
              {categoriesLoading && rootCategories.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-gray-500">Cargando categorías...</p>
                </div>
              ) : (
                <>
                  {/* Sección Recientemente */}
                  {recentCategories.length > 0 && (
                    <>
                      <div className="px-6 py-3">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Recientemente</h3>
                      </div>
                      {recentCategories.map((category) => {
                        return (
                          <ContextualLink
                            key={`recent-${category.id}`}
                            href={`/products?categoryId=${category.id}`}
                            onClick={() => {
                              // Cerrar el menú al hacer clic en una categoría reciente
                              if (onCategoryClick) {
                                onCategoryClick();
                              }
                            }}
                            className="w-full flex items-center gap-3 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group text-left"
                          >
                            <span className="flex-1 font-medium">{category.name}</span>
                            <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </ContextualLink>
                        );
                      })}
                    </>
                  )}

                  {/* Sección Categorías */}
                  <div className="px-6 py-3 border-t border-gray-200 mt-2">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Categorías</h3>
                  </div>

                  {/* Todas las categorías */}
                  {rootCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={(e) => handleCategoryClick(category, e)}
                      className="w-full flex items-center gap-3 px-6 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group text-left"
                    >
                      <span className="flex-1 font-medium">{category.name}</span>
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </>
              )}
            </nav>
          </div>

          {/* Vista de subcategorías */}
          {selectedCategory && !selectedSubcategory && (
            <div 
              className={`absolute inset-0 overflow-y-auto transition-transform duration-300 ease-in-out ${
                selectedCategory ? 'translate-x-0' : 'translate-x-full'
              }`}
              style={{ zIndex: 20 }}
            >
              {/* Header con botón Back */}
              <div className="px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
                >
                  <ArrowBackIcon className="w-5 h-5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedCategory.name}</h2>
                  <ContextualLink
                    href={`/products?categoryId=${selectedCategory.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    onClick={onCategoryClick}
                  >
                    Ver Todo →
                  </ContextualLink>
                </div>
                {selectedCategory.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedCategory.description}</p>
                )}
              </div>

              {/* Lista de subcategorías */}
              <div className="py-2">
                {subcategories.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">Cargando subcategorías...</p>
                  </div>
                ) : (
                  <div className="px-6 py-2">
                    {/* Opción "Todo [Nombre de Categoría]" */}
                    <button
                      onClick={() => handleSubcategoryNavigation(selectedCategory)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group text-left mb-2"
                    >
                      <span className="flex-1">Todo {selectedCategory.name}</span>
                    </button>

                    {subcategories.map((subcategory) => {
                      const subSubcats = subSubcategories[subcategory.id] || [];
                      const hasSubSubcategories = subSubcats.length > 0;
                      
                      return (
                        <div key={subcategory.id} className="mb-2">
                          {/* Nivel 2: Subcategoría */}
                          <button
                            onClick={(e) => handleSubcategoryClick(subcategory, e)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group text-left"
                          >
                            <span className="flex-1">{subcategory.name}</span>
                            {hasSubSubcategories && (
                              <ChevronRightIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                          
                          {/* Nivel 3: Sub-subcategorías (mostrar inline si no hay vista separada) */}
                          {hasSubSubcategories && subSubcats.length <= 5 && (
                            <ul className="ml-4 mt-1 space-y-1">
                              {subSubcats.map((subSubcat) => (
                                <li key={subSubcat.id}>
                                  <button
                                    onClick={() => handleSubcategoryNavigation(subSubcat)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                                  >
                                    {subSubcat.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vista de sub-subcategorías (nivel 3) */}
          {selectedSubcategory && (
            <div 
              className={`absolute inset-0 overflow-y-auto transition-transform duration-300 ease-in-out translate-x-0`}
              style={{ zIndex: 30 }}
            >
              {/* Header con botón Back */}
              <div className="px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
                >
                  <ArrowBackIcon className="w-5 h-5" />
                  <span>Atrás</span>
                </button>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedSubcategory.name}</h2>
                  <ContextualLink
                    href={`/products?categoryId=${selectedSubcategory.id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    onClick={onCategoryClick}
                  >
                    Ver Todo →
                  </ContextualLink>
                </div>
                {selectedSubcategory.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedSubcategory.description}</p>
                )}
              </div>

              {/* Lista de sub-subcategorías */}
              <div className="py-2">
                {(() => {
                  const subSubcats = subSubcategories[selectedSubcategory.id] || [];
                  return subSubcats.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">Cargando subcategorías...</p>
                    </div>
                  ) : (
                    <div className="px-6 py-2">
                      <button
                        onClick={() => handleSubcategoryNavigation(selectedSubcategory)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg transition-colors group text-left mb-2"
                      >
                        <span className="flex-1">Todo {selectedSubcategory.name}</span>
                      </button>
                      {subSubcats.map((subSubcat) => (
                        <button
                          key={subSubcat.id}
                          onClick={() => handleSubcategoryNavigation(subSubcat)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group text-left mb-2"
                        >
                          <span className="flex-1">{subSubcat.name}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

