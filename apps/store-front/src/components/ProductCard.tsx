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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && product.is_available) {
      // onAddToCart manejará la verificación de autenticación
      onAddToCart(product);
    }
  };

  // Determinar precio a mostrar
  const displayPrice = contextType === 'sucursal' && product.branch_price !== undefined
    ? product.branch_price
    : product.price;

  // Determinar si está disponible
  const isAvailable = contextType === 'sucursal' 
    ? (product.branch_is_enabled !== false && product.is_available)
    : product.is_available;

  return (
    <ContextualLink href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
        {product.image_url && (
          <div className="aspect-square bg-gray-200 relative overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            {!isAvailable && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white font-semibold">Agotado</span>
              </div>
            )}
            {contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined && (
              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-medium">
                Stock: {product.branch_stock}
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
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
            {isAvailable && onAddToCart && (
              <button
                onClick={handleAddToCart}
                className="px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors text-sm font-medium"
                aria-label="Agregar al carrito"
              >
                Agregar
              </button>
            )}
          </div>
        </div>
      </div>
    </ContextualLink>
  );
}

