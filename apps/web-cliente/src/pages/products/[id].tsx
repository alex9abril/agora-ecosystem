/**
 * Página de detalle de producto
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useI18n } from '@/contexts/I18nContext';
import { productsService, Product, ProductVariantGroup, ProductVariant } from '@/lib/products';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ProductDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      const productData = await productsService.getProduct(id);
      console.log('📦 Producto cargado:', {
        id: productData.id,
        name: productData.name,
        variant_groups: productData.variant_groups,
        variant_groups_length: productData.variant_groups?.length || 0,
        variants: productData.variants,
      });
      setProduct(productData);
    } catch (error) {
      console.error('Error cargando producto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Si no está autenticado, redirigir a login
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Validar variantes requeridas
    const hasRequiredVariants = !product.variant_groups?.some(
      g => g.is_required && !selectedVariants[g.variant_group_id]
    );

    if (!hasRequiredVariants) {
      alert('Por favor, selecciona todas las variantes requeridas');
      return;
    }

    try {
      setAddingToCart(true);
      await addItem(
        product.id,
        quantity,
        selectedVariants,
        specialInstructions || undefined
      );
      
      // El contexto ya maneja la animación y el sonido
      // Opcional: router.push('/cart');
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </MobileLayout>
    );
  }

  if (!product) {
    return (
      <MobileLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">{t('products.noProducts')}</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-6">
          {/* Botón de regresar */}
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowBackIcon className="w-5 h-5" />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>

          {product.image_url && (
            <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="mb-4">
            <span className="text-3xl font-bold text-black">
              ${product.price.toFixed(2)}
            </span>
          </div>
          {product.description && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">{t('products.description')}</h2>
              <p className="text-gray-600">{product.description}</p>
            </div>
          )}
          {product.category_name && (
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {product.category_name}
              </span>
            </div>
          )}

          {/* Variantes del producto */}
          {product.variant_groups && product.variant_groups.length > 0 && (
            <div className="mb-6 space-y-4">
              {product.variant_groups.map((group: ProductVariantGroup) => (
                <div key={group.variant_group_id} className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {group.variant_group_name}
                    {group.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {group.selection_type === 'single' ? (
                    <div className="flex flex-wrap gap-2">
                      {group.variants.map((variant: ProductVariant) => {
                        const isSelected = selectedVariants[group.variant_group_id] === variant.variant_id;
                        const variantPrice = variant.absolute_price !== null && variant.absolute_price !== undefined
                          ? variant.absolute_price
                          : product.price + (variant.price_adjustment || 0);
                        
                        return (
                          <button
                            key={variant.variant_id}
                            type="button"
                            onClick={() => {
                              setSelectedVariants({
                                ...selectedVariants,
                                [group.variant_group_id]: variant.variant_id,
                              });
                            }}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                              isSelected
                                ? 'border-black bg-black text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-medium">{variant.variant_name}</div>
                            {variantPrice !== product.price && (
                              <div className="text-xs text-gray-500">
                                {variantPrice > product.price ? '+' : ''}
                                ${(variantPrice - product.price).toFixed(2)}
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
                                onChange={(e) => {
                                  const current = (selectedVariants[group.variant_group_id] as string[]) || [];
                                  const updated = e.target.checked
                                    ? [...current, variant.variant_id]
                                    : current.filter(id => id !== variant.variant_id);
                                  setSelectedVariants({
                                    ...selectedVariants,
                                    [group.variant_group_id]: updated,
                                  });
                                }}
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
            </div>
          )}

          {/* Cantidad y notas especiales */}
          <div className="mt-4 space-y-4 mb-4">
            {/* Cantidad */}
            <div>
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
            <div>
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
          </div>

          {/* Precio total calculado */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total:</span>
              <span className="text-2xl font-bold text-black">
                ${(() => {
                  let total = product.price * quantity;
                  if (product.variant_groups) {
                    product.variant_groups.forEach((group: ProductVariantGroup) => {
                      if (group.selection_type === 'single') {
                        const selectedId = selectedVariants[group.variant_group_id] as string;
                        if (selectedId) {
                          const variant = group.variants.find(v => v.variant_id === selectedId);
                          if (variant) {
                            if (variant.absolute_price !== null && variant.absolute_price !== undefined) {
                              total = variant.absolute_price * quantity;
                            } else {
                              total += (variant.price_adjustment || 0) * quantity;
                            }
                          }
                        }
                      } else {
                        const selectedIds = (selectedVariants[group.variant_group_id] as string[]) || [];
                        selectedIds.forEach(variantId => {
                          const variant = group.variants.find(v => v.variant_id === variantId);
                          if (variant) {
                            total += (variant.price_adjustment || 0) * quantity;
                          }
                        });
                      }
                    });
                  }
                  return total.toFixed(2);
                })()}
              </span>
            </div>
          </div>

          {!product.is_available && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {t('products.outOfStock')}
            </div>
          )}
          {product.is_available && (
            <button 
              onClick={handleAddToCart}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 active:bg-gray-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                product.variant_groups?.some(g => g.is_required && !selectedVariants[g.variant_group_id]) ||
                addingToCart
              }
            >
              {addingToCart ? 'Agregando...' : t('products.addToCart')}
            </button>
          )}
        </div>
      </MobileLayout>
    </>
  );
}

