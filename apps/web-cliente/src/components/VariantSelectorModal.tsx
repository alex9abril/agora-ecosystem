/**
 * Modal flotante para seleccionar variantes de un producto
 * Muestra las variantes slide por slide (un grupo a la vez)
 */

import React, { useState, useEffect } from 'react';
import { Product, ProductVariantGroup, ProductVariant } from '@/lib/products';
import { useI18n } from '@/contexts/I18nContext';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface VariantSelectorModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (variantSelections: Record<string, string | string[]>, specialInstructions?: string) => void;
  initialQuantity?: number;
}

export default function VariantSelectorModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  initialQuantity = 1,
}: VariantSelectorModalProps) {
  const { t } = useI18n();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(initialQuantity);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const variantGroups = product.variant_groups || [];
  const totalSlides = variantGroups.length + 1; // +1 para el slide final de resumen

  // Reset cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setSelectedVariants({});
      setQuantity(initialQuantity);
      setSpecialInstructions('');
    }
  }, [isOpen, initialQuantity]);

  // Verificar si se pueden avanzar al siguiente slide
  const canGoNext = () => {
    if (currentSlide < variantGroups.length) {
      const currentGroup = variantGroups[currentSlide];
      if (currentGroup.is_required) {
        if (currentGroup.selection_type === 'single') {
          return !!selectedVariants[currentGroup.variant_group_id];
        } else {
          const selected = selectedVariants[currentGroup.variant_group_id] as string[] || [];
          return selected.length > 0;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1 && canGoNext()) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleVariantSelect = (groupId: string, variantId: string, selectionType: 'single' | 'multiple') => {
    if (selectionType === 'single') {
      setSelectedVariants({
        ...selectedVariants,
        [groupId]: variantId,
      });
    } else {
      const current = (selectedVariants[groupId] as string[]) || [];
      const updated = current.includes(variantId)
        ? current.filter(id => id !== variantId)
        : [...current, variantId];
      setSelectedVariants({
        ...selectedVariants,
        [groupId]: updated,
      });
    }
  };

  const handleAddToCart = () => {
    onAddToCart(selectedVariants, specialInstructions || undefined);
    onClose();
  };

  // Calcular precio total
  const calculateTotalPrice = () => {
    let total = product.price * quantity;
    
    variantGroups.forEach(group => {
      const selected = selectedVariants[group.variant_group_id];
      if (selected) {
        const variantIds = Array.isArray(selected) ? selected : [selected];
        group.variants.forEach(variant => {
          if (variantIds.includes(variant.variant_id)) {
            if (variant.absolute_price !== null && variant.absolute_price !== undefined) {
              total = variant.absolute_price * quantity;
            } else {
              total += (variant.price_adjustment || 0) * quantity;
            }
          }
        });
      }
    });

    return total;
  };

  if (!isOpen) return null;

  // Si no hay variantes, no mostrar el modal
  if (variantGroups.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Cerrar"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-black">{product.name}</h2>
          <div className="w-9" /> {/* Spacer para centrar */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slides de variantes */}
            {variantGroups.map((group, index) => (
              <div key={group.variant_group_id} className="w-full flex-shrink-0 p-4 overflow-y-auto">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-black mb-1">
                    {group.variant_group_name}
                    {group.is_required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}
                </div>

                {group.selection_type === 'single' ? (
                  <div className="space-y-2">
                    {group.variants.map((variant: ProductVariant) => {
                      const isSelected = selectedVariants[group.variant_group_id] === variant.variant_id;
                      const variantPrice = variant.absolute_price !== null && variant.absolute_price !== undefined
                        ? variant.absolute_price
                        : product.price + (variant.price_adjustment || 0);

                      return (
                        <button
                          key={variant.variant_id}
                          onClick={() => handleVariantSelect(group.variant_group_id, variant.variant_id, 'single')}
                          className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{variant.variant_name}</span>
                            {variantPrice !== product.price && (
                              <span className="text-sm">
                                {variantPrice > product.price ? '+' : ''}
                                ${(variantPrice - product.price).toFixed(2)}
                              </span>
                            )}
                          </div>
                          {variant.description && (
                            <p className="text-xs mt-1 opacity-80">{variant.description}</p>
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
                      const variantPrice = variant.absolute_price !== null && variant.absolute_price !== undefined
                        ? variant.absolute_price
                        : product.price + (variant.price_adjustment || 0);

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
                              onChange={() => handleVariantSelect(group.variant_group_id, variant.variant_id, 'multiple')}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className={`font-medium ${isSelected ? 'text-black' : 'text-gray-700'}`}>
                              {variant.variant_name}
                            </span>
                          </div>
                          {variantPrice !== product.price && (
                            <span className={`text-sm ${isSelected ? 'text-gray-700' : 'text-gray-600'}`}>
                              {variantPrice > product.price ? '+' : ''}
                              ${(variantPrice - product.price).toFixed(2)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Slide final: Resumen y cantidad */}
            <div className="w-full flex-shrink-0 p-4 overflow-y-auto">
              <h3 className="text-xl font-bold text-black mb-4">Resumen</h3>

              {/* Cantidad */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    <span className="text-xl">−</span>
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    <span className="text-xl">+</span>
                  </button>
                </div>
              </div>

              {/* Notas especiales */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas especiales (opcional)
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Ej: Sin cebolla, por favor"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  rows={3}
                />
              </div>

              {/* Precio total */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-black">Total</span>
                  <span className="text-2xl font-bold text-black">
                    ${calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con navegación */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
          {currentSlide > 0 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center gap-2"
            >
              <ArrowBackIcon className="w-5 h-5" />
              <span>Atrás</span>
            </button>
          ) : (
            <div className="w-20" /> // Spacer
          )}

          {/* Indicadores de slide */}
          <div className="flex gap-1 flex-1 justify-center">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-black' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentSlide < totalSlides - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Siguiente</span>
              <ArrowForwardIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Agregar al Carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

