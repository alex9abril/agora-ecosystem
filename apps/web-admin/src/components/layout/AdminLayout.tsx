import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, loading, token, user } = useAuth();
  const router = useRouter();

  // Si no está autenticado Y ya terminó de cargar completamente, redirigir al login
  // Esto evita redirecciones prematuras mientras se carga desde localStorage
  // IMPORTANTE: useEffect debe llamarse antes de cualquier return condicional
  useEffect(() => {
    // Solo redirigir si realmente no hay sesión después de cargar
    if (!loading && !token && !user) {
      console.log('[AdminLayout] No hay sesión, redirigiendo al login');
      router.push('/auth/login');
    }
  }, [loading, token, user, router]);

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay token ni usuario después de cargar, mostrar nada (useEffect redirigirá)
  if (!token && !user) {
    return null;
  }

  // Si hay token o usuario, mostrar el layout (incluso si isAuthenticated es false temporalmente)
  // Esto permite que la sesión se restaure sin redireccionar

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar izquierdo */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar />

        {/* Contenido con sidebar derecho */}
        <div className="flex-1 flex overflow-hidden">
          {/* Contenido principal */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>

          {/* Sidebar derecho */}
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

