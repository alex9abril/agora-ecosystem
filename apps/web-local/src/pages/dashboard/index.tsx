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
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');

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
        <title>Dashboard - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-normal text-gray-900">Dashboard</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPeriod('today')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'today'
                      ? 'bg-indigo-100 text-indigo-700 font-normal'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setSelectedPeriod('week')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'week'
                      ? 'bg-indigo-100 text-indigo-700 font-normal'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setSelectedPeriod('month')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'month'
                      ? 'bg-indigo-100 text-indigo-700 font-normal'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setSelectedPeriod('year')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedPeriod === 'year'
                      ? 'bg-indigo-100 text-indigo-700 font-normal'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Año
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">Bienvenido a tu panel de control de AGORA Local.</p>
          </div>

          {/* Métricas Principales - KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Ingresos Totales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-normal text-gray-600">Ingresos Totales</p>
                <div className="p-2 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-normal text-gray-900 mb-1">$125,450.00</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-green-600">+12.5%</span>
                <span className="text-xs font-normal text-gray-500">vs mes anterior</span>
              </div>
            </div>

            {/* Órdenes Totales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-normal text-gray-600">Órdenes Totales</p>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-normal text-gray-900 mb-1">1,247</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-green-600">+8.3%</span>
                <span className="text-xs font-normal text-gray-500">vs mes anterior</span>
              </div>
            </div>

            {/* Ticket Promedio */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-normal text-gray-600">Ticket Promedio</p>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-normal text-gray-900 mb-1">$100.60</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-green-600">+4.2%</span>
                <span className="text-xs font-normal text-gray-500">vs mes anterior</span>
              </div>
            </div>

            {/* Clientes Activos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-normal text-gray-600">Clientes Activos</p>
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-normal text-gray-900 mb-1">892</h3>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-green-600">+15.7%</span>
                <span className="text-xs font-normal text-gray-500">vs mes anterior</span>
              </div>
            </div>
          </div>

          {/* Gráfica de Tendencia de Ventas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-normal text-gray-900">Tendencia de Ventas</h2>
                <p className="text-sm text-gray-500 mt-1">Ingresos por día en los últimos 30 días</p>
              </div>
            </div>
            {/* Gráfica de línea simulada */}
            <div className="h-64 flex items-end justify-between gap-2">
              {Array.from({ length: 30 }).map((_, i) => {
                const height = Math.random() * 60 + 20;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`Día ${i + 1}: $${(height * 100).toFixed(0)}`}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Hace 30 días</span>
              <span>Hoy</span>
            </div>
          </div>

          {/* Métricas Secundarias y Productos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Distribución de Pedidos por Estado */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-normal text-gray-900 mb-6">Estado de Pedidos</h2>
              <div className="space-y-4">
                {[
                  { label: 'Pendientes', value: 23, color: 'bg-yellow-500', percentage: 18 },
                  { label: 'Confirmados', value: 45, color: 'bg-blue-500', percentage: 36 },
                  { label: 'En Preparación', value: 32, color: 'bg-purple-500', percentage: 26 },
                  { label: 'En Tránsito', value: 15, color: 'bg-indigo-500', percentage: 12 },
                  { label: 'Entregados', value: 1132, color: 'bg-green-500', percentage: 91 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-normal text-gray-700">{item.label}</span>
                      <span className="text-sm font-normal text-gray-900">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Productos Más Vendidos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-normal text-gray-900 mb-6">Productos Más Vendidos</h2>
              <div className="space-y-4">
                {[
                  { name: 'Refacciones Premium', sales: 234, revenue: '$23,450' },
                  { name: 'Aceite Motor 5W-30', sales: 189, revenue: '$18,900' },
                  { name: 'Filtro de Aire', sales: 156, revenue: '$7,800' },
                  { name: 'Pastillas de Freno', sales: 142, revenue: '$14,200' },
                  { name: 'Batería Automotriz', sales: 98, revenue: '$19,600' },
                ].map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-normal">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-normal text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sales} ventas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-normal text-gray-900">{product.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Métricas Adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Tasa de Conversión */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900">Tasa de Conversión</h3>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-normal text-gray-900 mb-2">3.2%</div>
                <p className="text-xs text-gray-500">Visitas convertidas en pedidos</p>
              </div>
            </div>

            {/* Tiempo Promedio de Entrega */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900">Tiempo Promedio</h3>
                <div className="p-2 bg-teal-50 rounded-lg">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-normal text-gray-900 mb-2">2.5h</div>
                <p className="text-xs text-gray-500">Tiempo promedio de entrega</p>
              </div>
            </div>

            {/* Clientes Nuevos vs Recurrentes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-normal text-gray-900">Clientes</h3>
                <div className="p-2 bg-pink-50 rounded-lg">
                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-normal text-gray-600">Nuevos</span>
                    <span className="text-sm font-normal text-gray-900">234 (26%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '26%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-normal text-gray-600">Recurrentes</span>
                    <span className="text-sm font-normal text-gray-900">658 (74%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '74%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información del Grupo y Sucursales (mantener del original) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grupo Empresarial */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-normal text-gray-900 mb-4">Grupo Empresarial</h2>
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
                    <p className="text-sm font-normal text-gray-700">Nombre del Grupo</p>
                    <p className="text-base text-gray-900">{businessGroup.name}</p>
                  </div>
                  {businessGroup.legal_name && (
                    <div>
                      <p className="text-sm font-normal text-gray-700">Razón Social</p>
                      <p className="text-base text-gray-900">{businessGroup.legal_name}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
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
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-normal mt-2 inline-block"
                  >
                    Crear grupo empresarial →
                  </a>
                </div>
              )}
            </div>

            {/* Sucursales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-normal text-gray-900">Sucursales</h2>
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
                  {branches.slice(0, 3).map((branch) => (
                    <div 
                      key={branch.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-base font-normal text-gray-900">{branch.name}</h3>
                          {branch.business_address && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">{branch.business_address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                            branch.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {branch.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {branches.length > 3 && (
                    <a 
                      href="/settings/branches" 
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-normal inline-block"
                    >
                      Ver todas las sucursales →
                    </a>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <p>No tienes sucursales registradas.</p>
                  <a 
                    href="/settings/branches" 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-normal mt-2 inline-block"
                  >
                    Agregar sucursal →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}
