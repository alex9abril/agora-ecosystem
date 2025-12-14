/**
 * Card de orden para Operations Staff
 * Diseño compacto y operativo
 */

import { Order } from '@/lib/orders';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

export default function OrderCard({ order, onClick, onStatusChange }: OrderCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-red-100 text-red-800',
      confirmed: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-green-100 text-green-800',
      in_transit: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      preparing: 'Preparando',
      ready: 'Lista',
      in_transit: 'En tránsito',
      picked_up: 'Recogida',
      delivered: 'Entregada',
    };
    return labels[status] || status;
  };

  const getAvailableActions = (status: string) => {
    const actions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
      pending: [
        { label: 'Aceptar', nextStatus: 'confirmed', color: 'bg-green-600 hover:bg-green-700' },
        { label: 'Rechazar', nextStatus: 'cancelled', color: 'bg-red-600 hover:bg-red-700' },
      ],
      confirmed: [
        { label: 'Preparar', nextStatus: 'preparing', color: 'bg-orange-600 hover:bg-orange-700' },
      ],
      preparing: [
        { label: 'Marcar Listo', nextStatus: 'ready', color: 'bg-green-600 hover:bg-green-700' },
      ],
      ready: [
        { label: 'Entregar', nextStatus: 'delivered', color: 'bg-blue-600 hover:bg-blue-700' },
      ],
    };
    return actions[status] || [];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `Hace ${diffHours}h`;
  };

  const availableActions = getAvailableActions(order.status);

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              #{order.order_number || order.id.slice(-8).toUpperCase()}
            </span>
            <span className={`${getStatusColor(order.status)} text-xs font-medium px-2 py-0.5 rounded-full`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {order.client_first_name} {order.client_last_name}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {formatTime(order.created_at)}
        </div>
      </div>

      {/* Items count */}
      <div className="text-xs text-gray-600 mb-3">
        {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-600">Total</span>
        <span className="font-semibold text-gray-900">
          ${parseFloat(String(order.total_amount || order.total || 0)).toFixed(2)}
        </span>
      </div>

      {/* Acciones rápidas */}
      {availableActions.length > 0 && (
        <div className="flex gap-2 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
          {availableActions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(order.id, action.nextStatus);
              }}
              className={`${action.color} text-white text-xs font-medium px-3 py-1.5 rounded flex-1 transition-colors`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

