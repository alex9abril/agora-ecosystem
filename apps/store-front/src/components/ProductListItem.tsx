/**
 * Item de producto para vista de lista
 * Layout horizontal con imagen a la izquierda y detalles a la derecha
 */

import React from 'react';
import ContextualLink from './ContextualLink';
import { Product } from '@/lib/products';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatPrice } from '@/lib/format';

interface ProductListItemProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  overridePrice?: number;
}

export default function ProductListItem({ product, onAddToCart, overridePrice }: ProductListItemProps) {
  const { contextType, branchId } = useStoreContext();

  // Determinar precio a mostrar
  const displayPrice = overridePrice !== undefined
    ? overridePrice
    : contextType === 'sucursal' && product.branch_price !== undefined
      ? product.branch_price
      : product.price;

  // Determinar si está disponible
  const isAvailable = contextType === 'sucursal' 
    ? (product.branch_is_enabled !== false && product.is_available)
    : product.is_available;
  const isBackorder = contextType === 'sucursal'
    && product.branch_is_enabled !== false
    && product.branch_allow_backorder
    && product.branch_stock !== null
    && product.branch_stock !== undefined
    && product.branch_stock <= 0;

  // Usar primary_image_url si existe, sino usar image_url como fallback
  const displayImageUrl = product.primary_image_url || product.image_url;

  return (
    <ContextualLink href={`/products/${product.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
        <div className="flex flex-row">
          {/* Imagen - lado izquierdo */}
          <div className="w-48 h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center flex-shrink-0">
            {/* Badge de Destacado */}
            {product.is_featured && (
              <div className="absolute top-2 left-2 z-10 bg-toyota-red text-white px-2 py-1 rounded-md text-xs font-semibold shadow-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Destacado
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
                    {isBackorder ? 'backorder' : product.branch_stock > 0 ? `${product.branch_stock} disponibles` : 'Agotado'}
                  </div>
                )}
              </>
            ) : (
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

          {/* Contenido - lado derecho */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            <div className="flex-1">
              {/* SKU y Categoría */}
              <div className="flex items-center gap-3 mb-2">
                {product.sku && (
                  <span className="text-xs text-gray-400">SKU: {product.sku}</span>
                )}
                {product.category_name && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                    {product.category_name}
                  </span>
                )}
              </div>

              {/* Nombre del producto */}
              <h3 className="font-semibold text-xl mb-2 line-clamp-2">{product.name}</h3>

              {/* Descripción */}
              {product.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {product.description}
                </p>
              )}

              {/* Badges de disponibilidad */}
              <div className="flex items-center gap-2 mb-3">
                {isAvailable && contextType !== 'sucursal' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                    Disponible
                  </span>
                )}
                {isBackorder && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    backorder
                  </span>
                )}
                {isAvailable && contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined && product.branch_stock > 0 && product.branch_stock <= 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Últimas unidades
                  </span>
                )}
              </div>
            </div>

            {/* Precio */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-black">
                  {formatPrice(displayPrice)}
                </span>
                {contextType === 'sucursal' && product.branch_price !== undefined && product.branch_price !== product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
                {contextType !== 'sucursal' && (
                  <span className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
                    Precio aproximado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContextualLink>
  );
}

