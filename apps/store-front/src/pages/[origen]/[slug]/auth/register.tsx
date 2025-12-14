/**
 * Página de registro con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import RegisterPage from '../../../auth/register';

export default function ContextualRegisterPage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <RegisterPage />;
}


