import { ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService } from '@/lib/business';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import BusinessSetupWizard from '../BusinessSetupWizard';
import BusinessSelector from '../BusinessSelector';

interface LocalLayoutProps {
  children: ReactNode;
}

export default function LocalLayout({ children }: LocalLayoutProps) {
  const { isAuthenticated, loading, token, user } = useAuth();
  const { selectedBusiness, availableBusinesses, isLoading: loadingBusinesses } = useSelectedBusiness();
  const router = useRouter();
  const [checkingBusiness, setCheckingBusiness] = useState(true);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [userRole, setUserRole] = useState<'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff' | null>(null);
  const isValidatingRef = useRef(false);

  // Si no está autenticado Y ya terminó de cargar completamente, redirigir al login
  // Esto evita redirecciones prematuras mientras se carga desde localStorage
  // IMPORTANTE: useEffect debe llamarse antes de cualquier return condicional
  useEffect(() => {
    // Solo redirigir si realmente no hay sesión después de cargar
    if (!loading && !token && !user) {
      console.log('[LocalLayout] No hay sesión, redirigiendo al login');
      router.push('/auth/login');
    }
  }, [loading, token, user, router]);

  // Verificar tiendas asignadas y validar acceso según el rol
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const validateAccess = async () => {
      // Solo ejecutar si tenemos todos los datos necesarios y no estamos ya verificando
      if (!loading && token && user && !loadingBusinesses && !isValidatingRef.current) {
        isValidatingRef.current = true;
        try {
          setCheckingBusiness(true);
          
          // Timeout de seguridad: si la validación tarda más de 15 segundos, cancelar
          timeoutId = setTimeout(() => {
            console.warn('[LocalLayout] Timeout en validación de acceso, continuando...');
            setCheckingBusiness(false);
            isValidatingRef.current = false;
          }, 15000);
          
          // Obtener el rol del usuario desde las tiendas disponibles
          // Si tiene tiendas, el rol será el de la primera tienda (o la seleccionada)
          let role: 'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff' | null = null;
          
          if (availableBusinesses.length > 0) {
            // Usar el rol de la tienda seleccionada, o de la primera disponible
            const businessToCheck = selectedBusiness || availableBusinesses[0];
            role = businessToCheck.role;
            setUserRole(role);
            
            // Si tiene tiendas, permitir acceso
            setHasBusiness(true);
            setShowWizard(false);
          } else {
            // Si no tiene tiendas, intentar obtener el rol desde getMyBusiness (para superadmin)
            // Solo si es superadmin puede no tener tiendas
            try {
              const business = await businessService.getMyBusiness();
              if (business?.user_role) {
                role = business.user_role;
                setUserRole(role);
                
                // Si tiene negocio pero no está en availableBusinesses, permitir acceso
                setHasBusiness(true);
                setShowWizard(false);
              } else {
                // No tiene negocio, pero podría ser superadmin sin tiendas
                role = null;
                setUserRole(null);
                setHasBusiness(false);
                setShowWizard(true);
              }
            } catch (err: any) {
              // Si es 404, el usuario no tiene negocio
              if (err?.statusCode === 404) {
                console.log('[LocalLayout] Usuario no tiene negocio (404) - puede ser superadmin');
                // Asumir que puede ser superadmin sin tiendas
                role = null;
                setUserRole(null);
                setHasBusiness(false);
                setShowWizard(true);
              } else {
                // Otro error, no permitir acceso
                console.error('[LocalLayout] Error obteniendo negocio:', err);
                role = null;
                setUserRole(null);
                setHasBusiness(false);
                setShowWizard(false);
              }
            }
          }

          // Validaciones finales según el rol
          if (role === 'superadmin') {
            // Superadmin puede crear tiendas si no tiene ninguna
            if (availableBusinesses.length === 0) {
              setHasBusiness(false);
              setShowWizard(true);
            }
          } else if (role && ['admin', 'operations_staff', 'kitchen_staff'].includes(role)) {
            // admin, operations_staff, kitchen_staff: DEBEN tener al menos 1 tienda
            if (availableBusinesses.length === 0) {
              // No tiene tiendas: bloquear acceso
              setHasBusiness(false);
              setShowWizard(false);
            } else {
              // Tiene tiendas: permitir acceso
              setHasBusiness(true);
              setShowWizard(false);
            }
          } else if (!role) {
            // Rol desconocido o sin rol: asumir que puede ser superadmin
            setHasBusiness(false);
            setShowWizard(true);
          }
          
          // Limpiar timeout si todo salió bien
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          } catch (error: any) {
            console.error('[LocalLayout] Error validando acceso:', error);
            
            if (error?.statusCode === 401) {
              router.push('/auth/login');
              return;
            }
            
            setHasBusiness(false);
            setShowWizard(false);
          } finally {
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            setCheckingBusiness(false);
            isValidatingRef.current = false;
          }
        }
      };

    validateAccess();
    
    // Cleanup: limpiar timeout si el componente se desmonta o cambian las dependencias
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, token, user, loadingBusinesses, availableBusinesses.length, selectedBusiness?.business_id]);

  // Mostrar loading mientras se verifica autenticación o negocio
  if (loading || checkingBusiness || loadingBusinesses) {
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

  // Validar acceso según el rol
  // Superadmin: puede entrar sin tienda (para crear)
  // Otros roles: DEBEN tener al menos 1 tienda
  if (userRole && ['admin', 'operations_staff', 'kitchen_staff'].includes(userRole)) {
    if (availableBusinesses.length === 0) {
      // No tiene tiendas: mostrar mensaje y bloquear acceso
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No tienes tiendas asignadas
            </h2>
            <p className="text-gray-600 mb-6">
              No tienes acceso a ninguna tienda. Por favor, contacta al administrador para que te asigne una tienda.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      );
    }

    // Si tiene múltiples tiendas y no hay una seleccionada, mostrar selector
    // PERO solo si el usuario no eligió modo global previamente
    if (availableBusinesses.length > 1 && !selectedBusiness) {
      const globalMode = typeof window !== 'undefined' ? localStorage.getItem('localia_global_mode') === 'true' : false;
      if (!globalMode) {
        return <BusinessSelector />;
      }
      // Si eligió modo global, continuar sin mostrar selector
    }

    // Si tiene una tienda pero no está seleccionada (no debería pasar, pero por si acaso)
    if (availableBusinesses.length === 1 && !selectedBusiness) {
      // El contexto debería autoseleccionarla, pero si no, esperar un momento
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Configurando tienda...</p>
          </div>
        </div>
      );
    }
  }

  const handleWizardComplete = () => {
    setShowWizard(false);
    setHasBusiness(true);
    // Recargar la página para actualizar el estado
    window.location.reload();
  };

  // Si debe mostrar el wizard (usuario sin negocio que puede ser superadmin)
  if (showWizard && !hasBusiness && (userRole === 'superadmin' || userRole === null)) {
    return <BusinessSetupWizard onComplete={handleWizardComplete} />;
  }

  // Si es superadmin y tiene múltiples tiendas sin seleccionar, mostrar selector
  // PERO solo si el usuario no eligió modo global previamente
  if (userRole === 'superadmin' && availableBusinesses.length > 1 && !selectedBusiness) {
    const globalMode = typeof window !== 'undefined' ? localStorage.getItem('localia_global_mode') === 'true' : false;
    if (!globalMode) {
      return <BusinessSelector />;
    }
    // Si eligió modo global, continuar sin mostrar selector
  }

  // Si tiene tienda seleccionada, es superadmin (puede trabajar sin tienda), o tiene una sola tienda, mostrar layout normal
  if (selectedBusiness || userRole === 'superadmin' || availableBusinesses.length === 1) {
    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar izquierdo */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar />

          {/* Contenido principal */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Si llegamos aquí y no hay negocio ni rol conocido, mostrar mensaje
  // Esto no debería pasar normalmente, pero es un fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuración requerida
        </h2>
        <p className="text-gray-600 mb-6">
          Por favor, configura tu negocio para continuar.
        </p>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Configurar Negocio
        </button>
      </div>
    </div>
  );
}

