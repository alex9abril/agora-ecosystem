# Ejemplos de Implementación - Contexto de Navegación

## Estructura de Archivos

```
apps/store-front/
├── src/
│   ├── contexts/
│   │   └── StoreContext.tsx          # Contexto principal
│   ├── components/
│   │   ├── ContextualLink.tsx         # Link con contexto
│   │   ├── ContextualRouter.tsx      # Router con contexto
│   │   └── layout/
│   │       └── StoreLayout.tsx        # Layout personalizado
│   ├── hooks/
│   │   └── useStoreContext.ts        # Hook personalizado
│   ├── lib/
│   │   └── store-routing.ts          # Utilidades de routing
│   └── pages/
│       ├── _app.tsx                  # App con providers
│       ├── index.tsx                 # Home general
│       ├── [origen]/
│       │   └── [slug]/
│       │       ├── index.tsx         # Home grupo/sucursal
│       │       └── products/
│       │           ├── index.tsx     # Lista productos
│       │           └── [id].tsx      # Detalle producto
│       └── products/
│           ├── index.tsx             # Lista productos (general)
│           └── [id].tsx              # Detalle producto (general)
```

## Ejemplo 1: StoreContext Completo

```typescript
// contexts/StoreContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';

export type StoreContextType = 'global' | 'grupo' | 'sucursal';

export interface BusinessGroup {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  business_group_id?: string;
  address?: string;
  phone?: string;
  email?: string;
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/businesses/groups/${groupSlug}`);
      if (!response.ok) {
        throw new Error('Grupo no encontrado');
      }
      
      const data = await response.json();
      setGroupData(data);
      setGroupId(data.id);
    } catch (err: any) {
      console.error('Error cargando grupo:', err);
      setError(err.message || 'Error al cargar el grupo');
      // Opcional: redirigir a home general
      // router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranchData = async (branchSlug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/businesses/branches/${branchSlug}`);
      if (!response.ok) {
        throw new Error('Sucursal no encontrada');
      }
      
      const data = await response.json();
      setBranchData(data);
      setBranchId(data.id);
      // Si la sucursal pertenece a un grupo, cargar también el grupo
      if (data.business_group_id) {
        // Opcional: cargar datos del grupo también
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
    return 'Localia';
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
```

## Ejemplo 2: ContextualLink

```typescript
// components/ContextualLink.tsx
import Link, { LinkProps } from 'next/link';
import { useStoreContext } from '@/contexts/StoreContext';
import { ReactNode } from 'react';

interface ContextualLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
  preserveQuery?: boolean; // Preservar query params
}

export default function ContextualLink({ 
  href, 
  children, 
  preserveQuery = false,
  ...props 
}: ContextualLinkProps) {
  const { getContextualUrl } = useStoreContext();
  const router = useRouter();
  
  // Generar URL con contexto
  let contextualHref = getContextualUrl(href);
  
  // Preservar query params si se solicita
  if (preserveQuery && router.query) {
    const queryString = new URLSearchParams(
      Object.entries(router.query).reduce((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        } else if (Array.isArray(value)) {
          acc[key] = value[0];
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();
    
    if (queryString) {
      contextualHref += `?${queryString}`;
    }
  }
  
  return (
    <Link href={contextualHref} {...props}>
      {children}
    </Link>
  );
}
```

## Ejemplo 3: Hook useStoreRouting

```typescript
// hooks/useStoreRouting.ts
import { useStoreContext } from '@/contexts/StoreContext';
import { useRouter } from 'next/router';

export function useStoreRouting() {
  const { getContextualUrl, contextType, slug, isInStore } = useStoreContext();
  const router = useRouter();

  const push = (path: string, options?: any) => {
    const contextualPath = getContextualUrl(path);
    return router.push(contextualPath, undefined, options);
  };

  const replace = (path: string, options?: any) => {
    const contextualPath = getContextualUrl(path);
    return router.replace(contextualPath, undefined, options);
  };

  const back = () => {
    router.back();
  };

  const getProductUrl = (productId: string) => {
    return getContextualUrl(`/products/${productId}`);
  };

  const getProductsUrl = () => {
    return getContextualUrl('/products');
  };

  const getCartUrl = () => {
    return getContextualUrl('/cart');
  };

  const getCheckoutUrl = () => {
    return getContextualUrl('/checkout');
  };

  return {
    push,
    replace,
    back,
    getProductUrl,
    getProductsUrl,
    getCartUrl,
    getCheckoutUrl,
    contextType,
    slug,
    isInStore,
  };
}
```

## Ejemplo 4: Página de Productos con Contexto

```typescript
// pages/[origen]/[slug]/products/index.tsx
import { useStoreContext } from '@/contexts/StoreContext';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import { productsService } from '@/lib/products';
import ProductCard from '@/components/ProductCard';
import ContextualLink from '@/components/ContextualLink';

export default function ProductsPage() {
  const { contextType, groupId, branchId, isLoading, isInStore } = useStoreContext();
  const { getProductUrl } = useStoreRouting();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, [contextType, groupId, branchId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      const params: any = {};
      
      // Filtrar según contexto
      if (contextType === 'grupo' && groupId) {
        params.groupId = groupId;
      } else if (contextType === 'sucursal' && branchId) {
        params.branchId = branchId;
      }
      
      const response = await productsService.getProducts(params);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <h1>
        {contextType === 'global'
          ? 'Todos los Productos'
          : contextType === 'grupo'
          ? 'Productos del Grupo'
          : 'Productos de la Sucursal'
        }
      </h1>
      
      <div className="grid grid-cols-4 gap-4">
        {products.map((product) => (
          <ContextualLink 
            key={product.id} 
            href={`/products/${product.id}`}
          >
            <ProductCard product={product} />
          </ContextualLink>
        ))}
      </div>
    </div>
  );
}
```

## Ejemplo 5: Layout Personalizado

```typescript
// components/layout/StoreLayout.tsx
import { useStoreContext } from '@/contexts/StoreContext';
import ContextualLink from '@/components/ContextualLink';
import { useStoreRouting } from '@/hooks/useStoreRouting';

export default function StoreLayout({ children }: { children: ReactNode }) {
  const { 
    contextType, 
    groupData, 
    branchData, 
    isInStore, 
    getStoreName,
    getStoreLogo,
    isLoading 
  } = useStoreContext();
  const { getProductsUrl, getCartUrl } = useStoreRouting();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con branding del grupo/sucursal */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo y nombre */}
            <ContextualLink href="/" className="flex items-center gap-3">
              {getStoreLogo() && (
                <img 
                  src={getStoreLogo()!} 
                  alt={getStoreName()} 
                  className="h-10 w-10 rounded"
                />
              )}
              <span className="text-xl font-bold text-black">
                {getStoreName()}
              </span>
            </ContextualLink>

            {/* Navegación */}
            <nav className="flex items-center gap-6">
              <ContextualLink href="/" className="text-gray-700 hover:text-black">
                Inicio
              </ContextualLink>
              <ContextualLink href={getProductsUrl()} className="text-gray-700 hover:text-black">
                Productos
              </ContextualLink>
              <ContextualLink href={getCartUrl()} className="text-gray-700 hover:text-black">
                Carrito
              </ContextualLink>
            </nav>
          </div>
        </div>
      </header>

      {/* Banner del grupo/sucursal si aplica */}
      {isInStore() && !isLoading && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
          <div className="max-w-7xl mx-auto px-4">
            {contextType === 'grupo' && groupData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{groupData.name}</h2>
                {groupData.description && (
                  <p className="text-blue-100">{groupData.description}</p>
                )}
              </div>
            )}
            {contextType === 'sucursal' && branchData && (
              <div>
                <h2 className="text-2xl font-bold mb-2">{branchData.name}</h2>
                {branchData.address && (
                  <p className="text-blue-100">📍 {branchData.address}</p>
                )}
                {branchData.phone && (
                  <p className="text-blue-100">📞 {branchData.phone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer con información de contacto */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {isInStore() ? (
            <div>
              <h3 className="text-lg font-bold mb-4">Contacto</h3>
              {contextType === 'grupo' && groupData && (
                <div>
                  <p>{groupData.name}</p>
                  {groupData.website_url && (
                    <a href={groupData.website_url} target="_blank" rel="noopener">
                      {groupData.website_url}
                    </a>
                  )}
                </div>
              )}
              {contextType === 'sucursal' && branchData && (
                <div>
                  <p>{branchData.name}</p>
                  {branchData.address && <p>{branchData.address}</p>}
                  {branchData.phone && <p>{branchData.phone}</p>}
                  {branchData.email && <p>{branchData.email}</p>}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>© 2024 Localia. Todos los derechos reservados.</p>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
```

## Ejemplo 6: Servicio de Productos con Contexto

```typescript
// lib/products.ts
import { apiRequest } from './api';

export interface ListProductsParams {
  page?: number;
  limit?: number;
  groupId?: string;      // Filtro por grupo
  branchId?: string;     // Filtro por sucursal
  categoryId?: string;
  search?: string;
  isAvailable?: boolean;
}

export const productsService = {
  async getProducts(params: ListProductsParams = {}) {
    const queryParams = new URLSearchParams();
    
    // Agregar filtros según contexto
    if (params.groupId) {
      queryParams.append('groupId', params.groupId);
    }
    if (params.branchId) {
      queryParams.append('branchId', params.branchId);
    }
    if (params.categoryId) {
      queryParams.append('categoryId', params.categoryId);
    }
    if (params.search) {
      queryParams.append('search', params.search);
    }
    if (params.isAvailable !== undefined) {
      queryParams.append('isAvailable', params.isAvailable.toString());
    }
    if (params.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const url = `/catalog/products${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(url, { method: 'GET' });
  },

  async getProduct(productId: string, branchId?: string) {
    const url = `/catalog/products/${productId}`;
    const params = branchId ? { branchId } : {};
    
    return apiRequest(url, { method: 'GET', params });
  },
};
```

## Flujo de Navegación

```
Usuario entra a: /sucursal/toyota-satelite
  ↓
StoreContext detecta: contextType='sucursal', slug='toyota-satelite'
  ↓
Carga datos de la sucursal
  ↓
Home muestra productos de la sucursal
  ↓
Usuario hace click en "Ver Productos"
  ↓
ContextualLink genera: /sucursal/toyota-satelite/products
  ↓
Página de productos filtra por branchId
  ↓
Usuario hace click en un producto
  ↓
ContextualLink genera: /sucursal/toyota-satelite/products/123
  ↓
Detalle muestra precio y stock de la sucursal específica
```

## Consideraciones Finales

1. **Performance**: Cachear datos de grupo/sucursal para evitar requests repetidos
2. **Error Handling**: Manejar casos donde el slug no existe
3. **SEO**: Las URLs con contexto son SEO-friendly y compartibles
4. **Analytics**: Trackear navegación por contexto para métricas
5. **Breadcrumbs**: Mostrar breadcrumbs con contexto para mejor UX

