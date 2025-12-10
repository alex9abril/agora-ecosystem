/**
 * Header principal del store-front
 * Diseño inspirado en Toyota con paleta de colores oficial
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import agoraLogo from '@/images/agora_logo.png';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import ContextualLink from '../ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';
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

export default function Header() {
  const router = useRouter();
  const { 
    contextType, 
    branchData,
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
  const [storeInfo, setStoreInfo] = useState<{ name: string; address: string; isOpen: boolean; nextOpenTime: string } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);

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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        {/* Primera fila: Logo, promoción y acciones de usuario */}
        <div className="bg-white">
          <div className="w-full px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo y branding */}
              <div className="flex items-center gap-4">
                <ContextualLink href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="relative">
                    <Image
                      src={agoraLogo}
                      alt="AGORA PARTS"
                      width={200}
                      height={60}
                      className="object-contain"
                      priority
                    />
                    <span className="absolute text-[9px] text-gray-600 uppercase tracking-wide whitespace-nowrap" style={{ left: '75px', top: '53px', fontWeight: 600 }}>
                      EL CENTRO DE TUS REFACCIONES.
                    </span>
                  </div>
                </ContextualLink>
              </div>

              {/* Acciones de usuario */}
              <div className="flex items-center gap-1">
                {/* Separador visual */}
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Botón Navegar */}
                <button
                  onClick={() => setShowNavigationDialog(true)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-toyota-red hover:bg-gray-50 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                  <BusinessIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Navegar</span>
                </button>

                {/* Sección de Usuario */}
                {!isAuthenticated ? (
                  <ContextualLink 
                    href="/auth/login" 
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-toyota-red hover:bg-gray-50 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5"
                  >
                    <PersonIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Ingresar</span>
                  </ContextualLink>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      onMouseEnter={() => setShowUserMenu(true)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-toyota-red hover:bg-gray-50 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 group"
                    >
                      <div className="flex items-center gap-2">
                        <AccountCircleIcon className="w-5 h-5 text-gray-500 group-hover:text-toyota-red transition-colors" />
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                          <span className="text-xs text-gray-500 group-hover:text-gray-600">
                            Hola,
                          </span>
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-toyota-red">
                            {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                          </span>
                        </div>
                      </div>
                      <ArrowDropDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
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
                          <div className="bg-gradient-to-r from-toyota-red to-toyota-red-dark px-5 py-4">
                            <p className="text-xs text-white/90 font-medium uppercase tracking-wide mb-1">
                              Bienvenido
                            </p>
                            <p className="text-base font-bold text-white truncate">
                              {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                            </p>
                            {user?.email && (
                              <p className="text-xs text-white/80 truncate mt-1">
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
                <div className="h-6 w-px bg-gray-300 mx-2" />
                
                {/* Carrito con preview */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowCartPreview(true)}
                  onMouseLeave={() => setShowCartPreview(false)}
                >
                  <ContextualLink 
                    href={getCartUrl()} 
                    className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-toyota-red hover:bg-gray-50 rounded-md transition-all whitespace-nowrap group"
                  >
                    <div className="relative">
                      <ShoppingCartIcon className="w-6 h-6 text-gray-600 group-hover:text-toyota-red transition-colors" />
                      {itemCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-toyota-red text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs text-gray-500 group-hover:text-gray-600">
                        Carrito
                      </span>
                      {cart?.subtotal && (
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-toyota-red">
                          ${parseFloat(cart.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </ContextualLink>
                  
                  {/* Preview del carrito */}
                  {showCartPreview && itemCount > 0 && cart && (
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                      <div className="bg-gradient-to-r from-toyota-red to-toyota-red-dark px-5 py-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white">
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
                              className="block w-full bg-toyota-red text-white text-center py-2.5 rounded-md font-semibold hover:bg-toyota-red-dark transition-colors"
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
        <div className="bg-white border-t border-toyota-gray-light">
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
                  className="flex items-center gap-2 text-toyota-gray hover:text-black transition-colors relative"
                >
                  <MenuIcon className="w-6 h-6" />
                  <span className="hidden sm:inline text-sm font-medium">Menú</span>
                </button>
                
                {/* Menú de categorías flotante */}
                {showCategoriesMenu && (
                  <div
                    className="absolute top-full left-0 mt-2 z-50 w-[1200px] shadow-2xl"
                    onMouseLeave={() => setShowCategoriesMenu(false)}
                  >
                    <CategoriesMenu onCategoryClick={() => setShowCategoriesMenu(false)} />
                  </div>
                )}

                <button className="hidden md:flex items-center gap-2 text-toyota-gray hover:text-black transition-colors">
                  <DirectionsCarIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Agregar Vehículo</span>
                  <span className="text-toyota-gray-light">→</span>
                </button>
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
                  className="flex items-center justify-center px-4 bg-toyota-red text-white rounded-r-lg hover:bg-toyota-red-dark transition-colors flex-shrink-0"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
              </form>

              {/* Información de tienda seleccionada - Alineado a la derecha */}
              <div className="flex-shrink-0">
                {isClient && storeInfo ? (
                  <button
                    onClick={() => setShowStoreSelector(true)}
                    className="hidden lg:flex items-start gap-2 text-left hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors min-w-[240px] max-w-[320px]"
                  >
                    <span className="flex-shrink-0 mt-0.5">
                      <CheckCircleIcon className="w-5 h-5 text-toyota-red" />
                    </span>
                    <span className="flex-1 min-w-0 inline-block">
                      <span className="block text-xs font-semibold text-black truncate leading-tight mb-0.5">
                        {storeInfo.name}
                      </span>
                      {storeInfo.address && (
                        <span className="block text-xs text-toyota-gray truncate leading-tight">
                          {storeInfo.address}
                        </span>
                      )}
                      <span className={`block text-xs font-semibold leading-tight mt-1 ${storeInfo.isOpen ? 'text-toyota-red' : 'text-toyota-gray'}`}>
                        {storeInfo.isOpen ? 'ABIERTO' : `CERRADO Hasta ${storeInfo.nextOpenTime}`}
                      </span>
                    </span>
                    <span className="text-gray-400 flex-shrink-0 text-lg">→</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowStoreSelector(true)}
                    className="hidden lg:flex items-center gap-2 text-toyota-gray hover:text-black transition-colors whitespace-nowrap"
                  >
                    <LocationOnIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Seleccionar Tienda</span>
                    <span className="text-toyota-gray-light text-lg">→</span>
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
    </>
  );
}

