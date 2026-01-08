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
import { getCategoryIconFromData } from '@/lib/category-icons';

interface CategoryInfoProps {
  categoryId: string;
  onCategoryLoaded?: (name: string, description?: string) => void;
}

export default function CategoryInfo({ categoryId, onCategoryLoaded }: CategoryInfoProps) {
  const router = useRouter();
  const { getContextualUrl, contextType } = useStoreContext();
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
        onCategoryLoaded(categoryData.name, categoryData.description || undefined);
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
      <div className="p-6 mb-6">
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
    <div className="sticky top-4">
      {/* Header simple */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Browse Categories
        </h3>
      </div>

      {/* Subcategorías - Lista simple */}
      {subcategories.length > 0 && (
        <div>
          <div className="space-y-0">
            {subcategories.map((subcat) => (
              <ContextualLink
                key={subcat.id}
                href={getContextualUrl(`/products?categoryId=${subcat.id}`)}
                className="block py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                {subcat.name}
              </ContextualLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

