/**
 * Card de orden para Kitchen Staff
 * Diseño tipo ticket de cocina, grande y legible
 */

import { Order } from '@/lib/orders';
import KitchenTimer from './KitchenTimer';

interface KitchenOrderCardProps {
  order: Order;
  onClick: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

export default function KitchenOrderCard({ order, onClick, onStatusChange }: KitchenOrderCardProps) {
  const isPreparing = order.status === 'preparing';
  const isConfirmed = order.status === 'confirmed';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = () => {
    if (isPreparing) return 'border-orange-500 bg-orange-50';
    if (isConfirmed) return 'border-yellow-500 bg-yellow-50';
    return 'border-gray-300 bg-white';
  };

  return (
    <div
      className={`${getStatusColor()} border-2 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all`}
      onClick={onClick}
    >
      {/* Header con número de orden grande */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            #{order.order_number || order.id.slice(-8).toUpperCase()}
          </div>
          <div className="text-sm text-gray-600">
            {formatTime(order.created_at)}
          </div>
        </div>
        <KitchenTimer startTime={order.created_at} isActive={isPreparing} />
      </div>

      {/* Items del pedido */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Items:</h3>
        <div className="space-y-2">
          {order.items?.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-900 font-medium">
                {item.quantity}x {item.item_name}
              </span>
            </div>
          ))}
          {order.items && order.items.length > 5 && (
            <div className="text-xs text-gray-500 italic">
              +{order.items.length - 5} items más
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones especiales */}
      {order.items?.some(item => item.special_instructions) && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
          <div className="text-xs font-semibold text-yellow-800 mb-1">⚠️ Instrucciones Especiales:</div>
          {order.items
            .filter(item => item.special_instructions)
            .map((item, index) => (
              <div key={index} className="text-xs text-yellow-700">
                • {item.item_name}: {item.special_instructions}
              </div>
            ))}
        </div>
      )}

      {/* Acción principal */}
      <div className="pt-4 border-t border-gray-300" onClick={(e) => e.stopPropagation()}>
        {isConfirmed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(order.id, 'preparing');
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
          >
            Iniciar Preparación
          </button>
        )}
        {isPreparing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(order.id, 'ready');
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg text-lg transition-colors"
          >
            Marcar como Listo
          </button>
        )}
      </div>
    </div>
  );
}

