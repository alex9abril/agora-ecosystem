/**
 * Layout principal del store-front con branding personalizado por contexto
 */

import React, { ReactNode } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import ContextualLink from '../ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import StoreIcon from '@mui/icons-material/Store';

interface StoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const { 
    contextType, 
    groupData, 
    branchData, 
    isInStore, 
    getStoreName,
    getStoreLogo,
    isLoading,
    error,
  } = useStoreContext();
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { getProductsUrl, getCartUrl } = useStoreRouting();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con branding del grupo/sucursal */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y nombre */}
            <ContextualLink href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {getStoreLogo() && (
                <img 
                  src={getStoreLogo()!} 
                  alt={getStoreName()} 
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <span className="text-xl font-bold text-black">
                {getStoreName()}
              </span>
            </ContextualLink>

            {/* Navegación */}
            <nav className="flex items-center gap-6">
              <ContextualLink href="/" className="text-gray-700 hover:text-black transition-colors font-medium">
                Inicio
              </ContextualLink>
              <ContextualLink href={getProductsUrl()} className="text-gray-700 hover:text-black transition-colors font-medium">
                Productos
              </ContextualLink>
              {/* Carrito siempre visible */}
              <ContextualLink href={getCartUrl()} className="relative text-gray-700 hover:text-black transition-colors font-medium">
                <ShoppingCartIcon className="w-6 h-6" />
                {isAuthenticated && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </ContextualLink>
              
              {/* Perfil solo si está autenticado */}
              {isAuthenticated ? (
                <ContextualLink href="/profile" className="text-gray-700 hover:text-black transition-colors font-medium">
                  <PersonIcon className="w-6 h-6" />
                </ContextualLink>
              ) : (
                <ContextualLink href="/auth/login" className="text-gray-700 hover:text-black transition-colors font-medium">
                  Iniciar Sesión
                </ContextualLink>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Banner del grupo/sucursal si aplica */}
      {isInStore() && !isLoading && !error && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-6">
          <div className="max-w-7xl mx-auto px-4">
            {contextType === 'grupo' && groupData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{groupData.name}</h2>
                {groupData.description && (
                  <p className="text-blue-100">{groupData.description}</p>
                )}
              </div>
            )}
            {contextType === 'sucursal' && branchData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{branchData.name}</h2>
                {branchData.address && (
                  <p className="text-blue-100">📍 {branchData.address}</p>
                )}
                {branchData.phone && (
                  <p className="text-blue-100">📞 {branchData.phone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensaje de error si el slug no existe */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-red-700">{error}</p>
            <ContextualLink href="/" className="text-red-600 hover:text-red-800 text-sm mt-2 inline-block">
              Volver al inicio
            </ContextualLink>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Cargando...</p>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Footer con información de contacto */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {isInStore() ? (
            <div>
              <h3 className="text-lg font-bold mb-4">Contacto</h3>
              {contextType === 'grupo' && groupData && (
                <div>
                  <p className="font-medium">{groupData.name}</p>
                  {groupData.website_url && (
                    <a href={groupData.website_url} target="_blank" rel="noopener" className="text-blue-300 hover:text-blue-200">
                      {groupData.website_url}
                    </a>
                  )}
                </div>
              )}
              {contextType === 'sucursal' && branchData && (
                <div>
                  <p className="font-medium">{branchData.name}</p>
                  {branchData.address && <p>{branchData.address}</p>}
                  {branchData.phone && <p>{branchData.phone}</p>}
                  {branchData.email && <p>{branchData.email}</p>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>© 2024 Agora. Todos los derechos reservados.</p>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

