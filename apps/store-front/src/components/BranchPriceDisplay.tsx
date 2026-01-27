/**
 * Componente para mostrar precio específico de sucursal
 */

import React from 'react';
import { Product } from '@/lib/products';
import { formatPrice } from '@/lib/format';

interface BranchPriceDisplayProps {
  product: Product;
  branchPrice?: number;
  className?: string;
  overridePrice?: number;
}

export default function BranchPriceDisplay({ 
  product, 
  branchPrice, 
  className = '',
  overridePrice,
}: BranchPriceDisplayProps) {
  const displayPrice = overridePrice !== undefined
    ? overridePrice
    : branchPrice !== undefined
      ? branchPrice
      : product.price;
  const hasDiscount = branchPrice !== undefined && branchPrice < product.price;

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-black">
          {formatPrice(displayPrice)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-lg text-gray-500 line-through">
              {formatPrice(product.price)}
            </span>
            <span className="text-sm text-green-600 font-medium">
              -{((1 - displayPrice / product.price) * 100).toFixed(0)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}
