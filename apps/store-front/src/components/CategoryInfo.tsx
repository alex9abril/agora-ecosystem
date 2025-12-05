/**
 * Componente para mostrar información de la categoría actual
 * Incluye el nombre, descripción y subcategorías disponibles
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { categoriesService, ProductCategory } from '@/lib/categories';
import ContextualLink from './ContextualLink';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CategoryIcon from '@mui/icons-material/Category';

interface CategoryInfoProps {
  categoryId: string;
  onCategoryLoaded?: (name: string) => void;
}

export default function CategoryInfo({ categoryId, onCategoryLoaded }: CategoryInfoProps) {
  const router = useRouter();
  const { getContextualUrl } = useStoreContext();
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryId) {
      loadCategoryInfo();
    } else {
      setCategory(null);
      setSubcategories([]);
      setLoading(false);
    }
  }, [categoryId]);

  const loadCategoryInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading category info for ID:', categoryId);

      // Cargar la categoría actual
      const categoryData = await categoriesService.getCategoryById(categoryId);
      console.log('Category loaded:', categoryData);
      
      setCategory(categoryData);
      
      // Notificar que la categoría se cargó
      if (onCategoryLoaded && categoryData.name) {
        console.log('Calling onCategoryLoaded with:', categoryData.name);
        onCategoryLoaded(categoryData.name);
      }

      // Cargar subcategorías
      const subcategoriesResponse = await categoriesService.getSubcategories(categoryId, {
        isActive: true,
        limit: 20,
      });
      setSubcategories(subcategoriesResponse.data);
    } catch (err: any) {
      console.error('Error cargando información de categoría:', err);
      setError(`Error al cargar la información de la categoría: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
        <p className="text-sm">{error}</p>
        <p className="text-xs mt-1">Category ID: {categoryId}</p>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
      {/* Información de la categoría actual */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          {category.icon_url && (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="w-8 h-8 object-contain"
            />
          )}
          {!category.icon_url && (
            <CategoryIcon className="w-8 h-8 text-toyota-red" />
          )}
          <h2 className="text-2xl font-bold text-gray-900">{category.name}</h2>
        </div>
        {category.description && (
          <p className="text-gray-600 text-sm ml-11">{category.description}</p>
        )}
        {category.total_products !== undefined && category.total_products > 0 && (
          <p className="text-sm text-gray-500 ml-11 mt-1">
            {category.total_products} {category.total_products === 1 ? 'producto' : 'productos'} disponible{category.total_products === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {/* Subcategorías */}
      {subcategories.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Subcategorías
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subcategories.map((subcat) => (
              <ContextualLink
                key={subcat.id}
                href={getContextualUrl(`/products?categoryId=${subcat.id}`)}
                className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-toyota-red hover:shadow-sm transition-all group"
              >
                <CategoryIcon className="w-4 h-4 text-gray-400 group-hover:text-toyota-red transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-toyota-red transition-colors flex-1">
                  {subcat.name}
                </span>
                <ArrowForwardIcon className="w-4 h-4 text-gray-400 group-hover:text-toyota-red transition-colors opacity-0 group-hover:opacity-100" />
              </ContextualLink>
            ))}
          </div>
        </div>
      )}

      {/* Link para ver todos los productos de esta categoría */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <ContextualLink
          href={getContextualUrl(`/products?categoryId=${categoryId}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-toyota-red hover:text-toyota-red-dark transition-colors"
        >
          Ver todos los productos de {category.name}
          <ArrowForwardIcon className="w-4 h-4" />
        </ContextualLink>
      </div>
    </div>
  );
}

