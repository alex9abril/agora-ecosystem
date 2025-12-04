/**
 * Layout principal del store-front con branding personalizado por contexto
 */

import React, { ReactNode } from 'react';
import { useStoreContext } from '@/contexts/StoreContext';
import Header from './Header';
import ContextualLink from '../ContextualLink';

interface StoreLayoutProps {
  children: ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  const { 
    contextType, 
    groupData, 
    branchData, 
    isInStore, 
    isLoading,
    error,
  } = useStoreContext();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header principal con diseño AutoZone */}
      <Header />

      {/* Banner del grupo/sucursal si aplica */}
      {isInStore() && !isLoading && !error && (
        <div className="bg-gradient-to-r from-toyota-red to-toyota-red-dark text-white py-6">
          <div className="max-w-7xl mx-auto px-4">
            {contextType === 'grupo' && groupData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{groupData.name}</h2>
                {groupData.description && (
                  <p className="text-white opacity-90">{groupData.description}</p>
                )}
              </div>
            )}
            {contextType === 'sucursal' && branchData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{branchData.name}</h2>
                {branchData.address && (
                  <p className="text-white opacity-90">📍 {branchData.address}</p>
                )}
                {branchData.phone && (
                  <p className="text-white opacity-90">📞 {branchData.phone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensaje de error si el slug no existe */}
      {error && (
        <div className="bg-red-50 border-l-4 border-toyota-red p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-toyota-red-dark">{error}</p>
            <ContextualLink href="/" className="text-toyota-red hover:text-toyota-red-dark text-sm mt-2 inline-block">
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
      <footer className="bg-toyota-gray-dark text-white mt-12">
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

