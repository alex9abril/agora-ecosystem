# Store Front - Marketplace Multi-Sucursal

Frontend del marketplace tipo AutoZone/MercadoLibre para Agora con soporte para tres niveles de contexto:
- **Global**: Sin prefijo (`/`) - Muestra productos de todas las sucursales
- **Grupo**: Con prefijo `/grupo/{slug}` - Muestra productos del grupo empresarial
- **Sucursal**: Con prefijo `/sucursal/{slug}` - Muestra productos de la sucursal específica

## Características

- 🏪 **Marketplace Multi-Sucursal**: Catálogo general con precios globales y específicos por sucursal
- 🔄 **Contexto de Navegación**: Mantiene el contexto (global/grupo/sucursal) en toda la navegación
- 📍 **Selección de Sucursal**: Por geolocalización o dirección guardada
- 💰 **Precios Dinámicos**: Precio global en catálogo, precio específico al seleccionar sucursal
- 📦 **Stock por Sucursal**: Validación de stock específico antes de agregar al carrito
- 🎨 **Branding Personalizado**: Cada grupo/sucursal puede tener su propio branding

## Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Material-UI** - Componentes UI

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Configurar variables de entorno en .env
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor estará disponible en http://localhost:3008
```

## Estructura del Proyecto

```
apps/store-front/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── layout/         # Layouts (StoreLayout)
│   │   └── ...            # Otros componentes
│   ├── contexts/           # Contextos de React
│   │   ├── StoreContext.tsx    # Contexto de navegación
│   │   ├── AuthContext.tsx     # Autenticación
│   │   └── CartContext.tsx     # Carrito
│   ├── hooks/              # Hooks personalizados
│   │   └── useStoreRouting.ts
│   ├── lib/                # Servicios y utilidades
│   │   ├── api.ts          # Cliente API base
│   │   ├── branches.ts     # Servicio de sucursales
│   │   ├── business-groups.ts  # Servicio de grupos
│   │   ├── products.ts     # Servicio de productos
│   │   ├── cart.ts         # Servicio de carrito
│   │   └── ...
│   ├── pages/              # Páginas de Next.js
│   │   ├── index.tsx       # Home global
│   │   ├── [origen]/      # Rutas dinámicas (grupo/sucursal)
│   │   │   └── [slug]/
│   │   ├── products/      # Páginas de productos
│   │   ├── cart.tsx       # Carrito
│   │   ├── checkout.tsx    # Checkout
│   │   └── ...
│   └── styles/            # Estilos globales
│       └── globals.css
├── .env.example           # Variables de entorno de ejemplo
├── next.config.js         # Configuración de Next.js
├── tailwind.config.js     # Configuración de Tailwind
└── tsconfig.json          # Configuración de TypeScript
```

## Rutas Principales

### Contexto Global (sin prefijo)
- `/` - Home global
- `/products` - Catálogo global
- `/products/[id]` - Detalle de producto
- `/cart` - Carrito
- `/checkout` - Checkout

### Contexto Grupo (prefijo `/grupo/{slug}`)
- `/grupo/{slug}` - Home del grupo
- `/grupo/{slug}/products` - Productos del grupo
- `/grupo/{slug}/products/[id]` - Detalle con contexto grupo

### Contexto Sucursal (prefijo `/sucursal/{slug}`)
- `/sucursal/{slug}` - Home de la sucursal
- `/sucursal/{slug}/products` - Productos de la sucursal
- `/sucursal/{slug}/products/[id]` - Detalle con contexto sucursal

## Variables de Entorno

Crea un archivo `.env.local` en `apps/store-front/` con:

```env
# Backend API (requerido)
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Google Maps API (opcional - solo si usas geolocalización)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**Nota**: Todas las comunicaciones con Supabase y la base de datos pasan por el backend API. El frontend solo necesita la URL del backend.

## Documentación

Ver documentación detallada en:
- `docs/store-front/00-resumen-solucion-contexto.md` - Resumen ejecutivo
- `docs/store-front/01-contexto-navegacion-mini-tienda.md` - Documentación completa
- `docs/store-front/02-ejemplos-implementacion-contexto.md` - Ejemplos de código

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo en puerto 3008
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia servidor de producción
- `npm run lint` - Ejecuta el linter


