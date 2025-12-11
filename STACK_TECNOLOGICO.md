# 🛠️ Stack Tecnológico - Agora Ecosystem

## 📋 Resumen Ejecutivo

**Agora** es una tienda y marketplace de refacciones y accesorios construida con tecnologías modernas y escalables. El proyecto utiliza un enfoque de monorepo con múltiples aplicaciones frontend y un backend centralizado.

---

## 🏗️ Arquitectura General

### Estructura del Proyecto
- **Tipo**: Monorepo
- **Gestión de dependencias**: npm
- **Node.js**: >= 18.0.0
- **Organización**: Aplicaciones separadas por cliente (web-admin, web-local, store-front, mobile-client, mobile-repartidor)

---

## 🔧 Backend

### Framework y Lenguaje
- **Framework**: NestJS 10.x
- **Lenguaje**: TypeScript 5.1.3
- **Runtime**: Node.js >= 18.0.0
- **Arquitectura**: Modular (MVC con servicios)

### Principales Dependencias
- `@nestjs/common` ^10.0.0
- `@nestjs/core` ^10.0.0
- `@nestjs/platform-express` ^10.0.0
- `@nestjs/swagger` ^7.1.16 (Documentación API)
- `class-validator` ^0.14.0 (Validación de DTOs)
- `class-transformer` ^0.5.1 (Transformación de objetos)
- `rxjs` ^7.8.1 (Programación reactiva)

### Base de Datos
- **SGBD**: PostgreSQL 13+ (Supabase)
- **Driver**: `pg` ^8.16.3 (Conexión directa)
- **ORM**: No se usa ORM tradicional, consultas SQL directas con Pool de conexiones
- **Extensiones**:
  - PostGIS (geolocalización y consultas espaciales)
  - UUID nativo (gen_random_uuid())

### Integración con Supabase
- **Cliente**: `@supabase/supabase-js` ^2.38.0
- **Servicios utilizados**:
  - Supabase Auth (autenticación)
  - Supabase Storage (almacenamiento de archivos)
  - Supabase Database (PostgreSQL)
  - PostgREST (API REST automática)

### APIs y Comunicación
- **HTTP Client**: `axios` ^1.13.2
- **File Upload**: `multer` ^2.0.2
- **CORS**: Habilitado con configuración flexible

### Documentación API
- **Swagger/OpenAPI**: Integrado con NestJS Swagger
- **Endpoint**: `/api/docs` (en desarrollo)

### Testing
- **Framework**: Jest ^29.5.0
- **Cobertura**: Configurado con `test:cov`

### Linting y Formato
- **ESLint**: ^8.42.0
- **TypeScript ESLint**: ^6.0.0

---

## 🌐 Frontend Web

### Aplicaciones Web

#### 1. Store Front (`apps/store-front`)
- **Framework**: Next.js 14.0.0
- **Lenguaje**: TypeScript 5.x
- **UI Framework**: React 18.2.0
- **Estilos**:
  - Tailwind CSS ^3.3.0
  - Material-UI (MUI) ^7.3.5
  - Emotion (CSS-in-JS) ^11.14.0
- **Componentes UI**: 
  - `@headlessui/react` ^2.2.9
  - `@mui/icons-material` ^7.3.5
- **Cliente Supabase**: `@supabase/supabase-js` ^2.38.0
- **Puerto**: 3008

#### 2. Web Admin (`apps/web-admin`)
- **Framework**: Next.js 14.0.0
- **Lenguaje**: TypeScript 5.x
- **UI Framework**: React 18.2.0
- **Estilos**:
  - Tailwind CSS ^3.3.0
- **Componentes UI**: `@headlessui/react` ^2.2.9
- **Cliente Supabase**: `@supabase/supabase-js` ^2.38.0
- **Puerto**: 3002

#### 3. Web Local (`apps/web-local`)
- **Framework**: Next.js (versión similar a las otras apps)
- **Lenguaje**: TypeScript
- **UI Framework**: React
- **Estilos**: Tailwind CSS

### Herramientas de Desarrollo Frontend
- **PostCSS**: ^8 (procesamiento CSS)
- **Autoprefixer**: ^10.0.1
- **ESLint**: ^8 con `eslint-config-next`
- **TypeScript**: ^5

---

## 📱 Aplicaciones Móviles

