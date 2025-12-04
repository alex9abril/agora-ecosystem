/**
 * Guards y hooks para protección de rutas basadas en roles
 */

import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { BusinessRole, hasPermission, canAccessRoute, getDefaultRouteForRole } from './permissions';

/**
 * Hook para verificar si el usuario tiene un permiso específico
 */
export function usePermission(permission: keyof import('./permissions').RolePermissions): boolean {
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  
  // Si no hay tienda seleccionada pero hay tiendas disponibles con rol superadmin, usar superadmin
  const hasSuperadminRole = availableBusinesses.some(b => b.role === 'superadmin');
  const role = (selectedBusiness?.role || (hasSuperadminRole ? 'superadmin' : 'operations_staff')) as BusinessRole;
  return hasPermission(role, permission);
}

/**
 * Hook para proteger una ruta basada en permisos
 */
export function useRouteGuard(requiredPermission: keyof import('./permissions').RolePermissions) {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();

  useEffect(() => {
    if (isLoading) return;

    if (!selectedBusiness) {
      router.push('/auth/login');
      return;
    }

    const role = selectedBusiness.role as BusinessRole;
    const hasAccess = hasPermission(role, requiredPermission);

    if (!hasAccess) {
      router.push('/unauthorized');
    }
  }, [selectedBusiness, isLoading, requiredPermission, router]);
}

/**
 * Hook para proteger una ruta basada en la ruta misma
 */
export function useRouteAccessGuard() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();

  useEffect(() => {
    if (isLoading) return;

    if (!selectedBusiness) {
      router.push('/auth/login');
      return;
    }

    const role = selectedBusiness.role as BusinessRole;
    const currentRoute = router.pathname;
    const hasAccess = canAccessRoute(role, currentRoute);

    if (!hasAccess) {
      router.push('/unauthorized');
    }
  }, [selectedBusiness, isLoading, router.pathname, router]);
}

/**
 * Hook para redirigir al usuario a su ruta por defecto según su rol
 */
export function useRoleRedirect() {
  const router = useRouter();
  const { selectedBusiness, isLoading } = useSelectedBusiness();

  useEffect(() => {
    if (isLoading) return;

    if (!selectedBusiness) {
      return;
    }

    const role = selectedBusiness.role as BusinessRole;
    const defaultRoute = getDefaultRouteForRole(role);
    const currentRoute = router.pathname;

    // Solo redirigir si está en la raíz o en una ruta no permitida
    if (currentRoute === '/' || currentRoute === '/dashboard') {
      router.push(defaultRoute);
    }
  }, [selectedBusiness, isLoading, router]);
}

/**
 * Componente wrapper para proteger rutas
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: keyof import('./permissions').RolePermissions
) {
  return function ProtectedComponent(props: P) {
    useRouteGuard(requiredPermission);
    return <Component {...props} />;
  };
}

