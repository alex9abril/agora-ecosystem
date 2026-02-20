# Contexto de Navegación y Mini-Tienda

## Problema a Resolver

El marketplace tiene **tres niveles de contexto**:

1. **Global** (sin prefijo): `/` → Contexto por defecto, muestra productos de todas las sucursales
2. **Grupo** (prefijo `/grupo/{slug}`): `/grupo/grupo-andrade` → Muestra productos del grupo
3. **Sucursal** (prefijo `/sucursal/{slug}`): `/sucursal/toyota-satelite` → Muestra productos de la sucursal

Cuando un usuario entra mediante una URL específica (`/grupo/{slug}` o `/sucursal/{slug}`), toda la experiencia debe convertirse en una "mini-tienda" centrada en ese contexto:

1. **Persistencia de contexto**: Si entras a `/sucursal/{slug}` y navegas a productos, debe mantener el contexto
2. **URLs relativas**: Todos los links internos deben mantener el prefijo de contexto (excepto si es global)
3. **Búsquedas filtradas**: Las búsquedas deben filtrarse por el contexto actual
4. **Home personalizado**: El home debe mostrar contenido específico del contexto (global/grupo/sucursal)
5. **Links de contacto**: Deben apuntar al grupo/sucursal específico (si aplica)
6. **Contexto global sin prefijo**: Si el contexto es global, las URLs no llevan prefijo

## Solución Propuesta

### 1. Context Provider: `StoreContext`

Crear un contexto que detecte y mantenga el contexto de navegación desde la URL:

```typescript
// contexts/StoreContext.tsx

type StoreContextType = 'global' | 'grupo' | 'sucursal';
type StoreContext = {
  type: StoreContextType;
  slug: string | null;  // null si es global
  groupId: string | null;
  branchId: string | null;
  groupData: BusinessGroup | null;
  branchData: Business | null;
};

// El contexto se inicializa leyendo la URL actual:
// - Sin prefijo → 'global' (contexto por defecto)
// - /grupo/{slug} → 'grupo'
// - /sucursal/{slug} → 'sucursal'
// Se mantiene durante toda la sesión de navegación
```

**Características:**
- Detecta automáticamente el contexto desde `router.pathname`
- Proporciona funciones helper para generar URLs con contexto
- Mantiene datos del grupo/sucursal cargados
- Se sincroniza con cambios en la URL

### 2. Hook Personalizado: `useStoreContext()`

Hook que proporciona:
- `context`: El contexto actual (`global`/`grupo`/`sucursal`)
- `getContextualUrl(path)`: Genera URLs con el prefijo de contexto (si no es global)
- `isInStore()`: Verifica si estamos en modo mini-tienda (grupo o sucursal)
- `getStoreData()`: Obtiene datos del grupo/sucursal actual (null si es global)

### 3. Componente: `ContextualLink`

Wrapper de `next/link` que automáticamente agrega el prefijo de contexto:

```typescript
<ContextualLink href="/products/[id]">
  Ver Producto
</ContextualLink>

// Si estamos en contexto global (/)
// Genera: /products/[id] (sin prefijo)

// Si estamos en /grupo/grupo-andrade
// Genera: /grupo/grupo-andrade/products/[id]

// Si estamos en /sucursal/toyota-satelite
// Genera: /sucursal/toyota-satelite/products/[id]
```

### 4. Middleware de Next.js

Middleware que intercepta rutas y asegura que el contexto se mantenga:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Detectar si estamos en contexto de grupo/sucursal
  const grupoMatch = pathname.match(/^\/grupo\/([^/]+)/);
  const sucursalMatch = pathname.match(/^\/sucursal\/([^/]+)/);
  
  // Si hay contexto, asegurar que todas las rutas lo mantengan
  // (excepto rutas absolutas como /auth/login)
}
```

### 5. Estructura de Rutas

**Contexto Global** (sin prefijo - por defecto):
```
/                    → Home global (todas las sucursales)
/products            → Productos globales
/products/[id]       → Detalle producto (precio global)
/cart                → Carrito global
```

**Contexto Grupo** (prefijo `/grupo/{slug}`):
```
/grupo/{slug}                    → Home del grupo
/grupo/{slug}/products           → Productos del grupo
/grupo/{slug}/products/[id]      → Detalle producto (contexto grupo)
/grupo/{slug}/cart               → Carrito del grupo
```

**Contexto Sucursal** (prefijo `/sucursal/{slug}`):
```
/sucursal/{slug}                    → Home de la sucursal
/sucursal/{slug}/products           → Productos de la sucursal
/sucursal/{slug}/products/[id]      → Detalle producto (contexto sucursal)
/sucursal/{slug}/cart               → Carrito de la sucursal
```

**Nota**: El contexto global no requiere prefijo. Si no hay prefijo en la URL, se asume contexto global.

### 6. Layout Personalizado por Contexto

El layout detecta el contexto y:
- Muestra branding del grupo/sucursal
- Personaliza header y footer
- Filtra navegación según contexto
- Muestra información de contacto específica

## Implementación Detallada

### Paso 1: Crear StoreContext

```typescript
// contexts/StoreContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

