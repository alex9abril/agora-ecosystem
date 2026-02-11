/**
 * Lista de sucursales disponibles para un producto
 * Muestra todas las sucursales que tienen el producto disponible
 */

import React from 'react';
import { ProductBranchAvailability } from '@/lib/products';
import StockIndicator from './StockIndicator';
import { formatPrice } from '@/lib/format';

interface BranchAvailabilityGridProps {
  availabilities: ProductBranchAvailability[];
  globalPrice: number;
  selectedBranchId?: string | null;
  onBranchSelect: (branchId: string) => void;
  storedBranchId?: string | null;
  className?: string;
}

export default function BranchAvailabilityGrid({
  availabilities,
  globalPrice,
  selectedBranchId,
  onBranchSelect,
  storedBranchId,
  className = '',
}: BranchAvailabilityGridProps) {
  // Filtrar solo sucursales activas y con producto habilitado
  const availableBranches = availabilities
    .filter((avail) => avail.is_active && avail.is_enabled)
    .map((avail) => ({
      ...avail,
      displayPrice: (() => {
        const taxedRaw = (avail as any).taxed_price;
        const taxed = taxedRaw !== null && taxedRaw !== undefined ? Number(taxedRaw) : undefined;
        const price = avail.price !== null && avail.price !== undefined ? Number(avail.price) : undefined;

        // Prefer taxed price only if it is a valid positive number
        if (taxed !== undefined && !Number.isNaN(taxed) && taxed > 0) {
          return taxed;
        }

        // Fall back to branch price, then global price
        if (price !== undefined && !Number.isNaN(price)) {
          return price;
        }

        return globalPrice;
      })(),
    }))
    // Ordenar por precio (más bajo primero)
    .sort((a, b) => a.displayPrice - b.displayPrice);

  if (availableBranches.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-gray-500">No hay sucursales disponibles para este producto</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Disponible en:</h3>
      <div className="space-y-2">
        {availableBranches.map((availability, index) => {
          const displayPrice = availability.displayPrice;
          const hasCustomPrice = availability.price !== null && availability.price !== undefined;
          const hasDiscount = hasCustomPrice && displayPrice < globalPrice;
          const stockText = availability.stock !== null && availability.stock !== undefined
            ? availability.stock === 0 && availability.allow_backorder
              ? 'backorder'
              : availability.stock === 0
              ? 'Agotado'
              : `${availability.stock} unidades disponibles`
            : 'Disponible';
          
          const isBestOption = index === 0;
          const isSelected = selectedBranchId === availability.branch_id;

          return (
            <button
              key={availability.branch_id}
              onClick={() => onBranchSelect(availability.branch_id)}
              className={`w-full text-left p-4 bg-white border rounded-lg hover:shadow-sm transition-all ${
                isSelected
                  ? 'border-black border-2 bg-gray-50'
                  : isBestOption
                  ? 'border-green-500 border-2 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-black">
                      {availability.branch_name}
                    </h4>
                    {isSelected && (
                      <span className="text-xs font-medium text-white bg-toyota-red px-2 py-0.5 rounded">
                        Seleccionada
                      </span>
                    )}
                    {!isSelected && isBestOption && (
                      <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        Mejor precio
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {stockText}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <span className={`font-bold ${
                    isSelected ? 'text-black text-xl' : isBestOption ? 'text-green-700 text-xl' : 'text-black text-lg'
                  }`}>
                    {formatPrice(displayPrice)}
                  </span>
                  {hasDiscount && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500 line-through">
                        {formatPrice(globalPrice)}
                      </span>
                      <span className="text-xs text-green-600 font-medium ml-2">
                        -{((1 - displayPrice / globalPrice) * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

