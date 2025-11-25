/**
 * Vista Kanban de órdenes para Operations Staff
 * Columnas por estado con cards arrastrables
 */

import { Order } from '@/lib/orders';
import OrderCard from './OrderCard';

interface OrdersKanbanProps {
  orders: Order[];
  onOrderClick: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

interface OrderColumn {
  status: string;
  label: string;
  color: string;
}

const columns: OrderColumn[] = [
  { status: 'pending', label: 'Pendientes', color: 'bg-red-50 border-red-200' },
  { status: 'confirmed', label: 'Confirmadas', color: 'bg-yellow-50 border-yellow-200' },
  { status: 'preparing', label: 'En Preparación', color: 'bg-orange-50 border-orange-200' },
  { status: 'ready', label: 'Listas', color: 'bg-green-50 border-green-200' },
  { status: 'in_transit', label: 'En Tránsito', color: 'bg-blue-50 border-blue-200' },
  { status: 'picked_up', label: 'Recogidas', color: 'bg-purple-50 border-purple-200' },
  { status: 'delivered', label: 'Entregadas', color: 'bg-gray-50 border-gray-200' },
];

export default function OrdersKanban({ orders, onOrderClick, onStatusChange }: OrdersKanbanProps) {
  const getOrdersByStatus = (status: string) => {
    if (status === 'in_transit') {
      return orders.filter(o => o.status === 'in_transit' || o.status === 'picked_up');
    }
    return orders.filter(o => o.status === status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
      {columns.map((column) => {
        const columnOrders = getOrdersByStatus(column.status);
        
        return (
          <div
            key={column.status}
            className={`${column.color} border rounded-lg p-4 min-w-[300px] flex flex-col`}
          >
            {/* Header de columna */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">
                {column.label}
              </h3>
              <span className="bg-white text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                {columnOrders.length}
              </span>
            </div>

            {/* Cards de órdenes */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {columnOrders.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-8">
                  No hay órdenes
                </div>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => onOrderClick(order.id)}
                    onStatusChange={onStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

