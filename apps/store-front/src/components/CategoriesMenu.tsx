/**
 * Componente de menú de categorías
 * Muestra un menú vertical con categorías principales y subcategorías
 * Estilo similar a AliExpress - diseño ancho con panel lateral y contenido expandido
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { ProductCategory } from '@/lib/categories';
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
import { getCategoryIconFromData } from '@/lib/category-icons';

interface CategoriesMenuProps {
  className?: string;
  onCategoryClick?: () => void; // Callback para cerrar el menú cuando se hace clic en una categoría
}

interface CategoryWithChildren extends ProductCategory {
  children?: CategoryWithChildren[];
}

export default function CategoriesMenu({ className = '', onCategoryClick }: CategoriesMenuProps) {
  const router = useRouter();
  const { contextType, getContextualUrl } = useStoreContext();
  const dispatch = useAppDispatch();
  
  // Obtener categorías desde Redux
  const rootCategoriesFromRedux = useAppSelector(selectRootCategories);
  const categoriesLoading = useAppSelector(selectCategoriesLoading);
  const categoriesInitialized = useAppSelector(selectCategoriesInitialized);
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [subSubcategories, setSubSubcategories] = useState<Record<string, ProductCategory[]>>({});
  const [loadingSubSubcategories, setLoadingSubSubcategories] = useState<Record<string, boolean>>({});

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

  // Seleccionar automáticamente la primera categoría cuando se cargan las categorías raíz
  useEffect(() => {
    if (rootCategories.length > 0 && !selectedCategory) {
      // Seleccionar la primera categoría automáticamente
      setSelectedCategory(rootCategories[0]);
    }
  }, [rootCategories.length, selectedCategory]);

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

  const handleCategoryClick = (category: ProductCategory) => {
    // Construir la URL completa con query params usando getContextualUrl
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    
    // Parsear la URL para separar pathname y query
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const pathname = urlObj.pathname;
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Usar router.push con pathname y query explícitos para asegurar que se actualicen correctamente
    router.push({
      pathname,
      query: queryParams,
    }, undefined, { shallow: false });
    
    if (onCategoryClick) {
      onCategoryClick();
    }
  };

  const handleSubcategoryClick = (category: ProductCategory) => {
    // Construir la URL completa con query params usando getContextualUrl
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    
    // Parsear la URL para separar pathname y query
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const pathname = urlObj.pathname;
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Usar router.push con pathname y query explícitos para asegurar que se actualicen correctamente
    router.push({
      pathname,
      query: queryParams,
    }, undefined, { shallow: false });
    
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

  return (
    <div className={`flex bg-white rounded-lg shadow-xl border border-gray-200 w-full ${className}`}>
      {/* Menú lateral izquierdo - Estilo AliExpress */}
      <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
        {/* Header del menú */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MenuIcon className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-sm text-gray-900">Todas las categorías</h3>
          </div>
        </div>
        
        {/* Lista de categorías */}
        <nav className="py-1">
          {categoriesLoading && rootCategories.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Cargando categorías...</p>
            </div>
          ) : (
            rootCategories.map((category) => {
              const isSelected = selectedCategory?.id === category.id;
              return (
                <div
                  key={category.id}
                  onMouseEnter={() => handleCategoryHover(category)}
                  onMouseLeave={handleCategoryLeave}
                  className={`relative transition-colors ${
                    isSelected
                      ? 'bg-gray-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <ContextualLink
                    href={`/products?categoryId=${category.id}`}
                    onClick={() => {
                      if (onCategoryClick) {
                        onCategoryClick();
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                  >
                    {/* Ícono de la categoría */}
                    <div className={`flex-shrink-0 transition-colors ${
                      isSelected ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {getCategoryIcon(category)}
                    </div>
                    
                    {/* Nombre de la categoría */}
                    <span className={`text-sm font-medium flex-1 transition-colors ${
                      isSelected
                        ? 'text-gray-900'
                        : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {category.name}
                    </span>
                    
                    {/* Flecha indicadora */}
                    {isSelected && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </ContextualLink>
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Panel de subcategorías - Estilo AliExpress */}
      {selectedCategory && (
        <div className="flex-1 p-6 bg-white min-h-[400px]">
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{selectedCategory.name}</h2>
              <ContextualLink
                href={`/products?categoryId=${selectedCategory.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                onClick={onCategoryClick}
              >
                Ver Todo →
              </ContextualLink>
            </div>
            {selectedCategory.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedCategory.description}</p>
            )}
          </div>

          {subcategories.length === 0 && selectedCategory ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando subcategorías...</p>
            </div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay subcategorías disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {subcategories.map((subcategory) => {
                const subSubcats = subSubcategories[subcategory.id] || [];
                const hasSubSubcategories = subSubcats.length > 0;
                
                return (
                  <div key={subcategory.id} className="space-y-2">
                    {/* Nivel 2: Subcategoría */}
                    <div>
                      <ContextualLink
                        href={`/products?categoryId=${subcategory.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors block mb-1"
                        onClick={onCategoryClick}
                      >
                        {subcategory.name}
                      </ContextualLink>
                    </div>
                    
                    {/* Nivel 3: Sub-subcategorías */}
                    {hasSubSubcategories && (
                      <ul className="space-y-1">
                        {subSubcats.map((subSubcat) => (
                          <li key={subSubcat.id}>
                            <ContextualLink
                              href={`/products?categoryId=${subSubcat.id}`}
                              className="text-xs text-gray-600 hover:text-blue-600 transition-colors block py-0.5"
                              onClick={onCategoryClick}
                            >
                              {subSubcat.name}
                            </ContextualLink>
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
      )}

      {/* Estado inicial - mostrar mensaje si no hay categoría seleccionada */}
      {!selectedCategory && (
        <div className="flex-1 p-6 flex items-center justify-center bg-white min-h-[400px]">
          <p className="text-gray-500 text-sm">Pasa el mouse sobre una categoría para ver las subcategorías</p>
        </div>
      )}
    </div>
  );
}