### Mobile Client (`apps/mobile-client`)
- **Framework**: React Native 0.72.6
- **Plataforma**: Expo ~49.0.0
- **Lenguaje**: TypeScript 5.1.3
- **UI Framework**: React 18.2.0
- **Navegación**: 
  - `@react-navigation/native` ^6.1.7
  - `@react-navigation/native-stack` ^6.9.13
- **Cliente Supabase**: `@supabase/supabase-js` ^2.38.0
- **Utilidades**:
  - `react-native-safe-area-context` 4.6.3
  - `react-native-screens` ~3.22.0
  - `expo-status-bar` ~1.6.0

### Mobile Repartidor (`apps/mobile-repartidor`)
- **Framework**: React Native 0.72.6
- **Plataforma**: Expo ~49.0.0
- **Lenguaje**: TypeScript 5.1.3
- **UI Framework**: React 18.2.0
- **Navegación**: 
  - `@react-navigation/native` ^6.1.7
  - `@react-navigation/native-stack` ^6.9.13
- **Geolocalización**: `expo-location` ~16.1.0
- **Cliente Supabase**: `@supabase/supabase-js` ^2.38.0
- **Utilidades**: Mismas que mobile-client

---

## 🗄️ Base de Datos

### PostgreSQL (Supabase)
- **Versión**: PostgreSQL 13+
- **Hosting**: Supabase Cloud
- **Extensiones**:
  - PostGIS (geolocalización)
  - UUID nativo

### Organización del Schema
La base de datos está organizada en **7 schemas** por dominio funcional:

1. **`core`** - Entidades principales
   - `user_profiles` (perfiles de usuario)
   - `businesses` (negocios)
   - `repartidores` (repartidores)
   - `addresses` (direcciones con geolocalización)
   - `business_users` (roles y múltiples tiendas)

2. **`catalog`** - Catálogo de productos
   - `product_categories` (categorías)
   - `products` (productos)
   - `collections` (colecciones/combos)

3. **`orders`** - Sistema de pedidos
   - `orders` (pedidos)
   - `order_items` (items de pedido)
   - `deliveries` (entregas)

4. **`reviews`** - Evaluaciones
   - `reviews` (reseñas)
   - `tips` (propinas)

5. **`communication`** - Comunicación
   - `notifications` (notificaciones)
   - `messages` (mensajes)

6. **`commerce`** - Comercio
   - `promotions` (promociones)
   - `subscriptions` (suscripciones)
   - `ads` (publicidad)

7. **`social`** - Red social ecológica
   - `social_posts` (publicaciones)
   - `social_likes` (likes)
   - `social_comments` (comentarios)
   - `user_eco_profile` (perfiles ecológicos)

### Características de la Base de Datos
- ✅ Normalización completa (3NF)
- ✅ Integridad referencial con Foreign Keys
- ✅ Índices optimizados (B-tree, GIST para geolocalización, GIN para arrays)
- ✅ Triggers automáticos (timestamps, métricas)
- ✅ Row Level Security (RLS) en Supabase
- ✅ Tipos de datos: UUID, DECIMAL(10,2), JSONB, TEXT[], POINT (PostGIS)

---

## ☁️ Infraestructura y Servicios

### Supabase
- **Autenticación**: Supabase Auth
  - Email/Password
  - OAuth (configurable)
  - JWT tokens
  - Row Level Security (RLS)

- **Almacenamiento**: Supabase Storage
  - Buckets para productos, branding, etc.
  - Políticas RLS configurables
  - CDN integrado

- **Base de Datos**: PostgreSQL gestionado
  - Backups automáticos
  - Pooler de conexiones
  - API REST automática (PostgREST)

