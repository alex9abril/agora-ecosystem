# Localia Web Cliente

Aplicación web móvil para clientes de Localia. Permite a los usuarios descubrir tiendas locales, ver productos y realizar pedidos.

## Características

- 📱 **Mobile-first**: Diseñado específicamente para dispositivos móviles
- 🌐 **Multilenguaje**: Soporte para inglés y español con detección automática
- 🏪 **Exploración de tiendas**: Navega y descubre tiendas locales
- 🛍️ **Catálogo de productos**: Explora productos de diferentes tiendas
- 🔐 **Autenticación**: Registro e inicio de sesión para clientes
- 🎨 **UI moderna**: Interfaz limpia y fácil de usar

## Tecnologías

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Supabase (autenticación)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3006`

## Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── layout/       # Layouts y navegación
│   └── ...           # Otros componentes
├── contexts/         # Contextos de React (Auth, i18n)
├── lib/              # Utilidades y servicios
│   ├── api.ts        # Cliente API
│   ├── auth.ts       # Servicio de autenticación
│   ├── stores.ts     # Servicio de tiendas
│   ├── products.ts   # Servicio de productos
│   └── i18n/         # Sistema de traducciones
├── pages/            # Páginas de Next.js
│   ├── auth/         # Páginas de autenticación
│   ├── stores/       # Páginas de tiendas
│   └── ...
└── styles/           # Estilos globales
```

## Variables de Entorno

Crea un archivo `.env.local` con:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Flujo de Registro

1. El usuario accede a `/auth/register`
2. Completa el formulario con:
   - Nombre y apellido
   - Email
   - Teléfono (opcional)
   - Contraseña
3. Se crea una cuenta con rol `client`
4. Se redirige al home

## Consumo de Tiendas y Productos

### Tiendas

- **Listado público**: `/stores` - Muestra todas las tiendas activas
- **Búsqueda**: Permite buscar por nombre o descripción
- **Filtros**: Por categoría
- **Detalle**: `/stores/[id]` - Muestra información de la tienda y sus productos

### Productos

- **Listado público**: Se puede acceder desde la página de tienda
- **Búsqueda**: Por nombre o descripción
- **Filtros**: Por categoría, disponibilidad, destacados
- **Detalle**: `/products/[id]` - Muestra información completa del producto

## Multilenguaje

El sistema detecta automáticamente el idioma del dispositivo y permite cambiarlo manualmente desde el header. Los idiomas soportados son:

- Español (es) - Por defecto
- Inglés (en)

Las traducciones se encuentran en `src/lib/i18n/translations.ts`

## Build

```bash
npm run build
npm start
```

