import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import agoraLogoBlack from '@/images/agora_logo_black.png';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { usePermission } from '@/lib/role-guards';
import { canAccessRoute } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: MenuItem[];
  requiresSuperadmin?: boolean;
  requiredPermission?: keyof import('@/lib/permissions').RolePermissions;
  hideForRoles?: BusinessRole[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    hideForRoles: ['operations_staff', 'kitchen_staff'],
  },
  {
    name: 'Productos',
    href: '/products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    requiredPermission: 'canManageProducts',
  },
  {
    name: 'Pedidos',
    href: '/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    name: 'Clientes',
    href: '/clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    requiredPermission: 'canManageClients',
  },
  {
    name: 'Tiendas',
    href: '/tiendas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    requiresSuperadmin: true,
  },
  {
    name: 'Catalogo',
    href: '/catalog',
    requiredPermission: 'canManageCollections',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      {
        name: 'Colecciones',
        href: '/catalog/collections',
        requiredPermission: 'canManageCollections',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 14h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
          </svg>
        ),
      },
    ],
  },
  {
    name: 'Configuracion',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    requiredPermission: 'canManageSettings',
  },
];



export default function Sidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const storageKey = 'web-local.sidebar.isCollapsed';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      return storedValue === 'true';
    } catch {
      return false;
    }
  });
  const [isHovered, setIsHovered] = useState(false);
  const hasHydratedRef = useRef(false);
  
  // Si no hay tienda seleccionada pero hay tiendas disponibles con rol superadmin, usar superadmin
  const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
  const userRole = (selectedBusiness?.role || (hasSuperadminRole ? 'superadmin' : 'operations_staff')) as BusinessRole;
  const operatorPermissions = selectedBusiness?.permissions ?? null;
  const canManageSettings = usePermission('canManageSettings');
  const canManageProducts = usePermission('canManageProducts');
  const canManageOrders = usePermission('canManageOrders');
  const canManageClients = usePermission('canManageClients');
  const canViewReports = usePermission('canViewReports');
  const canManageSliders = usePermission('canManageSliders');
  const canManageCollections = usePermission('canManageCollections');

  const shouldShowItem = (item: MenuItem): boolean => {
    if (item.hideForRoles?.includes(userRole)) return false;
    if (item.requiresSuperadmin && !hasSuperadminRole) return false;
    if (item.requiredPermission === 'canManageSettings' && !canManageSettings) return false;
    if (item.requiredPermission === 'canManageProducts' && !canManageProducts) return false;
    if (item.requiredPermission === 'canManageClients' && !canManageClients) return false;
    if (item.requiredPermission === 'canViewReports' && !canViewReports) return false;
    if (item.requiredPermission === 'canManageSliders' && !canManageSliders) return false;
    if (item.requiredPermission === 'canManageCollections' && !canManageCollections) return false;
    if (!canAccessRoute(userRole, item.href, operatorPermissions)) return false;
    return true;
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, String(isCollapsed));
    } catch {
      // ignore storage errors
    }
  }, [isCollapsed, storageKey]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
    setIsHovered(false);
  };

  const renderMenuList = (showLabels: boolean) => (
    <ul className="space-y-1 px-3">
      {menuItems
        .filter(shouldShowItem)
        .map((item) => {
          const visibleChildren = (item.children || []).filter(shouldShowItem);
          const hasChildren = visibleChildren.length > 0;
          const selfActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          const childActive = visibleChildren.some(
            (child) => router.pathname === child.href || router.pathname.startsWith(child.href + '/'),
          );
          const isActive = selfActive || childActive;
          const linkClasses = `flex items-center ${showLabels ? 'space-x-3' : 'justify-center'} px-3 py-2 rounded-md text-xs font-normal transition-colors ${
            isActive ? 'bg-black text-white dark:bg-neutral-600 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
          }`;

          return (
            <li key={item.href}>
              <Link href={item.href} className={linkClasses}>
                <span className={isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>{item.icon}</span>
                {showLabels && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 text-xs font-normal px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>

              {hasChildren && showLabels && (
                <ul className="mt-1 ml-5 space-y-1 pl-3">
                  {visibleChildren.map((child) => {
                    const childActive =
                      router.pathname === child.href || router.pathname.startsWith(child.href + '/');
                    const childClasses = `flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-normal transition-colors ${
                      childActive ? 'bg-black text-white dark:bg-neutral-600 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`;
                    return (
                      <li key={child.href}>
                        <Link href={child.href} className={childClasses}>
                          <span className={childActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>
                            {child.icon}
                          </span>
                          <span className="flex-1">{child.name}</span>
                          {child.badge && (
                            <span className="bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 text-xs font-normal px-2 py-0.5 rounded-full">
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
    </ul>
  );

  return (
    <>
      {/* Sidebar base (siempre visible, mantiene su ancho para no afectar el layout) */}
      <aside 
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-neutral-900 flex flex-col h-screen sticky top-0 self-start transition-all duration-200 relative z-40 ${
          isCollapsed && isHovered ? 'opacity-0 pointer-events-none' : ''
        }`}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Logo y botón de colapsar */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <Image src={agoraLogoBlack} alt="AGORA" width={96} height={28} className="flex-shrink-0 dark:invert" />
        )}
        <button
          onClick={toggleSidebar}
          className={`${isCollapsed ? 'mx-auto' : ''} p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors`}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              /* Doble chevron derecha: expandir */
              <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5l7 7-7 7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
              </>
            ) : (
              /* Doble chevron izquierda: colapsar */
              <>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 19l-7-7 7-7" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className={`space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {menuItems
            .filter(shouldShowItem)
            .map((item) => {
              const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-md text-xs font-normal transition-colors ${
                      isActive
                        ? 'bg-black text-white dark:bg-neutral-600 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>{item.icon}</span>
                    {!isCollapsed && <span className="flex-1">{item.name}</span>}
                    {!isCollapsed && item.badge && (
                      <span className="bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 text-xs font-normal px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </aside>

    {/* Sidebar expandido por hover (se superpone sobre el contenido) */}
    {isCollapsed && (
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-neutral-900 flex flex-col transition-opacity duration-200 z-50 shadow-2xl ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo y botón de colapsar */}
        <div className="p-4 flex items-center justify-between">
          <Image src={agoraLogoBlack} alt="AGORA" width={96} height={28} className="flex-shrink-0 dark:invert" />
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Colapsar menú"
          >
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4">
          {renderMenuList(true)}
        </nav>
      </aside>
    )}
    </>
  );
}


