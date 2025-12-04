/**
 * Componente para mostrar el desglose de impuestos
 */

import React from 'react';
import { TaxBreakdown as TaxBreakdownType } from '@/lib/orders';
import { formatPrice } from '@/lib/format';

interface TaxBreakdownProps {
  taxBreakdown: TaxBreakdownType | null | undefined;
  showTotal?: boolean;
  compact?: boolean;
  className?: string;
}

export default function TaxBreakdown({
  taxBreakdown,
  showTotal = true,
  compact = false,
  className = '',
}: TaxBreakdownProps) {
  if (!taxBreakdown || 
      typeof taxBreakdown !== 'object' || 
      !Array.isArray(taxBreakdown.taxes) || 
      taxBreakdown.taxes.length === 0) {
    return null;
  }

  const formatRate = (rate: number, rateType: string) => {
    if (rateType === 'percentage') {
      return `${(rate * 100).toFixed(0)}%`;
    }
    return formatPrice(rate);
  };

  if (compact) {
    return (
      <div className={`text-xs text-gray-600 ${className}`}>
        {taxBreakdown.taxes.map((tax, index) => (
          <span key={tax.tax_type_id}>
            {index > 0 && ', '}
            {tax.tax_name} ({formatRate(tax.rate, tax.rate_type)}): {formatPrice(tax.amount)}
          </span>
        ))}
        {showTotal && taxBreakdown.total_tax > 0 && (
          <span className="ml-2 font-medium">
            Total impuestos: {formatPrice(taxBreakdown.total_tax)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {taxBreakdown.taxes.map((tax) => (
        <div key={tax.tax_type_id} className="flex justify-between text-sm">
          <span className="text-gray-600">
            {tax.tax_name} ({formatRate(tax.rate, tax.rate_type)})
          </span>
          <span className="text-black font-medium">
            {formatPrice(tax.amount)}
          </span>
        </div>
      ))}
      {showTotal && taxBreakdown.total_tax > 0 && (
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-200 mt-1">
          <span className="text-gray-700">Total de impuestos</span>
          <span className="text-black">{formatPrice(taxBreakdown.total_tax)}</span>
        </div>
      )}
    </div>
  );
}

