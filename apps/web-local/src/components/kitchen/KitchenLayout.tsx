/**
 * Layout específico para Kitchen Staff
 * Diseño minimalista optimizado para tablets en cocina
 */

import { ReactNode, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

interface KitchenLayoutProps {
  children: ReactNode;
}

export default function KitchenLayout({ children }: KitchenLayoutProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { selectedBusiness } = useSelectedBusiness();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimalista */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Cocina</h1>
            {selectedBusiness && (
              <span className="text-xs text-gray-500 hidden sm:block">
                {selectedBusiness.business_name}
              </span>
            )}
          </div>

          {/* Usuario con menú de logout */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                {user.first_name?.[0] || user.email?.[0] || 'U'}
              </button>

              {/* Menú desplegable */}
              {showLogoutMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLogoutMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-medium text-gray-900">
                        {user.first_name || user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Salir</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="w-full h-[calc(100vh-65px)]">
        {children}
      </main>
    </div>
  );
}

