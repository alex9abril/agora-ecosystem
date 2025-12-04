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
    // Si aún está cargando la autenticación, esperar
    if (authLoading) return;

    // Si no está autenticado, redirigir inmediatamente al login
    // No esperar a que termine businessLoading
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Si está autenticado, esperar a que termine businessLoading para decidir la ruta
    if (businessLoading) return;

    // Usuario autenticado y business cargado: decidir ruta
    if (selectedBusiness) {
      const role = selectedBusiness.role as BusinessRole;
      const defaultRoute = getDefaultRouteForRole(role);
      router.push(defaultRoute);
    } else {
      // Si no hay negocio seleccionado, ir al dashboard
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, selectedBusiness, businessLoading, router]);

  // Timeout de seguridad: si pasa más de 5 segundos y no está autenticado, redirigir al login
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!authLoading && !isAuthenticated) {
        console.log('[HomePage] Timeout: redirigiendo al login');
        router.push('/auth/login');
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [authLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}
