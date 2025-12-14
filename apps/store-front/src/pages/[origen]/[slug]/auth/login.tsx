/**
 * Página de login con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import LoginPage from '../../../auth/login';

export default function ContextualLoginPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <LoginPage />;
}


