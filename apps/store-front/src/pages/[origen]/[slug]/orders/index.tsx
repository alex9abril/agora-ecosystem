/**
 * Página de lista de pedidos con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import OrdersPage from '../../../orders';

export default function ContextualOrdersPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <OrdersPage />;
}

