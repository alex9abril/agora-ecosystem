/**
 * Card de producto para desktop
 * Soporta precio global y precio por sucursal
 */

import React from 'react';
import ContextualLink from './ContextualLink';
import { Product } from '@/lib/products';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatPrice } from '@/lib/format';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { contextType, branchId } = useStoreContext();

  // Determinar precio a mostrar
  const displayPrice = contextType === 'sucursal' && product.branch_price !== undefined
    ? product.branch_price
    : product.price;

  // Determinar si está disponible
  const isAvailable = contextType === 'sucursal' 
    ? (product.branch_is_enabled !== false && product.is_available)
    : product.is_available;

  // Usar primary_image_url si existe, sino usar image_url como fallback
  const displayImageUrl = product.primary_image_url || product.image_url;
  
  // Debug logging (solo en desarrollo, para primeros productos)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
    console.log('🔍 [ProductCard] Imagen del producto:', {
      productId: product.id,
      productName: product.name?.substring(0, 50),
      primary_image_url: product.primary_image_url?.substring(0, 100),
      image_url: product.image_url?.substring(0, 100),
      displayImageUrl: displayImageUrl?.substring(0, 100),
      hasDisplayImage: !!displayImageUrl,
    });
  }

  return (
    <ContextualLink href={`/products/${product.id}`} className="h-full block">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-full flex flex-col">
        {/* Siempre mostrar el espacio de la imagen, incluso si no hay foto */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center flex-shrink-0">
          {/* Badge de Destacado */}
          {product.is_featured && (
            <div className="absolute top-2 left-2 z-10 bg-toyota-red text-white px-2 py-1 rounded-md text-xs font-semibold shadow-md flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Destacado
            </div>
          )}
          
          {/* Badge de Categoría */}
          {product.category_name && (
            <div className="absolute top-2 right-2 z-10 bg-white bg-opacity-95 text-gray-700 px-2 py-1 rounded-md text-xs font-medium shadow-sm border border-gray-200 max-w-[120px] truncate" title={product.category_name}>
              {product.category_name}
            </div>
          )}
          
          {displayImageUrl ? (
            <>
              <div className="w-full h-full p-4 flex items-center justify-center relative">
                <img
                  src={displayImageUrl}
                  alt={product.name}
                  className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-105 transition-transform duration-200"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
              {!isAvailable && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                  <span className="text-white font-semibold">Agotado</span>
                </div>
              )}
              {isAvailable && contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined && (
                <div className="absolute bottom-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-semibold shadow-md z-10">
                  {product.branch_stock > 0 ? `${product.branch_stock} disponibles` : 'Agotado'}
                </div>
              )}
            </>
          ) : (
            // Mostrar mensaje cuando no hay imagen
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <svg 
                className="w-16 h-16 text-gray-300 mb-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
              <p className="text-xs text-gray-400 font-medium">Sin imagen disponible</p>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          {/* SKU si está disponible */}
          {product.sku && (
            <div className="text-xs text-gray-400 mb-1 flex-shrink-0">
              SKU: {product.sku}
            </div>
          )}
          
          <h3 className="font-semibold text-lg mb-1 line-clamp-2 flex-shrink-0">{product.name}</h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-shrink-0">
              {product.description}
            </p>
          )}
          
          {/* Badge de disponibilidad en el contenido - Solo en contexto global/grupo */}
          {isAvailable && contextType !== 'sucursal' && (
            <div className="mb-2 flex-shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                Disponible
              </span>
            </div>
          )}
          
          {/* Indicador de stock bajo en contexto de sucursal */}
          {isAvailable && contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined && product.branch_stock > 0 && product.branch_stock <= 5 && (
            <div className="mb-2 flex-shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Últimas unidades
              </span>
            </div>
          )}
          
          <div className="mt-auto">
            <div>
              <span className="text-xl font-bold text-black">
                {formatPrice(displayPrice)}
              </span>
              {contextType === 'sucursal' && product.branch_price !== undefined && product.branch_price !== product.price && (
                <span className="text-sm text-gray-500 line-through ml-2">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ContextualLink>
  );
}