type ContextType = 'global' | 'grupo' | 'sucursal';

interface StoreContextValue {
  contextType: ContextType;
  slug: string | null;
  groupId: string | null;
  branchId: string | null;
  groupData: any | null;
  branchData: any | null;
  isLoading: boolean;
  getContextualUrl: (path: string) => string;
  isInStore: () => boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [contextType, setContextType] = useState<ContextType>('global');
  const [slug, setSlug] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<any | null>(null);
  const [branchData, setBranchData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detectar contexto desde la URL
  useEffect(() => {
    const pathname = router.pathname;
    const asPath = router.asPath;
    
    // Detectar grupo
    const grupoMatch = asPath.match(/^\/grupo\/([^/]+)/);
    if (grupoMatch) {
      setContextType('grupo');
      setSlug(grupoMatch[1]);
      loadGroupData(grupoMatch[1]);
      return;
    }
    
    // Detectar sucursal
    const sucursalMatch = asPath.match(/^\/sucursal\/([^/]+)/);
    if (sucursalMatch) {
      setContextType('sucursal');
      setSlug(sucursalMatch[1]);
      loadBranchData(sucursalMatch[1]);
      return;
    }
    
    // Contexto global (sin prefijo - por defecto)
    setContextType('global');
    setSlug(null);
    setGroupData(null);
    setBranchData(null);
    setIsLoading(false);
  }, [router.pathname, router.asPath]);

  const loadGroupData = async (groupSlug: string) => {
    try {
      setIsLoading(true);
      // Llamar a API para obtener datos del grupo
      const response = await fetch(`/api/businesses/groups/${groupSlug}`);
      const data = await response.json();
      setGroupData(data);
      setGroupId(data.id);
    } catch (error) {
      console.error('Error cargando grupo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranchData = async (branchSlug: string) => {
    try {
      setIsLoading(true);
      // Llamar a API para obtener datos de la sucursal
      const response = await fetch(`/api/businesses/branches/${branchSlug}`);
      const data = await response.json();
      setBranchData(data);
      setBranchId(data.id);
    } catch (error) {
      console.error('Error cargando sucursal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getContextualUrl = (path: string): string => {
    // Si la ruta ya tiene el prefijo, no duplicar
    if (path.startsWith(`/${contextType}/`)) {
      return path;
    }
    
    // Si es ruta absoluta (auth, etc), no agregar contexto
    if (path.startsWith('/auth/') || path.startsWith('/api/')) {
      return path;
    }
    
    // Si el contexto es global, no agregar prefijo
    if (contextType === 'global' || !slug) {
      return path;
    }
    
    // Agregar prefijo de contexto solo si no es global
    return `/${contextType}/${slug}${path.startsWith('/') ? path : '/' + path}`;
  };

  const isInStore = (): boolean => {
    return contextType !== 'global';
  };

  const value: StoreContextValue = {
    contextType,
    slug,
    groupId: groupData?.id || null,
    branchId: branchData?.id || null,
    groupData,
    branchData,
    isLoading,
    getContextualUrl,
    isInStore,
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

### Paso 2: Crear ContextualLink

```typescript
// components/ContextualLink.tsx
import Link from 'next/link';
import { useStoreContext } from '@/contexts/StoreContext';

interface ContextualLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export default function ContextualLink({ 
  href, 
  children, 
  ...props 
}: ContextualLinkProps) {
  const { getContextualUrl } = useStoreContext();
  const contextualHref = getContextualUrl(href);
  
  return (
    <Link href={contextualHref} {...props}>
      {children}
    </Link>
  );
}
```

### Paso 3: Actualizar _app.tsx

```typescript
// pages/_app.tsx
import { StoreProvider } from '@/contexts/StoreContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider>
      <AuthProvider>
        <CartProvider>
          <Component {...pageProps} />
        </CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
```

### Paso 4: Crear Layout Personalizado

```typescript
// components/layout/StoreLayout.tsx
import { useStoreContext } from '@/contexts/StoreContext';

export default function StoreLayout({ children }: { children: ReactNode }) {
  const { contextType, groupData, branchData, isInStore } = useStoreContext();
  
  return (
    <div>
      <header>
        {isInStore() && (
          <div className="store-banner">
            {contextType === 'grupo' && groupData && (
              <div>
                <img src={groupData.logo_url} alt={groupData.name} />
                <h1>{groupData.name}</h1>
              </div>
            )}
            {contextType === 'sucursal' && branchData && (
              <div>
                <h1>{branchData.name}</h1>
                <p>{branchData.address}</p>
              </div>
            )}
          </div>
        )}
        {/* Navegación con links contextuales */}
      </header>
      <main>{children}</main>
      <footer>
        {isInStore() && (
          <div className="store-contact">
            {/* Información de contacto específica */}
          </div>
        )}
      </footer>
    </div>
  );
}
```

### Paso 5: Actualizar Servicios para Filtrar por Contexto

```typescript
// lib/products.ts
import { useStoreContext } from '@/contexts/StoreContext';

export const productsService = {
  async getProducts(params: ListProductsParams = {}) {
    const { contextType, groupId, branchId } = useStoreContext();
    
    // Agregar filtros según contexto
    if (contextType === 'grupo' && groupId) {
      params.groupId = groupId;
    }
    if (contextType === 'sucursal' && branchId) {
      params.branchId = branchId;
    }
    
    // Llamar a API con filtros
    return apiRequest('/catalog/products', { params });
  },
};
```

### Paso 6: Home Personalizado

```typescript
// pages/[origen]/[slug]/index.tsx (para grupo/sucursal)
// pages/index.tsx (para general)

export default function HomePage() {
  const { contextType, groupData, branchData, isInStore } = useStoreContext();
  
  if (isInStore()) {
    // Mostrar contenido personalizado del grupo/sucursal
    return (
      <div>
        <HeroSection storeData={groupData || branchData} />
        <FeaturedProducts contextType={contextType} />
        <StoreInfo storeData={groupData || branchData} />
      </div>
    );
  }
  
  // Home general
  return <GeneralHomePage />;
}
```

## Reglas de Navegación

1. **Tres niveles de contexto**: 
   - `global` (sin prefijo) → Contexto por defecto, no requiere prefijo
   - `grupo` (`/grupo/{slug}`) → Contexto de grupo empresarial
   - `sucursal` (`/sucursal/{slug}`) → Contexto de sucursal específica

2. **Rutas absolutas**: `/auth/login`, `/api/*` → NO agregan contexto (nunca)

3. **Rutas relativas**: 
   - Si contexto es `global` → NO agregan prefijo (`/products` → `/products`)
   - Si contexto es `grupo` → SÍ agregan prefijo (`/products` → `/grupo/{slug}/products`)
   - Si contexto es `sucursal` → SÍ agregan prefijo (`/products` → `/sucursal/{slug}/products`)

4. **Cambio de contexto**: Si navegas de `/grupo/x` a `/sucursal/y`, cambia el contexto

5. **Persistencia**: El contexto se mantiene hasta cambiar explícitamente

6. **Omisión de prefijo**: Si el contexto es global, las URLs se generan sin prefijo

## Ejemplos de Uso

### Ejemplo 1: Navegación desde contexto global
```
Usuario entra a: /
- Contexto: global, sin slug
- Home muestra productos de todas las sucursales
- Link a productos: /products (sin prefijo)
- Link a producto específico: /products/123 (sin prefijo)
- Búsqueda muestra todos los productos disponibles
```

### Ejemplo 2: Navegación desde grupo
```
Usuario entra a: /grupo/grupo-andrade
- Contexto: grupo, slug: grupo-andrade
- Home muestra productos del grupo
- Link a productos: /grupo/grupo-andrade/products
- Link a producto específico: /grupo/grupo-andrade/products/123
- Búsqueda filtra solo productos del grupo
```

### Ejemplo 3: Navegación desde sucursal
```
Usuario entra a: /sucursal/toyota-satelite
- Contexto: sucursal, slug: toyota-satelite
- Home muestra productos de la sucursal con precios específicos
- Link a productos: /sucursal/toyota-satelite/products
- Búsqueda filtra solo productos de esta sucursal
```

### Ejemplo 4: Cambio de contexto
```
Usuario está en: /grupo/grupo-andrade/products
Usuario hace click en: /sucursal/toyota-satelite
- Contexto cambia a: sucursal, slug: toyota-satelite
- Todas las navegaciones posteriores usan el nuevo contexto
- Links generan: /sucursal/toyota-satelite/products, etc.
```

## Consideraciones Técnicas

1. **SEO**: Las URLs con contexto son SEO-friendly
2. **Compartir links**: Los links compartidos mantienen el contexto
3. **Historial del navegador**: Funciona correctamente con back/forward
4. **Performance**: Cachear datos de grupo/sucursal para evitar requests repetidos
5. **Fallbacks**: Si el slug no existe, mostrar error o redirigir a home general

## Próximos Pasos

1. Implementar `StoreContext`
2. Crear `ContextualLink`
3. Actualizar todas las rutas para usar contexto
4. Personalizar layouts según contexto
5. Actualizar servicios para filtrar por contexto
6. Crear páginas de home personalizadas

