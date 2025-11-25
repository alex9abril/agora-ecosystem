/**
 * Lista de órdenes para Kitchen Staff
 * Vista vertical tipo ticket de cocina
 */

import { Order } from '@/lib/orders';
import KitchenOrderCard from './KitchenOrderCard';

interface KitchenOrderListProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

export default function KitchenOrderList({ orders, onOrderClick, onStatusChange }: KitchenOrderListProps) {
  // Separar órdenes por estado
  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Órdenes en preparación (prioridad) */}
      {preparingOrders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            En Preparación ({preparingOrders.length})
          </h2>
          <div className="space-y-4">
            {preparingOrders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onClick={() => onOrderClick(order.id)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Órdenes confirmadas (esperando) */}
      {confirmedOrders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            Confirmadas - Esperando Preparación ({confirmedOrders.length})
          </h2>
          <div className="space-y-4">
            {confirmedOrders.map((order) => (
              <KitchenOrderCard
                key={order.id}
                order={order}
                onClick={() => onOrderClick(order.id)}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

