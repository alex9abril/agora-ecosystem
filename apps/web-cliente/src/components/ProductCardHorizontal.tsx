/**
 * Card de producto horizontal (estilo app de delivery)
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/products';
import { useI18n } from '@/contexts/I18nContext';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import VariantSelectorModal from './VariantSelectorModal';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

interface ProductCardHorizontalProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCardHorizontal({ product, onAddToCart }: ProductCardHorizontalProps) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.is_available) return;

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Si el producto tiene variantes, abrir modal
    const hasVariants = product.variant_groups && product.variant_groups.length > 0;
    console.log('🔍 Producto tiene variantes?', {
      productId: product.id,
      productName: product.name,
      variant_groups: product.variant_groups,
      hasVariants,
    });
    
    if (hasVariants) {
      setShowModal(true);
      return;
    }

    // Si no tiene variantes, agregar directamente
    try {
      await addItem(product.id, 1);
      // Callback opcional
      if (onAddToCart) {
        onAddToCart(product);
      }
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    }
  };

  const handleModalAddToCart = async (variantSelections: Record<string, string | string[]>, specialInstructions?: string) => {
    try {
      await addItem(product.id, 1, variantSelections, specialInstructions);
      // Callback opcional
      if (onAddToCart) {
        onAddToCart(product);
      }
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    }
  };

  return (
    <>
      <Link href={`/products/${product.id}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 active:scale-[0.98]">
          <div className="flex gap-4 p-4">
            {/* Imagen del producto */}
            <div className="flex-shrink-0 relative">
              {product.image_url ? (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {!product.is_available && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold bg-red-500 px-2 py-1 rounded">
                        {t('products.outOfStock')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                  <RestaurantIcon className="text-4xl text-gray-400" />
                  {!product.is_available && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-lg">
                      <span className="text-white text-xs font-semibold bg-red-500 px-2 py-1 rounded">
                        {t('products.outOfStock')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Información del producto */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-1">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              {/* Precio y botón */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xl font-bold text-black">
                  ${product.price.toFixed(2)}
                </span>
                {product.is_available && (
                  <button
                    onClick={handleAddToCart}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-green-600 hover:bg-green-50 flex items-center justify-center transition-all duration-200 active:scale-95"
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
        </div>
      </Link>

      {/* Modal de selección de variantes */}
      {showModal && (
        <VariantSelectorModal
          product={product}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAddToCart={handleModalAddToCart}
        />
      )}
    </>
  );
}

