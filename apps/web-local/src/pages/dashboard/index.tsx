import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { BusinessRole } from '@/lib/users';
import { businessService, BusinessGroup, Business } from '@/lib/business';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();
  const { user } = useAuth();
  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [branches, setBranches] = useState<Business[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);

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

  // Cargar grupo empresarial y sucursales
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        // Cargar grupo empresarial
        setLoadingGroup(true);
        const group = await businessService.getMyBusinessGroup();
        setBusinessGroup(group);

        // Cargar sucursales
        setLoadingBranches(true);
        const allBranches = await businessService.getAllBranches(user.id);
        setBranches(allBranches);
      } catch (error: any) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoadingGroup(false);
        setLoadingBranches(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Si es superadmin o admin, mostrar dashboard normal
  return (
    <>
      <Head>
        <title>Dashboard - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Bienvenido a tu panel de control de LOCALIA Local.</p>
          </div>

          {/* Grupo Empresarial */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Grupo Empresarial</h2>
            {loadingGroup ? (
              <div className="flex items-center text-gray-500">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando información del grupo...
              </div>
            ) : businessGroup ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nombre del Grupo</p>
                  <p className="text-lg text-gray-900">{businessGroup.name}</p>
                </div>
                {businessGroup.legal_name && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Razón Social</p>
                    <p className="text-gray-900">{businessGroup.legal_name}</p>
                  </div>
                )}
                {businessGroup.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Descripción</p>
                    <p className="text-gray-900">{businessGroup.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    businessGroup.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {businessGroup.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">
                <p>No tienes un grupo empresarial configurado.</p>
                <a 
                  href="/settings/store" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2 inline-block"
                >
                  Crear grupo empresarial →
                </a>
              </div>
            )}
          </div>

          {/* Sucursales */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sucursales</h2>
              <span className="text-sm text-gray-500">
                {loadingBranches ? 'Cargando...' : `${branches.length} sucursal${branches.length !== 1 ? 'es' : ''}`}
              </span>
            </div>
            {loadingBranches ? (
              <div className="flex items-center text-gray-500">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando sucursales...
              </div>
            ) : branches.length > 0 ? (
              <div className="space-y-3">
                {branches.map((branch) => (
                  <div 
                    key={branch.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-gray-900">{branch.name}</h3>
                        {branch.legal_name && (
                          <p className="text-sm text-gray-600 mt-1">{branch.legal_name}</p>
                        )}
                        {branch.business_group_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            Grupo: <span className="font-medium">{branch.business_group_name}</span>
                          </p>
                        )}
                        {branch.business_address && (
                          <p className="text-sm text-gray-600 mt-1">{branch.business_address}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          branch.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {branch.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                        {branch.user_role && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {branch.user_role === 'superadmin' ? 'Super Admin' : 
                             branch.user_role === 'admin' ? 'Admin' :
                             branch.user_role === 'operations_staff' ? 'Operaciones' :
                             branch.user_role === 'kitchen_staff' ? 'Cocina' : branch.user_role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <p>No tienes sucursales registradas.</p>
                <a 
                  href="/settings/branches" 
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mt-2 inline-block"
                >
                  Agregar sucursal →
                </a>
              </div>
            )}
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

