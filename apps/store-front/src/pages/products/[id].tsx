/**
 * Página de detalle de producto - Contexto Global
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import VariantSelector from '@/components/VariantSelector';
import StockIndicator from '@/components/StockIndicator';
import BranchPriceDisplay from '@/components/BranchPriceDisplay';
import BranchAvailabilityGrid from '@/components/BranchAvailabilityGrid';
import { productsService, Product, ProductBranchAvailability } from '@/lib/products';
import { branchesService } from '@/lib/branches';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import ContextualLink from '@/components/ContextualLink';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatPrice } from '@/lib/format';
import WarningIcon from '@mui/icons-material/Warning';

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { contextType, branchId } = useStoreContext();
  const { push } = useStoreRouting();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchAvailabilities, setBranchAvailabilities] = useState<ProductBranchAvailability[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [storedBranch, setStoredBranch] = useState<{ id: string; name: string } | null>(null);

  // Cargar sucursal guardada en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selected_branch');
        if (stored) {
          const branch = JSON.parse(stored);
          setStoredBranch({ id: branch.id, name: branch.name });
        }
      } catch (error) {
        console.error('Error leyendo sucursal guardada:', error);
      }
    }
  }, []);

  // Cuando se carga la sucursal guardada, si hay disponibilidades ya cargadas, seleccionarla automáticamente
  useEffect(() => {
    if (contextType === 'global' && storedBranch && branchAvailabilities.length > 0 && !selectedBranchId) {
      // Si hay una sucursal guardada y está disponible, seleccionarla automáticamente
      const storedBranchAvailable = branchAvailabilities.find(
        (avail) => avail.branch_id === storedBranch.id && avail.is_active && avail.is_enabled
      );
      if (storedBranchAvailable) {
        setSelectedBranchId(storedBranch.id);
      }
    }
  }, [storedBranch, branchAvailabilities, contextType, selectedBranchId]);

  useEffect(() => {
    if (id) {
      loadProduct();
      // Si estamos en contexto global, cargar disponibilidad en todas las sucursales
      if (contextType === 'global') {
        loadBranchAvailabilities();
      }
    }
  }, [id, branchId, contextType]);

  const loadProduct = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoading(true);
      const productData = await productsService.getProduct(id, branchId || undefined);
      setProduct(productData);
    } catch (error) {
      console.error('Error cargando producto:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBranchAvailabilities = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setLoadingAvailabilities(true);
      const response = await productsService.getProductBranchAvailability(id);
      const availabilities = response.availabilities || [];
      setBranchAvailabilities(availabilities);
      
      // Obtener sucursal guardada (puede no estar en el estado aún)
      let currentStoredBranch = storedBranch;
      if (!currentStoredBranch && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('selected_branch');
          if (stored) {
            const branch = JSON.parse(stored);
            currentStoredBranch = { id: branch.id, name: branch.name };
          }
        } catch (error) {
          // Ignorar error
        }
      }
      
      // Si ya hay una sucursal seleccionada manualmente, no cambiar la selección
      if (selectedBranchId) {
        return;
      }
      
      // Si hay una sucursal guardada y está disponible, seleccionarla automáticamente (prioridad)
      if (currentStoredBranch) {
        const storedBranchAvailable = availabilities.find(
          (avail) => avail.branch_id === currentStoredBranch!.id && avail.is_active && avail.is_enabled
        );
        if (storedBranchAvailable) {
          setSelectedBranchId(currentStoredBranch.id);
          return;
        }
      }
      
      // Si no hay sucursal guardada o no está disponible, seleccionar la más barata
      const availableBranches = availabilities
        .filter((avail) => avail.is_active && avail.is_enabled)
        .map((avail) => ({
          ...avail,
          displayPrice: avail.price !== null && avail.price !== undefined
            ? avail.price
            : product?.price || 0,
        }))
        .sort((a, b) => a.displayPrice - b.displayPrice);
      
      if (availableBranches.length > 0) {
        setSelectedBranchId(availableBranches[0].branch_id);
      }
    } catch (error) {
      console.error('Error cargando disponibilidad por sucursal:', error);
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // Requerir login solo al agregar al carrito
    if (!isAuthenticated) {
      const shouldLogin = confirm('Debes iniciar sesión para agregar productos al carrito. ¿Deseas iniciar sesión ahora?');
      if (shouldLogin) {
        push('/auth/login');
      }
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

    // Determinar branchId a usar
    let branchIdToUse: string | undefined;
    if (contextType === 'sucursal') {
      branchIdToUse = branchId || undefined;
    } else if (contextType === 'global' && selectedBranchId) {
      branchIdToUse = selectedBranchId;
    }

    // Validar stock según la sucursal
    if (contextType === 'global' && selectedBranchId) {
      const selectedBranch = branchAvailabilities.find(
        (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
      );
      if (selectedBranch && selectedBranch.stock !== null && selectedBranch.stock !== undefined) {
        if (selectedBranch.stock < quantity) {
          alert(`Solo hay ${selectedBranch.stock} unidades disponibles en ${selectedBranch.branch_name}`);
          return;
        }
      }
    } else if (contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined) {
      if (product.branch_stock < quantity) {
        alert(`Solo hay ${product.branch_stock} unidades disponibles`);
        return;
      }
    }

    // Validar que se haya seleccionado una sucursal en contexto global
    if (contextType === 'global' && !selectedBranchId) {
      alert('Por favor, selecciona una sucursal de la lista');
      return;
    }

    try {
      setAddingToCart(true);
      await addItem(
        product.id,
        quantity,
        selectedVariants,
        specialInstructions || undefined,
        branchIdToUse
      );
      
      // Opcional: redirigir al carrito
      // push('/cart');
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando producto...</p>
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Producto no encontrado</p>
          <ContextualLink href="/products" className="text-black hover:text-gray-700 mt-4 inline-block">
            Volver a productos
          </ContextualLink>
        </div>
      </StoreLayout>
    );
  }

  // Obtener precio de la sucursal seleccionada
  const getSelectedBranchPrice = () => {
    if (contextType === 'sucursal' && product.branch_price !== undefined) {
      return product.branch_price;
    }
    if (contextType === 'global' && selectedBranchId) {
      const selectedBranch = branchAvailabilities.find(
        (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
      );
      if (selectedBranch) {
        return selectedBranch.price !== null && selectedBranch.price !== undefined
          ? selectedBranch.price
          : product.price;
      }
    }
    return product.price;
  };

  // Calcular precio total con variantes
  const calculateTotalPrice = () => {
    const basePrice = getSelectedBranchPrice();
    
    let total = basePrice * quantity;
    
    if (product.variant_groups) {
      product.variant_groups.forEach((group) => {
        const selected = selectedVariants[group.variant_group_id];
        if (selected) {
          const variantIds = Array.isArray(selected) ? selected : [selected];
          group.variants.forEach((variant) => {
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
    }

    return total;
  };

  const displayPrice = getSelectedBranchPrice();
  
  // Obtener la sucursal seleccionada para mostrar información
  const selectedBranch = contextType === 'global' && selectedBranchId
    ? branchAvailabilities.find(
        (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
      )
    : null;

  const isAvailable = contextType === 'sucursal' 
    ? (product.branch_is_enabled !== false && product.is_available)
    : product.is_available;

  return (
    <>
      <Head>
        <title>{product.name} - Agora</title>
        <meta name="description" content={product.description || product.name} />
      </Head>
      <StoreLayout>
        <div className="max-w-6xl mx-auto">
          {/* Botón de regresar */}
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowBackIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Volver</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Imagen */}
            <div>
              {product.image_url && (
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Información */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
              
              {/* Precio */}
              <div className="mb-4">
                {contextType === 'global' ? (
                  <div>
                    {selectedBranch ? (
                      <>
                        <span className="text-sm text-gray-600 mb-1 block">Precio:</span>
                        <span className="text-3xl font-bold text-black">
                          {formatPrice(displayPrice)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedBranch.branch_name}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-gray-600 mb-1 block">Precio global:</span>
                        <span className="text-3xl font-bold text-black">
                          {formatPrice(product.price)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Selecciona una sucursal para ver precio y stock específicos
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <BranchPriceDisplay 
                    product={product} 
                    branchPrice={product.branch_price}
                  />
                )}
              </div>

              {/* Stock */}
              {contextType === 'global' && selectedBranch && (
                <div className="mb-4">
                  <StockIndicator
                    stock={selectedBranch.stock}
                    isEnabled={selectedBranch.is_enabled}
                  />
                </div>
              )}
              {contextType === 'sucursal' && (
                <div className="mb-4">
                  <StockIndicator 
                    stock={product.branch_stock} 
                    isEnabled={product.branch_is_enabled}
                  />
                </div>
              )}

              {/* Descripción */}
              {product.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Descripción</h2>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              {/* Categoría */}
              {product.category_name && (
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {product.category_name}
                  </span>
                </div>
              )}

              {/* Lista de sucursales disponibles (solo en contexto global) */}
              {contextType === 'global' && (
                <div className="mb-8">
                  {loadingAvailabilities ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Cargando sucursales disponibles...</p>
                    </div>
                  ) : (
                    <>
                      {/* Alerta si el producto no está disponible en la sucursal seleccionada */}
                      {storedBranch && !branchAvailabilities.some(
                        (avail) => avail.branch_id === storedBranch.id && avail.is_active && avail.is_enabled
                      ) && (
                        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <WarningIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                                Producto no disponible en tu sucursal seleccionada
                              </h4>
                              <p className="text-sm text-yellow-700 mb-2">
                                Este producto no se encuentra disponible en <strong>{storedBranch.name}</strong>, pero puedes agregarlo al carrito desde otra sucursal.
                              </p>
                              <p className="text-xs text-yellow-600">
                                <strong>Nota:</strong> Si agregas este producto desde una sucursal diferente a la seleccionada, es probable que se genere una división de pedidos y costos adicionales de envío.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <BranchAvailabilityGrid
                        availabilities={branchAvailabilities}
                        globalPrice={product.price}
                        selectedBranchId={selectedBranchId}
                        onBranchSelect={setSelectedBranchId}
                        storedBranchId={storedBranch?.id}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Variantes */}
              {product.variant_groups && product.variant_groups.length > 0 && (
                <div className="mb-6">
                  <VariantSelector
                    product={product}
                    selectedVariants={selectedVariants}
                    onVariantChange={setSelectedVariants}
                  />
                </div>
              )}

              {/* Cantidad */}
              <div className="mb-6">
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
              <div className="mb-6">
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
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-black">
                    {formatPrice(calculateTotalPrice())}
                  </span>
                </div>
              </div>

              {/* Advertencia si se selecciona una sucursal diferente a la guardada */}
              {contextType === 'global' && storedBranch && selectedBranchId && selectedBranchId !== storedBranch.id && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <WarningIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                        Sucursal diferente a la seleccionada
                      </h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        Estás agregando este producto desde una sucursal diferente a <strong>{storedBranch.name}</strong> (tu sucursal seleccionada).
                        {selectedBranch && (
                          <> Actualmente seleccionada: <strong>{selectedBranch.branch_name}</strong>.</>
                        )}
                      </p>
                      <p className="text-xs text-yellow-600">
                        <strong>Nota:</strong> Esto puede generar una división de pedidos y costos adicionales de envío si tu carrito contiene productos de diferentes sucursales.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botón agregar al carrito */}
              {contextType === 'global' && !selectedBranchId && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-4">
                  <p className="font-medium mb-1">Selecciona una sucursal para agregar al carrito</p>
                  <p className="text-sm">Elige una sucursal de la lista arriba para ver precio y stock específicos</p>
                </div>
              )}
              {contextType === 'global' && selectedBranchId && (
                <button 
                  onClick={handleAddToCart}
                  className="w-full py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    product.variant_groups?.some(g => g.is_required && !selectedVariants[g.variant_group_id]) ||
                    addingToCart ||
                    (selectedBranch && selectedBranch.stock !== null && selectedBranch.stock !== undefined && selectedBranch.stock < quantity)
                  }
                >
                  {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
                </button>
              )}
              {contextType !== 'global' && !isAvailable && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  Producto no disponible
                </div>
              )}
              {contextType !== 'global' && isAvailable && (
                <button 
                  onClick={handleAddToCart}
                  className="w-full py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    product.variant_groups?.some(g => g.is_required && !selectedVariants[g.variant_group_id]) ||
                    addingToCart
                  }
                >
                  {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
                </button>
              )}
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

