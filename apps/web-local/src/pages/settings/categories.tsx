import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import LocalLayout from '@/components/layout/LocalLayout';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import CategoriesManager from '@/components/settings/CategoriesManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { usePermission } from '@/lib/role-guards';

export default function CategoriesSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, availableBusinesses, isLoading } = useSelectedBusiness();
  const canManageSettings = usePermission('canManageSettings');

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const hasSuperadminRole = availableBusinesses.some((b) => b.role === 'superadmin');
    if (!selectedBusiness && !hasSuperadminRole) {
      router.push('/');
      return;
    }
    if (!canManageSettings) router.push('/');
  }, [availableBusinesses, canManageSettings, isLoading, router, selectedBusiness, user]);

  if (!canManageSettings) return null;

  return (
    <>
      <Head>
        <title>Categorías - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50 dark:bg-neutral-900">
          <SettingsSidebar currentPath="/settings/categories" />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col px-6 py-6">
              <div className="mb-4 shrink-0">
                <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100">Categorías</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Imagen y datos del catálogo. La foto se muestra en la tienda.
                </p>
              </div>
              <CategoriesManager />
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
