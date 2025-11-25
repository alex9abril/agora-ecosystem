/**
 * Card de producto para móvil
 */

import React from 'react';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { useI18n } from '@/contexts/I18nContext';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { t } = useI18n();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAddToCart && product.is_available) {
      onAddToCart(product);
    }
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {product.image_url && (
          <div className="aspect-square bg-gray-200 relative">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {!product.is_available && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white font-semibold">{t('products.outOfStock')}</span>
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-base mb-1">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-black">
              ${product.price.toFixed(2)}
            </span>
            {product.is_available && onAddToCart && (
              <button
                onClick={handleAddToCart}
                className="w-9 h-9 rounded-full border-2 border-gray-300 hover:border-green-600 hover:bg-green-50 flex items-center justify-center transition-all duration-200 active:scale-95"
                aria-label={t('products.addToCart')}
              >
                <svg
                  className="w-5 h-5 text-gray-700 hover:text-green-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

