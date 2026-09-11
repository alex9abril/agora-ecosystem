/**
 * Header principal del store-front
 * Diseño inspirado en Toyota con paleta de colores oficial
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import agoraLogo from '@/images/agora_logo_white.png';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import ContextualLink from '../ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import { brandingService, Branding } from '@/lib/branding';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import StoreMenu from '../StoreMenu';
import NavigationDialog from '../NavigationDialog';
import CategoriesMenu from '../CategoriesMenu';
import VehicleMenu from '../VehicleMenu';
import { getStoredVehicle, getSelectedVehicle, setSelectedVehicle } from '@/lib/vehicle-storage';
import { userVehiclesService, UserVehicle } from '@/lib/user-vehicles';
import { getSearchHistory, addSearchToHistory, removeSearchFromHistory, clearSearchHistory } from '@/lib/search-history';
import { useBranding } from '@/contexts/BrandingContext';

export default function Header() {
  const { branding: brandingContext } = useBranding();
  const embedMode = brandingContext?.embed_mode === true;
  const router = useRouter();
  const { 
    contextType, 
    slug,
    branchData,
    groupId,
    branchId,
    brandId,
    getStoreName,
  } = useStoreContext();
  const { isAuthenticated, user, signOut } = useAuth();
  const { itemCount, cart } = useCart();
  const { getCartUrl } = useStoreRouting();
  const cartTotal = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => {
      const subtotal = parseFloat(String(item.item_subtotal || 0));
      const tax = item.tax_breakdown?.total_tax
        ? Number(item.tax_breakdown.total_tax)
        : 0;
      return sum + subtotal + tax;
    }, 0);
  }, [cart]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchHistoryDropdown, setShowSearchHistoryDropdown] = useState(false);
  const [searchHistoryHighlightIndex, setSearchHistoryHighlightIndex] = useState(-1);
  const searchHistoryRef = useRef<HTMLDivElement>(null);
  const searchHistoryItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [searchHistoryVersion, setSearchHistoryVersion] = useState(0);
  const searchHistory = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return getSearchHistory(contextType, slug ?? null);
  }, [contextType, slug, showSearchHistoryDropdown, searchHistoryVersion]);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{ name: string; address: string; isOpen: boolean; nextOpenTime: string } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [branding, setBranding] = useState<Branding | null>(null);
  // CRÍTICO: Siempre inicializar como true para garantizar consistencia entre servidor y cliente
  // El branding se carga en useEffect, así que en el servidor y en la primera renderización del cliente
  // siempre será true, garantizando que el HTML inicial sea idéntico
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);
  const [isCompactHeader, setIsCompactHeader] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Ocultar botón Navegar cuando la tienda se muestra dentro de un iframe
  useEffect(() => {
    if (typeof window !== 'undefined') setIsInIframe(window.self !== window.top);
  }, []);

  // Detección móvil/tablet (celulares y tablets, < 1024px): regla excepcional iframe + logo deshabilitado → mostramos logo siempre
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const check = () => setIsMobileViewport(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showNavegarButton = !embedMode && !isInIframe;

  // Regla excepcional: en iframe con logo deshabilitado, en celular/tablet mostramos el logo siempre (mejor UX)
  const showEmbedLogo = embedMode && (brandingContext?.embed_show_logo !== false || isMobileViewport);

  // Función helper para obtener el color guardado
  const getStoredPrimaryColor = (branchId?: string | null, groupId?: string | null, brandId?: string | null): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      if (branchId) {
        const stored = localStorage.getItem(`branding_primary_${branchId}`);
        if (stored) return stored;
      }
      if (groupId) {
        const stored = localStorage.getItem(`branding_primary_group_${groupId}`);
        if (stored) return stored;
      }
      if (brandId) {
        const stored = localStorage.getItem(`branding_primary_brand_${brandId}`);
        if (stored) return stored;
      }
      // Tienda global (Agora global)
      if (!branchId && !groupId && !brandId) {
        const stored = localStorage.getItem('branding_primary_global');
        if (stored) return stored;
      }
    } catch (error) {
      console.error('Error leyendo color primario guardado:', error);
    }
    return null;
  };

  // Función helper para guardar el color primario
  const savePrimaryColor = (color: string, branchId?: string | null, groupId?: string | null, brandId?: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (branchId) {
        localStorage.setItem(`branding_primary_${branchId}`, color);
      } else if (groupId) {
        localStorage.setItem(`branding_primary_group_${groupId}`, color);
      } else if (brandId) {
        localStorage.setItem(`branding_primary_brand_${brandId}`, color);
      } else {
        localStorage.setItem('branding_primary_global', color);
      }
    } catch (error) {
      console.error('Error guardando color primario:', error);
    }
  };
  const [currentVehicle, setCurrentVehicle] = useState<UserVehicle | any | null>(null);
  const [isVehicleLoaded, setIsVehicleLoaded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const compactHeaderRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Solo cargar información de localStorage en el cliente para evitar problemas de hidratación
  useEffect(() => {
    setIsClient(true);
    
    // Obtener información de la tienda seleccionada (desde contexto o localStorage)
    let info: { name: string; address: string; isOpen: boolean; nextOpenTime: string } | null = null;
    
    // Primero intentar desde el contexto
    if (contextType === 'sucursal' && branchData) {
      info = {
        name: branchData.name,
        address: branchData.address || '',
        isOpen: true,
        nextOpenTime: '08:00 Mañana',
      };
    } else if (typeof window !== 'undefined') {
      // Si no hay contexto, intentar desde localStorage
      try {
        const stored = localStorage.getItem('selected_branch');
        if (stored) {
          const branch = JSON.parse(stored);
          info = {
            name: branch.name,
            address: branch.address || '',
            isOpen: true,
            nextOpenTime: '08:00 Mañana',
          };
        }
      } catch (error) {
        console.error('Error leyendo sucursal guardada:', error);
      }
    }
    
    setStoreInfo(info);
  }, [contextType, branchData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const shouldBeCompact = scrollY > 200 ? true : scrollY < 40 ? false : compactHeaderRef.current;
        if (compactHeaderRef.current !== shouldBeCompact) {
          compactHeaderRef.current = shouldBeCompact;
          setIsCompactHeader(shouldBeCompact);
        }
        scrollRafRef.current = null;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOpenVehiclePanel = () => setShowVehicleSelector(true);
    window.addEventListener('open-vehicle-panel', handleOpenVehiclePanel);
    return () => {
      window.removeEventListener('open-vehicle-panel', handleOpenVehiclePanel);
    };
  }, []);

  // Cargar vehículo actual
  useEffect(() => {
    const loadCurrentVehicle = async () => {
      // Primero verificar si hay un vehículo seleccionado explícitamente
      const selected = getSelectedVehicle();
      
      // Verificar si fue deseleccionado intencionalmente
      const isDeselected = typeof window !== 'undefined' && 
        localStorage.getItem('user_vehicle_selected') === '__deselected__';
      
      if (selected) {
        // Si hay un vehículo seleccionado, usarlo (respeta la decisión del usuario)
        // Funciona tanto para usuarios autenticados como no autenticados
        setCurrentVehicle(selected);
        setIsVehicleLoaded(true);
        return;
      }
      
      // Si fue deseleccionado intencionalmente, NO restaurar el predeterminado
      if (isDeselected) {
        setCurrentVehicle(null);
        setIsVehicleLoaded(true);
        return;
      }
      
      // Si el usuario está autenticado, intentar cargar el predeterminado de la cuenta
      if (isAuthenticated) {
        const hasSelectedKey = typeof window !== 'undefined' && 
          localStorage.getItem('user_vehicle_selected') !== null;
        
        // Solo cargar predeterminado si no hay selección previa explícita del usuario
        // Si hay una selección previa, respetarla (puede ser un vehículo local que el usuario quiere usar)
        if (!hasSelectedKey) {
          try {
            const defaultVehicle = await userVehiclesService.getDefaultVehicle();
            if (defaultVehicle) {
              setCurrentVehicle(defaultVehicle);
              // Establecer como seleccionado automáticamente
              setSelectedVehicle(defaultVehicle);
              console.log('[Header] Vehículo predeterminado cargado automáticamente:', defaultVehicle.nickname || defaultVehicle.brand_name);
            } else {
              // Si no hay predeterminado en cuenta, verificar localStorage
              const localVehicle = getStoredVehicle();
              if (localVehicle) {
                setCurrentVehicle(localVehicle);
                setSelectedVehicle(localVehicle);
              } else {
                setCurrentVehicle(null);
              }
            }
          } catch (error) {
            console.error('Error cargando vehículo predeterminado:', error);
            // En caso de error, intentar usar vehículo local
            const localVehicle = getStoredVehicle();
            setCurrentVehicle(localVehicle || null);
          }
        } else {
          // Hay una selección previa, usarla (puede ser local o de cuenta)
          const selected = getSelectedVehicle();
          if (selected) {
            setCurrentVehicle(selected);
          }
        }
      } else {
        // Usuario no autenticado: usar vehículo de localStorage si existe
        const localVehicle = getStoredVehicle();
        if (localVehicle) {
          setCurrentVehicle(localVehicle);
          setSelectedVehicle(localVehicle);
        } else {
          setCurrentVehicle(null);
        }
      }
      
      setIsVehicleLoaded(true);
    };

    if (isClient) {
      loadCurrentVehicle();
    }

    // Escuchar cambios en localStorage para vehículos seleccionados
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_vehicle_selected') {
        if (e.newValue && e.newValue !== '__deselected__') {
          try {
            const vehicle = JSON.parse(e.newValue);
            setCurrentVehicle(vehicle);
          } catch (error) {
            console.error('Error parseando vehículo seleccionado desde storage event:', error);
          }
        } else {
          // Si se limpia la selección o se marca como deseleccionado, limpiar el vehículo actual
          setCurrentVehicle(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Escuchar evento de sincronización de vehículos después de login/registro
    const handleVehiclesSynced = async () => {
      if (isAuthenticated) {
        console.log('[Header] Vehículos sincronizados, recargando vehículo predeterminado...');
        try {
          // Cargar el vehículo predeterminado de la cuenta automáticamente
          const defaultVehicle = await userVehiclesService.getDefaultVehicle();
          if (defaultVehicle) {
            setCurrentVehicle(defaultVehicle);
            setSelectedVehicle(defaultVehicle);
            console.log('[Header] Vehículo predeterminado cargado automáticamente:', defaultVehicle.nickname || defaultVehicle.brand_name);
          } else {
            // Si no hay predeterminado, verificar si hay vehículos locales
            const localVehicle = getStoredVehicle();
            if (localVehicle) {
              setCurrentVehicle(localVehicle);
              setSelectedVehicle(localVehicle);
            } else {
              setCurrentVehicle(null);
            }
          }
        } catch (error) {
          console.error('[Header] Error cargando vehículo después de sincronización:', error);
        }
      }
    };

    window.addEventListener('auth:vehicles-synced', handleVehiclesSynced);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:vehicles-synced', handleVehiclesSynced);
    };
  }, [isClient, isAuthenticated]);

  // Cargar branding cuando hay grupo o sucursal
  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones si el componente se desmonta
    
    const loadBranding = async () => {
      setIsBrandingLoading(true);
      
      // Si hay grupo, cargar branding del grupo (solo una petición)
      if (contextType === 'grupo' && groupId) {
        try {
          const brandingData = await brandingService.getGroupBranding(groupId);
          console.log('🎨 [Header] Branding del grupo cargado:', brandingData);
          if (isMounted) {
            setBranding(brandingData);
            // Guardar color primario si existe
            if (brandingData?.colors?.primary) {
              savePrimaryColor(brandingData.colors.primary, null, groupId);
            }
          }
        } catch (error) {
          console.error('Error cargando branding del grupo:', error);
          if (isMounted) {
            setBranding(null);
          }
        } finally {
          if (isMounted) {
            setIsBrandingLoading(false);
          }
        }
      }
      // Si hay marca (brand), cargar branding por vehicle_brand_id
      else if (contextType === 'brand' && brandId) {
        try {
          const brandingData = await brandingService.getVehicleBrandBranding(brandId);
          console.log('🎨 [Header] Branding por marca cargado:', brandingData);
          if (isMounted) {
            setBranding(brandingData ?? null);
            if (brandingData?.colors?.primary) {
              savePrimaryColor(brandingData.colors.primary, null, null, brandId);
            }
          }
        } catch (error) {
          console.error('Error cargando branding por marca:', error);
          if (isMounted) setBranding(null);
        } finally {
          if (isMounted) setIsBrandingLoading(false);
        }
      }
      // Si hay sucursal, intentar cargar branding de la sucursal primero, sino del grupo
      else if (contextType === 'sucursal' && branchId) {
        try {
          // Intentar primero el branding de la sucursal
          const brandingData = await brandingService.getBusinessBranding(branchId);
          console.log('🎨 [Header] Branding de la sucursal cargado:', brandingData);
          
          // Si hay branding de sucursal, usarlo (aunque no tenga logo_url)
          if (brandingData) {
            // Si no tiene colores pero tiene grupo, intentar obtener colores del grupo
            if (!brandingData.colors?.primary && groupId) {
              try {
                const groupBranding = await brandingService.getGroupBranding(groupId);
                console.log('🎨 [Header] Branding del grupo (para colores):', groupBranding);
                // Combinar: logo de sucursal, colores del grupo si no hay en sucursal
                const combinedBranding = {
                  ...brandingData,
                  colors: brandingData.colors || groupBranding?.colors || undefined,
                };
                setBranding(combinedBranding);
                // Guardar color primario si existe
                if (combinedBranding.colors?.primary) {
                  savePrimaryColor(combinedBranding.colors.primary, branchId, groupId);
                }
              } catch (groupError) {
                console.error('Error cargando branding del grupo para colores:', groupError);
                setBranding(brandingData);
                // Guardar color primario si existe
                if (brandingData?.colors?.primary) {
                  savePrimaryColor(brandingData.colors.primary, branchId, groupId);
                }
              }
            } else {
              setBranding(brandingData);
              // Guardar color primario si existe
              if (brandingData?.colors?.primary) {
                savePrimaryColor(brandingData.colors.primary, branchId, groupId);
              }
            }
            setIsBrandingLoading(false);
          } else if (groupId) {
            // Si no hay branding de sucursal, intentar del grupo
            const groupBranding = await brandingService.getGroupBranding(groupId);
            console.log('🎨 [Header] Branding del grupo (fallback):', groupBranding);
            setBranding(groupBranding);
            // Guardar color primario si existe
            if (groupBranding?.colors?.primary) {
              savePrimaryColor(groupBranding.colors.primary, branchId, groupId);
            }
            setIsBrandingLoading(false);
          } else {
            setBranding(null);
            setIsBrandingLoading(false);
          }
        } catch (error) {
          console.error('Error cargando branding de la sucursal:', error);
          // Si falla, intentar del grupo si existe
          if (groupId) {
            try {
              const groupBranding = await brandingService.getGroupBranding(groupId);
              console.log('🎨 [Header] Branding del grupo (error fallback):', groupBranding);
              setBranding(groupBranding);
              // Guardar color primario si existe
              if (groupBranding?.colors?.primary) {
                savePrimaryColor(groupBranding.colors.primary, branchId, groupId);
              }
            } catch (groupError) {
              console.error('Error cargando branding del grupo:', groupError);
              setBranding(null);
            }
          } else {
            setBranding(null);
          }
          setIsBrandingLoading(false);
        }
      }
      // Tienda global (Agora global): cargar branding personalizado
      else if (contextType === 'global') {
        try {
          const brandingData = await brandingService.getGlobalBranding();
          console.log('🎨 [Header] Branding tienda global cargado:', brandingData);
          if (isMounted) {
            setBranding(brandingData ?? null);
            if (brandingData?.colors?.primary) {
              savePrimaryColor(brandingData.colors.primary, null, null, null);
            }
          }
        } catch (error) {
          console.error('Error cargando branding tienda global:', error);
          if (isMounted) setBranding(null);
        } finally {
          if (isMounted) setIsBrandingLoading(false);
        }
      }
      // Sin contexto reconocido
      else {
        setBranding(null);
        setIsBrandingLoading(false);
      }
    };

    loadBranding();
    
    // Cleanup: marcar como desmontado si el componente se desmonta
    return () => {
      isMounted = false;
    };
  }, [contextType, groupId, branchId, brandId]);

  // Determinar qué logo usar
  // CRÍTICO: El servidor y el cliente DEBEN renderizar EXACTAMENTE lo mismo inicialmente
  // El problema es que isBrandingLoading puede ser diferente entre servidor y cliente
  // Solución: Usar un estado que solo se actualiza después de la hidratación
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Solo marcar como hidratado después de que el componente esté montado
    setIsHydrated(true);
  }, []);
  
  // CRÍTICO: En el servidor (isHydrated = false): SIEMPRE mostrar logo por defecto
  // En el cliente inicialmente (isHydrated = false): SIEMPRE mostrar logo por defecto
  // Esto garantiza que el HTML inicial sea idéntico
  // Solo después de la hidratación (isHydrated = true) considerar el estado de branding
  const shouldShowLogo = isHydrated ? (!isBrandingLoading || contextType === 'global') : true;
  const useCustomLogo = isHydrated && !isBrandingLoading && !!branding?.logo_url;
  const logoUrl = useCustomLogo ? branding.logo_url : agoraLogo;
  const logoAlt = useCustomLogo ? (getStoreName() || 'AGORA PARTS') : 'AGORA PARTS';
  
  // Función para calcular la luminosidad de un color hexadecimal
  const getLuminance = (hex: string): number => {
    // Remover el # si existe
    const color = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    // Calcular luminosidad relativa usando la fórmula estándar
    // https://www.w3.org/WAI/GL/wiki/Relative_luminance
    const [rNorm, gNorm, bNorm] = [r, g, b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
  };
  
  // Función para determinar si un color es claro u oscuro
  const isLightColor = (hex: string): boolean => {
    const luminance = getLuminance(hex);
    // Si la luminosidad es mayor a 0.5, es un color claro
    return luminance > 0.5;
  };
  
  // Función para oscurecer un color hexadecimal
  const darkenColor = (hex: string, percent: number = 20): string => {
    // Remover el # si existe
    const color = hex.replace('#', '');
    
    // Convertir a RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    
    // Oscurecer cada componente
    const darken = (value: number) => {
      const darkened = Math.max(0, Math.floor(value * (1 - percent / 100)));
      return darkened.toString(16).padStart(2, '0');
    };
    
    return `#${darken(r)}${darken(g)}${darken(b)}`;
  };
  
  // Usar SIEMPRE el color configurado en branding cuando exista; solo usar default si no hay valor
  const configuredPrimary = branding?.colors?.primary && String(branding.colors.primary).trim();
  const primaryColor = configuredPrimary || '#254639';
  const shouldUseBrandingColor = isHydrated && !isBrandingLoading && (contextType === 'global' || contextType === 'grupo' || contextType === 'sucursal' || contextType === 'brand');
  
  // Calcular color del borde (un tono más oscuro del color de fondo)
  const borderColor = darkenColor(primaryColor, 20);
  
  // Calcular color del texto basándose en el color de fondo
  const textColor = isLightColor(primaryColor) ? '#000000' : '#FFFFFF';
  const textColorOpacity90 = isLightColor(primaryColor) ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
  const textColorOpacity80 = isLightColor(primaryColor) ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
  const separatorColor = isLightColor(primaryColor) ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
  const hoverBgColor = isLightColor(primaryColor) ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)';
  
  // Debug: Log del color primario
  useEffect(() => {
    if (branding) {
      console.log('🎨 [Header] Color primario detectado:', {
        primary: branding.colors?.primary,
        shouldUseBrandingColor,
        isBrandingLoading,
        contextType,
        groupId,
        branchId,
        brandId,
        finalColor: primaryColor,
      });
    }
  }, [branding, contextType, groupId, branchId, brandId, primaryColor, shouldUseBrandingColor, isBrandingLoading]);

  const runSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    addSearchToHistory(contextType, slug ?? null, q);
    const params = new URLSearchParams();
    const keepKeys = [
      'compatible',
      'categoryId',
      'uncategorized',
      'collectionId',
      'productType',
      'priceMin',
      'priceMax',
      'sortBy',
      'sortOrder',
      'featured',
    ];
    keepKeys.forEach((key) => {
      const raw = router.query[key];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value) params.set(key, value);
    });
    params.set('search', q);
    const qs = params.toString();
    const searchUrl = contextType === 'global'
      ? `/products?${qs}`
      : `/${contextType}/${router.query.slug}/products?${qs}`;
    router.push(searchUrl);
    setShowSearchHistoryDropdown(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      runSearch(searchQuery);
    }
  };

  const handleSearchFromHistory = (query: string) => {
    setSearchQuery(query);
    runSearch(query);
  };

  const handleRemoveSearchFromHistory = (e: React.MouseEvent, query: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeSearchFromHistory(contextType, slug ?? null, query);
    setSearchHistoryVersion((v) => v + 1);
  };

  const handleClearSearchHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory(contextType, slug ?? null);
    setSearchHistoryVersion((v) => v + 1);
    setShowSearchHistoryDropdown(false);
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchHistoryDropdown || searchHistory.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchHistoryHighlightIndex((i) => Math.min(i + 1, searchHistory.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchHistoryHighlightIndex((i) => Math.max(-1, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      // Solo usar el ítem del historial si el input está vacío; si el usuario escribió algo, buscar eso
      if (!searchQuery.trim() && searchHistoryHighlightIndex >= 0 && searchHistory[searchHistoryHighlightIndex]) {
        e.preventDefault();
        handleSearchFromHistory(searchHistory[searchHistoryHighlightIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSearchHistoryDropdown(false);
      setSearchHistoryHighlightIndex(-1);
    }
  };

  useEffect(() => {
    if (showSearchHistoryDropdown && searchHistory.length > 0) {
      setSearchHistoryHighlightIndex(0);
    } else {
      setSearchHistoryHighlightIndex(-1);
    }
  }, [showSearchHistoryDropdown, searchHistory.length]);

  useEffect(() => {
    if (searchHistoryHighlightIndex >= 0 && searchHistoryItemRefs.current[searchHistoryHighlightIndex]) {
      searchHistoryItemRefs.current[searchHistoryHighlightIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [searchHistoryHighlightIndex]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim() === '') {
      if (searchHistory.length > 0) setShowSearchHistoryDropdown(true);
    } else {
      setShowSearchHistoryDropdown(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchHistory.length > 0) setShowSearchHistoryDropdown(true);
  };

  const isSearchDropdownOpen = showSearchHistoryDropdown && searchHistory.length > 0;

  // Estilo de texto para versión iframe: mayúsculas, 14px, font-weight 300; color oscuro para fondo transparente
  const embedTextStyle: React.CSSProperties = { fontSize: 14, fontWeight: 300, textTransform: 'uppercase' };
  const embedColor = '#1f2937';

  return (
    <>
      {/* Header Principal */}
      <header 
        ref={headerRef}
        className={embedMode ? 'z-50' : 'sticky top-0 z-50'}
        style={{
          ...(embedMode ? { backgroundColor: 'transparent', marginTop: 16 } : { backgroundColor: primaryColor, borderBottom: `1px solid ${borderColor}` }),
        }}
      >
        {/* Modo embebido (iframe): fondo transparente, texto mayúsculas 16px font-weight 300 */}
        {embedMode ? (
          <div style={{ backgroundColor: 'transparent' }}>
            <div className="w-full px-3 py-1.5">
              {isMobileViewport ? (
                /* Móvil iframe: primera fila = logo, menú, usuario, carrito; segunda fila = buscador ancho completo */
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {showEmbedLogo && (
                    <div className="flex-shrink-0">
                      <ContextualLink href="/" className="flex items-center hover:opacity-80 transition-opacity">
                        <div className="relative" style={{ width: '104px', height: '31px' }}>
                          {shouldShowLogo ? (
                            useCustomLogo && logoUrl ? (
                              <img src={typeof logoUrl === 'string' ? logoUrl : logoUrl.src} alt={logoAlt} width={104} height={31} className="object-contain" style={{ maxWidth: '104px', maxHeight: '31px', width: 'auto', height: 'auto' }} />
                            ) : (
                              <img src={typeof agoraLogo === 'string' ? agoraLogo : agoraLogo.src} alt="AGORA PARTS" width={104} height={31} className="object-contain" style={{ maxWidth: '104px', maxHeight: '31px', width: 'auto', height: 'auto' }} />
                            )
                          ) : (
                            <div className="bg-transparent" style={{ width: '104px', height: '31px' }} aria-hidden="true" />
                          )}
                          <span className="absolute text-[5px] uppercase tracking-wide whitespace-nowrap" style={{ left: '39px', top: '26px', fontWeight: 600, color: embedColor, visibility: (shouldShowLogo && !useCustomLogo) ? 'visible' : 'hidden' }} suppressHydrationWarning>EL CENTRO DE TUS REFACCIONES.</span>
                        </div>
                      </ContextualLink>
                    </div>
                    )}
                    <div className="flex-shrink-0 relative">
                      <button onClick={() => { setShowCategoriesMenu(!showCategoriesMenu); setShowMobileMenu(false); }} className="flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                        <MenuIcon className="w-4 h-4" style={{ color: embedColor }} />
                        <span className="hidden sm:inline">Menú</span>
                      </button>
                      {showCategoriesMenu && <CategoriesMenu isOpen={showCategoriesMenu} onClose={() => setShowCategoriesMenu(false)} onCategoryClick={() => setShowCategoriesMenu(false)} />}
                    </div>
                    <div className="flex-1 min-w-0" />
                    {!isAuthenticated ? (
                      <ContextualLink href="/auth/login" className="flex-shrink-0 px-1.5 py-1 rounded flex items-center gap-1 hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                        <PersonIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                        <span className="hidden sm:inline">Ingresar</span>
                      </ContextualLink>
                    ) : (
                      <div className="relative flex-shrink-0">
                        <button onClick={() => setShowUserMenu(!showUserMenu)} className="px-1.5 py-1 rounded flex items-center gap-1 hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                          <AccountCircleIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                          <span className="hidden sm:inline truncate max-w-[64px]">{user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}</span>
                          <ArrowDropDownIcon className="w-3 h-3" style={{ color: embedColor }} />
                        </button>
                        {showUserMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden" onMouseEnter={() => setShowUserMenu(true)} onMouseLeave={() => setShowUserMenu(false)}>
                              <div className="px-5 py-4" style={{ backgroundColor: primaryColor }}><p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: textColorOpacity90 }}>Bienvenido</p><p className="text-base font-bold truncate" style={{ color: textColor }}>{user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}</p>{user?.email && <p className="text-xs truncate mt-1" style={{ color: textColorOpacity80 }}>{user.email}</p>}</div>
                              <div className="py-2">
                                <ContextualLink href="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><HomeIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis direcciones</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                                <ContextualLink href="/orders" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><ReceiptIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis pedidos</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                                <ContextualLink href="/profile?tab=payment" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><CreditCardIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis formas de pago</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                              </div>
                              <div className="border-t border-gray-200" /><div className="py-2"><button onClick={async () => { setShowUserMenu(false); await signOut(); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-medium"><ExitToAppIcon className="w-5 h-5" /><span>Cerrar sesión</span></button></div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className="relative flex-shrink-0" onMouseEnter={() => setShowCartPreview(true)} onMouseLeave={() => setShowCartPreview(false)}>
                      <ContextualLink href={getCartUrl()} className="relative flex items-center gap-1 px-1.5 py-1 rounded hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                        <div className="relative"><ShoppingCartIcon className="w-4 h-4" style={{ color: embedColor }} />{itemCount > 0 && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center bg-red-600 text-white">{itemCount > 99 ? '99+' : itemCount}</span>}</div>
                        {cart && <span className="hidden sm:inline">${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
                      </ContextualLink>
                      {showCartPreview && itemCount > 0 && cart && (
                        <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                          <div className="px-3 py-2" style={{ backgroundColor: primaryColor }}><h3 className="text-xs font-bold" style={{ color: textColor }}>Carrito ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})</h3></div>
                          <div className="max-h-60 overflow-y-auto py-1.5">{cart.items && cart.items.slice(0, 5).map((item) => (<div key={item.id} className="px-3 py-1.5 border-b border-gray-100"><p className="text-xs font-medium text-gray-900 truncate">{item.product_name}</p><span className="text-[11px] text-gray-500">${(parseFloat(String(item.item_subtotal || 0)) + (item.tax_breakdown?.total_tax ? Number(item.tax_breakdown.total_tax) : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>))}{cart.items && cart.items.length > 5 && <p className="px-3 py-0.5 text-[11px] text-gray-500">+{cart.items.length - 5} más</p>}</div>
                          {cart.items && cart.items.length > 0 && (<div className="border-t border-gray-200 px-3 py-2 bg-gray-50"><div className="flex justify-between items-center mb-1.5"><span className="text-xs font-medium text-gray-700">Total:</span><span className="text-xs font-bold text-gray-900">${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div><ContextualLink href={getCartUrl()} onClick={() => setShowCartPreview(false)} className="block w-full text-center py-1.5 rounded text-xs font-semibold hover:opacity-90" style={{ backgroundColor: primaryColor, color: textColor }}>Ver carrito</ContextualLink></div>)}</div>
                      )}
                    </div>
                  </div>
                  <div className="w-full mt-2" ref={searchHistoryRef}>
                    <div className={isSearchDropdownOpen ? 'relative w-full rounded-lg bg-white z-50' : 'relative w-full'}>
                      <form onSubmit={handleSearch} className="relative w-full">
                        <div className="relative w-full">
                          <input type="text" value={searchQuery} onChange={handleSearchInputChange} onFocus={() => setShowSearchHistoryDropdown(true)} onBlur={() => setTimeout(() => { setShowSearchHistoryDropdown(false); setSearchHistoryHighlightIndex(-1); }, 200)} onKeyDown={handleSearchInputKeyDown} placeholder="Buscar..." className={`w-full pl-3 pr-9 py-2 bg-white text-gray-700 placeholder-gray-400 ${isSearchDropdownOpen ? 'rounded-t-lg border border-gray-100 border-b-0' : 'rounded-full border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400'}`} style={{ fontSize: 14, ...(isSearchDropdownOpen ? {} : { boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)' }) }} />
                          {searchQuery ? <button type="button" onClick={clearSearch} className="absolute inset-y-0 right-6 flex items-center text-gray-400 hover:text-gray-600"><CloseIcon className="h-3.5 w-3.5" /></button> : null}
                          <button type="submit" className="absolute inset-y-0 right-0 flex items-center justify-center w-7 h-full rounded-r-full hover:opacity-80 bg-transparent"><SearchIcon className="h-3.5 w-3.5 text-gray-900" /></button>
                        </div>
                        {showSearchHistoryDropdown && searchHistory.length > 0 ? (
                          <div className="absolute left-0 right-0 top-full -mt-px w-full py-0.5 max-h-44 overflow-auto bg-white rounded-b-lg border-x border-b border-gray-100 z-50 shadow-lg">
                            <p className="px-2 py-0.5 text-[10px] font-semibold text-gray-500">Búsquedas recientes</p>
                            {searchHistory.map((item, idx) => (<div key={item} className={`flex items-center gap-1 w-full group ${idx === searchHistoryHighlightIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}><button ref={(el) => { searchHistoryItemRefs.current[idx] = el; }} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchFromHistory(item); }} className={`flex-1 min-w-0 text-left px-2 py-1 text-xs truncate text-gray-700 ${idx === searchHistoryHighlightIndex ? 'text-gray-900' : ''}`}>{item}</button><button type="button" onMouseDown={(e) => handleRemoveSearchFromHistory(e, item)} className="flex-shrink-0 p-0.5 rounded-full text-gray-400 hover:text-gray-600" aria-label="Eliminar búsqueda"><CloseIcon className="h-3 w-3" /></button></div>))}
                            <div className="border-t border-gray-100"><button type="button" onMouseDown={(e) => handleClearSearchHistory(e)} className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"> <DeleteSweepIcon className="h-3 w-3" /> Borrar historial</button></div>
                          </div>
                        ) : null}
                      </form>
                    </div>
                  </div>
                </>
              ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Logo iframe: mostrar si está habilitado o regla excepcional móvil (siempre en móvil aunque esté deshabilitado) */}
                {showEmbedLogo && (
                <div className="flex-shrink-0">
                  <ContextualLink href="/" className="flex items-center hover:opacity-80 transition-opacity">
                    <div className="relative" style={{ width: '104px', height: '31px' }}>
                      {shouldShowLogo ? (
                        useCustomLogo && logoUrl ? (
                          <img
                            src={typeof logoUrl === 'string' ? logoUrl : logoUrl.src}
                            alt={logoAlt}
                            width={104}
                            height={31}
                            className="object-contain"
                            style={{ maxWidth: '104px', maxHeight: '31px', width: 'auto', height: 'auto' }}
                          />
                        ) : (
                          <img
                            src={typeof agoraLogo === 'string' ? agoraLogo : agoraLogo.src}
                            alt="AGORA PARTS"
                            width={104}
                            height={31}
                            className="object-contain"
                            style={{ maxWidth: '104px', maxHeight: '31px', width: 'auto', height: 'auto' }}
                          />
                        )
                      ) : (
                        <div className="bg-transparent" style={{ width: '104px', height: '31px' }} aria-hidden="true" />
                      )}
                      <span
                        className="absolute text-[5px] uppercase tracking-wide whitespace-nowrap"
                        style={{ left: '39px', top: '26px', fontWeight: 600, color: embedColor, visibility: (shouldShowLogo && !useCustomLogo) ? 'visible' : 'hidden' }}
                        suppressHydrationWarning
                      >
                        EL CENTRO DE TUS REFACCIONES.
                      </span>
                    </div>
                  </ContextualLink>
                </div>
                )}

                {/* Menú categorías */}
                <div className="flex-shrink-0 relative">
                  <button
                    onClick={() => { setShowCategoriesMenu(!showCategoriesMenu); setShowMobileMenu(false); }}
                    className="flex items-center gap-1 transition-colors hover:opacity-80"
                    style={{ color: embedColor, ...embedTextStyle }}
                  >
                    <MenuIcon className="w-4 h-4" style={{ color: embedColor }} />
                    <span className="hidden sm:inline">Menú</span>
                  </button>
                  {showCategoriesMenu && (
                    <CategoriesMenu isOpen={showCategoriesMenu} onClose={() => setShowCategoriesMenu(false)} onCategoryClick={() => setShowCategoriesMenu(false)} />
                  )}
                </div>

                {/* Vehículo */}
                {isClient && isVehicleLoaded && currentVehicle ? (
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="hidden md:flex items-center gap-1 text-left rounded px-1.5 py-1 transition-colors min-w-0 max-w-[160px] hover:opacity-80"
                    style={{ color: embedColor, ...embedTextStyle }}
                  >
                    <DirectionsCarIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: embedColor }} />
                    <span className="truncate">{currentVehicle.nickname || `${currentVehicle.brand_name || ''} ${currentVehicle.model_name || ''}`.trim() || 'Mi Vehículo'}</span>
                  </button>
                ) : isClient && isVehicleLoaded ? (
                  <button onClick={() => setShowVehicleSelector(true)} className="hidden md:flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                    <DirectionsCarIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                    <span>Vehículo</span>
                  </button>
                ) : null}

                {/* Buscador desktop iframe: en línea */}
                <div className="flex-1 min-w-0 mx-2 sm:mx-3" ref={searchHistoryRef}>
                  <div className={isSearchDropdownOpen ? 'relative w-full rounded-lg bg-white z-50' : 'relative w-full'}>
                    <form onSubmit={handleSearch} className="relative w-full">
                      <div className="relative w-full">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={handleSearchInputChange}
                          onFocus={() => setShowSearchHistoryDropdown(true)}
                          onBlur={() => setTimeout(() => { setShowSearchHistoryDropdown(false); setSearchHistoryHighlightIndex(-1); }, 200)}
                          onKeyDown={handleSearchInputKeyDown}
                          placeholder="Buscar..."
                          className={`w-full pl-3 pr-9 py-2 bg-white text-gray-700 placeholder-gray-400 ${isSearchDropdownOpen ? 'rounded-t-lg border border-gray-100 border-b-0' : 'rounded-full border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400'}`}
                          style={{ fontSize: 14, ...(isSearchDropdownOpen ? {} : { boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)' }) }}
                        />
                        {searchQuery ? (
                          <button type="button" onClick={clearSearch} className="absolute inset-y-0 right-6 flex items-center text-gray-400 hover:text-gray-600">
                            <CloseIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button type="submit" className="absolute inset-y-0 right-0 flex items-center justify-center w-7 h-full rounded-r-full hover:opacity-80 bg-transparent">
                          <SearchIcon className="h-3.5 w-3.5 text-gray-900" />
                        </button>
                      </div>
                      {showSearchHistoryDropdown && searchHistory.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full -mt-px w-full py-0.5 max-h-44 overflow-auto bg-white rounded-b-lg border-x border-b border-gray-100 z-50 shadow-lg">
                          <p className="px-2 py-0.5 text-[10px] font-semibold text-gray-500">Búsquedas recientes</p>
                          {searchHistory.map((item, idx) => (
                            <div key={item} className={`flex items-center gap-1 w-full group ${idx === searchHistoryHighlightIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>
                              <button ref={(el) => { searchHistoryItemRefs.current[idx] = el; }} type="button" onMouseDown={(e) => { e.preventDefault(); handleSearchFromHistory(item); }} className={`flex-1 min-w-0 text-left px-2 py-1 text-xs truncate text-gray-700 ${idx === searchHistoryHighlightIndex ? 'text-gray-900' : ''}`}>{item}</button>
                              <button type="button" onMouseDown={(e) => handleRemoveSearchFromHistory(e, item)} className="flex-shrink-0 p-0.5 rounded-full text-gray-400 hover:text-gray-600" aria-label="Eliminar búsqueda"><CloseIcon className="h-3 w-3" /></button>
                            </div>
                          ))}
                          <div className="border-t border-gray-100">
                            <button type="button" onMouseDown={(e) => handleClearSearchHistory(e)} className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"> <DeleteSweepIcon className="h-3 w-3" /> Borrar historial</button>
                          </div>
                        </div>
                      ) : null}
                    </form>
                  </div>
                </div>

                {/* Grupo derecho: Navegar, Usuario, Carrito (iframe sin botón sucursal) */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
                {/* Navegar - oculto en iframe / embed */}
                {showNavegarButton && (
                <button onClick={() => setShowNavigationDialog(true)} className="flex-shrink-0 px-1.5 py-1 rounded flex items-center gap-1 hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                  <BusinessIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                  <span className="hidden sm:inline">Navegar</span>
                </button>
                )}

                {/* Usuario */}
                {!isAuthenticated ? (
                  <ContextualLink href="/auth/login" className="flex-shrink-0 px-1.5 py-1 rounded flex items-center gap-1 hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                    <PersonIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                    <span className="hidden sm:inline">Ingresar</span>
                  </ContextualLink>
                ) : (
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="px-1.5 py-1 rounded flex items-center gap-1 hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                      <AccountCircleIcon className="w-3.5 h-3.5" style={{ color: embedColor }} />
                      <span className="hidden sm:inline truncate max-w-[64px]">{user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}</span>
                      <ArrowDropDownIcon className="w-3 h-3" style={{ color: embedColor }} />
                    </button>
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden" onMouseEnter={() => setShowUserMenu(true)} onMouseLeave={() => setShowUserMenu(false)}>
                          <div className="px-5 py-4" style={{ backgroundColor: primaryColor }}>
                            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: textColorOpacity90 }}>Bienvenido</p>
                            <p className="text-base font-bold truncate" style={{ color: textColor }}>{user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}</p>
                            {user?.email && <p className="text-xs truncate mt-1" style={{ color: textColorOpacity80 }}>{user.email}</p>}
                          </div>
                          <div className="py-2">
                            <ContextualLink href="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><HomeIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis direcciones</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                            <ContextualLink href="/orders" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><ReceiptIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis pedidos</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                            <ContextualLink href="/profile?tab=payment" onClick={() => setShowUserMenu(false)} className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50"><div className="flex items-center gap-3"><CreditCardIcon className="w-5 h-5 text-gray-400" /><span className="font-medium">Mis formas de pago</span></div><KeyboardArrowRightIcon className="w-4 h-4 text-gray-300" /></ContextualLink>
                          </div>
                          <div className="border-t border-gray-200" />
                          <div className="py-2">
                            <button onClick={async () => { setShowUserMenu(false); await signOut(); }} className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-medium"><ExitToAppIcon className="w-5 h-5" /><span>Cerrar sesión</span></button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Carrito */}
                <div className="relative flex-shrink-0" onMouseEnter={() => setShowCartPreview(true)} onMouseLeave={() => setShowCartPreview(false)}>
                  <ContextualLink href={getCartUrl()} className="relative flex items-center gap-1 px-1.5 py-1 rounded hover:opacity-80" style={{ color: embedColor, ...embedTextStyle }}>
                    <div className="relative">
                      <ShoppingCartIcon className="w-4 h-4" style={{ color: embedColor }} />
                      {itemCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold rounded-full min-w-[12px] h-[12px] flex items-center justify-center bg-red-600 text-white">{itemCount > 99 ? '99+' : itemCount}</span>
                      )}
                    </div>
                    {cart && <span className="hidden sm:inline">${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
                  </ContextualLink>
                  {showCartPreview && itemCount > 0 && cart && (
                    <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="px-3 py-2" style={{ backgroundColor: primaryColor }}><h3 className="text-xs font-bold" style={{ color: textColor }}>Carrito ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})</h3></div>
                      <div className="max-h-60 overflow-y-auto py-1.5">
                        {cart.items && cart.items.slice(0, 5).map((item) => (
                          <div key={item.id} className="px-3 py-1.5 border-b border-gray-100">
                            <p className="text-xs font-medium text-gray-900 truncate">{item.product_name}</p>
                            <span className="text-[11px] text-gray-500">${(parseFloat(String(item.item_subtotal || 0)) + (item.tax_breakdown?.total_tax ? Number(item.tax_breakdown.total_tax) : 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        {cart.items && cart.items.length > 5 && <p className="px-3 py-0.5 text-[11px] text-gray-500">+{cart.items.length - 5} más</p>}
                      </div>
                      {cart.items && cart.items.length > 0 && (
                        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
                          <div className="flex justify-between items-center mb-1.5"><span className="text-xs font-medium text-gray-700">Total:</span><span className="text-xs font-bold text-gray-900">${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                          <ContextualLink href={getCartUrl()} onClick={() => setShowCartPreview(false)} className="block w-full text-center py-1.5 rounded text-xs font-semibold hover:opacity-90" style={{ backgroundColor: primaryColor, color: textColor }}>Ver carrito</ContextualLink>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>
              )}
            </div>
          </div>
        ) : !isCompactHeader ? (
          <>
            {/* Primera fila: Logo y acciones de usuario */}
            <div style={{ backgroundColor: primaryColor, borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-full px-6 py-4">
                <div className="flex items-center justify-between">
              {/* Logo y nombre de tienda */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <ContextualLink href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity" style={{}}>
                  <div className="relative" style={{ width: '128px', height: '38px' }}>
                    {/* CRÍTICO: El servidor y el cliente deben renderizar EXACTAMENTE lo mismo */}
                    {/* En el servidor y en la primera renderización del cliente: SIEMPRE logo por defecto */}
                    {/* Solo después de la hidratación se puede cambiar */}
                    {shouldShowLogo ? (
                      useCustomLogo && logoUrl ? (
                        <img
                          src={typeof logoUrl === 'string' ? logoUrl : logoUrl.src}
                          alt={logoAlt}
                          width={128}
                          height={38}
                          className="object-contain"
                          style={{ maxWidth: '128px', maxHeight: '38px', width: 'auto', height: 'auto' }}
                        />
                      ) : (
                        <img
                          src={typeof agoraLogo === 'string' ? agoraLogo : agoraLogo.src}
                          alt="AGORA PARTS"
                          width={128}
                          height={38}
                          className="object-contain"
                          style={{ maxWidth: '128px', maxHeight: '38px', width: 'auto', height: 'auto' }}
                        />
                      )
                    ) : (
                      // Placeholder - solo se muestra después de la hidratación si está cargando
                      <div 
                        className="bg-transparent"
                        style={{ width: '128px', height: '38px' }}
                        aria-hidden="true"
                      />
                    )}
                    {/* Span - SIEMPRE presente en el DOM sin condiciones para mantener estructura consistente */}
                    {/* Solo cambia su visibilidad después de la hidratación */}
                    <span 
                      className="absolute text-[6px] text-white uppercase tracking-wide whitespace-nowrap" 
                      style={{ 
                        left: '48px', 
                        top: '33px', 
                        fontWeight: 600,
                        // En servidor y primera renderización: visible (useCustomLogo = false, shouldShowLogo = true)
                        // Después de hidratación: oculto solo si hay branding o si no se muestra el logo
                        visibility: (shouldShowLogo && !useCustomLogo) ? 'visible' : 'hidden'
                      }}
                      suppressHydrationWarning
                    >
                      EL CENTRO DE TUS REFACCIONES.
                    </span>
                  </div>
                </ContextualLink>
              </div>

              {/* Acciones de usuario */}
              <div className="flex items-center gap-2 flex-shrink-0">
                
                {/* Botón Navegar - oculto en iframe / embed */}
                {showNavegarButton && (
                <button
                  onClick={() => setShowNavigationDialog(true)}
                  className="px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 hover:opacity-80"
                  style={{ color: textColor }}
                >
                  <BusinessIcon className="w-5 h-5" style={{ color: textColor }} />
                  <span className="hidden sm:inline">Navegar</span>
                </button>
                )}

                {/* Sección de Usuario */}
                {!isAuthenticated ? (
                  <ContextualLink 
                    href="/auth/login" 
                    className="px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <PersonIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="hidden sm:inline">Ingresar</span>
                  </ContextualLink>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      onMouseEnter={(e) => {
                        setShowUserMenu(true);
                        e.currentTarget.style.backgroundColor = hoverBgColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 group"
                      style={{ color: textColor }}
                    >
                      <div className="flex items-center gap-2">
                        <AccountCircleIcon className="w-5 h-5" style={{ color: textColorOpacity90 }} />
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span style={{ color: textColorOpacity80 }}>
                            Hola,
                          </span>
                          <span className="text-sm font-semibold" style={{ color: textColor }}>
                            {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                          </span>
                        </div>
                      </div>
                      <ArrowDropDownIcon className="w-4 h-4 transition-transform" style={{ color: textColorOpacity80 }} />
                    </button>
                    
                    {showUserMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowUserMenu(false)}
                          onMouseLeave={() => setShowUserMenu(false)}
                        />
                        <div 
                          className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                          onMouseEnter={() => setShowUserMenu(true)}
                          onMouseLeave={() => setShowUserMenu(false)}
                        >
                          {/* Header del menú */}
                          <div className="px-5 py-4" style={{ backgroundColor: primaryColor }}>
                            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: textColorOpacity90 }}>
                              Bienvenido
                            </p>
                            <p className="text-base font-bold truncate" style={{ color: textColor }}>
                              {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                            </p>
                            {user?.email && (
                              <p className="text-xs truncate mt-1" style={{ color: textColorOpacity80 }}>
                                {user.email}
                              </p>
                            )}
                          </div>
                          
                          {/* Opciones del menú */}
                          <div className="py-2">
                            <ContextualLink
                              href="/profile"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <HomeIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                <span className="font-medium">Mis direcciones</span>
                              </div>
                              <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                            </ContextualLink>
                            
                            <ContextualLink
                              href="/orders"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <ReceiptIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                <span className="font-medium">Mis pedidos</span>
                              </div>
                              <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                            </ContextualLink>
                            
                            <ContextualLink
                              href="/profile?tab=payment"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <CreditCardIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                <span className="font-medium">Mis formas de pago</span>
                              </div>
                              <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                            </ContextualLink>
                          </div>
                          
                          {/* Separador */}
                          <div className="border-t border-gray-200" />
                          
                          {/* Botón salir */}
                          <div className="py-2">
                            <button
                              onClick={async () => {
                                setShowUserMenu(false);
                                await signOut();
                              }}
                              className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                            >
                              <ExitToAppIcon className="w-5 h-5" />
                              <span>Cerrar sesión</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Carrito con preview */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowCartPreview(true)}
                  onMouseLeave={() => setShowCartPreview(false)}
                >
                  <ContextualLink 
                    href={getCartUrl()} 
                    className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap group hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <div className="relative">
                      <ShoppingCartIcon className="w-6 h-6 transition-colors" style={{ color: textColor }} />
                      {itemCount > 0 && (
                        <span 
                          className="absolute -top-1.5 -right-1.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md bg-red-600 text-white"
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs" style={{ color: textColorOpacity80 }}>
                        Carrito
                      </span>
                      {cart && (
                        <span className="text-sm font-semibold" style={{ color: textColor }}>
                          ${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </ContextualLink>
                  
                  {/* Preview del carrito */}
                  {showCartPreview && itemCount > 0 && cart && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="px-5 py-4" style={{ backgroundColor: primaryColor }}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold" style={{ color: textColor }}>
                            Tu carrito ({itemCount} {itemCount === 1 ? 'artículo' : 'artículos'})
                          </h3>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {cart.items && cart.items.length > 0 ? (
                          <div className="py-2">
                            {cart.items.slice(0, 5).map((item) => (
                              <div key={item.id} className="px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {item.product_name}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-xs text-gray-500">
                                        Total producto
                                      </span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        ${(
                                          parseFloat(String(item.item_subtotal || 0)) +
                                          (item.tax_breakdown?.total_tax ? Number(item.tax_breakdown.total_tax) : 0)
                                        ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            {cart.items.length > 5 && (
                              <div className="px-5 py-2 text-center">
                                <p className="text-xs text-gray-500">
                                  y {cart.items.length - 5} {cart.items.length - 5 === 1 ? 'artículo más' : 'artículos más'}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-5 py-8 text-center">
                            <ShoppingCartIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Tu carrito está vacío</p>
                          </div>
                        )}
                      </div>
                      
                      {cart.items && cart.items.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 px-5 py-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">Total:</span>
                              <span className="text-lg font-bold text-gray-900">
                                ${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <ContextualLink
                              href={getCartUrl()}
                              onClick={() => setShowCartPreview(false)}
                              className="block w-full text-center py-2.5 rounded-md font-semibold hover:opacity-90 transition-opacity"
                              style={{ backgroundColor: primaryColor, color: textColor }}
                            >
                              Ver carrito completo
                            </ContextualLink>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
                </div>
              </div>
            </div>

            {/* Segunda fila: Menú, buscador, selector de vehículo y tienda */}
            <div style={{ backgroundColor: primaryColor, borderTop: `1px solid ${borderColor}` }}>
              <div className="w-full px-6 py-3">
                <div className="flex items-center gap-4">
              {/* Grupo izquierdo: Menú y selector de vehículo */}
              <div className="flex items-center gap-4 flex-shrink-0 relative">
                <button
                  onClick={() => {
                    setShowCategoriesMenu(!showCategoriesMenu);
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center gap-2 transition-colors relative hover:opacity-80"
                  style={{ color: textColor }}
                >
                  <MenuIcon className="w-6 h-6" style={{ color: textColor }} />
                  <span className="hidden sm:inline text-sm font-medium">Menú</span>
                </button>
                
                {/* Menú de categorías flotante lateral izquierdo */}
                {showCategoriesMenu && (
                  <CategoriesMenu 
                    isOpen={showCategoriesMenu}
                    onClose={() => setShowCategoriesMenu(false)}
                    onCategoryClick={() => setShowCategoriesMenu(false)} 
                  />
                )}

                {isClient && isVehicleLoaded && currentVehicle ? (
                  <button 
                    onClick={() => setShowVehicleSelector(true)}
                    className="hidden md:flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[200px] max-w-[280px] hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <span className="flex-shrink-0">
                      <DirectionsCarIcon className="w-5 h-5" style={{ color: textColor }} />
                    </span>
                    <span className="flex-1 min-w-0 inline-block">
                      <span className="block text-xs font-semibold truncate leading-tight mb-0.5 uppercase" style={{ color: textColor }}>
                        {currentVehicle.nickname || `${currentVehicle.brand_name || ''} ${currentVehicle.model_name || ''}`.trim() || 'Mi Vehículo'}
                      </span>
                      <span className="block text-xs truncate leading-tight" style={{ color: textColorOpacity80 }}>
                        {currentVehicle.brand_name}
                        {currentVehicle.model_name && ` ${currentVehicle.model_name}`}
                        {currentVehicle.year_start && ` ${currentVehicle.year_start}`}
                        {currentVehicle.year_end && `-${currentVehicle.year_end}`}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-lg" style={{ color: textColorOpacity80 }}>→</span>
                  </button>
                ) : isClient && isVehicleLoaded ? (
                  <button 
                    onClick={() => setShowVehicleSelector(true)}
                    className="hidden md:flex items-center gap-2 transition-colors hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <DirectionsCarIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="text-sm font-medium">Agregar Vehículo</span>
                    <span style={{ color: textColorOpacity80 }}>→</span>
                  </button>
                ) : null}
              </div>

              {/* Barra de búsqueda - Dropdown flotante; un solo borde (input + dropdown) */}
              <div className="flex-1 min-w-0 px-4" ref={searchHistoryRef}>
                <div className={isSearchDropdownOpen ? 'relative w-full rounded-2xl bg-white z-50' : 'relative w-full'}>
                  <form onSubmit={handleSearch} className="relative w-full">
                    <div className="relative w-full">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        onFocus={() => setShowSearchHistoryDropdown(true)}
                        onBlur={() => setTimeout(() => { setShowSearchHistoryDropdown(false); setSearchHistoryHighlightIndex(-1); }, 200)}
                        onKeyDown={handleSearchInputKeyDown}
                        placeholder="Buscar por nombre o número de parte"
                        className={`w-full pl-6 pr-14 py-3 bg-white text-gray-700 placeholder-gray-400 font-sans text-base ${isSearchDropdownOpen ? 'rounded-t-2xl border border-gray-100 border-b-0 shadow-none focus:outline-none focus:ring-0 focus:border-gray-100' : 'rounded-full border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400'}`}
                        style={isSearchDropdownOpen ? undefined : { boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)' }}
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute inset-y-0 right-12 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <CloseIcon className="h-5 w-5" />
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full rounded-r-full hover:opacity-80 transition-opacity bg-transparent"
                      >
                        <SearchIcon className="h-5 w-5 text-gray-900" />
                      </button>
                    </div>
                    {showSearchHistoryDropdown && searchHistory.length > 0 ? (
                      <div className="absolute left-0 right-0 top-full -mt-px w-full py-1 max-h-60 overflow-auto bg-white rounded-b-2xl border-x border-b border-gray-100 z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]">
                        <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 tracking-wide">Búsquedas recientes</p>
                        {searchHistory.map((item, idx) => (
                          <div
                            key={item}
                            className={`flex items-center gap-1 w-full group ${idx === searchHistoryHighlightIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                          >
                            <button
                              ref={(el) => { searchHistoryItemRefs.current[idx] = el; }}
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleSearchFromHistory(item); }}
                              className={`flex-1 min-w-0 text-left px-3 py-2 text-sm truncate text-gray-700 ${idx === searchHistoryHighlightIndex ? 'text-gray-900' : ''}`}
                            >
                              {item}
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => handleRemoveSearchFromHistory(e, item)}
                              className="flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/80 transition-colors"
                              aria-label="Eliminar búsqueda"
                            >
                              <CloseIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {searchHistory.length > 0 ? (
                          <div className="border-t border-gray-100 mt-0.5">
                            <button
                              type="button"
                              onMouseDown={(e) => handleClearSearchHistory(e)}
                              className="w-full flex items-center justify-start gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            >
                              <DeleteSweepIcon className="h-3.5 w-3.5" />
                              Borrar historial
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </form>
                </div>
              </div>

              {/* Información de tienda seleccionada - Alineado a la derecha */}
              <div className="flex-shrink-0">
                {isClient && storeInfo ? (
                  <button
                    onClick={() => setShowStoreSelector(true)}
                    className="hidden lg:flex items-start gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[240px] max-w-[320px] hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      <CheckCircleIcon className="w-5 h-5" style={{ color: textColor }} />
                    </span>
                    <span className="flex-1 min-w-0 inline-block">
                      <span className="block text-xs font-semibold truncate leading-tight mb-0.5" style={{ color: textColor }}>
                        {storeInfo.name}
                      </span>
                      {storeInfo.address && (
                        <span className="block text-xs truncate leading-tight" style={{ color: textColorOpacity80 }}>
                          {storeInfo.address}
                        </span>
                      )}
                      <span className="block text-xs font-semibold leading-tight mt-1" style={{ color: storeInfo.isOpen ? textColor : textColorOpacity80 }}>
                        {storeInfo.isOpen ? 'ABIERTO' : `CERRADO Hasta ${storeInfo.nextOpenTime}`}
                      </span>
                    </span>
                    <span className="flex-shrink-0 text-lg" style={{ color: textColorOpacity80 }}>→</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStoreSelector(true)}
                    className="hidden lg:flex items-center gap-2 transition-colors whitespace-nowrap hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <LocationOnIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="text-sm font-medium">Seleccionar Tienda</span>
                    <span className="text-lg" style={{ color: textColorOpacity80 }}>→</span>
                  </button>
                )}
              </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ backgroundColor: primaryColor, borderBottom: `1px solid ${borderColor}` }}>
            <div className="w-full px-6 py-2">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <ContextualLink href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="relative" style={{ width: '110px', height: '32px' }}>
                      {shouldShowLogo ? (
                        useCustomLogo && logoUrl ? (
                          <img
                            src={typeof logoUrl === 'string' ? logoUrl : logoUrl.src}
                            alt={logoAlt}
                            width={110}
                            height={32}
                            className="object-contain"
                            style={{ maxWidth: '110px', maxHeight: '32px', width: 'auto', height: 'auto' }}
                          />
                        ) : (
                          <img
                            src={typeof agoraLogo === 'string' ? agoraLogo : agoraLogo.src}
                            alt="AGORA PARTS"
                            width={110}
                            height={32}
                            className="object-contain"
                            style={{ maxWidth: '110px', maxHeight: '32px', width: 'auto', height: 'auto' }}
                          />
                        )
                      ) : (
                        <div className="bg-transparent" style={{ width: '110px', height: '32px' }} aria-hidden="true" />
                      )}
                    </div>
                  </ContextualLink>
                </div>

                {/* Menú y vehículo */}
                <div className="flex items-center gap-4 flex-shrink-0 relative">
                  <button
                    onClick={() => {
                      setShowCategoriesMenu(!showCategoriesMenu);
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-2 transition-colors hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <MenuIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="hidden md:inline text-sm font-medium">Menú</span>
                  </button>
                  {showCategoriesMenu && (
                    <CategoriesMenu
                      isOpen={showCategoriesMenu}
                      onClose={() => setShowCategoriesMenu(false)}
                      onCategoryClick={() => setShowCategoriesMenu(false)}
                    />
                  )}

                  {isClient && isVehicleLoaded && currentVehicle ? (
                    <button
                      onClick={() => setShowVehicleSelector(true)}
                      className="hidden lg:flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[180px] max-w-[240px] hover:opacity-80"
                      style={{ color: textColor }}
                    >
                      <DirectionsCarIcon className="w-5 h-5" style={{ color: textColor }} />
                      <span className="text-xs font-semibold truncate">
                        {currentVehicle.nickname || `${currentVehicle.brand_name || ''} ${currentVehicle.model_name || ''}`.trim() || 'Mi Vehículo'}
                      </span>
                    </button>
                  ) : isClient && isVehicleLoaded ? (
                    <button
                      onClick={() => setShowVehicleSelector(true)}
                      className="hidden lg:flex items-center gap-2 transition-colors hover:opacity-80"
                      style={{ color: textColor }}
                    >
                      <DirectionsCarIcon className="w-5 h-5" style={{ color: textColor }} />
                      <span className="text-sm font-medium">Agregar Vehículo</span>
                    </button>
                  ) : null}
                </div>

                {/* Buscador - Dropdown flotante; un solo borde (input + dropdown) */}
                <div className="flex-1 min-w-0 relative">
                  <div className={isSearchDropdownOpen ? 'relative w-full rounded-2xl bg-white z-50' : 'relative w-full'}>
                    <form onSubmit={handleSearch} className="relative w-full">
                      <div className="relative w-full">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={handleSearchInputChange}
                          onFocus={() => setShowSearchHistoryDropdown(true)}
                          onBlur={() => setTimeout(() => { setShowSearchHistoryDropdown(false); setSearchHistoryHighlightIndex(-1); }, 200)}
                          onKeyDown={handleSearchInputKeyDown}
                          placeholder="Buscar por nombre o número de parte"
                          className={`w-full pl-6 pr-12 py-2.5 bg-white text-gray-700 placeholder-gray-400 font-sans text-sm ${isSearchDropdownOpen ? 'rounded-t-2xl border border-gray-100 border-b-0 shadow-none focus:outline-none focus:ring-0 focus:border-gray-100' : 'rounded-full border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400'}`}
                          style={isSearchDropdownOpen ? undefined : { boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)' }}
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute inset-y-0 right-10 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <CloseIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          className="absolute inset-y-0 right-0 flex items-center justify-center w-10 h-full rounded-r-full hover:opacity-80 transition-opacity bg-transparent"
                        >
                          <SearchIcon className="h-4 w-4 text-gray-900" />
                        </button>
                      </div>
                      {showSearchHistoryDropdown && searchHistory.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full -mt-px w-full py-1 max-h-60 overflow-auto bg-white rounded-b-2xl border-x border-b border-gray-100 z-50 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]">
                          <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 tracking-wide">Búsquedas recientes</p>
                          {searchHistory.map((item, idx) => (
                            <div
                              key={item}
                              className={`flex items-center gap-1 w-full group ${idx === searchHistoryHighlightIndex ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                            >
                              <button
                                ref={(el) => { searchHistoryItemRefs.current[idx] = el; }}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleSearchFromHistory(item); }}
                                className={`flex-1 min-w-0 text-left px-3 py-2 text-sm truncate text-gray-700 ${idx === searchHistoryHighlightIndex ? 'text-gray-900' : ''}`}
                              >
                                {item}
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => handleRemoveSearchFromHistory(e, item)}
                                className="flex-shrink-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200/80 transition-colors"
                                aria-label="Eliminar búsqueda"
                              >
                                <CloseIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {searchHistory.length > 0 ? (
                            <div className="border-t border-gray-100 mt-0.5">
                              <button
                                type="button"
                                onMouseDown={(e) => handleClearSearchHistory(e)}
                                className="w-full flex items-center justify-start gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              >
                                <DeleteSweepIcon className="h-3.5 w-3.5" />
                                Borrar historial
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </form>
                  </div>
                </div>

                {/* Tienda */}
                <div className="flex-shrink-0">
                  {isClient && storeInfo ? (
                    <button
                      onClick={() => setShowStoreSelector(true)}
                      className="hidden xl:flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[200px] max-w-[260px] hover:opacity-80"
                      style={{ color: textColor }}
                    >
                      <CheckCircleIcon className="w-5 h-5" style={{ color: textColor }} />
                      <span className="text-xs font-semibold truncate">{storeInfo.name}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowStoreSelector(true)}
                      className="hidden xl:flex items-center gap-2 transition-colors whitespace-nowrap hover:opacity-80"
                      style={{ color: textColor }}
                    >
                      <LocationOnIcon className="w-5 h-5" style={{ color: textColor }} />
                      <span className="text-sm font-medium">Seleccionar Tienda</span>
                    </button>
                  )}
                </div>

                {/* Acciones usuario y carrito */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {showNavegarButton && (
                  <button
                    onClick={() => setShowNavigationDialog(true)}
                    className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <BusinessIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="hidden xl:inline">Navegar</span>
                  </button>
                  )}

                  {!isAuthenticated ? (
                    <ContextualLink
                      href="/auth/login"
                      className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 hover:opacity-80"
                      style={{ color: textColor }}
                    >
                      <PersonIcon className="w-5 h-5" style={{ color: textColor }} />
                      <span className="hidden xl:inline">Ingresar</span>
                    </ContextualLink>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 group"
                        style={{ color: textColor }}
                      >
                        <AccountCircleIcon className="w-5 h-5" style={{ color: textColorOpacity90 }} />
                        <ArrowDropDownIcon className="w-4 h-4" style={{ color: textColorOpacity80 }} />
                      </button>
                      {showUserMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowUserMenu(false)}
                            onMouseLeave={() => setShowUserMenu(false)}
                          />
                          <div
                            className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
                            onMouseEnter={() => setShowUserMenu(true)}
                            onMouseLeave={() => setShowUserMenu(false)}
                          >
                            <div className="px-5 py-4" style={{ backgroundColor: primaryColor }}>
                              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: textColorOpacity90 }}>
                                Bienvenido
                              </p>
                              <p className="text-base font-bold truncate" style={{ color: textColor }}>
                                {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                              </p>
                              {user?.email && (
                                <p className="text-xs truncate mt-1" style={{ color: textColorOpacity80 }}>
                                  {user.email}
                                </p>
                              )}
                            </div>
                            <div className="py-2">
                              <ContextualLink
                                href="/profile"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <HomeIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                  <span className="font-medium">Mis direcciones</span>
                                </div>
                                <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                              </ContextualLink>
                              <ContextualLink
                                href="/orders"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <ReceiptIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                  <span className="font-medium">Mis pedidos</span>
                                </div>
                                <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                              </ContextualLink>
                              <ContextualLink
                                href="/profile?tab=payment"
                                onClick={() => setShowUserMenu(false)}
                                className="flex items-center justify-between px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <CreditCardIcon className="w-5 h-5 text-gray-400 group-hover:text-toyota-red transition-colors" />
                                  <span className="font-medium">Mis formas de pago</span>
                                </div>
                                <KeyboardArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-toyota-red transition-colors" />
                              </ContextualLink>
                            </div>
                            <div className="border-t border-gray-200" />
                            <div className="py-2">
                              <button
                                onClick={async () => {
                                  setShowUserMenu(false);
                                  await signOut();
                                }}
                                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                              >
                                <ExitToAppIcon className="w-5 h-5" />
                                <span>Cerrar sesión</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <ContextualLink
                    href={getCartUrl()}
                    className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap hover:opacity-80"
                    style={{ color: textColor }}
                  >
                    <div className="relative">
                      <ShoppingCartIcon className="w-6 h-6" style={{ color: textColor }} />
                      {itemCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md bg-red-600 text-white"
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </div>
                  </ContextualLink>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menú móvil desplegable */}
        {showMobileMenu && (
          <div className="bg-white border-t border-toyota-gray-light lg:hidden">
            <div className="w-full px-4 py-4">
              <nav className="flex flex-col gap-3">
                <ContextualLink 
                  href="/" 
                  className="text-toyota-gray hover:text-black transition-colors font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Inicio
                </ContextualLink>
                <ContextualLink 
                  href={contextType === 'global' ? '/products' : `/${contextType}/${router.query.slug}/products`}
                  className="text-toyota-gray hover:text-black transition-colors font-medium"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Productos
                </ContextualLink>
                {!storeInfo && (
                  <button
                    onClick={() => {
                      setShowStoreSelector(true);
                      setShowMobileMenu(false);
                    }}
                    className="text-left text-toyota-gray hover:text-black transition-colors font-medium flex items-center gap-2"
                  >
                    <LocationOnIcon className="w-5 h-5" />
                    Seleccionar Tienda
                  </button>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Panel de tienda (lateral derecho) */}
      <StoreMenu
        isOpen={showStoreSelector}
        onClose={() => setShowStoreSelector(false)}
      />
      
      {/* Diálogo de navegación */}
      <NavigationDialog
        open={showNavigationDialog}
        onClose={() => setShowNavigationDialog(false)}
      />
      
      {/* Panel de vehículos (lateral derecho) */}
      <VehicleMenu
        isOpen={showVehicleSelector}
        onClose={() => {
          setShowVehicleSelector(false);
          // Solo recargar vehículo desde localStorage, no hacer peticiones al backend
          // El vehículo seleccionado ya se actualizó a través de onVehicleSelected
          const selected = getSelectedVehicle();
          setCurrentVehicle(selected);
        }}
        onVehicleSelected={async (vehicle) => {
          if (vehicle === null) {
            // Si se deseleccionó el vehículo, solo limpiar la selección local sin hacer peticiones
            setCurrentVehicle(null);
            setSelectedVehicle(null);
            // Disparar evento para que otros componentes sepan que el vehículo cambió
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vehicle-selected', { detail: null }));
            }
            return;
          }
          
          // Verificar si el vehículo es de la cuenta (tiene id) o local (no tiene id)
          const isAccountVehicle = 'id' in vehicle;
          
          if (isAuthenticated && isAccountVehicle) {
            // Si está autenticado y seleccionó un vehículo de la cuenta
            // El vehículo ya fue establecido como predeterminado en VehicleMenu
            // Solo actualizar el estado local con el vehículo seleccionado
            setCurrentVehicle(vehicle);
            setSelectedVehicle(vehicle);
          } else {
            // Si es un vehículo local (sin sesión o vehículo local con sesión)
            // Usar el vehículo seleccionado directamente, NO recargar el predeterminado
            setCurrentVehicle(vehicle);
            setSelectedVehicle(vehicle);
          }
          
          // Disparar evento para que otros componentes sepan que el vehículo cambió
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('vehicle-selected', { detail: vehicle }));
          }
        }}
      />
    </>
  );
}

