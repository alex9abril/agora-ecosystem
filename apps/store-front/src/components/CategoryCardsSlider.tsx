/**
 * Tarjetas de categorías fijas
 * Inspirado en AutoZone - muestra 6 categorías en tarjetas horizontales fijas
 */

import React, { useState, useEffect, useMemo } from 'react';
import ContextualLink from './ContextualLink';
import { ProductCategory } from '@/lib/categories';
import { useAppSelector } from '@/store/hooks';
import { selectRootCategories, selectCategoriesInitialized } from '@/store/slices/categoriesSlice';
import { getCategoryIconFromData } from '@/lib/category-icons';

interface CategoryCard {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  iconUrl?: string;
  link?: string;
  backgroundColor?: string;
  categoryData?: ProductCategory; // Datos completos de la categoría para el sistema de iconos
}

interface CategoryCardsSliderProps {
  categories?: CategoryCard[]; // Si se proporcionan, usar estas. Si no, cargar desde API
  className?: string;
}

export default function CategoryCardsSlider({
  categories: providedCategories,
  className = '',
}: CategoryCardsSliderProps) {
  // Obtener categorías desde Redux
  const rootCategories = useAppSelector(selectRootCategories);
  const categoriesInitialized = useAppSelector(selectCategoriesInitialized);
  const [loading, setLoading] = useState(!providedCategories && !categoriesInitialized);

  // Convertir categorías a formato de tarjetas usando Redux o las proporcionadas
  const categories = useMemo(() => {
    if (providedCategories) {
      return providedCategories.slice(0, 6);
    }

    if (rootCategories.length > 0) {
      // Convertir categorías de Redux a formato de tarjetas
      return rootCategories
        .slice(0, 6)
        .map((cat: ProductCategory) => ({
          id: cat.id,
          title: cat.name.toUpperCase(),
          description: cat.description || 'Descubre nuestros productos',
          iconUrl: cat.icon_url || undefined,
          link: `/products?categoryId=${cat.id}`,
          backgroundColor: undefined, // No hay color de fondo para categorías del sistema
          // Guardar la categoría completa para usar el sistema de iconos
          categoryData: cat,
        }));
    }

    return [];
  }, [providedCategories, rootCategories]);

  // Agregar tarjetas por defecto si hay menos de 6 categorías
  const finalCategories = useMemo(() => {
    const result = [...categories];
    
    if (result.length < 6) {
      const defaultCards: CategoryCard[] = [
        {
          id: 'instalacion',
          title: 'INSTALACIÓN',
          description: 'Servicios de instalación profesional de refacciones y accesorios',
          backgroundColor: '#ffffff',
        },
        {
          id: 'promo',
          title: 'FOLLETO PROMOCIONAL',
          description: 'Las mejores ofertas y promociones',
          backgroundColor: '#fef3c7',
        },
        {
          id: 'offers',
          title: 'OFERTAS Y AHORROS',
          description: 'Conoce las mejores ofertas',
          backgroundColor: '#fee2e2',
        },
        {
          id: 'services',
          title: 'SERVICIOS GRATUITOS',
          description: 'Nosotros cuidamos de tu auto',
          backgroundColor: '#dbeafe',
        },
        {
          id: 'store',
          title: 'UBICA TU TIENDA',
          description: 'Estamos cerca de ti',
          backgroundColor: '#dcfce7',
        },
        {
          id: 'pickup',
          title: 'CLIC, COMPRA Y RECOGE',
          description: 'Compra en línea y recoge en tu tienda',
          backgroundColor: '#f3e8ff',
        },
      ];
      result.push(...defaultCards.slice(0, 6 - result.length));
    }
    
    return result;
  }, [categories]);

  // Actualizar loading cuando las categorías se inicialicen
  useEffect(() => {
    if (categoriesInitialized && !providedCategories) {
      setLoading(false);
    }
  }, [categoriesInitialized, providedCategories]);

  if (loading) {
    return (
      <div className={`py-6 ${className}`} style={{ marginTop: '-50px' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-lg animate-pulse shadow-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (finalCategories.length === 0 && !loading) {
    return null;
  }

  return (
    <div
      className={`py-6 ${className}`}
      style={{ marginTop: '0px', position: 'relative' }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Contenedor de tarjetas - Grid fijo de 6 columnas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {finalCategories.slice(0, 6).map((category) => {
            const CardContent = (
              <div
                className="h-48 rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 p-6 flex flex-col justify-between cursor-pointer"
                style={{
                  backgroundColor: category.backgroundColor || '#ffffff',
                }}
              >
                {/* Icono o imagen */}
                <div className="flex-shrink-0 mb-3">
                  {category.iconUrl ? (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <img
                        src={category.iconUrl}
                        alt={category.title}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          // Si falla la carga del icono personalizado, usar el sistema dinámico
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.title}
                      className="w-full h-24 object-contain mb-2"
                    />
                  ) : category.categoryData ? (
                    // Usar el sistema dinámico de iconos si hay datos de categoría
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                      {getCategoryIconFromData({
                        name: category.categoryData.name,
                        icon_url: category.categoryData.icon_url || undefined,
                        mui_icon_name: undefined,
                      })}
                    </div>
                  ) : (
                    // Fallback: emoji genérico
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2">
                    {category.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {category.description}
                  </p>
                </div>
              </div>
            );

            return category.link ? (
              <ContextualLink key={category.id} href={category.link}>
                {CardContent}
              </ContextualLink>
            ) : (
              <div key={category.id}>{CardContent}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
