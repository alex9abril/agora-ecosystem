/**
 * Página de checkout - Proceso de pago
 * Versión desktop con pasos claros
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import CheckoutSteps, { CheckoutStep } from '@/components/CheckoutSteps';
import AddressForm from '@/components/AddressForm';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { addressesService, Address, CreateAddressDto } from '@/lib/addresses';
import { ordersService, CheckoutDto } from '@/lib/orders';
import { cartService, CartItem, TaxBreakdown } from '@/lib/cart';
import { taxesService } from '@/lib/taxes';
import { productsService, Product } from '@/lib/products';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import ContextualLink from '@/components/ContextualLink';
import { formatPrice } from '@/lib/format';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, refreshCart } = useCart();
  const { getCartUrl } = useStoreRouting();
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [productsData, setProductsData] = useState<Record<string, Product>>({});

  // Redirigir solo si carrito vacío o no autenticado al proceder
  useEffect(() => {
    if (!cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
      router.push(getCartUrl());
      return;
    }
    // Requerir login solo cuando se intenta proceder al checkout
    if (!authLoading && !isAuthenticated && cart && cart.items && cart.items.length > 0) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
  }, [isAuthenticated, authLoading, cart, cartLoading, router, getCartUrl]);

  // Cargar direcciones
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadAddresses();
    }
  }, [isAuthenticated, authLoading]);

  // Cargar productos y calcular impuestos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      loadProducts();
      calculateTaxes();
    }
  }, [cart]);

  const loadAddresses = async () => {
    try {
      const data = await addressesService.findAll();
      setAddresses(data);
      const defaultAddress = data.find(a => a.is_default) || data[0];
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error: any) {
      console.error('Error cargando direcciones:', error);
    }
  };

  const loadProducts = async () => {
    if (!cart || !cart.items) return;
    
    const productIds = [...new Set(cart.items.map(item => item.product_id))];
    const productsMap: Record<string, Product> = {};
    
    await Promise.all(
      productIds.map(async (productId) => {
        try {
          const product = await productsService.getProduct(productId);
          productsMap[productId] = product;
        } catch (error) {
          console.error(`Error cargando producto ${productId}:`, error);
        }
      })
    );
    
    setProductsData(productsMap);
  };

  const calculateTaxes = async () => {
    if (!cart || !cart.items) return;
    
    const taxBreakdowns: Record<string, TaxBreakdown> = {};
    
    await Promise.all(
      cart.items.map(async (item: CartItem) => {
        try {
          const subtotal = parseFloat(String(item.item_subtotal || 0));
          const taxBreakdown = await taxesService.calculateProductTaxes(item.product_id, subtotal);
          taxBreakdowns[item.id] = taxBreakdown;
        } catch (error) {
          taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
        }
      })
    );
    
    setItemsTaxBreakdowns(taxBreakdowns);
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setShowAddressForm(false);
  };

  const handleAddressCreate = async (addressData: CreateAddressDto) => {
    try {
      const newAddress = await addressesService.create(addressData);
      await loadAddresses();
      setSelectedAddress(newAddress);
      setShowAddressForm(false);
    } catch (error: any) {
      setError(error.message || 'Error al crear dirección');
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'address') {
      if (!selectedAddress) {
        setError('Por favor selecciona una dirección');
        return;
      }
      setCurrentStep('delivery');
    } else if (currentStep === 'delivery') {
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('summary');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'delivery') {
      setCurrentStep('address');
    } else if (currentStep === 'payment') {
      setCurrentStep('delivery');
    } else if (currentStep === 'summary') {
      setCurrentStep('payment');
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress || !cart) {
      setError('Faltan datos para completar el pedido');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      const checkoutDto: CheckoutDto = {
        addressId: selectedAddress.id,
        deliveryNotes: deliveryNotes || undefined,
        tipAmount: tipAmount || 0,
      };

      const order = await ordersService.checkout(checkoutDto);
      
      if (!order || !order.id) {
        setError('Error al crear el pedido. Por favor intenta de nuevo.');
        return;
      }
      
      await refreshCart();
      window.location.href = `/orders/${order.id}`;
    } catch (error: any) {
      console.error('Error en checkout:', error);
      setError(error.message || 'Error al procesar el pedido');
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || cartLoading || !cart || !cart.items || cart.items.length === 0) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </StoreLayout>
    );
  }

  const subtotal = parseFloat(cart.subtotal || '0');
  const totalTax = Object.values(itemsTaxBreakdowns).reduce(
    (sum, breakdown) => sum + (breakdown?.total_tax || 0),
    0
  );
  const deliveryFee = 0;
  const total = subtotal + totalTax + deliveryFee + tipAmount;

  return (
    <>
      <Head>
        <title>Checkout - Agora</title>
      </Head>
      <StoreLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Indicador de pasos */}
          <CheckoutSteps currentStep={currentStep} className="mb-8" />

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Contenido del paso actual */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {currentStep === 'address' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Seleccionar Dirección</h2>
                {!showAddressForm ? (
                  <>
                    {addresses.length > 0 ? (
                      <div className="space-y-3 mb-4">
                        {addresses.map((address) => (
                          <button
                            key={address.id}
                            onClick={() => handleAddressSelect(address)}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                              selectedAddress?.id === address.id
                                ? 'border-black bg-gray-50'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <div className="font-semibold mb-1">{address.label || 'Dirección'}</div>
                            <div className="text-sm text-gray-600">
                              {address.street} {address.street_number && `#${address.street_number}`}
                              {address.interior_number && ` Int. ${address.interior_number}`}
                              <br />
                              {address.neighborhood}, {address.city}
                              {address.postal_code && ` ${address.postal_code}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 mb-4">No tienes direcciones guardadas</p>
                    )}
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      + Agregar Nueva Dirección
                    </button>
                  </>
                ) : (
                  <AddressForm
                    onSubmit={handleAddressCreate}
                    onCancel={() => setShowAddressForm(false)}
                  />
                )}
              </div>
            )}

            {currentStep === 'delivery' && selectedAddress && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Información de Entrega</h2>
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="font-semibold mb-2">Dirección de entrega:</div>
                  <div className="text-sm text-gray-600">
                    {selectedAddress.street} {selectedAddress.street_number && `#${selectedAddress.street_number}`}
                    {selectedAddress.interior_number && ` Int. ${selectedAddress.interior_number}`}
                    <br />
                    {selectedAddress.neighborhood}, {selectedAddress.city}
                    {selectedAddress.postal_code && ` ${selectedAddress.postal_code}`}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas de entrega (opcional)
                  </label>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Ej: Llamar antes de llegar"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {currentStep === 'payment' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Propina</h2>
                <div className="space-y-3 mb-4">
                  {[0, 10, 15, 20].map((percent) => {
                    const amount = (subtotal * percent) / 100;
                    return (
                      <button
                        key={percent}
                        onClick={() => setTipAmount(amount)}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                          tipAmount === amount
                            ? 'border-black bg-gray-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{percent === 0 ? 'Sin propina' : `${percent}%`}</span>
                          <span className="font-semibold">{formatPrice(amount)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Propina personalizada
                  </label>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            )}

            {currentStep === 'summary' && selectedAddress && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Resumen del Pedido</h2>
                
                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Productos</h3>
                  <div className="space-y-3">
                    {cart.items.map((item: CartItem) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-gray-600">
                            Cantidad: {item.quantity} × {formatPrice(parseFloat(String(item.unit_price || 0)))}
                          </div>
                          {itemsTaxBreakdowns[item.id] && (
                            <TaxBreakdownComponent taxBreakdown={itemsTaxBreakdowns[item.id]} compact />
                          )}
                        </div>
                        <div className="font-semibold">
                          {formatPrice(parseFloat(String(item.item_subtotal || 0)))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuestos</span>
                    <span>{formatPrice(totalTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Envío</span>
                    <span>{formatPrice(deliveryFee)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Propina</span>
                      <span>{formatPrice(tipAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex gap-3">
            {currentStep !== 'address' && (
              <button
                onClick={handlePreviousStep}
                className="flex-1 px-6 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Anterior
              </button>
            )}
            {currentStep !== 'summary' ? (
              <button
                onClick={handleNextStep}
                className="flex-1 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            )}
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

