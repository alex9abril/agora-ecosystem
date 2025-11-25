/**
 * Dashboard de estadísticas para Operations Staff
 * Muestra métricas en tiempo real
 */

interface OperationsDashboardProps {
  stats: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    in_transit: number;
    totalRevenue: number;
  };
  loading: boolean;
}

export default function OperationsDashboard({ stats, loading }: OperationsDashboardProps) {
  const statCards = [
    {
      label: 'Pendientes',
      value: stats.pending,
      color: 'bg-red-50 border-red-200 text-red-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Confirmadas',
      value: stats.confirmed,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'En Preparación',
      value: stats.preparing,
      color: 'bg-orange-50 border-orange-200 text-orange-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Listas',
      value: stats.ready,
      color: 'bg-green-50 border-green-200 text-green-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'En Tránsito',
      value: stats.in_transit,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: 'Ingresos Hoy',
      value: `$${stats.totalRevenue.toFixed(2)}`,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`${card.color} border rounded-lg p-4 flex items-center gap-3`}
          >
            <div className="flex-shrink-0">
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium opacity-75 mb-1">
                {card.label}
              </div>
              <div className="text-xl font-bold">
                {loading ? '...' : card.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

