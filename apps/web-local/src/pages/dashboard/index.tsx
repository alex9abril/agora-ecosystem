import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();

  useEffect(() => {
    if (isLoading) return;

    if (selectedBusiness) {
      const role = selectedBusiness.role as BusinessRole;
      const defaultRoute = getDefaultRouteForRole(role);
      
      // Solo redirigir si no es superadmin o admin
      if (role === 'operations_staff' || role === 'kitchen_staff') {
        router.push(defaultRoute);
      }
    }
  }, [selectedBusiness, isLoading, router]);

  // Si es superadmin o admin, mostrar dashboard normal
  return (
    <>
      <Head>
        <title>Dashboard - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
          <p className="text-gray-600">Bienvenido a tu panel de control de LOCALIA Local.</p>
        </div>
      </LocalLayout>
    </>
  );
}

