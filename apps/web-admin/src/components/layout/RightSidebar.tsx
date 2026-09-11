import { useLayoutShell } from './layout-shell';

export default function RightSidebar() {
  const { rightOpen, setRightOpen } = useLayoutShell();

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
    <>
      {rightOpen && (
        <button
          type="button"
          aria-label="Cerrar panel"
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
          onClick={() => setRightOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[min(100vw,20rem)] bg-white border-l border-gray-200 overflow-y-auto transition-transform duration-200 xl:static xl:z-auto xl:w-72 xl:translate-x-0 ${
          rightOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'
        }`}
      >
        <div className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4 xl:hidden">
            <h3 className="text-xs font-normal text-gray-900">Panel</h3>
            <button
              type="button"
              onClick={() => setRightOpen(false)}
              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Cerrar panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-xs font-normal text-gray-900 mb-4">Estadísticas de la Plataforma</h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-gray-600">Total Tiendas</p>
                <p className="text-sm font-normal text-gray-900">{platformStats.totalTiendas}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                <span className="text-green-600">Activas: {platformStats.tiendasActivas}</span>
                <span className="text-red-600">Inactivas: {platformStats.tiendasInactivas}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-gray-600">Categorías</p>
                <p className="text-sm font-normal text-gray-900">{platformStats.totalCategorias}</p>
              </div>
              <div className="text-xs text-green-600">Activas: {platformStats.categoriasActivas}</div>
            </div>

            <div className="space-y-2">
              <button className="w-full px-3 py-2 text-xs font-normal text-white bg-black rounded-md hover:bg-gray-800 text-left">
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

          <div>
            <h3 className="text-xs font-normal text-gray-900 mb-4">Actividad</h3>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-start space-x-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        activity.type === 'success'
                          ? 'bg-green-500'
                          : activity.type === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-normal text-gray-900 mb-1 break-words">{activity.message}</p>
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
    </>
  );
}
