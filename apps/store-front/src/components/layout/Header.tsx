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
import StoreSelectorDialog from '../StoreSelectorDialog';
import NavigationDialog from '../NavigationDialog';
import CategoriesMenu from '../CategoriesMenu';
import VehicleSelectorDialog from '../VehicleSelectorDialog';
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
  const [isBrandingLoading, setIsBrandingLoading] = useState(true);
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
      
      // Solo si la clave NO existe (primera vez), entonces cargar el predeterminado
      const hasSelectedKey = typeof window !== 'undefined' && 
        localStorage.getItem('user_vehicle_selected') !== null;
      
      if (isAuthenticated && !hasSelectedKey) {
        try {
          const defaultVehicle = await userVehiclesService.getDefaultVehicle();
          if (defaultVehicle) {
            setCurrentVehicle(defaultVehicle);
            // Establecer como seleccionado solo si es la primera vez
            setSelectedVehicle(defaultVehicle);
          } else {
            setCurrentVehicle(null);
          }
        } catch (error) {
          console.error('Error cargando vehículo predeterminado:', error);
          setCurrentVehicle(null);
        }
      } else {
        // Si no está autenticado o ya se estableció antes, usar el seleccionado
        setCurrentVehicle(selected);
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

    return () => {
      window.removeEventListener('storage', handleStorageChange);
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
                setBranding({
                  ...brandingData,
                  colors: brandingData.colors || groupBranding?.colors || undefined,
                });
              } catch (groupError) {
                console.error('Error cargando branding del grupo para colores:', groupError);
                setBranding(brandingData);
              }
            } else {
              setBranding(brandingData);
            }
            setIsBrandingLoading(false);
          } else if (groupId) {
            // Si no hay branding de sucursal, intentar del grupo
            const groupBranding = await brandingService.getGroupBranding(groupId);
            console.log('🎨 [Header] Branding del grupo (fallback):', groupBranding);
            setBranding(groupBranding);
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
  // Solo mostrar logo cuando el branding haya terminado de cargar (o si es contexto global)
  const shouldShowLogo = !isBrandingLoading || contextType === 'global';
  const logoUrl = branding?.logo_url || agoraLogo;
  const logoAlt = branding?.logo_url ? getStoreName() || 'AGORA PARTS' : 'AGORA PARTS';
  
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
  // Solo usar color personalizado si no estamos en contexto global y el branding está cargado
  const shouldUseBrandingColor = !isBrandingLoading && (contextType === 'grupo' || contextType === 'sucursal');
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
        {/* Primera fila: Logo, promoción y acciones de usuario */}
        <div style={{ backgroundColor: primaryColor, borderBottom: `1px solid ${borderColor}` }}>
          <div className="w-full px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo y branding */}
              <div className="flex items-center gap-4">
                <ContextualLink href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="relative" style={{ width: '128px', height: '38px' }}>
                    {shouldShowLogo ? (
                      <>
                        {branding?.logo_url ? (
                          <img
                            src={typeof logoUrl === 'string' ? logoUrl : logoUrl.src}
                            alt={logoAlt}
                            width={128}
                            height={38}
                            className="object-contain"
                            style={{ maxWidth: '128px', maxHeight: '38px' }}
                          />
                        ) : (
                          <Image
                            src={agoraLogo}
                            alt="AGORA PARTS"
                            width={128}
                            height={38}
                            className="object-contain"
                            priority
                          />
                        )}
                        {!branding?.logo_url && (
                          <span className="absolute text-[6px] text-white uppercase tracking-wide whitespace-nowrap" style={{ left: '48px', top: '33px', fontWeight: 600 }}>
                            EL CENTRO DE TUS REFACCIONES.
                          </span>
                        )}
                      </>
                    ) : (
                      // Placeholder mientras carga el branding (mismo tamaño para evitar layout shift)
                      <div 
                        className="bg-transparent"
                        style={{ width: '128px', height: '38px' }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </ContextualLink>
              </div>

              {/* Acciones de usuario */}
              <div className="flex items-center gap-1">
                {/* Separador visual */}
                <div className="h-6 w-px mx-2" style={{ backgroundColor: separatorColor }} />
                
                {/* Botón Navegar */}
                <button
                  onClick={() => setShowNavigationDialog(true)}
                  className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5"
                  style={{ color: textColor }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <BusinessIcon className="w-5 h-5" style={{ color: textColor }} />
                  <span className="hidden sm:inline">Navegar</span>
                </button>

                {/* Sección de Usuario */}
                {!isAuthenticated ? (
                  <ContextualLink 
                    href="/auth/login" 
                    className="px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5"
                    style={{ color: textColor }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                
                {/* Separador visual */}
                <div className="h-6 w-px mx-2" style={{ backgroundColor: separatorColor }} />
                
                {/* Carrito con preview */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowCartPreview(true)}
                  onMouseLeave={() => setShowCartPreview(false)}
                >
                  <ContextualLink 
                    href={getCartUrl()} 
                    className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap group"
                    style={{ color: textColor }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

        {/* Segunda fila: Menú, búsqueda y selector de tienda */}
        <div style={{ backgroundColor: primaryColor, borderTop: `1px solid ${borderColor}` }}>
          <div className="w-full px-4 py-3">
            <div className="flex items-center gap-4">
              {/* Grupo izquierdo: Menú y selector de vehículo */}
              <div className="flex items-center gap-4 flex-shrink-0 relative">
                <button
                  onClick={() => {
                    setShowCategoriesMenu(!showCategoriesMenu);
                    setShowMobileMenu(false);
                  }}
                  onMouseEnter={() => setShowCategoriesMenu(true)}
                  className="flex items-center gap-2 transition-colors relative"
                  style={{ color: textColor }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <MenuIcon className="w-6 h-6" style={{ color: textColor }} />
                  <span className="hidden sm:inline text-sm font-medium">Menú</span>
                </button>
                
                {/* Menú de categorías flotante - Estilo AliExpress */}
                {showCategoriesMenu && headerRef.current && (
                  <div
                    className="fixed left-0 right-0 z-50"
                    style={{ 
                      top: `${headerRef.current.offsetHeight + headerRef.current.offsetTop + 8}px`,
                    }}
                    onMouseLeave={() => setShowCategoriesMenu(false)}
                  >
                    <div className="w-full px-4">
                      <CategoriesMenu onCategoryClick={() => setShowCategoriesMenu(false)} />
                    </div>
                  </div>
                )}

                {isClient && isVehicleLoaded && currentVehicle ? (
                  <button 
                    onClick={() => setShowVehicleSelector(true)}
                    className="hidden md:flex items-center gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[200px] max-w-[280px]"
                    style={{ color: textColor }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    className="hidden md:flex items-center gap-2 transition-colors"
                    style={{ color: textColor }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <DirectionsCarIcon className="w-5 h-5" style={{ color: textColor }} />
                    <span className="text-sm font-medium">Agregar Vehículo</span>
                    <span style={{ color: textColorOpacity80 }}>→</span>
                  </button>
                ) : null}
              </div>

              {/* Barra de búsqueda - Ocupa todo el espacio disponible */}
              <form onSubmit={handleSearch} className="flex-1 min-w-0 flex">
                {/* Botón de categorías */}
                <button
                  type="button"
                  className="flex items-center gap-1 px-4 py-2 bg-toyota-gray-light text-toyota-gray rounded-l-lg border border-r-0 border-gray-300 hover:bg-gray-200 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
                >
                  <span>Todas las categorías</span>
                  <span className="text-toyota-gray">▼</span>
                </button>
                
                {/* Input de búsqueda */}
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar en Agora Parts"
                    className="block w-full h-full pl-4 pr-12 py-2 border border-gray-300 focus:ring-2 focus:ring-toyota-red focus:border-toyota-red text-sm rounded-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-12 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Botón de búsqueda */}
                <button
                  type="submit"
                  className="flex items-center justify-center px-4 rounded-r-lg hover:opacity-90 transition-opacity flex-shrink-0"
                  style={{ backgroundColor: primaryColor, color: textColor }}
                >
                  <SearchIcon className="h-5 w-5" style={{ color: textColor }} />
                </button>
              </form>

              {/* Información de tienda seleccionada - Alineado a la derecha */}
              <div className="flex-shrink-0">
                {isClient && storeInfo ? (
                  <button
                    onClick={() => setShowStoreSelector(true)}
                    className="hidden lg:flex items-start gap-2 text-left rounded-lg px-3 py-2 transition-colors min-w-[240px] max-w-[320px]"
                    style={{ color: textColor }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBgColor}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    className="hidden lg:flex items-center gap-2 transition-colors whitespace-nowrap"
                    style={{ color: textColor }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
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

      {/* Selector de tienda */}
      <StoreSelectorDialog
        open={showStoreSelector}
        onClose={() => setShowStoreSelector(false)}
      />
      
      {/* Diálogo de navegación */}
      <NavigationDialog
        open={showNavigationDialog}
        onClose={() => setShowNavigationDialog(false)}
      />
      
      {/* Selector de vehículos */}
      <VehicleSelectorDialog
        open={showVehicleSelector}
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
            return;
          }
          
          setCurrentVehicle(vehicle);
          // Si está autenticado, recargar el vehículo predeterminado
          if (isAuthenticated && vehicle) {
            try {
              const defaultVehicle = await userVehiclesService.getDefaultVehicle();
              setCurrentVehicle(defaultVehicle);
              if (defaultVehicle) {
                setSelectedVehicle(defaultVehicle);
              }
            } catch (error) {
              console.error('Error recargando vehículo:', error);
            }
          } else if (vehicle) {
            // Para usuarios no autenticados, establecer como seleccionado
            setSelectedVehicle(vehicle);
          }
        }}
      />
    </>
  );
}

