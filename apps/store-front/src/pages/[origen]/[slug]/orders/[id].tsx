/**
 * Página de detalle de pedido con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import OrderDetailPage from '../../../orders/[id]';

export default function ContextualOrderDetailPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <OrderDetailPage />;
}

