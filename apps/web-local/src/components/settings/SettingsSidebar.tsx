import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService } from '@/lib/business';
import { useState, useEffect } from 'react';

type SettingsCategory = 'store' | 'branches' | 'wallet' | 'users' | 'permissions' | 'vehicle' | 'emails';

interface CategoryInfo {
  id: SettingsCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  section: string;
  requiresSuperadmin?: boolean;
}

interface SettingsSidebarProps {
  currentPath?: string;
}

export default function SettingsSidebar({ currentPath }: SettingsSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Si hay tienda seleccionada, verificar desde ahí
        if (selectedBusiness) {
          const businessId = selectedBusiness.business_id;
          const business = await businessService.getMyBusiness(businessId);
          if (business && business.user_role === 'superadmin') {
            setIsSuperadmin(true);
            setLoading(false);
            return;
          }
        }

        // Si no hay tienda seleccionada o no es superadmin en esa tienda,
        // verificar si es superadmin en alguna de las tiendas disponibles
        if (availableBusinesses.length > 0) {
          const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
          if (hasSuperadminRole) {
            setIsSuperadmin(true);
            setLoading(false);
            return;
          }
        }

        // Si no hay tiendas disponibles pero el usuario existe, intentar verificar directamente
        if (user) {
          try {
            const business = await businessService.getMyBusiness();
            if (business && business.user_role === 'superadmin') {
              setIsSuperadmin(true);
              setLoading(false);
              return;
            }
          } catch (err: any) {
            console.log('[SettingsSidebar] No se pudo verificar negocio directo:', err);
          }
        }

        setIsSuperadmin(false);
      } catch (error: any) {
        if (error?.statusCode === 404) {
          const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
          if (hasSuperadminRole) {
            setIsSuperadmin(true);
          } else {
            setIsSuperadmin(false);
          }
        } else {
          setIsSuperadmin(false);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkPermissions();
    } else {
      setLoading(false);
    }
  }, [user, selectedBusiness?.business_id, availableBusinesses.length]);

  // Definir categorías disponibles con secciones
  interface CategorySection {
    title: string;
    categories: CategoryInfo[];
  }

  const allCategories: CategoryInfo[] = [
    {
      id: 'store',
      name: 'Tienda',
      description: 'Gestiona la información básica de tu tienda, ubicación y horarios',
      section: 'PROJECT SETTINGS',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      href: '/settings/store',
    },
    {
      id: 'branches',
      name: 'Sucursales',
      description: 'Gestiona las sucursales de tu tienda y agrega nuevas ubicaciones',
      section: 'PROJECT SETTINGS',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/settings/branches',
    },
    {
      id: 'wallet',
      name: 'Monedero Electrónico',
      description: 'Consulta tu saldo y el historial de transacciones de tu wallet',
      section: 'PROJECT SETTINGS',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      href: '/settings/wallet',
    },
    {
      id: 'vehicle',
      name: 'Vehículos',
      description: 'Gestiona la información de vehículos para entregas',
      section: 'PROJECT SETTINGS',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25a1.125 1.125 0 011.125-1.125H3.75m1.5-4.5A2.25 2.25 0 016.75 9h10.5a2.25 2.25 0 011.75.75m-12 0V9a2.25 2.25 0 012.25-2.25h10.5A2.25 2.25 0 0121.75 9v.75m-8.5-3h6m-6 3h6m-6 3h6m-3-6h3m-3 3h3m-3 3h3" />
        </svg>
      ),
      href: '/settings/vehicle',
    },
    {
      id: 'users',
      name: 'Usuarios y Permisos',
      description: 'Administra a tus empleados y sus permisos de acceso',
      section: 'CONFIGURATION',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      href: '/settings/users',
      requiresSuperadmin: true,
    },
    {
      id: 'permissions',
      name: 'Grupos de Permisos',
      description: 'Administra tus grupos de permisos y los permisos',
      section: 'CONFIGURATION',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      href: '/settings/permissions',
      requiresSuperadmin: true,
    },
    {
      id: 'emails',
      name: 'Correos',
      description: 'Gestiona los templates de correos electrónicos automáticos',
      section: 'CONFIGURATION',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      href: '/settings/emails',
      requiresSuperadmin: true,
    },
  ];

  // Agrupar categorías por sección
  const settingsSections: CategorySection[] = [
    {
      title: 'PROJECT SETTINGS',
      categories: allCategories.filter(c => c.section === 'PROJECT SETTINGS' && (!c.requiresSuperadmin || isSuperadmin)),
    },
    {
      title: 'CONFIGURATION',
      categories: allCategories.filter(c => c.section === 'CONFIGURATION' && (!c.requiresSuperadmin || isSuperadmin)),
    },
  ];

  const categories = allCategories;

  if (loading) {
    return (
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePath = currentPath || router.pathname;

  return (
    <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200">
      <div className="sticky top-0 p-4">
        <h2 className="text-xs font-normal text-gray-500 uppercase tracking-wider mb-4">Settings</h2>
        <nav className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-normal text-gray-500 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.categories.map((category) => {
                  const isActive = activePath === category.href;

                  return (
                    <button
                      key={category.id}
                      onClick={() => router.push(category.href)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center space-x-2 transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-normal'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className={isActive ? 'text-gray-900' : 'text-gray-400'}>
                        {category.icon}
                      </span>
                      <span className="flex-1">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