### Variables de Entorno
- `SUPABASE_URL` - URL del proyecto Supabase
- `SUPABASE_ANON_KEY` - Clave pública
- `SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio (solo backend)
- `DATABASE_URL` - URL de conexión directa a PostgreSQL
- `CORS_ORIGIN` - Orígenes permitidos para CORS

---

## 🔐 Seguridad

### Autenticación
- **Backend**: JWT tokens con Supabase Auth
- **API Keys**: Sistema de API Keys para aplicaciones externas
- **Service Role**: Solo en backend para operaciones administrativas

### Validación
- **Backend**: `class-validator` para DTOs
- **Frontend**: Validación en formularios
- **Base de Datos**: Constraints y Foreign Keys

### Seguridad de Datos
- Passwords hasheados (Supabase Auth)
- Row Level Security (RLS) en Supabase
- SSL/TLS en todas las conexiones
- Variables de entorno para secretos

---

## 📦 Gestión de Dependencias

### Backend
- **Gestor**: npm
- **Lock file**: `package-lock.json`
- **Instalación**: `npm install` en `apps/backend/`

### Frontend
- **Gestor**: npm
- **Lock file**: `package-lock.json` (en cada app)
- **Instalación**: Scripts en root `package.json`

### Scripts Principales
```json
{
  "dev:backend": "cd apps/backend && npm run dev",
  "dev:client": "cd apps/mobile-client && npm start",
  "dev:repartidor": "cd apps/mobile-repartidor && npm start",
  "dev:local": "cd apps/web-local && npm run dev",
  "dev:admin": "cd apps/web-admin && npm run dev",
  "install:all": "npm run install:backend && ..."
}
```

---

## 🧪 Testing

### Backend
- **Framework**: Jest
- **Comandos**:
  - `npm test` - Ejecutar tests
  - `npm run test:watch` - Modo watch
  - `npm run test:cov` - Con cobertura

### Frontend
- Testing configurado en Next.js (Jest/React Testing Library)

---

## 📝 Linting y Formato

### Backend
- **ESLint**: ^8.42.0
- **TypeScript ESLint**: ^6.0.0
- **Comando**: `npm run lint` (con `--fix`)

### Frontend
- **ESLint**: Integrado con Next.js
- **Configuración**: `eslint-config-next`

---

## 🚀 Despliegue

### Backend
- **Plataforma**: Node.js server (Vercel, Railway, Render, etc.)
- **Puerto**: Configurable (default 3000)
- **Build**: `npm run build` → `dist/`
- **Start**: `npm run start:prod`

### Frontend Web
- **Plataforma**: Vercel (recomendado para Next.js)
- **Build**: `npm run build`
- **Start**: `npm start`

### Mobile
- **Plataforma**: Expo Application Services (EAS)
- **Build**: `expo build` o EAS Build
- **Distribución**: App Store, Google Play Store

---

## 📚 Documentación

### API
- **Swagger/OpenAPI**: Disponible en `/api/docs` (desarrollo)
- **Postman**: Colecciones en `apps/backend/postman/`

### Base de Datos
- **Schema**: Documentado en `database/README.md`
- **Migraciones**: En `database/migrations/`
- **Seeds**: En `database/seeds/`

### Proyecto
- **Documentación general**: En `docs/`
- **Guías de configuración**: En `docs/` y archivos `SETUP-*.md`

---

## 🔄 Integraciones Externas

### Pagos
- **Karlopay**: Integración con sistema de pagos (ver `integraciones/karlo.md`)
- **Wallet**: Sistema de monedero electrónico (proyecto separado)

### APIs Externas
- Configuración mediante `integrations_settings` en base de datos
- Sistema de API Keys para autenticación externa

---

## 📊 Monitoreo y Logging

### Backend
- Logs en consola (desarrollo)
- Configuración para producción (pendiente)

### Base de Datos
- Logs de Supabase Dashboard
- Queries y performance monitoring

---

## 🛠️ Herramientas de Desarrollo

### Versionado
- **Git**: Control de versiones
- **GitHub**: Repositorio remoto

### IDEs Recomendados
- **VS Code** / **Cursor** (con extensiones TypeScript)
- **WebStorm** (JetBrains)

### Extensiones Útiles
- ESLint
- Prettier (recomendado)
- TypeScript
- PostgreSQL (para gestión de BD)

---

## 📈 Escalabilidad

### Arquitectura
- ✅ Monorepo para código compartido
- ✅ Separación de responsabilidades (schemas en BD)
- ✅ Pool de conexiones en backend
- ✅ CDN integrado (Supabase Storage)

### Optimizaciones
- Índices estratégicos en base de datos
- Consultas optimizadas con PostGIS
- Caching (pendiente de implementar)
- Lazy loading en frontend

---

## 🔮 Tecnologías Futuras Consideradas

- **Caching**: Redis (para sesiones y cache)
- **Queue System**: Bull/BullMQ (para tareas asíncronas)
- **Real-time**: Supabase Realtime (WebSockets)
- **Analytics**: Integración con servicios de analytics
- **Monitoring**: Sentry, LogRocket, etc.

---

## 📞 Contacto y Soporte

Para más información sobre el stack tecnológico, consulta:
- `README.md` - Documentación general del proyecto
- `docs/` - Documentación detallada
- `database/README.md` - Documentación de base de datos

---

**Última actualización**: Enero 2025  
**Versión del Stack**: 1.0

