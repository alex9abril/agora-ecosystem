/**
 * Layout móvil con navegación inferior
 */

import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';
import HomeIcon from '@mui/icons-material/Home';
import StoreIcon from '@mui/icons-material/Store';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';

interface MobileLayoutProps {
  children: ReactNode;
  showNavigation?: boolean; // Prop para controlar si se muestra la navegación
}

export default function MobileLayout({ children, showNavigation = true }: MobileLayoutProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const { itemCount, isAnimating } = useCart();
  
  // No mostrar navegación si no está autenticado o si showNavigation es false
  const shouldShowNavigation = showNavigation && isAuthenticated;

  const navItems = [
    { href: '/', label: t('nav.home'), icon: HomeIcon },
    { href: '/stores', label: t('nav.stores'), icon: StoreIcon },
    { href: '/cart', label: t('nav.cart'), icon: ShoppingCartIcon },
    { href: isAuthenticated ? '/profile' : '/auth/login', label: t('nav.profile'), icon: PersonIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${shouldShowNavigation ? 'pb-20' : ''}`}>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={isAuthenticated ? "/" : "/auth/login"} className="text-xl font-bold text-black">
              Localia
            </Link>
            <div className="flex items-center gap-3">
              {/* Language selector */}
              <LanguageSelector />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        {children}
      </main>

      {/* Bottom navigation - Solo mostrar si está autenticado */}
      {shouldShowNavigation && (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isCart = item.href === '/cart';
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2 px-4 min-w-[60px] transition-colors relative ${
                    isActive(item.href)
                      ? 'text-black font-semibold'
                      : 'text-gray-500'
                  }`}
                >
                  <div className={`relative ${isAnimating && isCart ? 'animate-cart-bounce' : ''}`}>
                    <IconComponent className="text-2xl mb-1" />
                    {isCart && (
                      <span 
                        className={`absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-md transition-all ${
                          itemCount > 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
                        }`}
                      >
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      )}
    </div>
  );
}

function LanguageSelector() {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLanguageChange = (lang: 'en' | 'es') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {language.toUpperCase()}
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-20 border border-gray-200">
            <button
              onClick={() => handleLanguageChange('es')}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                language === 'es' ? 'bg-black text-white font-medium' : 'text-gray-700'
              }`}
            >
              Español
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                language === 'en' ? 'bg-black text-white font-medium' : 'text-gray-700'
              }`}
            >
              English
            </button>
          </div>
        </>
      )}
    </div>
  );
}

