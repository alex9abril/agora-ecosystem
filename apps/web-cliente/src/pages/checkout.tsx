/**
 * Página de checkout - Proceso de pago
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { addressesService, Address, CreateAddressDto } from '@/lib/addresses';
import { ordersService, CheckoutDto } from '@/lib/orders';
import { cartService, CartItem, TaxBreakdown } from '@/lib/cart';
import { taxesService } from '@/lib/taxes';
import { productsService, Product } from '@/lib/products';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PaymentIcon from '@mui/icons-material/Payment';
import RestaurantIcon from '@mui/icons-material/Restaurant';

type CheckoutStep = 'address' | 'delivery' | 'payment' | 'summary';

export default function CheckoutPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, refreshCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [nearestBusiness, setNearestBusiness] = useState<any>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [loadingTaxes, setLoadingTaxes] = useState(false);
  const [productsData, setProductsData] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Redirigir si no está autenticado o carrito vacío
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!cartLoading && (!cart || !cart.items || cart.items.length === 0)) {
      router.push('/cart');
      return;
    }
  }, [isAuthenticated, authLoading, cart, cartLoading, router]);

  // Función para cargar direcciones - memoizada para evitar recreaciones
  const loadAddresses = React.useCallback(async () => {
    try {
      console.log('🔄 Cargando direcciones...');
      const data = await addressesService.findAll();
      console.log('✅ Direcciones cargadas:', data);
      console.log('📊 Cantidad de direcciones:', Array.isArray(data) ? data.length : 'No es un array');
      
      if (!Array.isArray(data)) {
        console.error('❌ Error: La respuesta no es un array:', data);
        setAddresses([]);
        return;
      }
      
      setAddresses(data);
      
      // Seleccionar dirección predeterminada si existe
      const defaultAddress = data.find(a => a.is_default);
      if (defaultAddress) {
        console.log('📍 Dirección predeterminada encontrada:', defaultAddress);
        setSelectedAddress(defaultAddress);
      } else if (data.length > 0) {
        console.log('📍 Seleccionando primera dirección:', data[0]);
        setSelectedAddress(data[0]);
      } else {
        console.log('⚠️ No hay direcciones disponibles');
        setSelectedAddress(null);
      }
    } catch (error: any) {
      console.error('❌ Error cargando direcciones:', error);
      setError('Error al cargar direcciones');
      setAddresses([]);
    }
  }, []);

  // Cargar direcciones cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('🔍 Usuario autenticado, cargando direcciones...');
      loadAddresses();
    }
  }, [isAuthenticated, authLoading, loadAddresses]);

  // Función para cargar negocio más cercano - memoizada
  const loadNearestBusiness = React.useCallback(async () => {
    if (!selectedAddress || !cart?.business_id) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/businesses/nearest?latitude=${selectedAddress.latitude}&longitude=${selectedAddress.longitude}&businessId=${cart.business_id}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener negocio más cercano: ${response.statusText}`);
      }

      const result = await response.json();
      setNearestBusiness(result.data || result);
    } catch (error) {
      console.error('Error obteniendo negocio más cercano:', error);
      // Continuar sin el negocio más cercano
    }
  }, [selectedAddress, cart?.business_id]);

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
      
      console.log('✅ Pedido creado:', order);
      
      // Validar que el order tenga id
      if (!order || !order.id) {
        console.error('❌ Error: El pedido no tiene ID', order);
        setError('Error al crear el pedido. Por favor intenta de nuevo.');
        return;
      }
      
      // Limpiar carrito
      await refreshCart();
      
      // Usar window.location para una redirección completa y evitar problemas con hooks
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
      <MobileLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </MobileLayout>
    );
  }

  const subtotal = parseFloat(cart.subtotal || '0');
  // Calcular impuestos para cada item del carrito
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      let isMounted = true;
      
      const calculateTaxes = async () => {
        setLoadingTaxes(true);
        try {
          const taxBreakdowns: Record<string, TaxBreakdown> = {};
          
          await Promise.all(
            cart.items.map(async (item: CartItem) => {
              try {
                const itemSubtotal = parseFloat(String(item.item_subtotal || 0));
                const taxBreakdown = await taxesService.calculateProductTaxes(item.product_id, itemSubtotal);
                if (isMounted) {
                  taxBreakdowns[item.id] = taxBreakdown;
                }
              } catch (error) {
                console.error(`Error calculando impuestos para item ${item.id}:`, error);
                if (isMounted) {
                  taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
                }
              }
            })
          );
          
          if (isMounted) {
            setItemsTaxBreakdowns(taxBreakdowns);
            setLoadingTaxes(false);
          }
        } catch (error) {
          console.error('Error calculando impuestos:', error);
          if (isMounted) {
            setLoadingTaxes(false);
          }
        }
      };
      
      calculateTaxes();
      
      return () => {
        isMounted = false;
      };
    }
  }, [cart]);

  // Cargar información de productos para obtener nombres de variantes
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadProducts = async () => {
        setLoadingProducts(true);
        try {
          const productIdsSet = new Set(cart.items.map((item: CartItem) => item.product_id));
          const productIds = Array.from(productIdsSet);
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
        } catch (error) {
          console.error('Error cargando productos:', error);
        } finally {
          setLoadingProducts(false);
        }
      };
      
      loadProducts();
    }
  }, [cart]);

  // Calcular total de impuestos
  const totalTax = Object.values(itemsTaxBreakdowns).reduce(
    (sum, breakdown) => sum + (breakdown?.total_tax || 0),
    0
  );
  const deliveryFee = 0; // Por ahora gratis
  const total = subtotal + totalTax + deliveryFee + tipAmount;

  return (
    <>
      <Head>
        <title>Checkout - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowBackIcon className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-black">Checkout</h1>
          </div>

          {/* Indicador de pasos */}
          <div className="flex items-center justify-between mb-6 px-4">
            {(['address', 'delivery', 'payment', 'summary'] as CheckoutStep[]).map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep === step ? 'bg-black text-white' :
                    ['address', 'delivery', 'payment', 'summary'].indexOf(currentStep) > index ? 'bg-green-600 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {['address', 'delivery', 'payment', 'summary'].indexOf(currentStep) > index ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 hidden sm:block">
                    {step === 'address' ? 'Dirección' :
                     step === 'delivery' ? 'Entrega' :
                     step === 'payment' ? 'Pago' : 'Resumen'}
                  </span>
                </div>
                {index < 3 && (
                  <div className={`h-0.5 flex-1 mx-2 ${
                    ['address', 'delivery', 'payment', 'summary'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Contenido del paso actual */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            {currentStep === 'address' && (
              <AddressStep
                addresses={addresses}
                selectedAddress={selectedAddress}
                onSelect={handleAddressSelect}
                showForm={showAddressForm}
                onToggleForm={() => setShowAddressForm(!showAddressForm)}
                onCreate={handleAddressCreate}
              />
            )}

            {currentStep === 'delivery' && selectedAddress && (
              <DeliveryStep
                address={selectedAddress}
                nearestBusiness={nearestBusiness}
                deliveryNotes={deliveryNotes}
                onDeliveryNotesChange={setDeliveryNotes}
              />
            )}

            {currentStep === 'payment' && (
              <PaymentStep
                tipAmount={tipAmount}
                onTipChange={setTipAmount}
              />
            )}

            {currentStep === 'summary' && selectedAddress && (
              <SummaryStep
                cart={cart}
                address={selectedAddress}
                subtotal={subtotal}
                totalTax={totalTax}
                itemsTaxBreakdowns={itemsTaxBreakdowns}
                deliveryFee={deliveryFee}
                tipAmount={tipAmount}
                total={total}
                deliveryNotes={deliveryNotes}
                productsData={productsData}
                loadingProducts={loadingProducts}
              />
            )}
          </div>

          {/* Botones de navegación */}
          <div className="flex gap-3">
            {currentStep !== 'address' && (
              <button
                onClick={handlePreviousStep}
                className="flex-1 py-3 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Anterior
              </button>
            )}
            {currentStep !== 'summary' ? (
              <button
                onClick={handleNextStep}
                className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={processing}
                className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            )}
          </div>
        </div>
      </MobileLayout>
    </>
  );
}

// Componente para el paso de dirección
function AddressStep({
  addresses,
  selectedAddress,
  onSelect,
  showForm,
  onToggleForm,
  onCreate,
}: {
  addresses: Address[];
  selectedAddress: Address | null;
  onSelect: (address: Address) => void;
  showForm: boolean;
  onToggleForm: () => void;
  onCreate: (address: CreateAddressDto) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateAddressDto>({
    street: '',
    neighborhood: '',
    postal_code: '',
    longitude: 0,
    latitude: 0,
  });
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación');
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      alert('Por favor, obtén tu ubicación primero');
      return;
    }
    onCreate(formData);
  };

  if (showForm) {
    return (
      <div>
        <h2 className="text-lg font-bold text-black mb-4">Nueva Dirección</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Casa, Trabajo, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calle *
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número exterior
              </label>
              <input
                type="text"
                value={formData.street_number || ''}
                onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colonia *
              </label>
              <input
                type="text"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código postal *
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {gettingLocation ? 'Obteniendo ubicación...' : '📍 Obtener mi ubicación'}
            </button>
            <button
              type="button"
              onClick={() => {
                // Datos de prueba completos para Colonia Roma, CDMX
                setFormData({
                  label: 'Casa',
                  street: 'Avenida Álvaro Obregón',
                  street_number: '45',
                  interior_number: '',
                  neighborhood: 'Roma Norte',
                  city: 'Ciudad de México',
                  state: 'CDMX',
                  postal_code: '06700',
                  country: 'México',
                  longitude: -99.1600,
                  latitude: 19.4220,
                  additional_references: '',
                  is_default: false,
                });
              }}
              className="w-full py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium border border-green-300"
            >
              🧪 Completar con Colonia Roma (Pruebas)
            </button>
            {formData.latitude && formData.longitude && (
              <p className="text-xs text-gray-500 mt-1">
                Ubicación: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onToggleForm}
              className="flex-1 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-black">Dirección de Entrega</h2>
        <button
          onClick={onToggleForm}
          className="flex items-center gap-1 text-black hover:text-gray-700 text-sm font-medium"
        >
          <AddIcon className="w-4 h-4" />
          Nueva
        </button>
      </div>
      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="text-center py-8">
            <LocationOnIcon className="text-4xl text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 mb-4">No tienes direcciones guardadas</p>
            <button
              onClick={onToggleForm}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Agregar Dirección
            </button>
          </div>
        ) : (
          addresses.map((address) => (
            <button
              key={address.id}
              onClick={() => onSelect(address)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedAddress?.id === address.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {selectedAddress?.id === address.id ? (
                    <RadioButtonUncheckedIcon className="w-5 h-5 text-black" />
                  ) : (
                    <RadioButtonUncheckedIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-black">{address.label || 'Dirección'}</span>
                    {address.is_default && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Predeterminada</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.street} {address.street_number}
                    {address.interior_number && ` Int. ${address.interior_number}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// Componente para el paso de entrega
function DeliveryStep({
  address,
  nearestBusiness,
  deliveryNotes,
  onDeliveryNotesChange,
}: {
  address: Address;
  nearestBusiness: any;
  deliveryNotes: string;
  onDeliveryNotesChange: (notes: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">Información de Entrega</h2>
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Dirección de entrega</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-900">
              {address.street} {address.street_number}
              {address.interior_number && ` Int. ${address.interior_number}`}
            </p>
            <p className="text-sm text-gray-600">
              {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
            </p>
          </div>
        </div>
        {nearestBusiness && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Punto de entrega</h3>
            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
              <RestaurantIcon className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{nearestBusiness.name}</p>
                {nearestBusiness.distance_km && (
                  <p className="text-xs text-gray-500">
                    A {parseFloat(nearestBusiness.distance_km).toFixed(1)} km de distancia
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notas para la entrega (opcional)
          </label>
          <textarea
            value={deliveryNotes}
            onChange={(e) => onDeliveryNotesChange(e.target.value)}
            placeholder="Ej: Llamar antes de llegar, dejar en recepción, etc."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// Componente para el paso de pago
function PaymentStep({
  tipAmount,
  onTipChange,
}: {
  tipAmount: number;
  onTipChange: (amount: number) => void;
}) {
  const tipOptions = [0, 20, 50, 100];

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">Método de Pago</h2>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
          <PaymentIcon className="text-gray-400" />
          <div>
            <p className="font-semibold text-black">Efectivo contra entrega</p>
            <p className="text-sm text-gray-600">Paga cuando recibas tu pedido</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Propina (opcional)
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {tipOptions.map((tip) => (
              <button
                key={tip}
                onClick={() => onTipChange(tip)}
                className={`py-2 rounded-lg border-2 transition-colors ${
                  tipAmount === tip
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                ${tip}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={tipAmount || ''}
            onChange={(e) => onTipChange(parseFloat(e.target.value) || 0)}
            placeholder="O ingresa otra cantidad"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>
    </div>
  );
}

// Componente para el paso de resumen
function SummaryStep({
  cart,
  address,
  subtotal,
  totalTax,
  itemsTaxBreakdowns,
  deliveryFee,
  tipAmount,
  total,
  deliveryNotes,
  productsData,
  loadingProducts,
}: {
  cart: any;
  address: Address;
  subtotal: number;
  totalTax: number;
  itemsTaxBreakdowns: Record<string, TaxBreakdown>;
  deliveryFee: number;
  tipAmount: number;
  total: number;
  deliveryNotes: string;
  productsData: Record<string, Product>;
  loadingProducts: boolean;
}) {
  // Función helper para obtener el nombre de una variante
  const getVariantName = (productId: string, variantId: string): string | null => {
    const product = productsData[productId];
    if (!product) {
      console.log(`⚠️ Producto ${productId} no encontrado en productsData`);
      return null;
    }
    if (!product.variant_groups || product.variant_groups.length === 0) {
      console.log(`⚠️ Producto ${productId} no tiene variant_groups`);
      return null;
    }
    
    for (const group of product.variant_groups) {
      const variant = group.variants.find((v: any) => {
        const vId = v.variant_id || v.id;
        return vId === variantId;
      });
      if (variant) {
        return variant.variant_name || null;
      }
    }
    
    console.log(`⚠️ Variante ${variantId} no encontrada en producto ${productId}`, {
      productName: product.name,
      variantGroups: product.variant_groups,
    });
    return null;
  };

  // Función helper para obtener el nombre de un grupo de variantes
  const getVariantGroupName = (productId: string, groupId: string): string | null => {
    const product = productsData[productId];
    if (!product) {
      console.log(`⚠️ Producto ${productId} no encontrado en productsData`);
      return null;
    }
    if (!product.variant_groups || product.variant_groups.length === 0) {
      console.log(`⚠️ Producto ${productId} no tiene variant_groups`);
      return null;
    }
    
    const group = product.variant_groups.find((g: any) => {
      const gId = g.variant_group_id || g.id;
      return gId === groupId;
    });
    
    if (!group) {
      console.log(`⚠️ Grupo ${groupId} no encontrado en producto ${productId}`, {
        productName: product.name,
        variantGroups: product.variant_groups,
      });
    }
    
    return group ? (group.variant_group_name || null) : null;
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-black mb-4">Resumen del Pedido</h2>
      <div className="space-y-4">
        {/* Items del pedido */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Items del pedido</h3>
          <div className="space-y-0">
            {cart.items?.map((item: CartItem) => {
              const itemPrice = parseFloat(String(item.item_subtotal || 0));
              const unitPrice = parseFloat(String(item.unit_price || 0));
              
              // Parsear variant_selections si viene como string JSON
              let variantSelections: Record<string, string | string[]> | null = null;
              if (item.variant_selections) {
                if (typeof item.variant_selections === 'string') {
                  try {
                    variantSelections = JSON.parse(item.variant_selections);
                  } catch (e) {
                    console.error('Error parseando variant_selections:', e);
                    variantSelections = null;
                  }
                } else {
                  variantSelections = item.variant_selections;
                }
              }
              
              return (
                <div key={item.id} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">{item.quantity}x</span>
                        <p className="font-semibold text-black">{item.product_name}</p>
                      </div>
                      
                      {/* Variantes seleccionadas - Diseño limpio y operativo */}
                      {variantSelections && Object.keys(variantSelections).length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {loadingProducts ? (
                            <span className="text-xs text-gray-400 italic">Cargando variantes...</span>
                          ) : (
                            Object.entries(variantSelections).map(([groupId, variantIds]) => {
                              const ids = Array.isArray(variantIds) ? variantIds : [variantIds];
                              const groupName = getVariantGroupName(item.product_id, groupId);
                              
                              return (
                                <div key={groupId} className="text-xs text-gray-600">
                                  {groupName && (
                                    <span className="font-medium text-gray-700">{groupName}: </span>
                                  )}
                                  {ids.map((id, idx) => {
                                    const variantName = getVariantName(item.product_id, id);
                                    return (
                                      <span key={id}>
                                        {idx > 0 && ', '}
                                        <span className="text-gray-800">{variantName || id}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                      
                      {/* Notas especiales */}
                      {item.special_instructions && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <span className="text-xs text-gray-500 font-medium">Nota:</span>
                          <p className="text-xs text-gray-600 italic flex-1">{item.special_instructions}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-black">${itemPrice.toFixed(2)}</p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-500">${unitPrice.toFixed(2)} c/u</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Dirección de entrega</h3>
          <p className="text-sm text-gray-900">
            {address.street} {address.street_number}
            {address.interior_number && ` Int. ${address.interior_number}`}
          </p>
          <p className="text-sm text-gray-600">
            {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
          </p>
        </div>
        {deliveryNotes && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Notas de entrega</h3>
            <p className="text-sm text-gray-600">{deliveryNotes}</p>
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen de montos</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-black font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {totalTax > 0 && (
              <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                {Object.values(itemsTaxBreakdowns).flatMap(breakdown => 
                  breakdown?.taxes?.map(tax => (
                    <div key={tax.tax_type_id} className="flex justify-between text-xs">
                      <span className="text-gray-500">{tax.tax_name} ({(tax.rate * 100).toFixed(0)}%)</span>
                      <span className="text-gray-600">${tax.amount.toFixed(2)}</span>
                    </div>
                  )) || []
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-gray-100 mt-1">
                  <span className="text-gray-600 font-medium">Total impuestos</span>
                  <span className="text-black font-medium">${totalTax.toFixed(2)}</span>
                </div>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Costo de envío</span>
                <span className="text-black font-medium">${deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Propina</span>
                <span className="text-black font-medium">${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-black">Total</span>
                <span className="text-2xl font-bold text-black">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

