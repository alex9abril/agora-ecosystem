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
  const { contextType, branchData } = useStoreContext();

  // Determinar precio a mostrar
  const displayPrice = contextType === 'sucursal' && product.branch_price !== undefined
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
  const availabilityLabel = isBackorder ? 'backorder' : 'disponible';

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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group h-full flex flex-col">
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden flex items-center justify-center">
          <button
            type="button"
            className="absolute top-3 right-3 z-10 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center text-gray-700"
            aria-label="Agregar a favoritos"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.687-4.5-1.935 0-3.597 1.126-4.313 2.733-.716-1.607-2.378-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 6.75 9 11.25 9 11.25s9-4.5 9-11.25z" />
            </svg>
          </button>

          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <svg className="w-16 h-16 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs text-gray-400 font-medium">Sin imagen disponible</p>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-grow">
          {product.sku && (
            <div className="text-xs text-gray-400 mb-1">#{product.sku}</div>
          )}

          <div className="text-xl font-semibold text-gray-900 mb-1">{formatPrice(displayPrice)}</div>

          <h3 className="text-sm font-medium text-gray-800 mb-4 line-clamp-2">{product.name}</h3>

          <button
            type="button"
            className="w-full py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors mb-3"
          >
            Agregar al carrito
          </button>

          <div className="flex items-center justify-between text-xs text-gray-600 border-b border-gray-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-[10px] font-semibold">
                ✓
              </span>
              <span>Revisa compatibilidad con tu vehículo</span>
            </div>
            <span className="text-gray-400">›</span>
          </div>

          <div className="text-xs text-gray-600">
            <div>
              <span className="font-semibold">Recoger</span>{' '}
              {branchData?.name ? `en ${branchData.name}` : availabilityLabel}
              {branchData?.name && isBackorder && (
                <span className="text-gray-500">{` ${availabilityLabel}`}</span>
              )}
            </div>
            <div className="text-gray-800">
              <span className="font-semibold">Envío a domicilio</span>{' '}
              <span className="text-gray-500">{availabilityLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </ContextualLink>
  );
}

