/**
 * Sidebar del panel de cuenta del usuario
 * Muestra las opciones de navegación para la cuenta
 */

import React from 'react';
import { useRouter } from 'next/router';
import ContextualLink from '@/components/ContextualLink';
import PersonIcon from '@mui/icons-material/Person';
import HomeIcon from '@mui/icons-material/Home';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CreditCardIcon from '@mui/icons-material/CreditCard';

interface AccountSidebarProps {
  activeTab?: string;
}

export default function AccountSidebar({ activeTab = 'profile' }: AccountSidebarProps) {
  const router = useRouter();

  const menuItems = [
    {
      id: 'profile',
      label: 'Mis datos de cuenta',
      icon: PersonIcon,
      href: '/profile',
    },
    {
      id: 'addresses',
      label: 'Mis direcciones',
      icon: HomeIcon,
      href: '/profile?tab=addresses',
    },
    {
      id: 'payment',
      label: 'Mis métodos de pago',
      icon: CreditCardIcon,
      href: '/profile?tab=payment',
    },
    {
      id: 'orders',
      label: 'Mis pedidos',
      icon: ReceiptIcon,
      href: '/orders',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mi Cuenta</h2>
        </div>
        
        <nav className="p-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.id === 'addresses' && router.query.tab === 'addresses') ||
                (item.id === 'payment' && router.query.tab === 'payment') ||
                (item.id === 'orders' && (router.pathname === '/orders' || router.pathname.includes('/orders'))) ||
                (item.id === 'profile' && (router.pathname === '/profile' || router.pathname.includes('/profile')) && !router.query.tab);

              return (
                <li key={item.id}>
                  <ContextualLink
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-toyota-red text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </ContextualLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

