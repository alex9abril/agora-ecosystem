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
}

export default function BranchPriceDisplay({ 
  product, 
  branchPrice, 
  className = '' 
}: BranchPriceDisplayProps) {
  const displayPrice = branchPrice !== undefined ? branchPrice : product.price;
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
      {branchPrice === undefined && (
        <p className="text-xs text-gray-500 mt-1">Precio global</p>
      )}
    </div>
  );
}

