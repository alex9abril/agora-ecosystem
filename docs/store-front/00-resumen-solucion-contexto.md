# Resumen: Solución de Contexto de Navegación para Mini-Tienda

## Problema

El marketplace tiene **tres niveles de contexto**:
1. **Global** - Sin prefijo (por defecto): `/` → Muestra productos de todas las sucursales
2. **Grupo** - Con prefijo `/grupo/{slug}`: `/grupo/grupo-andrade` → Muestra productos del grupo
3. **Sucursal** - Con prefijo `/sucursal/{slug}`: `/sucursal/toyota-satelite` → Muestra productos de la sucursal

Cuando un usuario entra mediante una URL específica (`/grupo/{slug}` o `/sucursal/{slug}`), necesita que:
1. **Todo el sitio funcione como una mini-tienda** centrada en ese grupo/sucursal
2. **La navegación mantenga el contexto** (si entras a `/sucursal/x` y luego a productos, debe ser `/sucursal/x/products`)
3. **Las búsquedas se filtren** por el contexto actual
4. **El home se personalice** según el contexto (global/grupo/sucursal)
5. **Los links de contacto** apunten al grupo/sucursal específico
6. **El contexto global no requiere prefijo** - Si no hay prefijo, es contexto global

## Solución en 3 Componentes Principales

### 1. **StoreContext** - Contexto de Navegación
- Detecta automáticamente el contexto desde la URL:
  - **Global**: Sin prefijo (`/`) → Contexto por defecto, no requiere prefijo
  - **Grupo**: `/grupo/{slug}` → Contexto de grupo empresarial
  - **Sucursal**: `/sucursal/{slug}` → Contexto de sucursal específica
- Mantiene datos del grupo/sucursal cargados (solo si aplica)
- Proporciona función `getContextualUrl()` para generar URLs con contexto
- **Si el contexto es global, no agrega prefijo** a las URLs

### 2. **ContextualLink** - Componente de Link Inteligente
- Wrapper de `next/link` que automáticamente agrega el prefijo de contexto
- Si estás en `/sucursal/x` y haces click en `/products`, genera `/sucursal/x/products`
- Respeta rutas absolutas como `/auth/login` (no agrega contexto)

### 3. **Layout Personalizado** - UI Adaptativa
- Detecta el contexto y muestra branding del grupo/sucursal
- Personaliza header, footer y navegación
- Muestra información de contacto específica

## Cómo Funciona

### Escenario 1: Usuario entra a contexto global
```
URL: /
↓
StoreContext detecta: tipo='global', sin slug
↓
No carga datos específicos (contexto por defecto)
↓
Home muestra productos de todas las sucursales
↓
Links generan: /products, /products/123 (sin prefijo)
↓
Búsquedas muestran todos los productos disponibles
```

### Escenario 2: Usuario entra a grupo
```
URL: /grupo/grupo-andrade
↓
StoreContext detecta: tipo='grupo', slug='grupo-andrade'
↓
Carga datos del grupo
↓
Home muestra productos del grupo
↓
Links generan: /grupo/grupo-andrade/products, /grupo/grupo-andrade/products/123
↓
Búsquedas filtran solo productos del grupo
```

### Escenario 3: Usuario entra a sucursal
```
URL: /sucursal/toyota-satelite
↓
StoreContext detecta: tipo='sucursal', slug='toyota-satelite'
↓
Carga datos de la sucursal
↓
Home muestra productos de la sucursal con precios específicos
↓
Links generan: /sucursal/toyota-satelite/products, etc.
↓
Búsquedas filtran solo productos de esta sucursal
```

### Escenario 4: Navegación interna mantiene contexto
```
Usuario está en: /sucursal/toyota-satelite/products
Usuario hace click en producto ID 123
↓
ContextualLink genera: /sucursal/toyota-satelite/products/123
↓
Detalle muestra precio y stock de la sucursal específica
```

## Estructura de Rutas

### Contexto Global (sin prefijo)
```
/                    → Home global (todas las sucursales)
/products            → Productos globales (todas las sucursales)
/products/[id]       → Detalle producto (precio global)
/cart                → Carrito global
/checkout            → Checkout global
```

### Contexto Grupo (prefijo `/grupo/{slug}`)
```
/grupo/{slug}                    → Home del grupo
/grupo/{slug}/products           → Productos del grupo
/grupo/{slug}/products/[id]     → Detalle producto (contexto grupo)
/grupo/{slug}/cart              → Carrito del grupo
/grupo/{slug}/checkout           → Checkout del grupo
```

### Contexto Sucursal (prefijo `/sucursal/{slug}`)
```
/sucursal/{slug}                    → Home de la sucursal
/sucursal/{slug}/products           → Productos de la sucursal
/sucursal/{slug}/products/[id]      → Detalle producto (contexto sucursal)
/sucursal/{slug}/cart               → Carrito de la sucursal
/sucursal/{slug}/checkout           → Checkout de la sucursal
```

**Nota importante**: El contexto global **no requiere prefijo**. Si no hay prefijo en la URL, se asume contexto global.

## Reglas de Contexto

1. **Tres niveles de contexto**: `global` (sin prefijo), `grupo` (`/grupo/{slug}`), `sucursal` (`/sucursal/{slug}`)
2. **Contexto global es el default**: Si no hay prefijo, es contexto global y no se agrega prefijo a las URLs
3. **Rutas absolutas** (`/auth/*`, `/api/*`) → NO agregan contexto (nunca)
4. **Rutas relativas** (`/products`, `/cart`) → SÍ agregan contexto solo si no es global
5. **Cambio de contexto** → Si navegas de `/grupo/x` a `/sucursal/y`, cambia el contexto
6. **Persistencia** → El contexto se mantiene hasta cambiar explícitamente
7. **Omisión de prefijo**: Si el contexto es global, las URLs se generan sin prefijo

## Beneficios

✅ **SEO-Friendly**: URLs claras y compartibles  
✅ **UX Mejorada**: Navegación intuitiva que mantiene contexto  
✅ **Personalización**: Cada grupo/sucursal tiene su propia experiencia  
✅ **Filtrado Automático**: Búsquedas y productos se filtran automáticamente  
✅ **Branding**: Cada mini-tienda puede tener su propio branding  

## Implementación

Ver documentos detallados:
- `01-contexto-navegacion-mini-tienda.md` - Documentación completa
- `02-ejemplos-implementacion-contexto.md` - Ejemplos de código

## Próximos Pasos

1. ✅ Crear `StoreContext`
2. ✅ Crear `ContextualLink`
3. ✅ Crear `StoreLayout` personalizado
4. ✅ Actualizar servicios para filtrar por contexto
5. ✅ Crear páginas de home personalizadas
6. ✅ Implementar búsqueda con filtros de contexto

