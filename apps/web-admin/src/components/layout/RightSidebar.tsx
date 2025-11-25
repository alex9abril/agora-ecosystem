import { useAuth } from '@/contexts/AuthContext';

export default function RightSidebar() {
  const { user } = useAuth();

  // Datos de ejemplo (luego se conectarán con el backend)
  const platformStats = {
    totalTiendas: 45,
    tiendasActivas: 42,
    tiendasInactivas: 3,
    totalCategorias: 12,
    categoriasActivas: 11,
  };

  const activities = [
    { id: 1, message: 'Tienda "Sushi Bar" fue deshabilitada', time: '16:21', date: '12 de nov. de 2025', type: 'warning' },
    { id: 2, message: 'Nueva tienda "Café Central" registrada', time: '16:15', date: '12 de nov. de 2025', type: 'success' },
    { id: 3, message: 'Categoría "Postres" actualizada', time: '15:50', date: '12 de nov. de 2025', type: 'info' },
    { id: 4, message: 'Pedido #342 completado exitosamente', time: '15:45', date: '12 de nov. de 2025', type: 'success' },
    { id: 5, message: 'Usuario "juan@example.com" bloqueado', time: '15:30', date: '12 de nov. de 2025', type: 'warning' },
    { id: 6, message: 'Reporte de ventas generado', time: '15:20', date: '12 de nov. de 2025', type: 'info' },
  ];

  return (
    <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="p-6">
        {/* Estadísticas de la Plataforma */}
        <div className="mb-6">
          <h3 className="text-xs font-normal text-gray-900 mb-4">Estadísticas de la Plataforma</h3>
          
          {/* Card de Tiendas */}
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Total Tiendas</p>
              <p className="text-sm font-normal text-gray-900">
                {platformStats.totalTiendas}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-green-600">Activas: {platformStats.tiendasActivas}</span>
              <span className="text-red-600">Inactivas: {platformStats.tiendasInactivas}</span>
            </div>
          </div>

          {/* Card de Categorías */}
          <div className="bg-gray-50 rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">Categorías</p>
              <p className="text-sm font-normal text-gray-900">
                {platformStats.totalCategorias}
              </p>
            </div>
            <div className="text-xs text-green-600">
              Activas: {platformStats.categoriasActivas}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="space-y-2">
            <button className="w-full px-3 py-2 text-xs font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left">
              Gestionar Tiendas
            </button>
            <button className="w-full px-3 py-2 text-xs font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left">
              Gestionar Categorías
            </button>
            <button className="w-full px-3 py-2 text-xs font-normal text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-left">
              Ver Reportes
            </button>
          </div>
        </div>

        {/* Actividad */}
        <div>
          <h3 className="text-xs font-normal text-gray-900 mb-4">Actividad</h3>
          
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-start space-x-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    activity.type === 'success' ? 'bg-green-500' :
                    activity.type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-xs font-normal text-gray-900 mb-1">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {activity.date} a las {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

