/**
 * Componente para selección de variantes de producto
 * Versión desktop (inline, no modal)
 */

import React, { useEffect, useState } from 'react';
import { Product, ProductVariantGroup, ProductVariant } from '@/lib/products';
import type { BranchTaxSettings } from '@/lib/branches';
import { formatPrice } from '@/lib/format';
import { resolveDisplayPrice } from '@/lib/price-display';

interface VariantSelectorProps {
  product: Product;
  selectedVariants: Record<string, string | string[]>;
  onVariantChange: (variants: Record<string, string | string[]>) => void;
  className?: string;
  baseProductPrice?: number | null;
  baseDisplayPrice?: number | null;
  taxSettings?: BranchTaxSettings | null;
}

export default function VariantSelector({
  product,
  selectedVariants,
  onVariantChange,
  className = '',
  baseProductPrice,
  baseDisplayPrice,
  taxSettings,
}: VariantSelectorProps) {
  const variantGroups = product.variant_groups || [];
  const [variantPriceDiffs, setVariantPriceDiffs] = useState<Record<string, number>>({});

  if (variantGroups.length === 0) {
    return null;
  }

  useEffect(() => {
    let cancelled = false;

    const resolveVariantDiffs = async () => {
      const referenceBasePrice = baseProductPrice ?? product.price ?? 0;
      const referenceDisplayPrice = baseDisplayPrice ?? referenceBasePrice;

      if (!referenceBasePrice || !referenceDisplayPrice) {
        if (!cancelled) {
          setVariantPriceDiffs({});
        }
        return;
      }

      const entries = await Promise.all(
        variantGroups.flatMap((group) =>
          group.variants.map(async (variant) => {
            const variantBasePrice =
              variant.absolute_price !== null && variant.absolute_price !== undefined
                ? variant.absolute_price
                : referenceBasePrice + (variant.price_adjustment || 0);

            const variantDisplayPrice = await resolveDisplayPrice({
              productId: product.id,
              basePrice: variantBasePrice,
              taxSettings,
            });

            return [variant.variant_id, variantDisplayPrice - referenceDisplayPrice] as const;
          }),
        ),
      );

      if (!cancelled) {
        setVariantPriceDiffs(Object.fromEntries(entries));
      }
    };

    resolveVariantDiffs();

    return () => {
      cancelled = true;
    };
  }, [baseDisplayPrice, baseProductPrice, product.id, product.price, taxSettings, variantGroups]);

  const handleVariantSelect = (groupId: string, variantId: string, selectionType: 'single' | 'multiple') => {
    let updated: Record<string, string | string[]>;

    if (selectionType === 'single') {
      updated = {
        ...selectedVariants,
        [groupId]: variantId,
      };
    } else {
      const current = (selectedVariants[groupId] as string[]) || [];
      const updatedArray = current.includes(variantId)
        ? current.filter(id => id !== variantId)
        : [...current, variantId];
      updated = {
        ...selectedVariants,
        [groupId]: updatedArray,
      };
    }

    onVariantChange(updated);
  };

  const getVariantBasePrice = (variant: ProductVariant) => {
    const referenceBasePrice = baseProductPrice ?? product.price ?? 0;
    return variant.absolute_price !== null && variant.absolute_price !== undefined
      ? variant.absolute_price
      : referenceBasePrice + (variant.price_adjustment || 0);
  };

  const getVariantDiffLabel = (variant: ProductVariant) => {
    const referenceBasePrice = baseProductPrice ?? product.price ?? 0;
    const fallbackDiff = getVariantBasePrice(variant) - referenceBasePrice;
    const resolvedDiff = variantPriceDiffs[variant.variant_id];
    const diff = resolvedDiff !== undefined ? resolvedDiff : fallbackDiff;

    if (Math.abs(diff) < 0.005) {
      return null;
    }

    return `${diff > 0 ? '+' : '-'}${formatPrice(Math.abs(diff))}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {variantGroups.map((group: ProductVariantGroup) => (
        <div key={group.variant_group_id}>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {group.variant_group_name}
            {group.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {group.description && (
            <p className="text-xs text-gray-500 mb-2">{group.description}</p>
          )}

          {group.selection_type === 'single' ? (
            <div className="flex flex-wrap gap-2">
              {group.variants.map((variant: ProductVariant) => {
                const isSelected = selectedVariants[group.variant_group_id] === variant.variant_id;
                const diffLabel = getVariantDiffLabel(variant);

                return (
                  <button
                    key={variant.variant_id}
                    type="button"
                    onClick={() => handleVariantSelect(group.variant_group_id, variant.variant_id, 'single')}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? 'border-toyota-red bg-toyota-red text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-toyota-gray'
                    }`}
                  >
                    <div className="font-medium">{variant.variant_name}</div>
                    {diffLabel && (
                      <div className="text-xs">
                        {diffLabel}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {group.variants.map((variant: ProductVariant) => {
                const selectedArray = (selectedVariants[group.variant_group_id] as string[]) || [];
                const isSelected = selectedArray.includes(variant.variant_id);
                const diffLabel = getVariantDiffLabel(variant);

                return (
                  <label
                    key={variant.variant_id}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          handleVariantSelect(group.variant_group_id, variant.variant_id, 'multiple');
                        }}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className={`font-medium ${isSelected ? 'text-black' : 'text-gray-700'}`}>
                        {variant.variant_name}
                      </span>
                    </div>
                    {diffLabel && (
                      <span className={`text-sm ${isSelected ? 'text-gray-700' : 'text-gray-600'}`}>
                        {diffLabel}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

