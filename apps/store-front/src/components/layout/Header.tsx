/**
 * Header principal del store-front
 * Diseño inspirado en Toyota con paleta de colores oficial
 */

import React, { useState, useEffect, useRef } from 'react';
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
import StoreMenu from '../StoreMenu';
import NavigationDialog from '../NavigationDialog';
import CategoriesMenu from '../CategoriesMenu';
import VehicleMenu from '../VehicleMenu';
import { getStoredVehicle, getSelectedVehicle, setSelectedVehicle } from '@/lib/vehicle-storage';
import { userVehiclesService, UserVehicle } from '@/lib/user-vehicles';

export default function Header() {
  const router = useRouter();
  const { 
    contextType, 
    branchData,
    groupId,
    branchId,
    getStoreName,
  } = useStoreContext();
  const { isAuthenticated, user, signOut } = useAuth();
  const { itemCount, cart } = useCart();
  const { getCartUrl } = useStoreRouting();
  const [searchQuery, setSearchQuery] = useState('');
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
  
  // Función helper para obtener el color guardado
  const getStoredPrimaryColor = (branchId?: string | null, groupId?: string | null): string | null => {
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
    } catch (error) {
      console.error('Error leyendo color primario guardado:', error);
    }
    return null;
  };

  // Función helper para guardar el color primario
  const savePrimaryColor = (color: string, branchId?: string | null, groupId?: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (branchId) {
        localStorage.setItem(`branding_primary_${branchId}`, color);
      } else if (groupId) {
        localStorage.setItem(`branding_primary_group_${groupId}`, color);
      }
    } catch (error) {
      console.error('Error guardando color primario:', error);
    }
  };
  const [currentVehicle, setCurrentVehicle] = useState<UserVehicle | any | null>(null);
  const [isVehicleLoaded, setIsVehicleLoaded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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
      // Si no hay contexto de tienda, no cargar branding (mostrar logo de Agora)
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
  }, [contextType, groupId, branchId]);

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
  
  // Obtener color primario del branding, o usar color por defecto
  // CRÍTICO: Solo usar color personalizado DESPUÉS de la hidratación para evitar diferencias
  // entre servidor y cliente causadas por datos en localStorage
  const shouldUseBrandingColor = isHydrated && !isBrandingLoading && (contextType === 'grupo' || contextType === 'sucursal');
  const primaryColor = shouldUseBrandingColor && branding?.colors?.primary 
    ? branding.colors.primary 
    : '#254639'; // Verde oliva complementario al logo (#433835) por defecto
  
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
        finalColor: primaryColor,
      });
    }
  }, [branding, contextType, groupId, branchId, primaryColor, shouldUseBrandingColor, isBrandingLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navegar a la página de búsqueda con el query
      const searchUrl = contextType === 'global' 
        ? `/products?search=${encodeURIComponent(searchQuery.trim())}`
        : `/${contextType}/${router.query.slug}/products?search=${encodeURIComponent(searchQuery.trim())}`;
      router.push(searchUrl);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <>
      {/* Header Principal */}
      <header 
        ref={headerRef}
        className="sticky top-0 z-50" 
        style={{ backgroundColor: primaryColor, borderBottom: `1px solid ${borderColor}` }}
      >
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
                
                {/* Botón Navegar */}
                <button
                  onClick={() => setShowNavigationDialog(true)}
                  className="px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-2 hover:opacity-80"
                  style={{ color: textColor }}
                >
                  <BusinessIcon className="w-5 h-5" style={{ color: textColor }} />
                  <span className="hidden sm:inline">Navegar</span>
                </button>

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
                          className="absolute -top-1.5 -right-1.5 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md"
                          style={{ 
                            backgroundColor: textColor, 
                            color: primaryColor 
                          }}
                        >
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs" style={{ color: textColorOpacity80 }}>
                        Carrito
                      </span>
                      {cart?.subtotal && (
                        <span className="text-sm font-semibold" style={{ color: textColor }}>
                          ${parseFloat(cart.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                        Cantidad: {item.quantity}
                                      </span>
                                      <span className="text-sm font-semibold text-gray-900">
                                        ${parseFloat(String(item.item_subtotal || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                              <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                              <span className="text-lg font-bold text-gray-900">
                                ${parseFloat(cart.subtotal || '0').toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

              {/* Barra de búsqueda - Ocupa todo el espacio disponible */}
              <div className="flex-1 min-w-0 px-4">
                <form onSubmit={handleSearch} className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o número de parte"
                    className="w-full pl-6 pr-14 py-3 border border-gray-300 rounded-full bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-base shadow-inner font-sans"
                    style={{
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
                    }}
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
                </form>
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

