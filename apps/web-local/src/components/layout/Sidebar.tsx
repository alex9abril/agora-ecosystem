import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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
  },
  {
    name: 'Catalogo',
    href: '/catalog',
    requiredPermission: 'canManageProducts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      {
        name: 'Colecciones',
        href: '/catalog/collections',
        requiredPermission: 'canManageProducts',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 14h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
          </svg>
        ),
      },
    ],
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
    requiredPermission: 'canManageOrders',
  },
  {
    name: 'Estadisticas',
    href: '/statistics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Sliders',
    href: '/sliders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    requiredPermission: 'canManageSettings',
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Si no hay tienda seleccionada pero hay tiendas disponibles con rol superadmin, usar superadmin
  const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
  const userRole = (selectedBusiness?.role || (hasSuperadminRole ? 'superadmin' : 'operations_staff')) as BusinessRole;
  const canManageSettings = usePermission('canManageSettings');
  const canManageProducts = usePermission('canManageProducts');
  const canManageOrders = usePermission('canManageOrders');
  
  // Función helper para verificar si un item debe mostrarse
  const shouldShowItem = (item: MenuItem): boolean => {
    // Ocultar si el rol está en la lista de exclusión
    if (item.hideForRoles?.includes(userRole)) {
      return false;
    }
    
    // Verificar permiso requerido
    if (item.requiredPermission === 'canManageSettings' && !canManageSettings) {
      return false;
    }
    if (item.requiredPermission === 'canManageProducts' && !canManageProducts) {
      return false;
    }
    
    // Verificar acceso a la ruta
    if (!canAccessRoute(userRole, item.href)) {
      return false;
    }
    
    return true;
  };

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const getUserEmail = () => {
    return user?.email || 'usuario@example.com';
  };

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
            isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`;

          return (
            <li key={item.href}>
              <Link href={item.href} className={linkClasses}>
                <span className={isActive ? 'text-gray-900' : 'text-gray-600'}>{item.icon}</span>
                {showLabels && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="bg-gray-200 text-gray-700 text-xs font-normal px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>

              {hasChildren && showLabels && (
                <ul className="mt-1 ml-5 space-y-1 border-l border-gray-100 pl-3">
                  {visibleChildren.map((child) => {
                    const childActive =
                      router.pathname === child.href || router.pathname.startsWith(child.href + '/');
                    const childClasses = `flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-normal transition-colors ${
                      childActive ? 'bg-gray-50 text-gray-900' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`;
                    return (
                      <li key={child.href}>
                        <Link href={child.href} className={childClasses}>
                          <span className={childActive ? 'text-gray-900' : 'text-gray-600'}>
                            {child.icon}
                          </span>
                          <span className="flex-1">{child.name}</span>
                          {child.badge && (
                            <span className="bg-gray-200 text-gray-700 text-xs font-normal px-2 py-0.5 rounded-full">
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
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-200 relative z-40 ${
          isCollapsed && isHovered ? 'opacity-0 pointer-events-none' : ''
        }`}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Logo y botón de colapsar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-sm font-normal text-gray-900">AGORA Local</h2>
        )}
        <button
          onClick={toggleSidebar}
          className={`${isCollapsed ? 'mx-auto' : ''} p-1.5 rounded-md hover:bg-gray-100 transition-colors`}
          title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg 
            className="w-4 h-4 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4">
        {renderMenuList(true)}
      </nav>

      {/* Usuario en la parte inferior */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-normal">
            {getUserInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-normal text-gray-900 truncate">
              {getUserEmail()}
            </p>
          </div>
        </div>
      </div>
    </aside>

    {/* Sidebar expandido por hover (se superpone sobre el contenido) */}
    {isCollapsed && (
      <aside 
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-opacity duration-200 z-50 shadow-2xl ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo y botón de colapsar */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-normal text-gray-900">AGORA Local</h2>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            title="Colapsar menú"
          >
            <svg 
              className="w-4 h-4 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4">
          {renderMenuList(true)}
        </nav>

        {/* Usuario en la parte inferior */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-normal flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-normal text-gray-900 truncate">
                {getUserEmail()}
              </p>
            </div>
          </div>
        </div>
      </aside>
    )}
    </>
  );
}


