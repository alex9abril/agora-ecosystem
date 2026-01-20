/**
 * Página de checkout - Proceso de compra completo
 * Layout profesional con dos columnas: proceso (izquierda) y resumen (derecha)
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { CartItem, TaxBreakdown } from '@/lib/cart';
import { taxesService } from '@/lib/taxes';
import { formatPrice } from '@/lib/format';
import { apiRequest } from '@/lib/api';
import { walletService, Wallet } from '@/lib/wallet';
import { logisticsService, type Address as LogisticsAddress, type Parcel } from '@/lib/logistics';
import { branchesService } from '@/lib/branches';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

type CheckoutStep = 'auth' | 'shipping' | 'shipping-method' | 'payment' | 'confirmation';

interface Address {
  id: string;
  label?: string;
  street: string;
  street_number?: string;
  interior_number?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  longitude?: number;
  latitude?: number;
  additional_references?: string;
  is_default: boolean;
  receiver_name?: string; // Nombre de quien recibe en esta dirección
  receiver_phone?: string; // Teléfono de quien recibe (opcional)
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'cash' | 'transfer' | 'wallet';
  label: string;
  icon?: string;
}

interface ShippingOption {
  id: string;
  provider: 'fedex' | 'dhl' | 'pickup' | 'skydropx';
  label: string;
  price: number;
  estimatedDays?: number;
  quotation_id?: string; // ID de la cotización de Skydropx (para referencia)
  rate_id?: string; // ID del rate específico dentro de la cotización (necesario para crear shipment)
  carrier?: string; // Nombre del transportista (ej: "FedEx", "DHL")
  service?: string; // Tipo de servicio (ej: "Express", "Standard")
}

interface ShippingSelection {
  storeId: string;
  optionId: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, loading: cartLoading, refreshCart } = useCart();
  const { isAuthenticated, signIn, signUp, user } = useAuth();
  const { contextType, slug, getContextualUrl } = useStoreContext();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('auth');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingReceiverForAddressId, setEditingReceiverForAddressId] = useState<string | null>(null);
  const [editingReceiverName, setEditingReceiverName] = useState('');
  const [editingReceiverPhone, setEditingReceiverPhone] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Estados para autenticación
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para nueva dirección
  const [newAddress, setNewAddress] = useState({
    label: '',
    street: '',
    street_number: '',
    interior_number: '',
    neighborhood: '',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '',
    country: 'México',
    longitude: -99.1332,
    latitude: 19.4326,
    additional_references: '',
    is_default: false,
    receiver_name: '', // Nombre de quien recibe (obligatorio)
    receiver_phone: '', // Teléfono de quien recibe (opcional)
  });
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  
  // Estados para facturación
  const [useSameAddressForBilling, setUseSameAddressForBilling] = useState(true);
  const [billingAddresses, setBillingAddresses] = useState<Address[]>([]);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('billing_address_id');
    }
    return null;
  });
  const [billingAddress, setBillingAddress] = useState({
    label: '',
    street: '',
    street_number: '',
    interior_number: '',
    neighborhood: '',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '',
    country: 'México',
    longitude: -99.1332,
    latitude: 19.4326,
    additional_references: '',
    // La dirección de facturación NO tiene campos de receptor
  });
  const [showBillingAddressForm, setShowBillingAddressForm] = useState(false);
  const [editingBillingAddressId, setEditingBillingAddressId] = useState<string | null>(null);
  const [deletingBillingAddressId, setDeletingBillingAddressId] = useState<string | null>(null);
  
  // Estados para envío
  const [shippingSelections, setShippingSelections] = useState<Record<string, string>>({}); // storeId -> optionId
  const [shippingOptionsByStore, setShippingOptionsByStore] = useState<Record<string, ShippingOption[]>>({});
  const [loadingQuotations, setLoadingQuotations] = useState<Record<string, boolean>>({}); // storeId -> loading
  const [quotationErrors, setQuotationErrors] = useState<Record<string, string>>({}); // storeId -> error
  
  // Estados para pago
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [secondaryPaymentMethod, setSecondaryPaymentMethod] = useState<string | null>(null);
  const [paymentMethods] = useState<PaymentMethod[]>([
    { id: 'card', type: 'card', label: 'Tarjeta de crédito/débito' },
    { id: 'wallet', type: 'wallet', label: 'Monedero electrónico' },
  ]);
  
  // Estados para confirmación
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [confirmedOrderData, setConfirmedOrderData] = useState<{
    storesInfo: Record<string, { name: string; items: CartItem[] }>;
    subtotalsByStore: Record<string, number>;
    shippingSelections: Record<string, string>;
    shippingOptionsByStore: Record<string, ShippingOption[]>;
    total: number;
    paymentInfo?: {
      method: string;
      walletAmount?: number;
      secondaryMethod?: string;
      secondaryAmount?: number;
    };
  } | null>(null);

  // Redirigir si no hay carrito (pero no si estamos en confirmación o en proceso de autenticación)
  useEffect(() => {
    // No redirigir si estamos en el paso de autenticación o si estamos cargando (proceso de autenticación)
    if (currentStep === 'auth' || loading) {
      return;
    }
    
    if (!cartLoading && (!cart || !cart.items || cart.items.length === 0) && currentStep !== 'confirmation' && !orderId) {
      // Mantener el contexto de tienda al redirigir al carrito
      const cartUrl = getContextualUrl('/cart');
      router.push(cartUrl);
    }
  }, [cart, cartLoading, router, currentStep, orderId, getContextualUrl, loading]);

  // Determinar paso inicial
  // IMPORTANTE: No cambiar el paso automáticamente si estamos en proceso de autenticación
  useEffect(() => {
    // Solo cambiar el paso si no estamos cargando (para evitar cambios durante el registro)
    if (loading) return;
    
    if (isAuthenticated) {
      if (currentStep === 'auth') {
        setCurrentStep('shipping');
        loadAddresses();
        loadWalletBalance();
      }
    } else {
      // Solo cambiar a 'auth' si no estamos en un paso avanzado del checkout
      // Esto previene que se resetee el paso durante el proceso de registro
      if (currentStep !== 'confirmation' && !orderId) {
        setCurrentStep('auth');
      }
    }
  }, [isAuthenticated, loading]);

  // Cargar saldo del wallet cuando se llega al paso de pago
  useEffect(() => {
    if (isAuthenticated && currentStep === 'payment' && walletBalance === null) {
      loadWalletBalance();
    }
  }, [isAuthenticated, currentStep]);

  // Cargar saldo del wallet cuando el usuario está autenticado
  const loadWalletBalance = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingWallet(true);
      const wallet = await walletService.getBalance();
      setWalletBalance(wallet.balance);
    } catch (error: any) {
      console.error('Error cargando saldo del wallet:', error);
      // Si no hay wallet, el saldo será null
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Cargar direcciones cuando el usuario está autenticado
  const loadAddresses = async () => {
    // Verificar si hay token disponible (más confiable que isAuthenticated que puede tener delay)
    const hasToken = typeof window !== 'undefined' && localStorage.getItem('auth_token');
    if (!isAuthenticated && !hasToken) return;
    
    try {
      const response = await apiRequest<Address[]>('/addresses', {
        method: 'GET',
      });
      setAddresses(response);
      
      // Filtrar direcciones de facturación (por label que contenga "Facturación" o por ID guardado)
      const savedBillingId = typeof window !== 'undefined' ? localStorage.getItem('billing_address_id') : null;
      const billingAddrs = response.filter(addr => 
        addr.label?.toLowerCase().includes('facturación') || 
        (savedBillingId && addr.id === savedBillingId)
      );
      setBillingAddresses(billingAddrs);
      
      // Seleccionar la dirección guardada si existe
      if (savedBillingId) {
        const savedBilling = billingAddrs.find(addr => addr.id === savedBillingId);
        if (savedBilling) {
          setSelectedBillingAddressId(savedBilling.id);
        } else if (billingAddrs.length > 0) {
          // Si no existe la guardada, seleccionar la primera disponible
          setSelectedBillingAddressId(billingAddrs[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('billing_address_id', billingAddrs[0].id);
          }
        }
      } else if (billingAddrs.length > 0) {
        // Si no hay guardada, seleccionar la primera disponible
        setSelectedBillingAddressId(billingAddrs[0].id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('billing_address_id', billingAddrs[0].id);
        }
        setUseSameAddressForBilling(false);
      }
      
      // Seleccionar dirección por defecto si existe
      const defaultAddress = response.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (response.length > 0) {
        setSelectedAddressId(response[0].id);
      }
    } catch (error: any) {
      console.error('Error cargando direcciones:', error);
    }
  };

  // Calcular impuestos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const calculateTaxes = async () => {
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
      
      calculateTaxes();
    }
  }, [cart]);

  // Agrupar items por tienda/sucursal
  const itemsByStore = useMemo(() => {
    if (!cart || !cart.items) return {};
    
    const grouped: Record<string, CartItem[]> = {};
    cart.items.forEach((item) => {
      const storeKey = item.business_id || 'unknown';
      if (!grouped[storeKey]) {
        grouped[storeKey] = [];
      }
      grouped[storeKey].push(item);
    });
    
    return grouped;
  }, [cart]);

  // Obtener información de cada tienda
  const storesInfo = useMemo(() => {
    const stores: Record<string, { name: string; items: CartItem[] }> = {};
    Object.entries(itemsByStore).forEach(([businessId, items]) => {
      if (items.length > 0) {
        stores[businessId] = {
          name: items[0].business_name || 'Tienda desconocida',
          items,
        };
      }
    });
    return stores;
  }, [itemsByStore]);

  // Calcular subtotales por tienda
  const subtotalsByStore = useMemo(() => {
    const subtotals: Record<string, number> = {};
    Object.entries(storesInfo).forEach(([businessId, store]) => {
      subtotals[businessId] = store.items.reduce(
        (sum, item) => sum + parseFloat(String(item.item_subtotal || 0)),
        0
      );
    });
    return subtotals;
  }, [storesInfo]);

  // Calcular impuestos por tienda
  const taxesByStore = useMemo(() => {
    const taxes: Record<string, number> = {};
    Object.entries(storesInfo).forEach(([businessId, store]) => {
      taxes[businessId] = store.items.reduce((sum, item) => {
        const breakdown = itemsTaxBreakdowns[item.id];
        return sum + (breakdown?.total_tax || 0);
      }, 0);
    });
    return taxes;
  }, [storesInfo, itemsTaxBreakdowns]);

  // Calcular totales
  const subtotal = useMemo(() => {
    return Object.values(subtotalsByStore).reduce((sum, storeSubtotal) => sum + storeSubtotal, 0);
  }, [subtotalsByStore]);

  const totalTax = useMemo(() => {
    return Object.values(taxesByStore).reduce((sum, storeTax) => sum + storeTax, 0);
  }, [taxesByStore]);

  // Obtener cotizaciones de Skydropx para una tienda
  const fetchQuotationsForStore = async (storeId: string) => {
    if (!selectedAddressId) return;
    
    try {
      setLoadingQuotations(prev => ({ ...prev, [storeId]: true }));
      setQuotationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[storeId];
        return newErrors;
      });

      // Obtener información de la tienda
      const business = await branchesService.getBranchById(storeId);
      
      // Obtener dirección de envío seleccionada
      const destinationAddress = addresses.find(addr => addr.id === selectedAddressId);
      if (!destinationAddress) {
        throw new Error('Dirección de envío no encontrada');
      }

      // Obtener dirección de la tienda (origen)
      // Parsear la dirección de la tienda si está disponible
      // El formato típico es: "Calle, Colonia, Ciudad, Estado, CP"
      let originStreet = 'Calle Principal';
      let originDistrict = '';
      let originCity = business.city || 'Ciudad de México';
      let originState = business.state || 'CDMX';
      let originPostalCode = '00000';

      if (business.address) {
        const addressParts = business.address.split(',').map(p => p.trim());
        if (addressParts.length > 0) originStreet = addressParts[0];
        if (addressParts.length > 1) originDistrict = addressParts[1];
        if (addressParts.length > 2) originCity = addressParts[2] || originCity;
        if (addressParts.length > 3) originState = addressParts[3] || originState;
        if (addressParts.length > 4) originPostalCode = addressParts[4] || originPostalCode;
      }

      const originAddress: LogisticsAddress = {
        name: business.name || 'Tienda',
        street: originStreet,
        number: '1',
        district: originDistrict,
        city: originCity,
        state: originState,
        country: 'MX', // Skydropx espera código de país ISO (MX para México)
        postal_code: originPostalCode,
        phone: business.phone || '5555555555',
        email: business.email,
      };

      // Dirección de destino
      const destAddress: LogisticsAddress = {
        name: destinationAddress.receiver_name || user?.firstName || 'Cliente',
        street: destinationAddress.street,
        number: destinationAddress.street_number || '1',
        district: destinationAddress.neighborhood,
        city: destinationAddress.city,
        state: destinationAddress.state,
        country: destinationAddress.country === 'México' ? 'MX' : (destinationAddress.country || 'MX'),
        postal_code: destinationAddress.postal_code,
        phone: destinationAddress.receiver_phone || user?.phone || '5555555555',
        email: user?.email,
      };

      // Calcular peso y dimensiones del paquete
      // Por ahora usamos valores por defecto, pero podrían venir del producto
      const storeItems = storesInfo[storeId]?.items || [];
      const totalQuantity = storeItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Valores por defecto: 1kg por producto, dimensiones estándar
      const parcel: Parcel = {
        weight: Math.max(0.5, totalQuantity * 0.5), // Mínimo 0.5kg, 0.5kg por producto
        distance_unit: 'CM',
        mass_unit: 'KG',
        height: 10,
        width: 20,
        length: 30,
      };

      // Obtener cotizaciones de Skydropx
      const quotationResponse = await logisticsService.getQuotations({
        origin: originAddress,
        destination: destAddress,
        parcels: [parcel],
      });

      // Convertir cotizaciones a ShippingOption
      // Usar un Set para eliminar duplicados basados en el quotation_id
      const seenIds = new Set<string>();
      const skydropxOptions: ShippingOption[] = quotationResponse.quotations
        .filter((q) => {
          // Filtrar duplicados basados en quotation_id
          if (seenIds.has(q.id)) {
            return false;
          }
          seenIds.add(q.id);
          return true;
        })
        .map((q) => ({
          id: `${storeId}-skydropx-${q.id}`,
          provider: 'skydropx' as const, // asegúranos de mantener el literal del union
          label: `${(q.carrier || 'Envío').toUpperCase()} - ${q.service || 'Estándar'}`,
          price: q.price,
          estimatedDays: q.estimated_days,
          quotation_id: q.id, // ID de la cotización (para referencia)
          rate_id: q.id, // ID del rate específico (necesario para crear shipment)
          carrier: q.carrier,
          service: q.service,
        }))
        .sort((a, b) => {
          // Ordenar primero por carrier (alfabéticamente)
          const carrierA = (a.carrier || '').toUpperCase();
          const carrierB = (b.carrier || '').toUpperCase();
          if (carrierA !== carrierB) {
            return carrierA.localeCompare(carrierB);
          }
          // Si el carrier es el mismo, ordenar por precio (menor a mayor)
          return a.price - b.price;
        });

      // Agregar opción de recoger en tienda
      const pickupOption: ShippingOption = {
        id: `${storeId}-pickup`,
        provider: 'pickup',
        label: 'Recoger en tienda',
        price: 0,
        estimatedDays: 0,
      };

      // Actualizar opciones de envío para esta tienda
      setShippingOptionsByStore(prev => ({
        ...prev,
        [storeId]: [...skydropxOptions, pickupOption],
      }));

      // Seleccionar "Recoger en tienda" por defecto
      setShippingSelections(prev => ({
        ...prev,
        [storeId]: pickupOption.id,
      }));
    } catch (error: any) {
      console.error(`[Checkout] Error obteniendo cotizaciones para tienda ${storeId}:`, error);
      setQuotationErrors(prev => ({
        ...prev,
        [storeId]: error.message || 'Error al obtener cotizaciones de envío',
      }));

      // En caso de error, mostrar solo la opción de recoger en tienda
      const pickupOption: ShippingOption = {
        id: `${storeId}-pickup`,
        provider: 'pickup',
        label: 'Recoger en tienda',
        price: 0,
        estimatedDays: 0,
      };
      setShippingOptionsByStore(prev => ({
        ...prev,
        [storeId]: [pickupOption],
      }));
      setShippingSelections(prev => ({
        ...prev,
        [storeId]: pickupOption.id,
      }));
    } finally {
      setLoadingQuotations(prev => ({ ...prev, [storeId]: false }));
    }
  };

  // Obtener cotizaciones cuando se avanza al paso de shipping-method
  useEffect(() => {
    if (currentStep === 'shipping-method' && selectedAddressId && Object.keys(storesInfo).length > 0) {
      // Limpiar cotizaciones anteriores antes de cargar nuevas
      setShippingOptionsByStore({});
      setShippingSelections({});
      
      // Obtener cotizaciones para cada tienda
      Object.keys(storesInfo).forEach((storeId) => {
        fetchQuotationsForStore(storeId);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedAddressId]);

  // Calcular total de envío
  const shippingTotal = useMemo(() => {
    return Object.entries(shippingSelections).reduce((total, [storeId, optionId]) => {
      const options = shippingOptionsByStore[storeId] || [];
      const selectedOption = options.find(opt => opt.id === optionId);
      return total + (selectedOption?.price || 0);
    }, 0);
  }, [shippingSelections, shippingOptionsByStore]);

  const total = subtotal + totalTax + shippingTotal;

  // Manejar autenticación
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'login') {
        try {
          await signIn(authEmail, authPassword);
        } catch (error: any) {
          // Si el error es que el email está confirmado pero necesita reintentar,
          // esperar y reintentar automáticamente
          if (error.message?.includes('EMAIL_CONFIRMED_PLEASE_RETRY') || 
              error.message?.includes('Tu email ha sido confirmado automáticamente')) {
            console.log('✅ Email confirmado automáticamente, reintentando inicio de sesión...');
            // Esperar más tiempo para que Supabase propague la confirmación
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
              await signIn(authEmail, authPassword);
              console.log('✅ Inicio de sesión exitoso después de confirmar email');
            } catch (retryError: any) {
              // Si aún falla después de 3 segundos, permitir continuar de todas formas
              // para no bloquear el checkout - el email está confirmado
              console.warn('⚠️  No se pudo crear sesión completa después de confirmar email, pero permitiendo continuar con checkout');
              // No lanzar error - permitir que continúe
            }
          } else {
            throw error;
          }
        }
        
        // Esperar a que el estado de autenticación se actualice
        // Verificar que el token esté disponible antes de continuar
        let attempts = 0;
        while (attempts < 20) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          if (token || isAuthenticated) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Esperar un poco más para asegurar que todos los estados se actualicen
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // No redirigir - quedarse en el checkout y avanzar al siguiente paso
        setCurrentStep('shipping');
        await loadAddresses();
      } else {
        await signUp({
          email: authEmail,
          password: authPassword,
          firstName: authFirstName,
          lastName: authLastName,
          phone: authPhone,
          role: 'client',
        });
        // Esperar a que el estado de autenticación se actualice
        // Aumentar el número de intentos y el tiempo de espera para dar más tiempo a la sesión
        let attempts = 0;
        const maxAttempts = 20;
        while (attempts < maxAttempts) {
          const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
          const user = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
          // Verificar tanto el token como el estado de autenticación
          if (token && user) {
            console.log('✅ Token y usuario disponibles después del registro');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        // Esperar un poco más para asegurar que todos los estados se actualicen
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verificar nuevamente antes de avanzar
        const finalToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (finalToken) {
          // No redirigir - quedarse en el checkout y avanzar al siguiente paso
          setCurrentStep('shipping');
          await loadAddresses();
        } else {
          console.warn('⚠️ Token no disponible después del registro, pero continuando...');
          // Continuar de todas formas para no bloquear al usuario
          setCurrentStep('shipping');
          await loadAddresses();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva dirección
  const handleCreateAddress = async () => {
    if (!isAuthenticated) return;
    
    setError('');
    setLoading(true);

    try {
      const address = await apiRequest<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddress),
      });
      
      setAddresses([...addresses, address]);
      setSelectedAddressId(address.id);
      setShowNewAddressForm(false);
      setNewAddress({
        label: '',
        street: '',
        street_number: '',
        interior_number: '',
        neighborhood: '',
        city: 'Ciudad de México',
        state: 'CDMX',
        postal_code: '',
        country: 'México',
        longitude: -99.1332,
        latitude: 19.4326,
        additional_references: '',
        is_default: false,
        receiver_name: '',
        receiver_phone: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al crear dirección');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar datos del receptor en una dirección existente
  const handleUpdateReceiver = async (addressId: string) => {
    if (!isAuthenticated || !editingReceiverName.trim()) return;
    
    setError('');
    setLoading(true);

    try {
      const updatedAddress = await apiRequest<Address>(`/addresses/${addressId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          receiver_name: editingReceiverName.trim(),
          receiver_phone: editingReceiverPhone.trim() || null,
        }),
      });
      
      // Actualizar el array de direcciones con la dirección actualizada
      // Usar el objeto completo devuelto por el backend para asegurar que todos los campos estén actualizados
      const updatedAddresses = addresses.map(addr => 
        addr.id === addressId ? updatedAddress : addr
      );
      setAddresses(updatedAddresses);
      
      // Cerrar el formulario de edición
      setEditingReceiverForAddressId(null);
      setEditingReceiverName('');
      setEditingReceiverPhone('');
      
      console.log('✅ Receptor actualizado:', {
        addressId,
        receiver_name: updatedAddress.receiver_name,
        receiver_phone: updatedAddress.receiver_phone,
        updatedAddress
      });
    } catch (err: any) {
      setError(err.message || 'Error al actualizar datos del receptor');
    } finally {
      setLoading(false);
    }
  };

  // Guardar dirección de facturación
  const handleCreateBillingAddress = async () => {
    if (!isAuthenticated) {
      setError('Debes estar autenticado para guardar la dirección de facturación');
      return;
    }
    
    if (!billingAddress.street.trim()) {
      setError('Por favor, ingresa la calle de la dirección de facturación');
      return;
    }
    if (!billingAddress.neighborhood.trim()) {
      setError('Por favor, ingresa la colonia de la dirección de facturación');
      return;
    }
    if (!billingAddress.postal_code.trim()) {
      setError('Por favor, ingresa el código postal de la dirección de facturación');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      let savedAddress: Address;
      
      if (editingBillingAddressId) {
        // Actualizar dirección existente
        savedAddress = await apiRequest<Address>(`/addresses/${editingBillingAddressId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            label: billingAddress.label || 'Facturación',
            street: billingAddress.street,
            street_number: billingAddress.street_number || null,
            interior_number: billingAddress.interior_number || null,
            neighborhood: billingAddress.neighborhood,
            city: billingAddress.city || 'Ciudad de México',
            state: billingAddress.state || 'CDMX',
            postal_code: billingAddress.postal_code,
            country: billingAddress.country || 'México',
            longitude: billingAddress.longitude,
            latitude: billingAddress.latitude,
            additional_references: billingAddress.additional_references || null,
          }),
        });
        
        // Actualizar en las listas
        setBillingAddresses(billingAddresses.map(addr => addr.id === editingBillingAddressId ? savedAddress : addr));
        setAddresses(addresses.map(addr => addr.id === editingBillingAddressId ? savedAddress : addr));
      } else {
        // Crear nueva dirección de facturación
        savedAddress = await apiRequest<Address>('/addresses', {
          method: 'POST',
          body: JSON.stringify({
            label: billingAddress.label || 'Facturación',
            street: billingAddress.street,
            street_number: billingAddress.street_number || null,
            interior_number: billingAddress.interior_number || null,
            neighborhood: billingAddress.neighborhood,
            city: billingAddress.city || 'Ciudad de México',
            state: billingAddress.state || 'CDMX',
            postal_code: billingAddress.postal_code,
            country: billingAddress.country || 'México',
            longitude: billingAddress.longitude,
            latitude: billingAddress.latitude,
            additional_references: billingAddress.additional_references || null,
            is_default: false,
          }),
        });
        
        // Agregar a las listas
        setBillingAddresses([...billingAddresses, savedAddress]);
        setAddresses([...addresses, savedAddress]);
      }
      
      // Seleccionar la dirección guardada
      setSelectedBillingAddressId(savedAddress.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('billing_address_id', savedAddress.id);
      }
      
      // Cerrar formulario y resetear
      setShowBillingAddressForm(false);
      setEditingBillingAddressId(null);
      setBillingAddress({
        label: '',
        street: '',
        street_number: '',
        interior_number: '',
        neighborhood: '',
        city: 'Ciudad de México',
        state: 'CDMX',
        postal_code: '',
        country: 'México',
        longitude: -99.1332,
        latitude: 19.4326,
        additional_references: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al guardar la dirección de facturación');
    } finally {
      setLoading(false);
    }
  };

  // Editar dirección de facturación
  const handleEditBillingAddress = (address: Address) => {
    setEditingBillingAddressId(address.id);
    setBillingAddress({
      label: address.label || '',
      street: address.street,
      street_number: address.street_number || '',
      interior_number: address.interior_number || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      longitude: address.longitude || -99.1332,
      latitude: address.latitude || 19.4326,
      additional_references: address.additional_references || '',
    });
    setShowBillingAddressForm(true);
  };

  // Eliminar dirección de facturación
  const handleDeleteBillingAddress = async (addressId: string) => {
    if (!isAuthenticated) return;
    
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección de facturación?')) {
      return;
    }
    
    setError('');
    setLoading(true);
    setDeletingBillingAddressId(addressId);

    try {
      await apiRequest(`/addresses/${addressId}`, {
        method: 'DELETE',
      });
      
      // Remover de las listas
      const updatedBillingAddresses = billingAddresses.filter(addr => addr.id !== addressId);
      setBillingAddresses(updatedBillingAddresses);
      setAddresses(addresses.filter(addr => addr.id !== addressId));
      
      // Si era la dirección seleccionada, seleccionar otra o limpiar
      if (selectedBillingAddressId === addressId) {
        if (updatedBillingAddresses.length > 0) {
          setSelectedBillingAddressId(updatedBillingAddresses[0].id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('billing_address_id', updatedBillingAddresses[0].id);
          }
        } else {
          setSelectedBillingAddressId(null);
          setUseSameAddressForBilling(true);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('billing_address_id');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar dirección de facturación');
    } finally {
      setLoading(false);
      setDeletingBillingAddressId(null);
    }
  };

  // Eliminar dirección
  const handleDeleteAddress = async (addressId: string) => {
    if (!isAuthenticated) return;
    
    if (!confirm('¿Estás seguro de que deseas eliminar esta dirección?')) {
      return;
    }
    
    setError('');
    setLoading(true);
    setDeletingAddressId(addressId);

    try {
      await apiRequest(`/addresses/${addressId}`, {
        method: 'DELETE',
      });
      
      // Remover de la lista
      const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
      setAddresses(updatedAddresses);
      
      // Si era la dirección seleccionada, seleccionar otra o limpiar
      if (selectedAddressId === addressId) {
        if (updatedAddresses.length > 0) {
          const defaultAddress = updatedAddresses.find(addr => addr.is_default) || updatedAddresses[0];
          setSelectedAddressId(defaultAddress.id);
        } else {
          setSelectedAddressId(null);
        }
      }
      
      // Si era una dirección de facturación, removerla de la lista
      const wasBillingAddress = billingAddresses.find(addr => addr.id === addressId);
      if (wasBillingAddress) {
        setBillingAddresses(billingAddresses.filter(addr => addr.id !== addressId));
        
        // Si era la dirección seleccionada, seleccionar otra o limpiar
        if (selectedBillingAddressId === addressId) {
          const remainingBilling = billingAddresses.filter(addr => addr.id !== addressId);
          if (remainingBilling.length > 0) {
            setSelectedBillingAddressId(remainingBilling[0].id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('billing_address_id', remainingBilling[0].id);
            }
          } else {
            setSelectedBillingAddressId(null);
            setUseSameAddressForBilling(true);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('billing_address_id');
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al eliminar dirección');
    } finally {
      setLoading(false);
      setDeletingAddressId(null);
    }
  };

  // Editar dirección completa
  const handleEditAddress = (address: Address) => {
    console.log('🔍 [checkout] Editando dirección:', {
      addressId: address.id,
      addressLabel: address.label,
      addressStreet: address.street,
    });
    
    setEditingAddressId(address.id);
    setNewAddress({
      label: address.label || '',
      street: address.street,
      street_number: address.street_number || '',
      interior_number: address.interior_number || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      longitude: address.longitude || -99.1332,
      latitude: address.latitude || 19.4326,
      additional_references: address.additional_references || '',
      is_default: address.is_default,
      receiver_name: address.receiver_name || '',
      receiver_phone: address.receiver_phone || '',
    });
    setShowNewAddressForm(true);
  };

  // Actualizar dirección completa
  const handleUpdateAddress = async () => {
    if (!isAuthenticated || !editingAddressId) return;
    
    setError('');
    setLoading(true);

    try {
      console.log('🔍 [checkout] Actualizando dirección:', {
        editingAddressId,
        addressData: newAddress,
        availableAddresses: addresses.map(a => ({ id: a.id, label: a.label })),
      });

      const updatedAddress = await apiRequest<Address>(`/addresses/${editingAddressId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          label: newAddress.label || null,
          street: newAddress.street,
          street_number: newAddress.street_number || null,
          interior_number: newAddress.interior_number || null,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city || 'Ciudad de México',
          state: newAddress.state || 'CDMX',
          postal_code: newAddress.postal_code,
          country: newAddress.country || 'México',
          longitude: newAddress.longitude,
          latitude: newAddress.latitude,
          additional_references: newAddress.additional_references || null,
          receiver_name: newAddress.receiver_name || null,
          receiver_phone: newAddress.receiver_phone || null,
          is_default: newAddress.is_default || false,
        }),
      });
      
      // Actualizar en la lista
      setAddresses(addresses.map(addr => addr.id === editingAddressId ? updatedAddress : addr));
      
      // Si era la dirección seleccionada, mantenerla seleccionada
      if (selectedAddressId === editingAddressId) {
        setSelectedAddressId(updatedAddress.id);
      }
      
      // Cerrar formulario y resetear
      setEditingAddressId(null);
      setShowNewAddressForm(false);
      setNewAddress({
        label: '',
        street: '',
        street_number: '',
        interior_number: '',
        neighborhood: '',
        city: 'Ciudad de México',
        state: 'CDMX',
        postal_code: '',
        country: 'México',
        longitude: -99.1332,
        latitude: 19.4326,
        additional_references: '',
        is_default: false,
        receiver_name: '',
        receiver_phone: '',
      });
    } catch (err: any) {
      setError(err.message || 'Error al actualizar dirección');
    } finally {
      setLoading(false);
    }
  };

  // Establecer dirección como predeterminada
  const handleSetDefaultAddress = async (addressId: string) => {
    if (!isAuthenticated) return;
    
    setError('');
    setLoading(true);

    try {
      await apiRequest<Address>(`/addresses/${addressId}/set-default`, {
        method: 'PATCH',
      });
      
      // Actualizar todas las direcciones: la seleccionada como default, las demás sin default
      setAddresses(addresses.map(addr => 
        addr.id === addressId 
          ? { ...addr, is_default: true }
          : { ...addr, is_default: false }
      ));
      
      // Seleccionar automáticamente la dirección predeterminada
      setSelectedAddressId(addressId);
    } catch (err: any) {
      setError(err.message || 'Error al establecer dirección predeterminada');
    } finally {
      setLoading(false);
    }
  };

  // Continuar al paso de método de envío
  const handleContinueToShippingMethod = () => {
    if (!selectedAddressId) {
      setError('Por favor, selecciona una dirección de envío');
      return;
    }
    
    // Validar que la dirección seleccionada tenga el nombre del receptor
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (selectedAddress && !selectedAddress.receiver_name?.trim()) {
      setError('Por favor, ingresa el nombre de la persona que recibirá el pedido en la dirección seleccionada');
      return;
    }
    
    // Si es una dirección nueva que se está creando, validar que tenga receptor
    if (showNewAddressForm && !newAddress.receiver_name.trim()) {
      setError('Por favor, ingresa el nombre de la persona que recibirá el pedido');
      return;
    }
    
    if (!useSameAddressForBilling && !selectedBillingAddressId) {
      setError('Por favor, selecciona o agrega una dirección de facturación');
      return;
    }
    setCurrentStep('shipping-method');
    setError('');
  };

  // Continuar al paso de pago (desde método de envío)
  const handleContinueToPaymentFromShipping = () => {
    // Validar que todas las tiendas tengan un método de envío seleccionado
    const allStoresHaveShipping = Object.keys(storesInfo).every(storeId => 
      shippingSelections[storeId] && shippingOptionsByStore[storeId]?.some(opt => opt.id === shippingSelections[storeId])
    );
    
    if (!allStoresHaveShipping) {
      setError('Por favor, selecciona un método de envío para cada tienda');
      return;
    }
    
    setCurrentStep('payment');
    setError('');
  };

  // Procesar orden
  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !selectedPaymentMethod) {
      setError('Por favor, completa todos los pasos');
      return;
    }

    // Validar distribución de pago si se usa wallet
    if (selectedPaymentMethod === 'wallet' && useWallet && walletAmount < total && !secondaryPaymentMethod) {
      setError('Por favor, selecciona un método de pago adicional para completar el pago');
      return;
    }

    setProcessingOrder(true);
    setError('');

    try {
      // Construir notas de entrega
      let deliveryNotes = '';
      
      // Construir información de pago
      if (selectedPaymentMethod === 'wallet' && useWallet) {
        if (walletAmount >= total) {
          // Pago completo con wallet
          deliveryNotes = `Método de pago: Monedero electrónico (${formatPrice(walletAmount)})`;
        } else {
          // Pago distribuido
          const secondaryMethodLabel = paymentMethods.find(m => m.id === secondaryPaymentMethod)?.label || secondaryPaymentMethod;
          deliveryNotes = `Método de pago: Monedero electrónico (${formatPrice(walletAmount)}) + ${secondaryMethodLabel} (${formatPrice(total - walletAmount)})`;
        }
      } else {
        // Método de pago tradicional
        deliveryNotes = `Método de pago: ${paymentMethods.find(m => m.id === selectedPaymentMethod)?.label || selectedPaymentMethod}`;
      }
      
      // Agregar información de dirección de facturación si es diferente
      if (!useSameAddressForBilling && selectedBillingAddressId) {
        const selectedBillingAddress = billingAddresses.find(addr => addr.id === selectedBillingAddressId);
        if (selectedBillingAddress) {
          const billingAddressText = [
            selectedBillingAddress.street,
            selectedBillingAddress.street_number,
            selectedBillingAddress.interior_number,
            selectedBillingAddress.neighborhood,
            selectedBillingAddress.city,
            selectedBillingAddress.state,
            selectedBillingAddress.postal_code,
          ].filter(Boolean).join(', ');
          deliveryNotes += `\nDirección de facturación: ${billingAddressText}`;
        }
      }
      
      // Preparar información de pago para el backend
      // Si se selecciona "Tarjeta de crédito/débito" (card), usar Karlopay internamente
      const backendPaymentMethod = selectedPaymentMethod === 'card' ? 'karlopay' : selectedPaymentMethod;
      const paymentInfo: any = {
        method: backendPaymentMethod,
      };

      // Si se usa wallet, agregar información de distribución
      if (selectedPaymentMethod === 'wallet' && useWallet && walletAmount > 0) {
        paymentInfo.wallet = {
          amount: walletAmount,
          use_full_balance: walletAmount >= walletBalance!,
        };

        // Si hay método secundario, agregarlo
        // Si el método secundario es "card", usar "karlopay" internamente
        if (walletAmount < total && secondaryPaymentMethod) {
          const backendSecondaryMethod = secondaryPaymentMethod === 'card' ? 'karlopay' : secondaryPaymentMethod;
          paymentInfo.secondary_method = backendSecondaryMethod;
          paymentInfo.secondary_amount = total - walletAmount;
        }
      }
      
      // Construir ruta de tienda para la URL de redirección
      let storePath = '';
      if (contextType !== 'global' && slug) {
        storePath = `/${contextType}/${slug}`;
      }

      // Preparar quotation_ids y rate_ids por tienda
      const quotationIds: Record<string, string> = {};
      const rateIds: Record<string, string> = {};
      const shippingInfo: Record<string, { carrier?: string; service?: string }> = {};
      Object.entries(shippingSelections).forEach(([storeId, optionId]) => {
        const options = shippingOptionsByStore[storeId] || [];
        const selectedOption = options.find(opt => opt.id === optionId);
        if (selectedOption?.quotation_id) {
          quotationIds[storeId] = selectedOption.quotation_id;
        }
        if (selectedOption?.rate_id) {
          rateIds[storeId] = selectedOption.rate_id;
        }
        // Guardar información de envío (carrier y service) si es una opción de Skydropx
        if (selectedOption?.provider === 'skydropx' && selectedOption?.carrier && selectedOption?.service) {
          shippingInfo[storeId] = {
            carrier: selectedOption.carrier.toUpperCase(),
            service: selectedOption.service,
          };
        }
      });

      const order = await apiRequest<{ id: string; order_number: string; karlopay_payment_url?: string }>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          addressId: selectedAddressId,
          deliveryNotes: deliveryNotes.trim(),
          payment: paymentInfo,
          deliveryFee: shippingTotal, // Enviar el costo de envío calculado al backend
          storeContext: storePath, // Ruta de la tienda para la URL de redirección
          quotationIds: Object.keys(quotationIds).length > 0 ? quotationIds : undefined, // Enviar quotation_ids si existen
          rateIds: Object.keys(rateIds).length > 0 ? rateIds : undefined, // Enviar rate_ids si existen (necesario para crear shipment)
          shippingInfo: Object.keys(shippingInfo).length > 0 ? shippingInfo : undefined, // Enviar información de envío si existe
        }),
      });

      // Si el método de pago es Tarjeta (que usa Karlopay internamente) o hay método secundario Tarjeta, redirigir
      const needsPaymentRedirect = 
        (selectedPaymentMethod === 'card' || selectedPaymentMethod === 'karlopay') ||
        (selectedPaymentMethod === 'wallet' && secondaryPaymentMethod === 'card');
      
      if (needsPaymentRedirect && order.karlopay_payment_url) {
        // Asegurar que la URL tenga protocolo
        let paymentUrl = order.karlopay_payment_url;
        if (!paymentUrl.startsWith('http://') && !paymentUrl.startsWith('https://')) {
          paymentUrl = `https://${paymentUrl}`;
        }
        console.log(`🔗 Redirigiendo a pasarela de pago: ${paymentUrl}`);
        window.location.href = paymentUrl;
        return; // No continuar con el flujo normal
      }

      // Guardar información del pedido antes de vaciar el carrito
      setConfirmedOrderData({
        storesInfo,
        subtotalsByStore,
        shippingSelections,
        shippingOptionsByStore,
        total,
        paymentInfo: selectedPaymentMethod === 'wallet' && useWallet ? {
          method: 'wallet',
          walletAmount: walletAmount,
          secondaryMethod: walletAmount < total ? secondaryPaymentMethod || undefined : undefined,
          secondaryAmount: walletAmount < total ? total - walletAmount : undefined,
        } : {
          method: selectedPaymentMethod || 'cash',
        },
      });
      
      setOrderId(order.id);
      setCurrentStep('confirmation');
      
      // Vaciar el carrito después de mostrar la confirmación
      setTimeout(async () => {
        await refreshCart();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la orden');
    } finally {
      setProcessingOrder(false);
    }
  };

  // No mostrar loading si estamos en confirmación (el carrito ya está vacío pero es normal)
  if ((cartLoading || !cart || !cart.items || cart.items.length === 0) && currentStep !== 'confirmation' && !orderId) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </StoreLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - Agora</title>
      </Head>
      <StoreLayout>
        <div className="max-w-7xl mx-auto py-8">
          <h1 className="text-3xl font-medium text-gray-900 mb-8">Finalizar Compra</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna izquierda: Proceso de checkout (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Indicador de pasos */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    {[
                      { key: 'auth', label: 'Autenticación', icon: PersonIcon },
                      { key: 'shipping', label: 'Dirección', icon: LocalShippingIcon },
                      { key: 'shipping-method', label: 'Envío', icon: LocalShippingIcon },
                      { key: 'payment', label: 'Pago', icon: CreditCardIcon },
                      { key: 'confirmation', label: 'Confirmación', icon: LockIcon },
                    ].map((step, index) => {
                      const StepIcon = step.icon;
                      const stepKeys: CheckoutStep[] = ['auth', 'shipping', 'shipping-method', 'payment', 'confirmation'];
                      const currentStepIndex = stepKeys.indexOf(currentStep);
                      const isCompleted = stepKeys.indexOf(step.key as CheckoutStep) < currentStepIndex;
                      const isCurrent = step.key === currentStep;

                      const stepIndex = stepKeys.indexOf(step.key as CheckoutStep);
                      const canNavigateToStep = stepIndex <= currentStepIndex; // Solo permitir navegar a pasos completados o actual

                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          <div 
                            className={`flex flex-col items-center flex-1 ${canNavigateToStep ? 'cursor-pointer' : 'cursor-default'}`}
                            onClick={() => {
                              if (canNavigateToStep && currentStep !== 'confirmation') {
                                setCurrentStep(step.key as CheckoutStep);
                                setError('');
                              }
                            }}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              isCompleted ? 'bg-blue-600 text-white' : 
                              isCurrent ? 'bg-blue-600 text-white' : 
                              'bg-gray-200 text-gray-500'
                            } ${canNavigateToStep && currentStep !== 'confirmation' ? 'hover:ring-2 hover:ring-blue-500 hover:ring-offset-2' : ''}`}>
                              {isCompleted ? (
                                <CheckCircleIcon className="w-6 h-6" />
                              ) : (
                                <StepIcon className="w-5 h-5" />
                              )}
                            </div>
                            <span className={`text-xs mt-2 text-center ${
                              isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                          {index < 3 && (
                            <div className={`flex-1 h-0.5 mx-2 ${
                              isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Paso 1: Autenticación */}
                {currentStep === 'auth' && (
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-6">Autenticación</h2>
                    
                    <div className="mb-4 flex gap-2 border-b border-gray-200">
                      <button
                        onClick={() => {
                          setAuthMode('login');
                          setError('');
                        }}
                        className={`px-4 py-2 font-medium ${
                          authMode === 'login'
                            ? 'text-toyota-red border-b-2 border-toyota-red'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Iniciar Sesión
                      </button>
                      <button
                        onClick={() => {
                          setAuthMode('register');
                          setError('');
                        }}
                        className={`px-4 py-2 font-medium ${
                          authMode === 'register'
                            ? 'text-toyota-red border-b-2 border-toyota-red'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Registrarse
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {authMode === 'register' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre
                              </label>
                              <input
                                type="text"
                                value={authFirstName}
                                onChange={(e) => setAuthFirstName(e.target.value)}
                                required={authMode === 'register'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Apellido
                              </label>
                              <input
                                type="text"
                                value={authLastName}
                                onChange={(e) => setAuthLastName(e.target.value)}
                                required={authMode === 'register'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Teléfono
                            </label>
                            <input
                              type="tel"
                              value={authPhone}
                              onChange={(e) => setAuthPhone(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
                          >
                            {showPassword ? 'Ocultar' : 'Mostrar'}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {loading ? 'Procesando...' : authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse y Continuar'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Paso 2: Envío */}
                {currentStep === 'shipping' && (
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-6">Dirección de Envío</h2>

                    {addresses.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                              selectedAddressId === address.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="address"
                                value={address.id}
                                checked={selectedAddressId === address.id}
                                onChange={() => setSelectedAddressId(address.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="flex-1">
                                    {address.label && (
                                      <p className="font-medium text-gray-900">{address.label}</p>
                                    )}
                                    {address.is_default && (
                                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium mt-1">
                                        <StarIcon className="w-3 h-3" />
                                        Predeterminada
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    {!address.is_default && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetDefaultAddress(address.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Establecer como predeterminada"
                                      >
                                        <StarBorderIcon className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAddress(address);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                      title="Editar dirección"
                                    >
                                      <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAddress(address.id);
                                      }}
                                      disabled={deletingAddressId === address.id || loading}
                                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                      title="Eliminar dirección"
                                    >
                                      <DeleteIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {address.street} {address.street_number}
                                  {address.interior_number && ` Int. ${address.interior_number}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
                                </p>
                                {address.additional_references && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Referencias: {address.additional_references}
                                  </p>
                                )}
                                {/* Datos del receptor */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  {editingReceiverForAddressId === address.id ? (
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Nombre completo *
                                        </label>
                                        <input
                                          type="text"
                                          value={editingReceiverName}
                                          onChange={(e) => setEditingReceiverName(e.target.value)}
                                          placeholder="Nombre de quien recibirá"
                                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                          Teléfono (opcional)
                                        </label>
                                        <input
                                          type="tel"
                                          value={editingReceiverPhone}
                                          onChange={(e) => setEditingReceiverPhone(e.target.value)}
                                          placeholder="10 dígitos"
                                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleUpdateReceiver(address.id)}
                                          disabled={loading || !editingReceiverName.trim()}
                                          className="flex-1 px-3 py-1.5 text-xs bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                          Guardar
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingReceiverForAddressId(null);
                                            setEditingReceiverName('');
                                            setEditingReceiverPhone('');
                                          }}
                                          className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-500 mb-1">Recibe:</p>
                                          {address.receiver_name ? (
                                            <>
                                              <p className="text-sm font-medium text-gray-900">
                                                {address.receiver_name}
                                              </p>
                                              {address.receiver_phone && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                  Tel: {address.receiver_phone}
                                                </p>
                                              )}
                                            </>
                                          ) : (
                                            <p className="text-xs text-orange-600 italic">
                                              Falta nombre del receptor
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingReceiverForAddressId(address.id);
                                            setEditingReceiverName(address.receiver_name || '');
                                            setEditingReceiverPhone(address.receiver_phone || '');
                                          }}
                                          className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium"
                                        >
                                          {address.receiver_name ? 'Editar' : 'Agregar'}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {!showNewAddressForm ? (
                      <button
                        onClick={() => {
                          setEditingAddressId(null);
                          setShowNewAddressForm(true);
                        }}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                      >
                        + Agregar Nueva Dirección
                      </button>
                    ) : (
                      <div className="border-2 border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {editingAddressId ? 'Editar Dirección de Envío' : 'Nueva Dirección de Envío'}
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Etiqueta (opcional)
                            </label>
                            <input
                              type="text"
                              value={newAddress.label}
                              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                              placeholder="Casa, Trabajo, etc."
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Calle *
                            </label>
                            <input
                              type="text"
                              value={newAddress.street}
                              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número Exterior
                              </label>
                              <input
                                type="text"
                                value={newAddress.street_number}
                                onChange={(e) => setNewAddress({ ...newAddress, street_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Número Interior
                              </label>
                              <input
                                type="text"
                                value={newAddress.interior_number}
                                onChange={(e) => setNewAddress({ ...newAddress, interior_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Colonia *
                            </label>
                            <input
                              type="text"
                              value={newAddress.neighborhood}
                              onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                              required
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ciudad
                              </label>
                              <input
                                type="text"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado
                              </label>
                              <input
                                type="text"
                                value={newAddress.state}
                                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Código Postal *
                              </label>
                              <input
                                type="text"
                                value={newAddress.postal_code}
                                onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Referencias Adicionales
                            </label>
                            <textarea
                              value={newAddress.additional_references}
                              onChange={(e) => setNewAddress({ ...newAddress, additional_references: e.target.value })}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          
                          {/* Datos del receptor */}
                          <div className="border-t border-gray-200 pt-4 mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Datos de la Persona que Recibe</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Nombre completo *
                                </label>
                                <input
                                  type="text"
                                  value={newAddress.receiver_name}
                                  onChange={(e) => setNewAddress({ ...newAddress, receiver_name: e.target.value })}
                                  placeholder="Nombre de quien recibirá el pedido"
                                  required
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Teléfono de contacto
                                </label>
                                <input
                                  type="tel"
                                  value={newAddress.receiver_phone}
                                  onChange={(e) => setNewAddress({ ...newAddress, receiver_phone: e.target.value })}
                                  placeholder="10 dígitos (opcional)"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button
                              onClick={editingAddressId ? handleUpdateAddress : handleCreateAddress}
                              disabled={loading || !newAddress.street || !newAddress.neighborhood || !newAddress.postal_code || !newAddress.receiver_name.trim()}
                              className="flex-1 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {loading ? 'Guardando...' : editingAddressId ? 'Actualizar Dirección' : 'Guardar Dirección'}
                            </button>
                            <button
                              onClick={() => {
                                setShowNewAddressForm(false);
                                setEditingAddressId(null);
                                setError('');
                                setNewAddress({
                                  label: '',
                                  street: '',
                                  street_number: '',
                                  interior_number: '',
                                  neighborhood: '',
                                  city: 'Ciudad de México',
                                  state: 'CDMX',
                                  postal_code: '',
                                  country: 'México',
                                  longitude: -99.1332,
                                  latitude: 19.4326,
                                  additional_references: '',
                                  is_default: false,
                                  receiver_name: '',
                                  receiver_phone: '',
                                });
                              }}
                              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dirección de facturación */}
                    <div className="mt-8 mb-6 border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Dirección de Facturación</h3>
                      
                      <label className="flex items-center gap-3 mb-4 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSameAddressForBilling}
                          onChange={(e) => {
                            setUseSameAddressForBilling(e.target.checked);
                            if (e.target.checked) {
                              setShowBillingAddressForm(false);
                              // Mantener la dirección seleccionada
                            }
                          }}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usar la misma dirección para facturación
                        </span>
                      </label>

                      {!useSameAddressForBilling && (
                        <div>
                          {billingAddresses.length > 0 && !showBillingAddressForm && (
                            <div className="space-y-3 mb-4">
                              {billingAddresses.map((address) => (
                                <label
                                  key={address.id}
                                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedBillingAddressId === address.id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="billingAddress"
                                    value={address.id}
                                    checked={selectedBillingAddressId === address.id}
                                    onChange={() => {
                                      setSelectedBillingAddressId(address.id);
                                      if (typeof window !== 'undefined') {
                                        localStorage.setItem('billing_address_id', address.id);
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-1">
                                      <div className="flex-1">
                                        {address.label && (
                                          <p className="font-medium text-gray-900">{address.label}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditBillingAddress(address);
                                          }}
                                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                          title="Editar dirección"
                                        >
                                          <EditIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteBillingAddress(address.id);
                                          }}
                                          disabled={deletingBillingAddressId === address.id || loading}
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                          title="Eliminar dirección"
                                        >
                                          <DeleteIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      {address.street} {address.street_number}
                                      {address.interior_number && ` Int. ${address.interior_number}`}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
                                    </p>
                                    {address.additional_references && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Referencias: {address.additional_references}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}

                          {!showBillingAddressForm ? (
                            <button
                              onClick={() => {
                                setEditingBillingAddressId(null);
                                setShowBillingAddressForm(true);
                              }}
                              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                            >
                              + {billingAddresses.length > 0 ? 'Agregar Otra Dirección de Facturación' : 'Agregar Dirección de Facturación'}
                            </button>
                          ) : (
                            <div className="border-2 border-gray-200 rounded-lg p-6">
                              <h4 className="text-md font-medium text-gray-900 mb-4">Nueva Dirección de Facturación</h4>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Etiqueta (opcional)
                                  </label>
                                  <input
                                    type="text"
                                    value={billingAddress.label}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, label: e.target.value })}
                                    placeholder="Casa, Oficina, etc."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Calle *
                                  </label>
                                  <input
                                    type="text"
                                    value={billingAddress.street}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Número Exterior
                                    </label>
                                    <input
                                      type="text"
                                      value={billingAddress.street_number}
                                      onChange={(e) => setBillingAddress({ ...billingAddress, street_number: e.target.value })}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Número Interior
                                    </label>
                                    <input
                                      type="text"
                                      value={billingAddress.interior_number}
                                      onChange={(e) => setBillingAddress({ ...billingAddress, interior_number: e.target.value })}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Colonia *
                                  </label>
                                  <input
                                    type="text"
                                    value={billingAddress.neighborhood}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, neighborhood: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Ciudad
                                    </label>
                                    <input
                                      type="text"
                                      value={billingAddress.city}
                                      onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Estado
                                    </label>
                                    <input
                                      type="text"
                                      value={billingAddress.state}
                                      onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Código Postal *
                                    </label>
                                    <input
                                      type="text"
                                      value={billingAddress.postal_code}
                                      onChange={(e) => setBillingAddress({ ...billingAddress, postal_code: e.target.value })}
                                      required
                                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Referencias Adicionales
                                  </label>
                                  <textarea
                                    value={billingAddress.additional_references}
                                    onChange={(e) => setBillingAddress({ ...billingAddress, additional_references: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={handleCreateBillingAddress}
                                    disabled={loading || !billingAddress.street.trim() || !billingAddress.neighborhood.trim() || !billingAddress.postal_code.trim()}
                                    className="flex-1 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                  >
                                    {loading ? 'Guardando...' : editingBillingAddressId ? 'Actualizar Dirección' : 'Guardar Dirección'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowBillingAddressForm(false);
                                      setEditingBillingAddressId(null);
                                      setError('');
                                      setBillingAddress({
                                        label: '',
                                        street: '',
                                        street_number: '',
                                        interior_number: '',
                                        neighborhood: '',
                                        city: 'Ciudad de México',
                                        state: 'CDMX',
                                        postal_code: '',
                                        country: 'México',
                                        longitude: -99.1332,
                                        latitude: 19.4326,
                                        additional_references: '',
                                      });
                                    }}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => {
                          if (isAuthenticated) {
                            setCurrentStep('shipping');
                          } else {
                            setCurrentStep('auth');
                          }
                          setError('');
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        ← Volver
                      </button>
                      <button
                        onClick={handleContinueToShippingMethod}
                        disabled={
                          !selectedAddressId || 
                          (showNewAddressForm && !newAddress.receiver_name.trim()) ||
                          (!showNewAddressForm && addresses.find(addr => addr.id === selectedAddressId) && !addresses.find(addr => addr.id === selectedAddressId)?.receiver_name?.trim()) ||
                          (!useSameAddressForBilling && !selectedBillingAddressId)
                        }
                        className="px-8 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Continuar a Método de Envío
                      </button>
                    </div>
                  </div>
                )}

                {/* Paso 3: Método de Envío */}
                {currentStep === 'shipping-method' && (
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-6">Método de Envío</h2>
                    <p className="text-sm text-gray-600 mb-6">
                      Selecciona el método de envío para cada tienda. Los productos de diferentes tiendas se enviarán por separado.
                    </p>

                    <div className="space-y-4 mb-6">
                      {Object.entries(storesInfo).map(([storeId, store]) => {
                        const options = shippingOptionsByStore[storeId] || [];
                        const selectedOptionId = shippingSelections[storeId];
                        const isLoading = loadingQuotations[storeId];
                        const error = quotationErrors[storeId];
                        
                        return (
                          <div key={storeId} className="border-2 border-gray-200 rounded-lg p-4">
                            <div className="mb-3 pb-2 border-b border-gray-200">
                              <h3 className="text-base font-medium text-gray-900">{store.name}</h3>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {store.items.length} {store.items.length === 1 ? 'producto' : 'productos'} • Subtotal: {formatPrice(subtotalsByStore[storeId] || 0)}
                              </p>
                            </div>
                            
                            {isLoading && (
                              <div className="py-4 text-center">
                                <p className="text-sm text-gray-500">Obteniendo opciones de envío...</p>
                              </div>
                            )}
                            
                            {error && !isLoading && (
                              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-800">
                                  {error}
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  Solo está disponible la opción de recoger en tienda.
                                </p>
                              </div>
                            )}
                            
                            {!isLoading && (
                              <div className="space-y-2">
                                {options.map((option) => (
                                <label
                                  key={option.id}
                                  className={`block p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedOptionId === option.id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <input
                                        type="radio"
                                        name={`shipping-${storeId}`}
                                        value={option.id}
                                        checked={selectedOptionId === option.id}
                                        onChange={() => {
                                          setShippingSelections({
                                            ...shippingSelections,
                                            [storeId]: option.id,
                                          });
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <div>
                                        <span className="font-medium text-gray-900 text-sm block">{option.label}</span>
                                        {option.estimatedDays && option.estimatedDays > 0 && (
                                          <span className="text-xs text-gray-500">
                                            Entrega estimada: {option.estimatedDays} {option.estimatedDays === 1 ? 'día' : 'días'}
                                          </span>
                                        )}
                                        {option.provider === 'pickup' && (
                                          <span className="text-xs text-gray-500">
                                            Recoge en {store.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-semibold text-gray-900 text-sm">
                                        {option.price === 0 ? 'Gratis' : formatPrice(option.price)}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => setCurrentStep('shipping')}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                      >
                        ← Volver
                      </button>
                      <button
                        onClick={handleContinueToPaymentFromShipping}
                        disabled={!Object.keys(storesInfo).every(storeId => shippingSelections[storeId])}
                        className="px-8 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Continuar al Pago
                      </button>
                    </div>
                  </div>
                )}

                {/* Paso 4: Pago */}
                {currentStep === 'payment' && (
                  <div>
                    <h2 className="text-xl font-medium text-gray-900 mb-6">Método de Pago</h2>

                    {/* Mostrar saldo del wallet si está disponible */}
                    {isAuthenticated && walletBalance !== null && walletBalance > 0 && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-900">Saldo disponible en tu monedero</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{formatPrice(walletBalance)}</p>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 mb-6">
                      {paymentMethods
                        .filter(method => {
                          // Ocultar wallet si no hay saldo disponible
                          if (method.id === 'wallet') {
                            return walletBalance !== null && walletBalance > 0;
                          }
                          return true;
                        })
                        .map((method) => (
                        <label
                          key={method.id}
                          className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedPaymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment"
                              value={method.id}
                              checked={selectedPaymentMethod === method.id}
                              onChange={() => {
                                setSelectedPaymentMethod(method.id);
                                if (method.id === 'wallet') {
                                  // Al seleccionar wallet, activar uso y usar todo el saldo disponible (o el total si es menor)
                                  if (walletBalance !== null && walletBalance > 0) {
                                    setUseWallet(true);
                                    const amountToUse = Math.min(walletBalance, total);
                                    setWalletAmount(amountToUse);
                                    // Si el wallet no cubre todo, requerir método secundario
                                    if (amountToUse < total) {
                                      // No seleccionar automáticamente, dejar que el usuario elija
                                      setSecondaryPaymentMethod(null);
                                    } else {
                                      setSecondaryPaymentMethod(null);
                                    }
                                  }
                                } else {
                                  setUseWallet(false);
                                  setWalletAmount(0);
                                  setSecondaryPaymentMethod(null);
                                }
                              }}
                              className="w-5 h-5"
                            />
                            <div className="flex items-center gap-3 flex-1">
                              {method.type === 'card' && <CreditCardIcon className="w-6 h-6 text-gray-600" />}
                              {method.type === 'wallet' && (
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                              <span className="font-medium text-gray-900">{method.label}</span>
                              {method.id === 'wallet' && walletBalance !== null && walletBalance > 0 && (
                                <span className="text-sm text-gray-500 ml-auto">
                                  ({formatPrice(walletBalance)} disponible)
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Opciones de distribución de pago si se selecciona wallet */}
                    {selectedPaymentMethod === 'wallet' && walletBalance !== null && walletBalance > 0 && (
                      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Distribución de pago</h3>
                        
                        <div className="space-y-4">
                          {/* Monto total */}
                          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                            <span className="text-sm text-gray-600">Total a pagar</span>
                            <span className="text-lg font-semibold text-gray-900">{formatPrice(total)}</span>
                          </div>

                          {/* Usar wallet */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={useWallet}
                                onChange={(e) => {
                                  setUseWallet(e.target.checked);
                                  if (e.target.checked) {
                                    // Usar todo el saldo disponible o el total, lo que sea menor
                                    setWalletAmount(Math.min(walletBalance, total));
                                  } else {
                                    setWalletAmount(0);
                                    setSecondaryPaymentMethod(null);
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-900">Usar monedero electrónico</span>
                            </label>
                            
                            {useWallet && (
                              <div className="ml-6 space-y-3">
                                <div>
                                  <label className="block text-sm text-gray-700 mb-1">
                                    Monto a usar del monedero
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={Math.min(walletBalance, total)}
                                    step="0.01"
                                    value={walletAmount}
                                    onChange={(e) => {
                                      const amount = Math.min(Math.max(0, parseFloat(e.target.value) || 0), Math.min(walletBalance, total));
                                      setWalletAmount(amount);
                                      // Si el monto del wallet es menor al total, requerir método secundario
                                      if (amount < total) {
                                        // Si no hay método secundario seleccionado, no hacer nada
                                      } else {
                                        setSecondaryPaymentMethod(null);
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Disponible: {formatPrice(walletBalance)} | Máximo: {formatPrice(Math.min(walletBalance, total))}
                                  </p>
                                </div>

                                {/* Mostrar saldo restante si el wallet no cubre todo */}
                                {walletAmount < total && (
                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <p className="text-sm text-yellow-800 mb-3">
                                      Restante a pagar: <span className="font-semibold">{formatPrice(total - walletAmount)}</span>
                                    </p>
                                    
                                    <div className="space-y-2">
                                      <label className="block text-sm font-medium text-gray-900 mb-2">
                                        Selecciona un método de pago adicional:
                                      </label>
                                      {paymentMethods
                                        .filter(m => m.id !== 'wallet')
                                        .map((method) => (
                                          <label
                                            key={method.id}
                                            className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors ${
                                              secondaryPaymentMethod === method.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                          >
                                            <input
                                              type="radio"
                                              name="secondary-payment"
                                              value={method.id}
                                              checked={secondaryPaymentMethod === method.id}
                                              onChange={() => setSecondaryPaymentMethod(method.id)}
                                              className="w-4 h-4"
                                            />
                                            <div className="flex items-center gap-2">
                                              {method.type === 'card' && <CreditCardIcon className="w-5 h-5 text-gray-600" />}
                                              <span className="text-sm text-gray-900">{method.label}</span>
                                            </div>
                                          </label>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Resumen de distribución */}
                                {walletAmount > 0 && (
                                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm font-medium text-blue-900 mb-2">Resumen de pago:</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-blue-700">Monedero electrónico:</span>
                                        <span className="font-semibold text-blue-900">{formatPrice(walletAmount)}</span>
                                      </div>
                                      {walletAmount < total && secondaryPaymentMethod && (
                                        <div className="flex justify-between">
                                          <span className="text-blue-700">
                                            {paymentMethods.find(m => m.id === secondaryPaymentMethod)?.label || 'Otro método'}:
                                          </span>
                                          <span className="font-semibold text-blue-900">{formatPrice(total - walletAmount)}</span>
                                        </div>
                                      )}
                                      <div className="flex justify-between pt-2 border-t border-blue-200">
                                        <span className="font-semibold text-blue-900">Total:</span>
                                        <span className="font-bold text-blue-900">{formatPrice(total)}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex justify-between">
                      <button
                        onClick={() => {
                          setCurrentStep('shipping-method');
                          setError('');
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        ← Volver
                      </button>
                      <button
                        onClick={handlePlaceOrder}
                        disabled={
                          !selectedPaymentMethod || 
                          processingOrder ||
                          (selectedPaymentMethod === 'wallet' && useWallet && walletAmount < total && !secondaryPaymentMethod)
                        }
                        className="px-8 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {processingOrder ? 'Procesando Orden...' : 'Realizar Pedido'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Paso 5: Confirmación */}
                {currentStep === 'confirmation' && orderId && (
                  <div className="py-8">
                    {/* Icono de éxito */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 mb-6">
                        <CheckCircleIcon className="w-16 h-16 text-green-600" />
                      </div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-3">¡Pedido Confirmado!</h2>
                      <p className="text-lg text-gray-600 mb-2">
                        Tu pedido ha sido procesado exitosamente
                      </p>
                      <p className="text-sm text-gray-500">
                        Recibirás un correo de confirmación con los detalles de tu pedido
                      </p>
                    </div>

                    {/* Información del pedido */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
                          <p className="text-xl font-bold text-gray-900">{orderId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Total pagado</p>
                          <p className="text-xl font-bold text-toyota-red">
                            {formatPrice(confirmedOrderData?.total || total)}
                          </p>
                        </div>
                      </div>

                      {/* Dirección de envío */}
                      {selectedAddressId && (() => {
                        const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
                        if (selectedAddress) {
                          return (
                            <div className="mb-4 pb-4 border-b border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-2">Dirección de envío</p>
                              <div className="text-sm text-gray-600">
                                {selectedAddress.receiver_name && (
                                  <p className="font-medium text-gray-900 mb-1">{selectedAddress.receiver_name}</p>
                                )}
                                <p>{selectedAddress.street} {selectedAddress.street_number}</p>
                                {selectedAddress.interior_number && <p>Int. {selectedAddress.interior_number}</p>}
                                <p>{selectedAddress.neighborhood}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}</p>
                                {selectedAddress.receiver_phone && (
                                  <p className="mt-1 text-gray-500">Tel: {selectedAddress.receiver_phone}</p>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Método de pago */}
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Método de pago</p>
                        {confirmedOrderData?.paymentInfo?.walletAmount ? (
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Monedero electrónico:</span>
                              <span className="font-semibold">{formatPrice(confirmedOrderData.paymentInfo.walletAmount)}</span>
                            </div>
                            {confirmedOrderData.paymentInfo.secondaryMethod && confirmedOrderData.paymentInfo.secondaryAmount && (
                              <div className="flex justify-between">
                                <span>{paymentMethods.find(m => m.id === confirmedOrderData.paymentInfo?.secondaryMethod)?.label || 'Otro método'}:</span>
                                <span className="font-semibold">{formatPrice(confirmedOrderData.paymentInfo.secondaryAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                              <span className="font-semibold">Total:</span>
                              <span className="font-bold">{formatPrice(confirmedOrderData.total)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {paymentMethods.find(m => m.id === selectedPaymentMethod)?.label || selectedPaymentMethod}
                          </p>
                        )}
                      </div>

                      {/* Métodos de envío seleccionados */}
                      {confirmedOrderData && Object.keys(confirmedOrderData.storesInfo).length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-3">Métodos de envío</p>
                          <div className="space-y-2">
                            {Object.entries(confirmedOrderData.storesInfo).map(([storeId, store]) => {
                              const selectedOptionId = confirmedOrderData.shippingSelections[storeId];
                              const options = confirmedOrderData.shippingOptionsByStore[storeId] || [];
                              const selectedOption = options.find(opt => opt.id === selectedOptionId);
                              
                              return (
                                <div key={storeId} className="flex items-center justify-between text-sm bg-white rounded p-2">
                                  <div>
                                    <span className="font-medium text-gray-900">{store.name}:</span>
                                    <span className="text-gray-600 ml-2">
                                      {selectedOption?.label || 'No seleccionado'}
                                    </span>
                                    {selectedOption?.estimatedDays && selectedOption.estimatedDays > 0 && (
                                      <span className="text-gray-500 ml-2">
                                        ({selectedOption.estimatedDays} {selectedOption.estimatedDays === 1 ? 'día' : 'días'})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    {selectedOption?.price === 0 ? 'Gratis' : formatPrice(selectedOption?.price || 0)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mensaje informativo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800">
                        <strong>¿Qué sigue?</strong> Te enviaremos un correo electrónico con los detalles de tu pedido y el número de seguimiento una vez que sea enviado.
                      </p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => router.push('/')}
                        className="px-8 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium shadow-sm"
                      >
                        Continuar Comprando
                      </button>
                      <button
                        onClick={() => router.push('/orders')}
                        className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      >
                        Ver Mis Pedidos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: Resumen del pedido (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h2 className="text-xl font-medium text-gray-900 mb-6">Resumen del Pedido</h2>
                
                {/* Items del carrito agrupados por tienda */}
                <div className="space-y-4 mb-6 border-b border-gray-200 pb-6">
                  {Object.entries(storesInfo).map(([businessId, store], storeIndex) => (
                    <div key={businessId} className={storeIndex > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                      {/* Encabezado de la tienda */}
                      {Object.keys(storesInfo).length > 1 && (
                        <div className="mb-3 pb-2 border-b border-gray-100">
                          <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            {store.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {store.items.length} {store.items.length === 1 ? 'producto' : 'productos'}
                          </p>
                        </div>
                      )}
                      
                      {/* Items de esta tienda */}
                      <div className="space-y-3">
                        {store.items.map((item: CartItem) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                              {item.product_image_url && !imageErrors[item.id] ? (
                                <img
                                  src={item.product_image_url}
                                  alt={item.product_name}
                                  className="w-full h-full object-contain p-1"
                                  onError={() => {
                                    setImageErrors(prev => ({ ...prev, [item.id]: true }));
                                  }}
                                />
                              ) : (
                                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.product_name}</p>
                              <p className="text-xs text-gray-500 mt-1">Cantidad: {item.quantity}</p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {formatPrice(parseFloat(String(item.item_subtotal || 0)))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Subtotal y envío por tienda (solo si hay múltiples tiendas) */}
                      {Object.keys(storesInfo).length > 1 && (
                        <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Subtotal {store.name}:</span>
                            <span className="font-medium text-gray-900">
                              {formatPrice(subtotalsByStore[businessId] || 0)}
                            </span>
                          </div>
                          {currentStep !== 'auth' && currentStep !== 'shipping' && (
                            (() => {
                              const selectedOptionId = shippingSelections[businessId];
                              const options = shippingOptionsByStore[businessId] || [];
                              const selectedOption = options.find(opt => opt.id === selectedOptionId);
                              const shippingCost = selectedOption?.price || 0;
                              
                              if (shippingCost === 0 && selectedOption?.provider === 'pickup') {
                                return (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Envío {store.name}:</span>
                                    <span className="text-gray-700">Recoger en tienda</span>
                                  </div>
                                );
                              } else if (shippingCost > 0) {
                                return (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Envío {store.name} ({selectedOption?.label}):</span>
                                    <span className="text-gray-700">{formatPrice(shippingCost)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Impuestos</span>
                    <span className="text-gray-900">{formatPrice(totalTax)}</span>
                  </div>
                  {shippingTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Envío</span>
                      <span className="text-gray-900">{formatPrice(shippingTotal)}</span>
                    </div>
                  )}
                  {Object.keys(storesInfo).length > 1 && shippingTotal > 0 && (
                    <div className="pl-4 space-y-1 mt-2">
                      {Object.entries(storesInfo).map(([storeId, store]) => {
                        const selectedOptionId = shippingSelections[storeId];
                        const options = shippingOptionsByStore[storeId] || [];
                        const selectedOption = options.find(opt => opt.id === selectedOptionId);
                        const shippingCost = selectedOption?.price || 0;
                        
                        if (shippingCost === 0) return null;
                        
                        return (
                          <div key={storeId} className="flex justify-between text-xs">
                            <span className="text-gray-500">Envío {store.name}:</span>
                            <span className="text-gray-700">{formatPrice(shippingCost)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total</span>
                    <span className="text-2xl font-medium text-gray-900">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </StoreLayout>
    </>
  );
}
