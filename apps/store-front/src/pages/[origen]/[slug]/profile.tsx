/**
 * Página de perfil con contexto (grupo/sucursal)
 * Reutiliza la misma lógica pero con contexto
 */

import ProfilePage from '../../profile';

export default function ContextualProfilePage() {
  // Reutilizar la misma página, el contexto se maneja automáticamente
  return <ProfilePage />;
}


