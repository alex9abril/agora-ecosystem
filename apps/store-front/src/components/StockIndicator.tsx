/**
 * Componente para mostrar stock por sucursal
 */

import React from 'react';

interface StockIndicatorProps {
  stock: number | null | undefined;
  allowBackorder?: boolean;
  backorderLeadTimeDays?: number | null;
  isEnabled?: boolean;
  className?: string;
}

export default function StockIndicator({ 
  stock, 
  allowBackorder = false,
  backorderLeadTimeDays = null,
  isEnabled = true,
  className = '' 
}: StockIndicatorProps) {
  if (!isEnabled) {
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 ${className}`}>
        No disponible
      </span>
    );
  }

  if (stock === null || stock === undefined) {
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 ${className}`}>
        Stock ilimitado
      </span>
    );
  }

  if (stock === 0) {
    if (allowBackorder) {
      return (
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 ${className}`}
          title={
            backorderLeadTimeDays !== null && backorderLeadTimeDays !== undefined
              ? `Surtido estimado: ${backorderLeadTimeDays} días`
              : undefined
          }
        >
          backorder
        </span>
      );
    }
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 ${className}`}>
        Agotado
      </span>
    );
  }

  if (stock < 5) {
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700 ${className}`}>
        Últimas {stock} unidades
      </span>
    );
  }

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 ${className}`}>
      En stock ({stock})
    </span>
  );
}

