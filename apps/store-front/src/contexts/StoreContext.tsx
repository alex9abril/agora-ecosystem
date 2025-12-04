/**
 * Contexto de navegación del store-front
 * Maneja el contexto de navegación: global, grupo o sucursal
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';
import { businessGroupsService } from '@/lib/business-groups';
import { branchesService } from '@/lib/branches';

export type StoreContextType = 'global' | 'grupo' | 'sucursal';

export interface BusinessGroup {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  tax_id?: string;
  is_active: boolean;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_group_id?: string;
  description?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

interface StoreContextValue {
  // Estado del contexto
  contextType: StoreContextType;
  slug: string | null;
  groupId: string | null;
  branchId: string | null;
  
  // Datos cargados
  groupData: BusinessGroup | null;
  branchData: Business | null;
  
  // Estado de carga
  isLoading: boolean;
  error: string | null;
  
  // Funciones helper
  getContextualUrl: (path: string) => string;
  isInStore: () => boolean;
  getStoreName: () => string;
  getStoreLogo: () => string | null;
  navigateToContext: (type: StoreContextType, slug: string) => void;
  clearContext: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [contextType, setContextType] = useState<StoreContextType>('global');
  const [slug, setSlug] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<BusinessGroup | null>(null);
  const [branchData, setBranchData] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detectar contexto desde la URL
  useEffect(() => {
    if (!router.isReady) return;

    const asPath = router.asPath;
    
    // Detectar grupo: /grupo/{slug}
    const grupoMatch = asPath.match(/^\/grupo\/([^/?#]+)/);
    if (grupoMatch) {
      setContextType('grupo');
      setSlug(grupoMatch[1]);
      loadGroupData(grupoMatch[1]);
      return;
    }
    
    // Detectar sucursal: /sucursal/{slug}
    const sucursalMatch = asPath.match(/^\/sucursal\/([^/?#]+)/);
    if (sucursalMatch) {
      setContextType('sucursal');
      setSlug(sucursalMatch[1]);
      loadBranchData(sucursalMatch[1]);
      return;
    }
    
    // Contexto global (sin prefijo - por defecto)
    setContextType('global');
    setSlug(null);
    setGroupId(null);
    setBranchId(null);
    setGroupData(null);
    setBranchData(null);
    setIsLoading(false);
    setError(null);
  }, [router.isReady, router.asPath]);

  const loadGroupData = async (groupSlug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await businessGroupsService.getGroupBySlug(groupSlug);
      
      setGroupData(data);
      setGroupId(data.id);
    } catch (err: any) {
      console.error('Error cargando grupo:', err);
      setError(err.message || 'Error al cargar el grupo');
      // No redirigir automáticamente - permitir que el usuario vea el error
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranchData = async (branchSlug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await branchesService.getBranchBySlug(branchSlug);
      
      setBranchData(data);
      setBranchId(data.id);
      // Si la sucursal pertenece a un grupo, podríamos cargar también el grupo
      if (data.business_group_id) {
        setGroupId(data.business_group_id);
      }
    } catch (err: any) {
      console.error('Error cargando sucursal:', err);
      setError(err.message || 'Error al cargar la sucursal');
    } finally {
      setIsLoading(false);
    }
  };

  const getContextualUrl = useCallback((path: string): string => {
    // Rutas absolutas que NO deben tener contexto
    const absoluteRoutes = ['/auth/', '/api/', '/_next/'];
    if (absoluteRoutes.some(route => path.startsWith(route))) {
      return path;
    }
    
    // Si ya tiene el prefijo de contexto, no duplicar
    if (path.startsWith(`/${contextType}/`)) {
      return path;
    }
    
    // Si el contexto es global, no agregar prefijo
    if (contextType === 'global' || !slug) {
      return path;
    }
    
    // Agregar prefijo de contexto solo si no es global
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${contextType}/${slug}${cleanPath}`;
  }, [contextType, slug]);

  const isInStore = useCallback((): boolean => {
    return contextType !== 'global';
  }, [contextType]);

  const getStoreName = useCallback((): string => {
    if (contextType === 'grupo' && groupData) {
      return groupData.name;
    }
    if (contextType === 'sucursal' && branchData) {
      return branchData.name;
    }
    return 'Agora';
  }, [contextType, groupData, branchData]);

  const getStoreLogo = useCallback((): string | null => {
    if (contextType === 'grupo' && groupData?.logo_url) {
      return groupData.logo_url;
    }
    if (contextType === 'sucursal' && branchData?.logo_url) {
      return branchData.logo_url;
    }
    return null;
  }, [contextType, groupData, branchData]);

  const navigateToContext = useCallback((type: StoreContextType, newSlug: string) => {
    router.push(`/${type}/${newSlug}`);
  }, [router]);

  const clearContext = useCallback(() => {
    router.push('/');
  }, [router]);

  const value: StoreContextValue = {
    contextType,
    slug,
    groupId,
    branchId,
    groupData,
    branchData,
    isLoading,
    error,
    getContextualUrl,
    isInStore,
    getStoreName,
    getStoreLogo,
    navigateToContext,
    clearContext,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStoreContext must be used within StoreProvider');
  }
  return context;
}

