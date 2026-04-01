import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { getDefaultRouteForRole, hasPermission } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';
import { DashboardControlTower } from '@/features/dashboard/DashboardControlTower';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();

  useEffect(() => {
    if (isLoading || !selectedBusiness) return;

    const role = selectedBusiness.role as BusinessRole;
    if (role !== 'operations_staff' && role !== 'kitchen_staff') return;

    const canDashboard = hasPermission(role, 'canViewDashboard', selectedBusiness.permissions);
    if (!canDashboard) {
      router.replace(getDefaultRouteForRole(role));
    }
  }, [selectedBusiness, isLoading, router]);

  return (
    <>
      <Head>
        <title>Dashboard - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <DashboardControlTower
            businessId={selectedBusiness?.business_id}
            businessName={selectedBusiness?.business_name}
          />
        </div>
      </LocalLayout>
    </>
  );
}
