/**
 * Tarjetas de categorías fijas
 * Inspirado en AutoZone - muestra 6 categorías en tarjetas horizontales fijas
 */

import React, { useState, useEffect } from 'react';
import ContextualLink from './ContextualLink';
import { categoriesService, ProductCategory } from '@/lib/categories';
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
  const [categories, setCategories] = useState<CategoryCard[]>([]);
  const [loading, setLoading] = useState(!providedCategories);

  // Cargar categorías si no se proporcionan
  useEffect(() => {
    if (providedCategories) {
      setCategories(providedCategories.slice(0, 6));
      setLoading(false);
      return;
    }

    const loadCategories = async () => {
      try {
        setLoading(true);
        const response = await categoriesService.getRootCategories({
          isActive: true,
          globalOnly: true,
          limit: 20,
          sortBy: 'display_order',
          sortOrder: 'asc',
        });

        // Convertir categorías a formato de tarjetas
        const cards: CategoryCard[] = response.data.slice(0, 6).map((cat: ProductCategory) => ({
          id: cat.id,
          title: cat.name.toUpperCase(),
          description: cat.description || 'Descubre nuestros productos',
          iconUrl: cat.icon_url || undefined,
          link: `/products?categoryId=${cat.id}`,
          // Guardar la categoría completa para usar el sistema de iconos
          categoryData: cat,
        }));

        // Si hay menos de 6 categorías, agregar algunas por defecto
        if (cards.length < 6) {
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
          cards.push(...defaultCards.slice(0, 6 - cards.length));
        }

        setCategories(cards.slice(0, 6));
      } catch (error) {
        console.error('Error cargando categorías:', error);
        // Usar categorías por defecto si falla
        setCategories([
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
        ].slice(0, 6));
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [providedCategories]);

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

  if (categories.length === 0) {
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
          {categories.slice(0, 6).map((category) => {
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
