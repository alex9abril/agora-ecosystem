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
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

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
      id: 'vehicles',
      label: 'Mis vehículos',
      icon: DirectionsCarIcon,
      href: '/profile?tab=vehicles',
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
      <div className="bg-transparent">
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Administrar Cuenta</h2>
        </div>
        
        <nav>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || 
                (item.id === 'addresses' && router.query.tab === 'addresses') ||
                (item.id === 'vehicles' && router.query.tab === 'vehicles') ||
                (item.id === 'payment' && router.query.tab === 'payment') ||
                (item.id === 'orders' && (router.pathname === '/orders' || router.pathname.includes('/orders'))) ||
                (item.id === 'profile' && (router.pathname === '/profile' || router.pathname.includes('/profile')) && !router.query.tab);

              return (
                <li key={item.id}>
                  <ContextualLink
                    href={item.href}
                    className={`block py-2 text-sm transition-colors ${
                      isActive
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
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

