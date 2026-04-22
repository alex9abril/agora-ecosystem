import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService } from '@/lib/business';
import { usePermission } from '@/lib/role-guards';
import { isOperatorRole } from '@/lib/operator-permissions';
import { normalizeOperatorPermissions } from '@/lib/operator-permissions';
import type { SettingsKey } from '@/lib/operator-permissions';
import { SkeletonSettingsCards } from '@/components/ui/Skeleton';

interface ConfigurationCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  category: string;
}

const CARD_ID_TO_SETTINGS_KEY: Record<string, SettingsKey> = {
  store: 'store',
  branches: 'branches',
  wallet: 'wallet',
  vehicle: 'vehicle',
  integrations_workflows: 'branches_integrations_workflows',
  users: 'users',
  permissions: 'permissions_groups',
  emails: 'emails',
};

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, availableBusinesses, isLoading } = useSelectedBusiness();
  const canManageSettings = usePermission('canManageSettings');
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    const checkSuperadmin = async () => {
      try {
        if (selectedBusiness) {
          const businessId = selectedBusiness.business_id;
          const business = await businessService.getMyBusiness(businessId);
          if (business && business.user_role === 'superadmin') {
            setIsSuperadmin(true);
            setLoading(false);
            return;
          }
        }

        if (availableBusinesses.length > 0) {
          const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
          if (hasSuperadminRole) {
            setIsSuperadmin(true);
            setLoading(false);
            return;
          }
        }

        if (user) {
          try {
            const business = await businessService.getMyBusiness();
            if (business && business.user_role === 'superadmin') {
              setIsSuperadmin(true);
              setLoading(false);
              return;
            }
          } catch (err: any) {
            console.log('[Settings] No se pudo verificar negocio directo:', err);
          }
        }

        setIsSuperadmin(false);
      } catch (error: any) {
        console.error('Error verificando permisos:', error);
        if (error?.statusCode === 404) {
          const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
          if (hasSuperadminRole) {
            setIsSuperadmin(true);
            setLoading(false);
            return;
          }
        }
        setIsSuperadmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkSuperadmin();
    } else {
      setLoading(false);
    }
  }, [user, router, selectedBusiness?.business_id, availableBusinesses.length]);

  useEffect(() => {
    if (isLoading || loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    // Permitir acceso si es superadmin en alguna tienda aunque no tenga sucursal seleccionada
    const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
    if (!selectedBusiness && !hasSuperadminRole) {
      router.push('/');
      return;
    }
    if (!canManageSettings) router.push('/');
  }, [isLoading, loading, user, selectedBusiness, canManageSettings, availableBusinesses, router]);

  const role = selectedBusiness?.role ?? 'operations_staff';
  const isOperator = isOperatorRole(role);
  const operatorPerms = selectedBusiness?.permissions
    ? normalizeOperatorPermissions(selectedBusiness.permissions as Record<string, unknown>)
    : null;

  const canShowCard = (cardId: string): boolean => {
    if (cardId === 'users' || cardId === 'permissions' || cardId === 'emails') {
      if (isOperator && operatorPerms) {
        const key = CARD_ID_TO_SETTINGS_KEY[cardId];
        return operatorPerms.settings?.[key] === true;
      }
      return isSuperadmin;
    }
    if (isOperator && operatorPerms) {
      const key = CARD_ID_TO_SETTINGS_KEY[cardId];
      return key ? operatorPerms.settings?.[key] === true : false;
    }
    return true;
  };

  const configurationCards: ConfigurationCard[] = [
    // Configuración de Tienda
    {
      id: 'store',
      title: 'Tienda',
      description: 'Gestiona la información básica de tu tienda, ubicación y horarios',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      href: '/settings/store',
      category: 'Configuración de Tienda',
    },
    {
      id: 'branches',
      title: 'Sucursales',
      description: 'Gestiona las sucursales de tu tienda y agrega nuevas ubicaciones',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/settings/branches',
      category: 'Configuración de Tienda',
    },
    {
      id: 'wallet',
      title: 'Monedero Electrónico',
      description: 'Consulta tu saldo y el historial de transacciones de tu wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      href: '/settings/wallet',
      category: 'Configuración de Tienda',
    },
    {
      id: 'vehicle',
      title: 'Vehículos',
      description: 'Gestiona la información de vehículos para entregas',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25a1.125 1.125 0 011.125-1.125H3.75m1.5-4.5A2.25 2.25 0 016.75 9h10.5a2.25 2.25 0 011.75.75m-12 0V9a2.25 2.25 0 012.25-2.25h10.5A2.25 2.25 0 0121.75 9v.75m-8.5-3h6m-6 3h6m-6 3h6m-3-6h3m-3 3h3m-3 3h3" />
        </svg>
      ),
      href: '/settings/vehicle',
      category: 'Configuración de Tienda',
    },
    {
      id: 'integrations_workflows',
      title: 'Automatización',
      description: 'Flujos de integración, conectores MSSQL y ejecución manual para esta sucursal',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      href: '/settings/integrations-workflows',
      category: 'Configuración de Tienda',
    },
    {
      id: 'users',
      title: 'Usuarios y Permisos',
      description: 'Administra a tus empleados y sus permisos de acceso',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      href: '/settings/users',
      category: 'Configuraciones de Personal',
    },
    {
      id: 'permissions',
      title: 'Grupos de Permisos',
      description: 'Administra tus grupos de permisos y los permisos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
      href: '/settings/permissions',
      category: 'Configuraciones de Personal',
    },
    {
      id: 'emails',
      title: 'Correos',
      description: 'Gestiona los templates de correos electrónicos automáticos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      href: '/settings/emails',
      category: 'Configuraciones de Personal',
    },
  ].filter((card) => canShowCard(card.id));

  // Agrupar tarjetas por categoría
  const cardsByCategory = configurationCards.reduce((acc, card) => {
    if (!acc[card.category]) {
      acc[card.category] = [];
    }
    acc[card.category].push(card);
    return acc;
  }, {} as Record<string, ConfigurationCard[]>);

  if (loading) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 rounded bg-gray-200 dark:bg-neutral-600 animate-pulse mb-2" />
            <div className="h-4 w-96 max-w-full rounded bg-gray-200 dark:bg-neutral-600 animate-pulse" />
          </div>
          <SkeletonSettingsCards count={8} />
        </div>
      </LocalLayout>
    );
  }

  if (!canManageSettings) {
    return null;
  }

  // Definir categorías para mostrar en la vista previa
  const categories = [
    {
      id: 'store',
      name: 'Tienda',
      description: 'Gestiona la información básica de tu tienda, ubicación y horarios',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      href: '/settings/store',
    },
    {
      id: 'branches',
      name: 'Sucursales',
      description: 'Gestiona las sucursales de tu tienda y agrega nuevas ubicaciones',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      href: '/settings/branches',
    },
    {
      id: 'wallet',
      name: 'Monedero Electrónico',
      description: 'Consulta tu saldo y el historial de transacciones de tu wallet',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
      href: '/settings/wallet',
    },
    ...(isSuperadmin
      ? [
          {
            id: 'users',
            name: 'Usuarios y Permisos',
            description: 'Administra a tus empleados y sus permisos de acceso',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            ),
            href: '/settings/users',
          },
          {
            id: 'permissions',
            name: 'Grupos de Permisos',
            description: 'Administra tus grupos de permisos y los permisos',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ),
            href: '/settings/permissions',
          },
          {
            id: 'emails',
            name: 'Correos',
            description: 'Gestiona los templates de correos electrónicos automáticos',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ),
            href: '/settings/emails',
          },
        ]
      : []),
    {
      id: 'vehicle',
      name: 'Vehículos',
      description: 'Gestiona la información de vehículos para entregas',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25a1.125 1.125 0 011.125-1.125H3.75m1.5-4.5A2.25 2.25 0 016.75 9h10.5a2.25 2.25 0 011.75.75m-12 0V9a2.25 2.25 0 012.25-2.25h10.5A2.25 2.25 0 0121.75 9v.75m-8.5-3h6m-6 3h6m-6 3h6m-3-6h3m-3 3h3m-3 3h3" />
        </svg>
      ),
      href: '/settings/vehicle',
    },
    ...(canShowCard('integrations_workflows')
      ? [
          {
            id: 'integrations_workflows',
            name: 'Automatización',
            description: 'Flujos de integración y conectores para esta sucursal',
            icon: (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            ),
            href: '/settings/integrations-workflows',
          },
        ]
      : []),
  ];

  return (
    <>
      <Head>
        <title>Configuración - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="w-full min-w-0">
          {/* Header */}
          <div className="px-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona la configuración de tu tienda y personal
            </p>
          </div>

          {/* Contenido: Vista previa */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="w-full min-w-0 px-6 py-8">
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Selecciona una categoría del menú lateral para comenzar
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => router.push(category.href)}
                      className="bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6 text-left hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800/50 transition-colors">
                            {category.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-normal text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {category.name}
                          </h3>
                          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {category.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

