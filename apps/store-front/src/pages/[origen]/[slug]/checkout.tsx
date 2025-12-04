/**
 * Página de checkout con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import CheckoutPage from '../../checkout';

export default function ContextualCheckoutPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <CheckoutPage />;
}

