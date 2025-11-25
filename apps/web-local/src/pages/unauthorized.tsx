/**
 * Página de acceso no autorizado
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();

  const handleGoBack = () => {
    if (selectedBusiness) {
      const role = selectedBusiness.role as BusinessRole;
      const defaultRoute = getDefaultRouteForRole(role);
      router.push(defaultRoute);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>Acceso No Autorizado - LOCALIA Local</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso No Autorizado</h1>
          <p className="text-gray-600 mb-6">
            No tienes permisos para acceder a esta sección.
          </p>
          <button
            onClick={handleGoBack}
            className="w-full bg-black text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Volver al Panel
          </button>
        </div>
      </div>
    </>
  );
}

