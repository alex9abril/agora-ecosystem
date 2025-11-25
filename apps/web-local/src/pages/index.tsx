import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { selectedBusiness, isLoading: businessLoading } = useSelectedBusiness();

  useEffect(() => {
    if (authLoading || businessLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (selectedBusiness) {
      const role = selectedBusiness.role as BusinessRole;
      const defaultRoute = getDefaultRouteForRole(role);
      router.push(defaultRoute);
    } else {
      // Si no hay negocio seleccionado, ir al dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, selectedBusiness, businessLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}
