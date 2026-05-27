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
import { productsService, type Product } from '@/lib/products';
import { walletService, Wallet } from '@/lib/wallet';
import { logisticsService, type Address as LogisticsAddress, type Parcel } from '@/lib/logistics';
import { branchesService, BranchTaxSettings } from '@/lib/branches';
import { authService } from '@/lib/auth';
import TaxBreakdownComponent from '@/components/TaxBreakdown';
import { KarlopayCheckout } from '@/components/checkout/KarlopayCheckout';
import { isEmbedded } from '@/utils/embed';
import { beginCheckout, buildStandaloneCheckoutUrl } from '@/services/checkout-embed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';

const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

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
  const { isAuthenticated, signIn, signUp, user, token, refreshUser } = useAuth();
  const { contextType, slug, getContextualUrl, groupId, branchId } = useStoreContext();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('auth');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingReceiverForAddressId, setEditingReceiverForAddressId] = useState<string | null>(null);
  const [editingReceiverName, setEditingReceiverName] = useState('');
  const [editingReceiverPhone, setEditingReceiverPhone] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [itemsTaxBreakdowns, setItemsTaxBreakdowns] = useState<Record<string, TaxBreakdown>>({});
  const [itemsNetSubtotals, setItemsNetSubtotals] = useState<Record<string, number>>({});
  const [branchTaxSettings, setBranchTaxSettings] = useState<Record<string, BranchTaxSettings>>({});
  const [branchWhatsappEnabledById, setBranchWhatsappEnabledById] = useState<Record<string, boolean>>({});
  const [showWhatsappPrompt, setShowWhatsappPrompt] = useState(false);
  const [whatsappPromptDismissed, setWhatsappPromptDismissed] = useState(false);
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [whatsappError, setWhatsappError] = useState('');
  const [backorderByItemId, setBackorderByItemId] = useState<Record<string, { isBackorder: boolean; leadTimeDays?: number | null }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [productsData, setProductsData] = useState<Record<string, Product>>({});

  // Cargar datos de productos para imágenes en resumen (fallback si el carrito no trae product_image_url)
  useEffect(() => {
    if (cart?.items?.length) {
      const productIds = Array.from(new Set(cart.items.map((i) => i.product_id)));
      const load = async () => {
        const map: Record<string, Product> = {};
        await Promise.all(
          productIds.map(async (id) => {
            try {
              const p = await productsService.getProduct(id);
              map[id] = p;
            } catch {
              // ignore
            }
          })
        );
        setProductsData(map);
      };
      load();
    } else {
      setProductsData({});
    }
  }, [cart?.items?.length, cart?.items?.map((i) => i.product_id).join(',')]);

  const getBranchSettings = (businessId: string) =>
    branchTaxSettings[businessId] || DEFAULT_BRANCH_TAX_SETTINGS;

  const userPhone = (user?.profile?.phone || user?.phone || '').trim();

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

  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      setBackorderByItemId({});
      return;
    }

    let isCancelled = false;
    const loadBackorderInfo = async () => {
      const entries = await Promise.all(
        cart.items.map(async (item) => {
          try {
            const product = await productsService.getProduct(
              item.product_id,
              item.business_id || undefined,
            );
            const stock = product.branch_stock;
            const allowBackorder = product.branch_allow_backorder;
            const isBackorder =
              !!allowBackorder &&
              stock !== null &&
              stock !== undefined &&
              stock <= 0;
            return [
              item.id,
              {
                isBackorder,
                leadTimeDays: product.branch_backorder_lead_time_days ?? null,
              },
            ] as const;
          } catch (err) {
            return [item.id, { isBackorder: false }] as const;
          }
        }),
      );

      if (!isCancelled) {
        setBackorderByItemId(Object.fromEntries(entries));
      }
    };

    loadBackorderInfo();
    return () => {
      isCancelled = true;
    };
  }, [cart?.items?.map((item) => `${item.id}:${item.business_id || ''}`).join(',')]);

  useEffect(() => {
    if (!cart?.items || cart.items.length === 0) {
      setBranchWhatsappEnabledById({});
      return;
    }

    let isCancelled = false;
    const businessIds = Array.from(
      new Set(cart.items.map((item) => item.business_id).filter(Boolean) as string[]),
    );

    const loadWhatsappConfig = async () => {
      const entries = await Promise.all(
        businessIds.map(async (businessId) => {
          try {
            const settings = await branchesService.getBranchNotificationSettings(businessId);
            const hasWhatsapp = settings.some((item) => item.whatsapp_enabled);
            return [businessId, hasWhatsapp] as const;
          } catch (error) {
            return [businessId, false] as const;
          }
        }),
      );

      if (!isCancelled) {
        setBranchWhatsappEnabledById(Object.fromEntries(entries));
      }
    };

    loadWhatsappConfig();
    return () => {
      isCancelled = true;
    };
  }, [cart?.items?.map((item) => `${item.id}:${item.business_id || ''}`).join(',')]);

  useEffect(() => {
    if (!isAuthenticated || whatsappPromptDismissed) {
      return;
    }

    const anyWhatsappEnabled = Object.values(branchWhatsappEnabledById).some(Boolean);
    if (anyWhatsappEnabled && !userPhone) {
      setShowWhatsappPrompt(true);
      return;
    }

    setShowWhatsappPrompt(false);
  }, [isAuthenticated, branchWhatsappEnabledById, userPhone, whatsappPromptDismissed]);
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
  const [deliveryType, setDeliveryType] = useState<'shipping' | 'pickup'>('shipping');
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
  const [branchKarlopayEnabled, setBranchKarlopayEnabled] = useState(false);
  const [branchKarlopayBusinessId, setBranchKarlopayBusinessId] = useState<string | null>(null);
  /** Config pública de Karlopay de la sucursal (p. ej. kiosco: flag en credenciales prod) */
  const [branchKarlopayPublic, setBranchKarlopayPublic] = useState<{
    environment?: 'dev' | 'prod';
    prod?: { kiosk_payment_enabled?: boolean };
  } | null>(null);
  const [kioskContactEmail, setKioskContactEmail] = useState('');
  const [kioskContactPhone, setKioskContactPhone] = useState('');

  /** Toggle en credenciales prod + integración Karlopay en Producción. En Desarrollo no existe esta opción en checkout. */
  const showKioskOption = useMemo(
    () =>
      branchKarlopayEnabled &&
      branchKarlopayPublic?.environment === 'prod' &&
      !!branchKarlopayPublic?.prod?.kiosk_payment_enabled,
    [branchKarlopayEnabled, branchKarlopayPublic],
  );

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'card', type: 'card', label: 'Tarjeta de crédito/débito' },
    { id: 'wallet', type: 'wallet', label: 'Monedero electrónico' },
  ]);
  
  // Estados para confirmación
  const [orderId, setOrderId] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [karlopayPaymentData, setKarlopayPaymentData] = useState<{
    mode: 'redirect' | 'embedded';
    paymentUrl: string;
    orderGroupId: string;
    numberOfOrder: string;
    businessId?: string;
  } | null>(null);
  /** Metadatos públicos del backend: entorno dev/prod y origen de credenciales (misma lógica que el cobro) */
  const [karlopayCheckoutContext, setKarlopayCheckoutContext] = useState<{
    karlopayEnabled: boolean;
    environment?: 'dev' | 'prod';
    credentialSource?: 'branch' | 'group' | 'global';
    integrationMode?: 'redirect' | 'embedded';
  } | null>(null);
  const [karlopayCheckoutContextLoading, setKarlopayCheckoutContextLoading] = useState(false);
  /** Cuando la tienda está embebida y enviamos postMessage al parent para breakout */
  const [embedBreakoutPending, setEmbedBreakoutPending] = useState(false);
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
      kioskFlow?: boolean;
    };
    /** Referencia AGORA_… / KarloPay para pago en kiosco */
    karlopayKioskReference?: string;
  } | null>(null);
  const [kioskQrDataUrl, setKioskQrDataUrl] = useState<string | null>(null);

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

  // Cargar configuracion de impuestos por sucursal
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const loadBranchSettings = async () => {
        try {
          const uniqueBusinessIds = Array.from(
            new Set(
              cart.items
                .map((item: CartItem) => item.branch_id || item.business_id)
                .filter((id): id is string => !!id)
            )
          );

          if (uniqueBusinessIds.length === 0) {
            setBranchTaxSettings({});
            return;
          }

          const settingsEntries = await Promise.all(
            uniqueBusinessIds.map(async (businessId) => {
              const settings = await branchesService.getBranchTaxSettings(businessId);
              return [businessId, settings || DEFAULT_BRANCH_TAX_SETTINGS] as const;
            })
          );

          const settingsMap: Record<string, BranchTaxSettings> = {};
          settingsEntries.forEach(([businessId, settings]) => {
            settingsMap[businessId] = settings;
          });
          setBranchTaxSettings(settingsMap);
        } catch (error) {
          console.warn('[Checkout] No se pudo cargar configuracion de impuestos por sucursal:', error);
          setBranchTaxSettings({});
        }
      };

      loadBranchSettings();
    } else {
      setBranchTaxSettings({});
    }
  }, [cart]);

  // Cargar configuracion de Karlopay a nivel branch
  useEffect(() => {
    const checkBranchKarlopay = async () => {
      try {
        // Obtener branchId del contexto o del primer item del carrito
        let targetBranchId: string | null = null;
        
        if (branchId) {
          targetBranchId = branchId;
        } else if (cart && cart.items && cart.items.length > 0) {
          // Usar el branch_id del primer item
          const firstItem = cart.items[0];
          targetBranchId = firstItem.branch_id || firstItem.business_id || null;
        }

        if (!targetBranchId) {
          setBranchKarlopayEnabled(false);
          setBranchKarlopayBusinessId(null);
          setBranchKarlopayPublic(null);
          return;
        }

        // Verificar si hay configuración de Karlopay para esta sucursal
        try {
          const response = await apiRequest<{
            karlopay?: {
              enabled: boolean;
              environment?: 'dev' | 'prod';
              prod?: { kiosk_payment_enabled?: boolean };
            };
          }>(`/businesses/branches/id/${targetBranchId}/karlopay-settings`, { method: 'GET' });

          const karlopayConfig = response?.karlopay;
          if (karlopayConfig && karlopayConfig.enabled === true) {
            setBranchKarlopayEnabled(true);
            setBranchKarlopayBusinessId(targetBranchId);
            setBranchKarlopayPublic({
              environment: karlopayConfig.environment,
              prod: karlopayConfig.prod,
            });
          } else {
            setBranchKarlopayEnabled(false);
            setBranchKarlopayBusinessId(null);
            setBranchKarlopayPublic(null);
          }
        } catch (error: any) {
          // Si no hay configuración o hay error, deshabilitar
          console.debug('[Checkout] No hay configuración Karlopay branch o error:', error.message);
          setBranchKarlopayEnabled(false);
          setBranchKarlopayBusinessId(null);
          setBranchKarlopayPublic(null);
        }
      } catch (error) {
        console.warn('[Checkout] Error verificando configuración Karlopay branch:', error);
        setBranchKarlopayEnabled(false);
        setBranchKarlopayBusinessId(null);
        setBranchKarlopayPublic(null);
      }
    };

    if (cart && cart.items && cart.items.length > 0) {
      checkBranchKarlopay();
    } else {
      setBranchKarlopayEnabled(false);
      setBranchKarlopayBusinessId(null);
      setBranchKarlopayPublic(null);
    }
  }, [cart, branchId]);

  // Actualizar métodos de pago: priorizar sucursal. Si hay config por sucursal solo mostramos esa opción; si no, la global.
  useEffect(() => {
    const walletMethod: PaymentMethod = { id: 'wallet', type: 'wallet', label: 'Monedero electrónico' };

    if (branchKarlopayEnabled) {
      const cardMethods: PaymentMethod[] = [
        { id: 'karlopay-branch', type: 'card', label: 'Tarjeta de crédito/débito (Pago directo a sucursal)' },
      ];
      if (showKioskOption) {
        cardMethods.push({
          id: 'karlopay-kiosk',
          type: 'card',
          label: 'Pago en KarloPay Kiosco',
        });
      }
      setPaymentMethods([...cardMethods, walletMethod]);
    } else {
      // Solo opción global
      setPaymentMethods([
        { id: 'card', type: 'card', label: 'Tarjeta de crédito/débito' },
        walletMethod,
      ]);
    }
  }, [branchKarlopayEnabled, showKioskOption]);

  useEffect(() => {
    if (selectedPaymentMethod === 'karlopay-kiosk' && user) {
      setKioskContactEmail((prev) => (prev.trim() ? prev : user.email || ''));
      setKioskContactPhone((prev) => (prev.trim() ? prev : userPhone));
    }
  }, [selectedPaymentMethod, user, userPhone]);

  useEffect(() => {
    const ref = confirmedOrderData?.karlopayKioskReference?.trim();
    if (!confirmedOrderData?.paymentInfo?.kioskFlow || !ref) {
      setKioskQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void import('qrcode')
      .then((QRMod) => {
        const QR = QRMod.default;
        return QR.toDataURL(ref, { width: 220, margin: 2, errorCorrectionLevel: 'M' });
      })
      .then((url) => {
        if (!cancelled) setKioskQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setKioskQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [confirmedOrderData?.paymentInfo?.kioskFlow, confirmedOrderData?.karlopayKioskReference]);

  // Contexto KarloPay (entorno + origen) para QA: alinea con resolveBranchOrGroupFirst del backend
  useEffect(() => {
    if (currentStep !== 'payment') {
      return;
    }
    let cancelled = false;
    const load = async () => {
      setKarlopayCheckoutContextLoading(true);
      try {
        const params = new URLSearchParams();
        if (branchKarlopayEnabled && branchKarlopayBusinessId) {
          params.set('branchBusinessId', branchKarlopayBusinessId);
          params.set('resolveBranchOrGroupFirst', 'true');
        } else {
          params.set('resolveBranchOrGroupFirst', 'false');
        }
        const data = await apiRequest<{
          karlopayEnabled: boolean;
          environment?: 'dev' | 'prod';
          credentialSource?: 'branch' | 'group' | 'global';
          integrationMode?: 'redirect' | 'embedded';
        }>(`/payments/karlopay/checkout-context?${params.toString()}`, { method: 'GET' });
        if (!cancelled) {
          setKarlopayCheckoutContext(data);
        }
      } catch {
        if (!cancelled) {
          setKarlopayCheckoutContext(null);
        }
      } finally {
        if (!cancelled) {
          setKarlopayCheckoutContextLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentStep, branchKarlopayEnabled, branchKarlopayBusinessId]);

  // Mantener selección válida: si la actual no está en la lista, o no hay selección y solo hay una tarjeta, elegir la opción de tarjeta
  useEffect(() => {
    const ids = paymentMethods.map((m) => m.id);
    const cardMethods = paymentMethods.filter((m) => m.type === 'card');
    if (selectedPaymentMethod && !ids.includes(selectedPaymentMethod)) {
      setSelectedPaymentMethod(cardMethods[0] ? cardMethods[0].id : null);
    } else if (!selectedPaymentMethod && cardMethods.length === 1) {
      setSelectedPaymentMethod(cardMethods[0].id);
    }
  }, [paymentMethods]);

  // Calcular impuestos
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      const splitIncludedTaxes = (
        grossSubtotal: number,
        taxBreakdown: TaxBreakdown | null | undefined
      ): { taxBreakdown: TaxBreakdown; netSubtotal: number } => {
        if (!taxBreakdown || !Array.isArray(taxBreakdown.taxes)) {
          return { taxBreakdown: { taxes: [], total_tax: 0 }, netSubtotal: grossSubtotal };
        }

        const percentageRate = taxBreakdown.taxes
          .filter((t) => t.rate_type === 'percentage')
          .reduce((sum, t) => sum + (typeof t.rate === 'number' ? t.rate : Number(t.rate) || 0), 0);

        const fixedSum = taxBreakdown.taxes
          .filter((t) => t.rate_type === 'fixed')
          .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : Number(t.amount) || 0), 0);

        const netSubtotal =
          percentageRate > 0
            ? (grossSubtotal - fixedSum) / (1 + percentageRate)
            : Math.max(0, grossSubtotal - fixedSum);

        const adjustedTaxes = taxBreakdown.taxes.map((t) => {
          if (t.rate_type === 'percentage') {
            const amount = netSubtotal * (typeof t.rate === 'number' ? t.rate : Number(t.rate) || 0);
            return { ...t, amount };
          }
          return t;
        });

        const total_tax = adjustedTaxes.reduce((sum, t) => sum + (t.amount || 0), 0);
        return { taxBreakdown: { taxes: adjustedTaxes, total_tax }, netSubtotal };
      };

      const calculateTaxes = async () => {
        const taxBreakdowns: Record<string, TaxBreakdown> = {};
        const netSubtotals: Record<string, number> = {};
        
        await Promise.all(
          cart.items.map(async (item: CartItem) => {
            try {
              const grossSubtotal = parseFloat(String(item.item_subtotal || 0));
              const businessId = item.branch_id || item.business_id || '';
              const taxSettings = branchTaxSettings[businessId] || DEFAULT_BRANCH_TAX_SETTINGS;

              const taxBreakdown = await taxesService.calculateProductTaxes(
                item.product_id,
                grossSubtotal
              );

              if (taxSettings.included_in_price) {
                const { taxBreakdown: adjusted, netSubtotal } = splitIncludedTaxes(
                  grossSubtotal,
                  taxBreakdown
                );
                taxBreakdowns[item.id] = adjusted;
                netSubtotals[item.id] = netSubtotal;
                return;
              }

              taxBreakdowns[item.id] = taxBreakdown;
              netSubtotals[item.id] = grossSubtotal;
            } catch (error) {
              taxBreakdowns[item.id] = { taxes: [], total_tax: 0 };
              netSubtotals[item.id] = parseFloat(String(item.item_subtotal || 0));
            }
          })
        );
        
        setItemsTaxBreakdowns(taxBreakdowns);
        setItemsNetSubtotals(netSubtotals);
      };
      
      calculateTaxes();
    } else {
      setItemsTaxBreakdowns({});
      setItemsNetSubtotals({});
    }
  }, [cart, branchTaxSettings]);

  // Agrupar items por tienda/sucursal
  const itemsByStore = useMemo(() => {
    if (!cart || !cart.items) return {};
    
    const grouped: Record<string, CartItem[]> = {};
    cart.items.forEach((item) => {
      const storeKey = item.branch_id || item.business_id || 'unknown';
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
        (sum, item) =>
          sum +
          (itemsNetSubtotals[item.id] !== undefined
            ? itemsNetSubtotals[item.id]
            : parseFloat(String(item.item_subtotal || 0))),
        0
      );
    });
    return subtotals;
  }, [storesInfo, itemsNetSubtotals]);

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

  // Etiquetas desactivadas (se ocultaron las opciones 2 y 3)
  const hasIncludedTaxLabels = false;

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

      if (skydropxOptions.length === 0) {
        setQuotationErrors(prev => ({
          ...prev,
          [storeId]: 'No se encontraron opciones de envío para esta tienda.',
        }));
      }

      // Actualizar opciones de envío para esta tienda (solo entrega a domicilio)
      setShippingOptionsByStore(prev => ({
        ...prev,
        [storeId]: skydropxOptions,
      }));

      // Seleccionar por defecto la opción más barata disponible (si existe)
      setShippingSelections(prev => {
        const currentSelection = prev[storeId];
        if (currentSelection && skydropxOptions.some(o => o.id === currentSelection)) {
          return prev;
        }

        if (skydropxOptions.length === 0) {
          return { ...prev, [storeId]: '' };
        }

        const cheapestOption = skydropxOptions.reduce(
          (best, option) => (option.price < best.price ? option : best),
          skydropxOptions[0]
        );
        return { ...prev, [storeId]: cheapestOption.id };
      });
    } catch (error: any) {
      console.error(`[Checkout] Error obteniendo cotizaciones para tienda ${storeId}:`, error);
      setQuotationErrors(prev => ({
        ...prev,
        [storeId]: error.message || 'Error al obtener cotizaciones de envío',
      }));

      setShippingOptionsByStore(prev => ({
        ...prev,
        [storeId]: [],
      }));
      setShippingSelections(prev => ({ ...prev, [storeId]: '' }));
    } finally {
      setLoadingQuotations(prev => ({ ...prev, [storeId]: false }));
    }
  };

  // Obtener cotizaciones cuando se avanza al paso de shipping-method (solo si envío a domicilio)
  useEffect(() => {
    if (currentStep !== 'shipping-method' || Object.keys(storesInfo).length === 0) return;

    if (deliveryType === 'pickup') {
      // Pickup: no cotizar Skydropx; solo opción "Recoger en tienda" por tienda
      setShippingOptionsByStore({});
      setShippingSelections({});
      const optionsByStore: Record<string, ShippingOption[]> = {};
      const selections: Record<string, string> = {};
      Object.keys(storesInfo).forEach((storeId) => {
        const store = storesInfo[storeId];
        const pickupOption: ShippingOption = {
          id: `${storeId}-pickup`,
          provider: 'pickup',
          label: 'Recoger en tienda',
          price: 0,
          estimatedDays: 0,
        };
        optionsByStore[storeId] = [pickupOption];
        selections[storeId] = pickupOption.id;
      });
      setShippingOptionsByStore(optionsByStore);
      setShippingSelections(selections);
      return;
    }

    if (selectedAddressId) {
      setShippingOptionsByStore({});
      setShippingSelections({});
      Object.keys(storesInfo).forEach((storeId) => {
        fetchQuotationsForStore(storeId);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedAddressId, deliveryType]);

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
        const currentPath = router.asPath.split('?')[0];
        const contextMatch = currentPath.match(/^\/(grupo|sucursal|brand)\/([^/]+)/);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agoramp.mx';
        const appUrl = contextMatch
          ? `${origin}/${contextMatch[1]}/${contextMatch[2]}`
          : `${origin}/`;

        await signUp({
          email: authEmail,
          password: authPassword,
          firstName: authFirstName,
          lastName: authLastName,
          phone: authPhone,
          role: 'client',
          appUrl,
          businessId: branchId || undefined,
          businessGroupId: groupId || undefined,
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
    if (deliveryType === 'pickup') {
      setCurrentStep('shipping-method');
      setError('');
      return;
    }

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
    if (!selectedPaymentMethod) {
      setError('Por favor, completa todos los pasos');
      return;
    }
    if (deliveryType === 'shipping' && !selectedAddressId) {
      setError('Por favor, selecciona una dirección de envío');
      return;
    }

    if (selectedPaymentMethod === 'karlopay-kiosk') {
      const em = kioskContactEmail.trim();
      const phDigits = kioskContactPhone.replace(/\D/g, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        setError('Ingresa un correo electrónico válido para el pago en kiosco.');
        return;
      }
      if (phDigits.length < 10) {
        setError('Ingresa un teléfono válido (mínimo 10 dígitos) para el pago en kiosco.');
        return;
      }
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
      // Si se selecciona "karlopay-branch" o "karlopay-kiosk", mantener id y agregar branchId / contacto kiosco
      const backendPaymentMethod =
        selectedPaymentMethod === 'card'
          ? 'karlopay'
          : selectedPaymentMethod === 'karlopay-kiosk'
            ? 'karlopay-kiosk'
            : selectedPaymentMethod;
      const paymentInfo: any = {
        method: backendPaymentMethod,
      };

      // Si es karlopay-branch o karlopay-kiosk, agregar branchId
      if (
        (selectedPaymentMethod === 'karlopay-branch' || selectedPaymentMethod === 'karlopay-kiosk') &&
        branchKarlopayBusinessId
      ) {
        paymentInfo.branchId = branchKarlopayBusinessId;
      }

      if (selectedPaymentMethod === 'karlopay-kiosk') {
        paymentInfo.kiosk_contact = {
          email: kioskContactEmail.trim(),
          phone: kioskContactPhone.trim(),
        };
      }

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
          
          // Si el método secundario es karlopay-branch, agregar branchId
          if (secondaryPaymentMethod === 'karlopay-branch' && branchKarlopayBusinessId) {
            paymentInfo.secondary_branchId = branchKarlopayBusinessId;
          }
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

      const order = await apiRequest<{
        id: string;
        order_number: string;
        order_group_id?: string;
        karlopay_payment_url?: string;
        karlopay_mode?: 'redirect' | 'embedded';
        karlopay_order_group_id?: string;
        karlopay_number_of_order?: string;
      }>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          ...(deliveryType === 'pickup' ? { deliveryType: 'pickup' } : { addressId: selectedAddressId }),
          deliveryNotes: deliveryNotes.trim(),
          payment: paymentInfo,
          deliveryFee: shippingTotal, // Enviar el costo de envío calculado al backend
          storeContext: storePath,
          appUrl: window.location.origin,
          quotationIds: Object.keys(quotationIds).length > 0 ? quotationIds : undefined,
          rateIds: Object.keys(rateIds).length > 0 ? rateIds : undefined, // Enviar rate_ids si existen (necesario para crear shipment)
          shippingInfo: Object.keys(shippingInfo).length > 0 ? shippingInfo : undefined, // Enviar información de envío si existe
        }),
      });

      // Si el método de pago es Tarjeta (Karlopay redirect) o karlopay-branch, o hay método secundario Tarjeta, redirigir (no aplica a kiosco)
      const needsPaymentRedirect =
        (selectedPaymentMethod === 'card' ||
          selectedPaymentMethod === 'karlopay' ||
          selectedPaymentMethod === 'karlopay-branch') ||
        (selectedPaymentMethod === 'wallet' &&
          (secondaryPaymentMethod === 'card' || secondaryPaymentMethod === 'karlopay-branch'));
      
      if (needsPaymentRedirect && order.karlopay_payment_url) {
        const orderGroupId = order.karlopay_order_group_id || order.order_group_id || order.id;
        const mode = order.karlopay_mode || 'redirect';

        // Si la tienda está embebida en iframe: breakout para evitar cross-origin con KarloPay
        if (isEmbedded()) {
          const standaloneUrl = buildStandaloneCheckoutUrl(orderGroupId);
          const result = beginCheckout({
            checkoutUrl: standaloneUrl,
            sessionId: orderGroupId,
          });
          setProcessingOrder(false);
          if (result.success) {
            setEmbedBreakoutPending(true);
            return;
          }
          // Fallback: abrir en nueva pestaña
          if ('fallbackUrl' in result && result.fallbackUrl) {
            window.open(result.fallbackUrl, '_blank', 'noopener,noreferrer');
            setEmbedBreakoutPending(true);
            return;
          }
          setError(('error' in result ? result.error : null) || 'No se pudo iniciar el pago');
          return;
        }

        // No embebido: flujo normal
        let paymentUrl = order.karlopay_payment_url;
        if (!paymentUrl.startsWith('http://') && !paymentUrl.startsWith('https://')) {
          paymentUrl = `https://${paymentUrl}`;
        }
        if (mode === 'embedded') {
          setKarlopayPaymentData({
            mode: 'embedded',
            paymentUrl,
            orderGroupId,
            numberOfOrder: order.karlopay_number_of_order || `AGORA_${order.id?.replace(/-/g, '').substring(0, 20).toUpperCase()}`,
            businessId: paymentInfo.branchId || paymentInfo.secondary_branchId || branchKarlopayBusinessId || undefined,
          });
          setProcessingOrder(false);
          return;
        }
        console.log(`🔗 Redirigiendo a pasarela de pago: ${paymentUrl}`);
        window.location.href = paymentUrl;
        return;
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
          kioskFlow: selectedPaymentMethod === 'karlopay-kiosk',
        },
        karlopayKioskReference:
          selectedPaymentMethod === 'karlopay-kiosk' && order.karlopay_number_of_order
            ? String(order.karlopay_number_of_order)
            : undefined,
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
        {embedBreakoutPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-neutral-900/95 px-4">
            <div className="text-center max-w-md">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-toyota-red mb-4" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Te estamos llevando al pago seguro...
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                La ventana principal se abrirá para completar el pago. Si no ocurre, revisa si un popup fue bloqueado.
              </p>
            </div>
          </div>
        )}
        {karlopayPaymentData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 px-4">
            <div className="w-full max-w-lg">
              <h2 className="text-lg font-medium text-gray-900 mb-4 text-center">Pago con tarjeta</h2>
              <KarlopayCheckout
                mode={karlopayPaymentData.mode}
                paymentUrl={karlopayPaymentData.paymentUrl}
                orderGroupId={karlopayPaymentData.orderGroupId}
                numberOfOrder={karlopayPaymentData.numberOfOrder}
                businessId={karlopayPaymentData.businessId}
                onError={(msg) => {
                  setError(msg);
                  setKarlopayPaymentData(null);
                }}
              />
            </div>
          </div>
        )}
        {showWhatsappPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-lg">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-900">Notificaciones por WhatsApp</h2>
              </div>
              <div className="px-6 py-4 space-y-3">
                <p className="text-sm text-gray-700">
                  Podemos notificarte por WhatsApp pero para ello debes proporcionarnos tu número.
                </p>
                <input
                  type="tel"
                  value={whatsappPhoneInput}
                  onChange={(e) => {
                    setWhatsappPhoneInput(e.target.value);
                    setWhatsappError('');
                  }}
                  placeholder="Ej: +525512345678"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {whatsappError && (
                  <p className="text-xs text-red-600">{whatsappError}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWhatsappPrompt(false);
                    setWhatsappPromptDismissed(true);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Omitir por ahora
                </button>
                <button
                  type="button"
                  disabled={whatsappSaving}
                  onClick={async () => {
                    if (!token) {
                      setWhatsappError('Inicia sesión para guardar tu número.');
                      return;
                    }
                    const phone = whatsappPhoneInput.trim();
                    if (!phone) {
                      setWhatsappError('Ingresa un número de teléfono válido.');
                      return;
                    }
                    try {
                      setWhatsappSaving(true);
                      await authService.updateProfile(token, { phone });
                      await refreshUser();
                      setShowWhatsappPrompt(false);
                      setWhatsappPromptDismissed(true);
                    } catch (err: any) {
                      setWhatsappError(err?.message || 'No se pudo guardar el teléfono.');
                    } finally {
                      setWhatsappSaving(false);
                    }
                  }}
                  className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-50"
                >
                  {whatsappSaving ? 'Guardando...' : 'Guardar número'}
                </button>
              </div>
            </div>
          </div>
        )}
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
                    <p className="text-sm text-gray-600 mb-3">¿Cómo quieres recibir tu pedido?</p>
                    <div className="flex flex-wrap gap-3 mb-6">
                      <label
                        className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          deliveryType === 'shipping' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryType"
                          value="shipping"
                          checked={deliveryType === 'shipping'}
                          onChange={() => setDeliveryType('shipping')}
                          className="sr-only"
                        />
                        <LocalShippingIcon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">Envío a domicilio</span>
                      </label>
                      <label
                        className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          deliveryType === 'pickup' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryType"
                          value="pickup"
                          checked={deliveryType === 'pickup'}
                          onChange={() => setDeliveryType('pickup')}
                          className="sr-only"
                        />
                        <LocationOnIcon className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900">Recoger en tienda</span>
                      </label>
                    </div>

                    {deliveryType === 'pickup' && (
                      <p className="text-sm text-gray-600 mb-6">Recogerás tu pedido en la tienda. No se requiere dirección de envío.</p>
                    )}

                    {deliveryType === 'shipping' && (
                      <>
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

                    {/* Dirección de facturación (oculta por ahora, retomar más adelante) */}
                    <div className="mt-8 mb-6 border-t border-gray-200 pt-6 hidden">
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
                      </>
                    )}

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
                          deliveryType === 'shipping'
                            ? !selectedAddressId ||
                              (showNewAddressForm && !newAddress.receiver_name.trim()) ||
                              (!showNewAddressForm && addresses.find(addr => addr.id === selectedAddressId) && !addresses.find(addr => addr.id === selectedAddressId)?.receiver_name?.trim()) ||
                              (!useSameAddressForBilling && !selectedBillingAddressId)
                            : false
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
                                        {option.estimatedDays != null && option.estimatedDays > 0 ? (
                                          <span className="text-xs text-gray-500">
                                            Entrega estimada: {option.estimatedDays} {option.estimatedDays === 1 ? 'día' : 'días'}
                                          </span>
                                        ) : null}
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
                    <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-6">Método de Pago</h2>

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
                                if (method.id === 'karlopay-kiosk' && user) {
                                  setKioskContactEmail(user.email || '');
                                  setKioskContactPhone(userPhone);
                                }
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
                              {method.type === 'card' && method.id !== 'karlopay-kiosk' && (
                                <CreditCardIcon className="w-6 h-6 text-gray-600" />
                              )}
                              {method.id === 'karlopay-kiosk' && (
                                <PointOfSaleIcon className="w-6 h-6 text-gray-600" aria-hidden />
                              )}
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

                    {selectedPaymentMethod === 'karlopay-kiosk' && (
                      <div className="mb-6 p-4 border border-blue-200 bg-blue-50/80 rounded-lg space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900">Datos de contacto para instrucciones de pago</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Confirma o edita el correo y el teléfono donde enviaremos cómo completar el pago en el kiosco de la sucursal. El pedido en KarloPay se crea al confirmar estos datos al pulsar &quot;Realizar pedido&quot;.
                        </p>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Correo electrónico</label>
                          <input
                            type="email"
                            autoComplete="email"
                            value={kioskContactEmail}
                            onChange={(e) => setKioskContactEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                          <input
                            type="tel"
                            autoComplete="tel"
                            value={kioskContactPhone}
                            onChange={(e) => setKioskContactPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej. 5512345678"
                          />
                        </div>
                      </div>
                    )}

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
                                        .filter((m) => m.id !== 'wallet' && m.id !== 'karlopay-kiosk')
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
                          (selectedPaymentMethod === 'wallet' && useWallet && walletAmount < total && !secondaryPaymentMethod) ||
                          (selectedPaymentMethod === 'karlopay-kiosk' &&
                            (!kioskContactEmail.trim() ||
                              kioskContactPhone.replace(/\D/g, '').length < 10 ||
                              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kioskContactEmail.trim())))
                        }
                        className="px-8 py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {processingOrder ? 'Procesando Orden...' : 'Realizar Pedido'}
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100/80 dark:border-neutral-800/80">
                      {karlopayCheckoutContextLoading && (
                        <div className="flex gap-2.5 items-start" role="status">
                          <span
                            className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-gray-400/60 dark:bg-gray-500/45"
                            aria-hidden
                          />
                          <p className="text-[11px] leading-snug text-gray-400/80 dark:text-gray-500/50">
                            Consultando configuración de KarloPay…
                          </p>
                        </div>
                      )}
                      {!karlopayCheckoutContextLoading &&
                        karlopayCheckoutContext?.karlopayEnabled && (
                          <div className="flex gap-2.5 items-start" role="status">
                            <span
                              className={
                                karlopayCheckoutContext.environment === 'prod'
                                  ? 'mt-[5px] h-2 w-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400'
                                  : 'mt-[5px] h-2 w-2 shrink-0 rounded-full bg-amber-400 dark:bg-amber-400'
                              }
                              title={
                                karlopayCheckoutContext.environment === 'prod'
                                  ? 'Entorno: producción'
                                  : 'Entorno: desarrollo'
                              }
                              aria-hidden
                            />
                            <p className="text-[11px] leading-relaxed font-normal text-gray-400/90 dark:text-gray-500/55">
                              KarloPay (referencia QA): entorno{' '}
                              {karlopayCheckoutContext.environment === 'prod' ? 'Producción' : 'Desarrollo'}, credenciales
                              desde{' '}
                              {karlopayCheckoutContext.credentialSource === 'branch'
                                ? 'sucursal (web-local / web-admin)'
                                : karlopayCheckoutContext.credentialSource === 'group'
                                  ? 'grupo empresarial'
                                  : 'integración global'}
                              .{' '}
                              {karlopayCheckoutContext.integrationMode === 'embedded'
                                ? 'Pasarela: embedded. '
                                : 'Pasarela: redirect. '}
                              {branchKarlopayEnabled
                                ? 'Flujo: pago directo a sucursal (sucursal → grupo → global).'
                                : 'Flujo: tarjeta vía integración global.'}
                            </p>
                          </div>
                        )}
                      {!karlopayCheckoutContextLoading &&
                        karlopayCheckoutContext &&
                        !karlopayCheckoutContext.karlopayEnabled &&
                        paymentMethods.some((m) => m.type === 'card') && (
                          <div className="flex gap-2.5 items-start" role="alert">
                            <span
                              className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-gray-400/60 dark:bg-gray-500/45"
                              aria-hidden
                            />
                            <p className="text-[11px] leading-relaxed text-gray-500/90 dark:text-gray-400/50 font-normal">
                              KarloPay no está disponible para este flujo; el pago con tarjeta podría no abrir la
                              pasarela.
                            </p>
                          </div>
                        )}
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
                      {confirmedOrderData?.paymentInfo?.kioskFlow ? (
                        <div className="max-w-lg mx-auto text-left space-y-4">
                          <p className="text-sm text-gray-700">
                            Tu pago queda <strong>pendiente</strong> hasta que lo completes en el <strong>kiosco KarloPay</strong> de la sucursal.
                          </p>
                          {confirmedOrderData.karlopayKioskReference && (
                            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-center">
                              <p className="text-xs font-medium uppercase tracking-wide text-blue-800 mb-1">
                                Número de orden KarloPay (presenta en kiosco)
                              </p>
                              <p className="text-lg sm:text-xl font-bold font-mono text-blue-900 break-all">
                                {confirmedOrderData.karlopayKioskReference}
                              </p>
                              {kioskQrDataUrl && (
                                <div className="mt-4 flex justify-center">
                                  <img
                                    src={kioskQrDataUrl}
                                    alt="Código QR con tu referencia de pago en kiosco"
                                    width={220}
                                    height={220}
                                    className="rounded-lg border border-blue-100 bg-white p-1"
                                  />
                                </div>
                              )}
                              <p className="text-xs text-blue-800/80 mt-3">
                                El mismo código llegó por correo (confirmación e instrucciones) para que lo tengas a la mano.
                              </p>
                            </div>
                          )}
                          <p className="text-sm text-gray-700">
                            Hemos enviado las instrucciones al correo <strong>{kioskContactEmail.trim()}</strong> y al teléfono{' '}
                            <strong>{kioskContactPhone.trim()}</strong> (WhatsApp, si Karbot está configurado en la sucursal).
                          </p>
                          <p className="text-xs text-gray-500">
                            También recibirás el correo habitual de confirmación del pedido.
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Recibirás un correo de confirmación con los detalles de tu pedido
                        </p>
                      )}
                    </div>

                    {/* Información del pedido */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Número de pedido</p>
                          <p className="text-xl font-bold text-gray-900">{orderId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">
                            {confirmedOrderData?.paymentInfo?.kioskFlow ? 'Total por pagar' : 'Total pagado'}
                          </p>
                          <p className="text-xl font-bold text-toyota-red">
                            {formatPrice(confirmedOrderData?.total || total)}
                          </p>
                        </div>
                      </div>

                      {/* Dirección de envío o Recoger en tienda */}
                      {deliveryType === 'pickup' ? (
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700 mb-2">Entrega</p>
                          <p className="text-sm text-gray-600">Recoger en tienda</p>
                        </div>
                      ) : selectedAddressId && (() => {
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
                  {Object.entries(storesInfo).map(([businessId, store], storeIndex) => {
                    const storeSettings = getBranchSettings(businessId);
                    return (
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
                      
                      <div className="flex flex-wrap gap-2 mb-2" />
                      
                      {/* Items de esta tienda */}
                      <div className="space-y-3">
                        {store.items.map((item: CartItem) => {
                        const itemTaxBreakdown = itemsTaxBreakdowns[item.id];
                        const itemNetSubtotal =
                          itemsNetSubtotals[item.id] !== undefined
                            ? itemsNetSubtotals[item.id]
                            : parseFloat(String(item.item_subtotal || 0));
                        const shouldShowTaxBreakdown = false; // desgloses ocultos

                          return (
                            <div key={item.id} className="flex gap-3">
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                                {(() => {
                                  const product = productsData[item.product_id];
                                  const imageToShow = !imageErrors[item.id]
                                    ? item.product_image_url || product?.primary_image_url || product?.image_url
                                    : undefined;
                                  return imageToShow ? (
                                    <img
                                      src={imageToShow}
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
                                  );
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.product_name}</p>
                                <p className="text-xs text-gray-500 mt-1">Cantidad: {item.quantity}</p>
                                {backorderByItemId[item.id]?.isBackorder && (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 mt-1"
                                    title={
                                      backorderByItemId[item.id]?.leadTimeDays !== null &&
                                      backorderByItemId[item.id]?.leadTimeDays !== undefined
                                        ? `Surtido estimado: ${backorderByItemId[item.id]?.leadTimeDays} dias`
                                        : undefined
                                    }
                                  >
                                    backorder
                                  </span>
                                )}
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                  {formatPrice(itemNetSubtotal)}
                                </p>
                                {shouldShowTaxBreakdown && (
                                  <div className="mt-1">
                                    <TaxBreakdownComponent taxBreakdown={itemTaxBreakdown} compact />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                          {taxesByStore[businessId] > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Impuestos {store.name}:</span>
                              <span className="font-medium text-gray-900">
                                {formatPrice(taxesByStore[businessId] || 0)}
                              </span>
                            </div>
                          )}
                          {taxesByStore[businessId] === 0 && storeSettings.included_in_price && storeSettings.show_tax_included_label && (
                            <div className="flex justify-between text-[11px] text-gray-600">
                              <span>Impuestos incluidos en precios</span>
                            </div>
                          )}
                          {!storeSettings.display_tax_breakdown && taxesByStore[businessId] > 0 && (
                            <p className="text-[11px] text-gray-500">
                              Desglose de impuestos oculto por configuracion de la sucursal.
                            </p>
                          )}
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
                  );
                  })}
                </div>

                {/* Totales */}
                <div className="space-y-3 mb-6">
                  {false && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Instalación</span>
                      <span className="text-gray-900">{formatPrice(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Impuestos</span>
                    <span className="text-gray-900">{formatPrice(totalTax)}</span>
                  </div>
                  {hasIncludedTaxLabels && totalTax === 0 && (
                    <p className="text-xs text-gray-500 -mt-1">
                      Los precios ya incluyen impuestos para al menos una tienda.
                    </p>
                  )}
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
