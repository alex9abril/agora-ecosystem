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
  const { itemCount } = useCart();
  const { getCartUrl } = useStoreRouting();
  const [searchQuery, setSearchQuery] = useState('');
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{ name: string; address: string; isOpen: boolean; nextOpenTime: string } | null>(null);
  const [isClient, setIsClient] = useState(false);

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
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowNavigationDialog(true)}
                  className="text-sm font-medium text-toyota-gray hover:text-black transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <BusinessIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Navegar</span>
                </button>
                {!isAuthenticated ? (
                  <ContextualLink 
                    href="/auth/login" 
                    className="text-sm font-medium text-toyota-gray hover:text-black transition-colors whitespace-nowrap"
                  >
                    Ingresar
                  </ContextualLink>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-1 text-sm font-medium text-toyota-gray hover:text-black transition-colors whitespace-nowrap"
                    >
                      <PersonIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">
                        Bienvenido {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                      </span>
                      <ArrowDropDownIcon className="w-4 h-4" />
                    </button>
                    
                    {showUserMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
                          <div className="px-4 py-2 border-b border-gray-200">
                            <p className="text-sm font-medium text-gray-900">
                              Bienvenido
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {user?.profile?.first_name || user?.profile?.name || user?.email?.split('@')[0] || 'Usuario'}
                            </p>
                          </div>
                          
                          <ContextualLink
                            href="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <HomeIcon className="w-5 h-5 text-gray-400" />
                            <span>Mis direcciones</span>
                          </ContextualLink>
                          
                          <ContextualLink
                            href="/orders"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ReceiptIcon className="w-5 h-5 text-gray-400" />
                            <span>Mis pedidos</span>
                          </ContextualLink>
                          
                          <ContextualLink
                            href="/profile?tab=payment"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <CreditCardIcon className="w-5 h-5 text-gray-400" />
                            <span>Mis formas de pago</span>
                          </ContextualLink>
                          
                          <div className="border-t border-gray-200 mt-1 pt-1">
                            <button
                              onClick={async () => {
                                setShowUserMenu(false);
                                await signOut();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <ExitToAppIcon className="w-5 h-5" />
                              <span>Salir</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <ContextualLink 
                  href={getCartUrl()} 
                  className="relative flex items-center gap-1 text-sm font-medium text-toyota-gray hover:text-black transition-colors whitespace-nowrap"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">Carrito</span>
                  {itemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-toyota-red text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </ContextualLink>
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

