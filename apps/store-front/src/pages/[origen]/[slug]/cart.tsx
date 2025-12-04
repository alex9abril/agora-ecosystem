/**
 * Página de carrito con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import CartPage from '../../cart';

export default function ContextualCartPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <CartPage />;
}

