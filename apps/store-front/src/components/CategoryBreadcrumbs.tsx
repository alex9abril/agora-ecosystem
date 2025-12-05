/**
 * Componente de breadcrumbs para navegación de categorías
 * Muestra la jerarquía completa: Inicio > Categoría > Subcategoría > Sub-subcategoría
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStoreContext } from '@/contexts/StoreContext';
import { categoriesService, ProductCategory } from '@/lib/categories';
import ContextualLink from './ContextualLink';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';

interface CategoryBreadcrumbsProps {
  categoryId: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
  url: string;
}

export default function CategoryBreadcrumbs({ categoryId }: CategoryBreadcrumbsProps) {
  const router = useRouter();
  const { getContextualUrl } = useStoreContext();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadBreadcrumbs();
    } else {
      setBreadcrumbs([]);
      setLoading(false);
    }
  }, [categoryId]);

  const loadBreadcrumbs = async () => {
    try {
      setLoading(true);
      const crumbs: BreadcrumbItem[] = [];
      
      // Agregar "Inicio"
      crumbs.push({
        id: 'home',
        name: 'Inicio',
        url: getContextualUrl('/'),
      });

      // Cargar la categoría actual y construir la jerarquía hacia arriba
      let currentCategoryId: string | null = categoryId;
      const categoryMap = new Map<string, ProductCategory>();

      // Cargar todas las categorías en la jerarquía
      while (currentCategoryId) {
        try {
          const category = await categoriesService.getCategoryById(currentCategoryId);
          categoryMap.set(category.id, category);
          
          // Agregar al breadcrumb
          crumbs.push({
            id: category.id,
            name: category.name,
            url: getContextualUrl(`/products?categoryId=${category.id}`),
          });

          // Mover al padre
          currentCategoryId = category.parent_category_id || null;
        } catch (error) {
          console.error('Error cargando categoría:', error);
          break;
        }
      }

      // Invertir para mostrar desde la raíz hasta la actual
      setBreadcrumbs(crumbs.reverse());
    } catch (error) {
      console.error('Error cargando breadcrumbs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <span>Cargando...</span>
      </div>
    );
  }

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm py-3 mb-4" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        return (
          <React.Fragment key={crumb.id}>
            {index === 0 ? (
              <ContextualLink
                href={crumb.url}
                className="flex items-center gap-1 text-gray-600 hover:text-toyota-red transition-colors"
              >
                <HomeIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{crumb.name}</span>
              </ContextualLink>
            ) : (
              <ContextualLink
                href={crumb.url}
                className={`transition-colors ${
                  isLast
                    ? 'text-gray-900 font-semibold cursor-default pointer-events-none'
                    : 'text-gray-600 hover:text-toyota-red'
                }`}
              >
                {crumb.name}
              </ContextualLink>
            )}
            {!isLast && (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

