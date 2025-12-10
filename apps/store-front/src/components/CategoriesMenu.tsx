/**
 * Componente de menú de categorías
 * Muestra un menú vertical con categorías principales y subcategorías
 * Similar al diseño de AutoZone
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { categoriesService, ProductCategory } from '@/lib/categories';
import ContextualLink from './ContextualLink';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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
  const [rootCategories, setRootCategories] = useState<CategoryWithChildren[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ProductCategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<Record<string, ProductCategory[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías raíz al montar el componente
  useEffect(() => {
    loadRootCategories();
  }, []);

  // Cargar subcategorías cuando se selecciona una categoría
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory.id);
    } else {
      setSubcategories([]);
      setSubSubcategories({});
    }
  }, [selectedCategory]);

  const loadRootCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoriesService.getRootCategories({
        isActive: true,
        globalOnly: true,
        limit: 100,
      });
      
      // Organizar categorías con sus hijos
      const categoriesWithChildren = response.data.map(cat => ({
        ...cat,
        children: [],
      }));
      
      setRootCategories(categoriesWithChildren);
    } catch (err: any) {
      console.error('Error cargando categorías raíz:', err);
      setError('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const loadSubcategories = async (parentId: string) => {
    try {
      setLoading(true);
      const response = await categoriesService.getSubcategories(parentId, {
        isActive: true,
        globalOnly: true,
        limit: 100,
      });
      
      setSubcategories(response.data);
      
      // Cargar sub-subcategorías para cada subcategoría
      const subSubcats: Record<string, ProductCategory[]> = {};
      for (const subcat of response.data) {
        const subSubResponse = await categoriesService.getSubcategories(subcat.id, {
          isActive: true,
          globalOnly: true,
          limit: 100,
        });
        if (subSubResponse.data.length > 0) {
          subSubcats[subcat.id] = subSubResponse.data;
        }
      }
      setSubSubcategories(subSubcats);
    } catch (err: any) {
      console.error('Error cargando subcategorías:', err);
      setError('Error al cargar las subcategorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryHover = (category: ProductCategory) => {
    setSelectedCategory(category);
  };

  const handleCategoryLeave = () => {
    // No limpiar inmediatamente para mejor UX
  };

  const handleCategoryClick = (category: ProductCategory) => {
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    router.push(url);
    if (onCategoryClick) {
      onCategoryClick();
    }
  };

  const handleSubcategoryClick = (category: ProductCategory) => {
    const url = getContextualUrl(`/products?categoryId=${category.id}`);
    router.push(url);
    if (onCategoryClick) {
      onCategoryClick();
    }
  };

  if (loading && rootCategories.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-4">
          <p className="text-gray-500 text-center">Cargando categorías...</p>
        </div>
      </div>
    );
  }

  if (error && rootCategories.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        <div className="p-4">
          <p className="text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Menú lateral izquierdo */}
      <div className="w-80 border-r border-gray-200 bg-gray-50">
        <div className="p-4 bg-toyota-gray-dark text-white">
          <h3 className="font-bold text-sm uppercase">Todos los Departamentos</h3>
        </div>
        <nav className="py-2">
          {rootCategories.map((category) => (
            <div
              key={category.id}
              onMouseEnter={() => handleCategoryHover(category)}
              onMouseLeave={handleCategoryLeave}
              className={`relative ${
                selectedCategory?.id === category.id
                  ? 'bg-white border-l-4 border-toyota-red'
                  : 'hover:bg-gray-100'
              } transition-colors`}
            >
              <button
                onClick={() => handleCategoryClick(category)}
                className="w-full text-left px-4 py-3 flex items-center justify-between group"
              >
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
                <ChevronRightIcon 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    selectedCategory?.id === category.id ? 'rotate-90' : ''
                  }`} 
                />
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Panel de subcategorías */}
      {selectedCategory && (
        <div className="flex-1 p-6">
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{selectedCategory.name}</h2>
              <ContextualLink
                href={`/products?categoryId=${selectedCategory.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                onClick={onCategoryClick}
              >
                Ver Todo
                <ArrowForwardIcon className="w-4 h-4" />
              </ContextualLink>
            </div>
            {selectedCategory.description && (
              <p className="text-sm text-gray-600 mt-1">{selectedCategory.description}</p>
            )}
          </div>

          {loading && subcategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando subcategorías...</p>
            </div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay subcategorías disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-8">
              {subcategories.map((subcategory) => {
                const subSubcats = subSubcategories[subcategory.id] || [];
                const hasSubSubcategories = subSubcats.length > 0;
                
                return (
                  <div key={subcategory.id} className="space-y-3">
                    {/* Nivel 2: Subcategoría */}
                    <div>
                      <ContextualLink
                        href={`/products?categoryId=${subcategory.id}`}
                        className="text-base font-bold text-gray-900 hover:text-toyota-red transition-colors block mb-2"
                        onClick={onCategoryClick}
                      >
                        {subcategory.name}
                      </ContextualLink>
                      {subcategory.description && (
                        <p className="text-xs text-gray-500 mb-2">{subcategory.description}</p>
                      )}
                    </div>
                    
                    {/* Nivel 3: Sub-subcategorías */}
                    {hasSubSubcategories ? (
                      <ul className="space-y-1.5">
                        {subSubcats.map((subSubcat) => (
                          <li key={subSubcat.id}>
                            <ContextualLink
                              href={`/products?categoryId=${subSubcat.id}`}
                              className="text-sm text-gray-700 hover:text-toyota-red transition-colors block py-0.5"
                              onClick={onCategoryClick}
                            >
                              {subSubcat.name}
                            </ContextualLink>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Sin subcategorías</p>
                    )}
                    
                    {/* Link "Ver Todo" para la subcategoría */}
                    <div className="pt-2 border-t border-gray-100">
                      <ContextualLink
                        href={`/products?categoryId=${subcategory.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        onClick={onCategoryClick}
                      >
                        Ver Todo
                        <ArrowForwardIcon className="w-3 h-3" />
                      </ContextualLink>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Estado inicial - mostrar mensaje si no hay categoría seleccionada */}
      {!selectedCategory && (
        <div className="flex-1 p-6 flex items-center justify-center">
          <p className="text-gray-500">Pasa el mouse sobre una categoría para ver las subcategorías</p>
        </div>
      )}
    </div>
  );
}

