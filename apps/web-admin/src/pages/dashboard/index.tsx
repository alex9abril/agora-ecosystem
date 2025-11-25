import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';

export default function DashboardPage() {
  // Datos de ejemplo (luego se conectarán con el backend)
  const kpis = {
    totalVentas: { valor: 125000, cambio: 12.5, periodo: 'este mes' },
    totalPedidos: { valor: 342, cambio: 8.3, periodo: 'esta semana' },
    tiendasActivas: { valor: 45, cambio: 3, periodo: 'este mes' },
    repartidoresActivos: { valor: 28, cambio: -2, periodo: 'esta semana' },
    usuariosActivos: { valor: 1234, cambio: 15.2, periodo: 'este mes' },
    tasaCompletitud: { valor: 94.5, cambio: 2.1, periodo: 'esta semana' },
  };

  const ventasPorTienda = [
    { id: 1, nombre: 'Restaurante La Roma', ventas: 45000, pedidos: 120, estado: 'activa' },
    { id: 2, nombre: 'Café Central', ventas: 32000, pedidos: 85, estado: 'activa' },
    { id: 3, nombre: 'Pizzería Italiana', ventas: 28000, pedidos: 75, estado: 'activa' },
    { id: 4, nombre: 'Sushi Bar', ventas: 15000, pedidos: 45, estado: 'inactiva' },
    { id: 5, nombre: 'Tacos El Patrón', ventas: 5000, pedidos: 17, estado: 'activa' },
  ];

  const ventasPorCategoria = [
    { categoria: 'Comida Rápida', ventas: 55000, porcentaje: 44 },
    { categoria: 'Restaurantes', ventas: 42000, porcentaje: 33.6 },
    { categoria: 'Bebidas', ventas: 18000, porcentaje: 14.4 },
    { categoria: 'Postres', ventas: 10000, porcentaje: 8 },
  ];

  return (
    <>
      <Head>
        <title>Dashboard - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* KPIs Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Total Ventas */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Total Ventas</p>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                ${kpis.totalVentas.valor.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-green-600">
                +{kpis.totalVentas.cambio}% {kpis.totalVentas.periodo}
              </p>
            </div>

            {/* Total Pedidos */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Total Pedidos</p>
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                {kpis.totalPedidos.valor}
              </p>
              <p className="text-xs text-green-600">
                +{kpis.totalPedidos.cambio}% {kpis.totalPedidos.periodo}
              </p>
            </div>

            {/* Tiendas Activas */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Tiendas Activas</p>
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                {kpis.tiendasActivas.valor}
              </p>
              <p className="text-xs text-green-600">
                +{kpis.tiendasActivas.cambio} {kpis.tiendasActivas.periodo}
              </p>
            </div>

            {/* Repartidores Activos */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Repartidores Activos</p>
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                {kpis.repartidoresActivos.valor}
              </p>
              <p className="text-xs text-red-600">
                {kpis.repartidoresActivos.cambio} {kpis.repartidoresActivos.periodo}
              </p>
            </div>

            {/* Usuarios Activos */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Usuarios Activos</p>
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                {kpis.usuariosActivos.valor.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-green-600">
                +{kpis.usuariosActivos.cambio}% {kpis.usuariosActivos.periodo}
              </p>
            </div>

            {/* Tasa de Completitud */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600">Tasa de Completitud</p>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-normal text-gray-900 mb-1">
                {kpis.tasaCompletitud.valor}%
              </p>
              <p className="text-xs text-green-600">
                +{kpis.tasaCompletitud.cambio}% {kpis.tasaCompletitud.periodo}
              </p>
            </div>
          </div>

          {/* Tablas de Información */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Tabla: Ventas por Tienda */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-normal text-gray-900">Ventas por Tienda</h3>
                <button className="text-xs text-indigo-600 hover:text-indigo-700">
                  Ver todas
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-normal text-gray-600">Tienda</th>
                      <th className="text-right py-2 px-3 text-xs font-normal text-gray-600">Ventas</th>
                      <th className="text-right py-2 px-3 text-xs font-normal text-gray-600">Pedidos</th>
                      <th className="text-center py-2 px-3 text-xs font-normal text-gray-600">Estado</th>
                      <th className="text-center py-2 px-3 text-xs font-normal text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasPorTienda.map((tienda) => (
                      <tr key={tienda.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs font-normal text-gray-900">{tienda.nombre}</td>
                        <td className="py-2 px-3 text-xs font-normal text-gray-900 text-right">
                          ${tienda.ventas.toLocaleString('es-MX')}
                        </td>
                        <td className="py-2 px-3 text-xs font-normal text-gray-900 text-right">
                          {tienda.pedidos}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-normal ${
                            tienda.estado === 'activa' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tienda.estado === 'activa' ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button className="text-xs text-indigo-600 hover:text-indigo-700">
                            {tienda.estado === 'activa' ? 'Deshabilitar' : 'Habilitar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico: Ventas por Categoría */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-normal text-gray-900">Ventas por Categoría</h3>
                <button className="text-xs text-indigo-600 hover:text-indigo-700">
                  Ver reporte
                </button>
              </div>
              <div className="space-y-3">
                {ventasPorCategoria.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-normal text-gray-900">{item.categoria}</span>
                      <span className="text-xs font-normal text-gray-600">
                        ${item.ventas.toLocaleString('es-MX')} ({item.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${item.porcentaje}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

