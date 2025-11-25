# 📊 Base de Datos LOCALIA

Este directorio contiene el esquema de base de datos para la plataforma LOCALIA.

## 📁 Archivos SQL - Documentación Completa

### Secuencia de Creación y Descripción
Test

Los archivos SQL están organizados por orden de creación y propósito. A continuación se documenta cada uno:

#### 1. **`schema.sql`** (Base - Ejecutar primero)
**Descripción:** Script principal con la estructura completa de la base de datos.  
**Contiene:** Schemas, tablas, índices, triggers, funciones, ENUMs, y toda la estructura base.  
**Cuándo ejecutar:** Primero, antes que cualquier otro script.  
**Dependencias:** Requiere extensión PostGIS.

#### 2. **`api_keys_schema.sql`**
**Descripción:** Sistema de autenticación mediante API Keys para aplicaciones externas.  
**Contiene:** Tablas `api_keys` y `api_key_requests` para tracking de peticiones.  
**Cuándo ejecutar:** Después de `schema.sql`, si necesitas autenticación de aplicaciones.  
**Dependencias:** `schema.sql`

#### 3. **`business_categories_catalog.sql`**
**Descripción:** Catálogo de categorías de negocios (tipos de establecimientos).  
**Contiene:** Categorías predefinidas para clasificar negocios (Restaurante, Café, Tienda, etc.).  
**Cuándo ejecutar:** Después de `schema.sql`, para tener categorías base.  
**Dependencias:** `schema.sql`

#### 4. **`service_regions.sql`**
**Descripción:** Sistema de regiones de servicio (áreas de cobertura de delivery).  
**Contiene:** Tabla `service_regions` con polígonos GeoJSON para definir zonas de entrega.  
**Cuándo ejecutar:** Después de `schema.sql`, si necesitas definir regiones de servicio.  
**Dependencias:** `schema.sql`

#### 4.1. **`get_location_region.sql`** 🆕
**Descripción:** Función SQL para identificar en qué zona de cobertura está un punto específico.  
**Contiene:** Función `core.get_location_region()` que retorna la región (zona) en la que está ubicado un punto, incluyendo el nombre de la zona (ej: "La Roma", "Polanco").  
**Cuándo ejecutar:** Después de `service_regions.sql`, para habilitar la identificación de zonas.  
**Dependencias:** `service_regions.sql`  
**Nota:** Esta función es utilizada por el backend para validar y mostrar la zona específica cuando se selecciona una ubicación en el mapa.

#### 5. **`migration_fix_wallet_types.sql`**
**Descripción:** Migración para cambiar campos de wallet de UUID a VARCHAR(255).  
**Contiene:** ALTER TABLE para campos `wallet_*` en múltiples tablas.  
**Cuándo ejecutar:** Solo si ya tienes datos y necesitas cambiar tipos de wallet.  
**Dependencias:** `schema.sql` (con datos existentes)

#### 6. **`business_roles_and_multi_store.sql`** 🆕
**Descripción:** Sistema de roles de negocio y soporte para múltiples tiendas por cuenta.  
**Contiene:** 
- ENUM `business_role` (superadmin, admin, operativo_aceptador, operativo_cocina)
- Tabla `core.business_users` (relación muchos-a-muchos usuarios-negocios)
- Funciones para gestión de usuarios y permisos
- Triggers de validación
- Migración automática de owners existentes a superadmin
**Cuándo ejecutar:** Después de `schema.sql`, para habilitar roles de negocio.  
**Dependencias:** `schema.sql`  
**Documentación:** Ver `docs/18-roles-negocio-multi-tiendas.md`

#### 7. **`superadmin_account_users.sql`** 🆕
**Descripción:** Funciones para gestión de usuarios a nivel de cuenta del superadmin.  
**Contiene:**
- `get_superadmin_account_users()` - Ver usuarios de todas las tiendas del superadmin
- `get_available_users_for_superadmin_account()` - Usuarios disponibles para asignar
- `remove_user_from_superadmin_account()` - Remover de todas las tiendas
- `get_superadmin_account_users_summary()` - Resumen por tienda
**Cuándo ejecutar:** Después de `business_roles_and_multi_store.sql`.  
**Dependencias:** `business_roles_and_multi_store.sql`

#### 8. **`migrate_user_to_roles.sql`**
**Descripción:** Script de migración para usuarios existentes al nuevo sistema de roles.  
**Contiene:** Migración específica para un usuario (configurado con UUID del usuario).  
**Cuándo ejecutar:** Después de `business_roles_and_multi_store.sql`, para migrar usuarios existentes.  
**Dependencias:** `business_roles_and_multi_store.sql`  
**Nota:** Este script está configurado para un usuario específico. Modifica el UUID antes de ejecutar.

#### 8.1. **`migrate_existing_businesses_to_business_users.sql`** 🔧
**Descripción:** Migración masiva de negocios existentes al sistema de roles.  
**Contiene:** Asigna rol `superadmin` a todos los `owner_id` de negocios que no tengan registro en `business_users`.  
**Cuándo ejecutar:** Después de `business_roles_and_multi_store.sql`, si tienes negocios creados antes del sistema de roles.  
**Dependencias:** `business_roles_and_multi_store.sql`

#### 8.2. **`fix_missing_business_users.sql`** 🔧
**Descripción:** Corrección rápida para negocios sin registro en `business_users`.  
**Contiene:** Asigna automáticamente el rol `superadmin` a negocios que existen pero no tienen registro en `business_users`.  
**Cuándo ejecutar:** Si un negocio existe pero el usuario no lo ve en web-local (404 en `/api/businesses/my-business`).  
**Dependencias:** `business_roles_and_multi_store.sql`  
**Nota:** Este script es idempotente y seguro de ejecutar múltiples veces.

#### 9. **`seed_catalog.sql`**
**Descripción:** Datos de catálogo básicos (categorías globales de ejemplo).  
**Contiene:** Categorías de productos predefinidas (Entradas, Platos Principales, Bebidas, Postres).  
**Cuándo ejecutar:** Después de `schema.sql`, opcional para tener categorías base.  
**Dependencias:** `schema.sql`

#### 10. **`seed_delivery_cycle.sql`**
**Descripción:** Ciclo completo de delivery de ejemplo para pruebas.  
**Contiene:** Usuarios, negocio, productos, pedido, entrega, evaluación y propina.  
**Cuándo ejecutar:** Después de crear usuarios en Supabase Auth, para datos de prueba.  
**Dependencias:** `schema.sql`, usuarios creados en `auth.users`

#### 11. **`seed_roles_catalog.sql`** ⚠️ OPCIONAL
**Descripción:** Catálogo de roles para documentación (no necesario para funcionamiento).  
**Contiene:** Tabla `roles_catalog` con permisos y descripciones de roles.  
**Cuándo ejecutar:** Opcional, solo si necesitas documentación de permisos.  
**Dependencias:** `schema.sql`  
**Nota:** Los roles funcionan perfectamente solo con el ENUM definido en `schema.sql`.

#### 12. **`create_profiles_only.sql`**
**Descripción:** Script simplificado para crear perfiles de usuarios existentes en Supabase Auth.  
**Contiene:** Creación de `user_profiles` para usuarios predefinidos (cliente, repartidor, local).  
**Cuándo ejecutar:** Después de crear usuarios en Supabase Dashboard.  
**Dependencias:** Usuarios creados en `auth.users`

#### 13. **`create_test_users.sql`** ⚠️ Puede fallar
**Descripción:** Intenta crear usuarios y perfiles (requiere permisos de service_role).  
**Contiene:** Creación de usuarios en `auth.users` y perfiles en `user_profiles`.  
**Cuándo ejecutar:** Solo si tienes permisos de service_role (generalmente falla).  
**Dependencias:** Permisos de service_role  
**Nota:** ⚠️ Generalmente falla. Usa `create_profiles_only.sql` en su lugar.

#### 14. **`fix_admin_role.sql`**
**Descripción:** Script de corrección para roles de administrador.  
**Contiene:** Correcciones específicas para roles admin.  
**Cuándo ejecutar:** Solo si necesitas corregir roles admin existentes.  
**Dependencias:** `schema.sql` (con datos existentes)

#### 15. **`migration_advanced_catalog_system.sql`** 🆕
**Descripción:** Sistema avanzado de catálogos de productos con funcionalidades completas.  
**Contiene:**
- ENUM `product_type` (food, beverage, medicine, grocery, non_food)
- Atributos múltiples para categorías de productos (JSONB)
- Sistema estructurado de variantes de productos (tablas `product_variant_groups` y `product_variants`)
- Mejora de colecciones (paquetes como productos, cantidades fraccionarias)
- Campos para productos de farmacia (receta, edad, límites)
- Funciones auxiliares y vistas útiles
**Cuándo ejecutar:** Después de `schema.sql`, para habilitar funcionalidades avanzadas de catálogos.  
**Dependencias:** `schema.sql`  
**Documentación:** Ver `docs/20-sistema-catalogos-productos-avanzado.md`  
**Nota:** Este script es idempotente y seguro de ejecutar múltiples veces. Migra automáticamente productos existentes.

#### 15.1. **`migration_product_type_field_config.sql`** 🆕
**Descripción:** Configuración de campos por tipo de producto. Define qué campos del formulario deben mostrarse según el tipo de producto seleccionado (ej: alérgenos solo para alimentos, campos de farmacia solo para medicamentos).  
**Contiene:** 
- Verificación y creación automática del tipo `catalog.product_type` si no existe
- Tabla `catalog.product_type_field_config` con configuración de visibilidad y requerimiento de campos
- Función `catalog.get_product_type_field_config(product_type)` para obtener configuración
- Datos iniciales para todos los tipos de producto (food, beverage, medicine, grocery, non_food)
**Cuándo ejecutar:** Después de `schema.sql` (y opcionalmente `migration_advanced_catalog_system.sql`), para configurar qué campos mostrar en el formulario.  
**Dependencias:** `schema.sql` (requerido), `migration_advanced_catalog_system.sql` (opcional, se crea automáticamente si falta)  
**Nota:** Esta migración permite personalizar el formulario de productos según el tipo, evitando mostrar campos irrelevantes (ej: alérgenos para medicamentos). La migración es robusta y crea automáticamente el tipo `product_type` si no existe.

#### 16. **`examples_advanced_catalog.sql`** 🆕
**Descripción:** Ejemplos prácticos de uso del sistema avanzado de catálogos.  
**Contiene:**
- Ejemplo 1: Producto con variantes (Papas Fritas - Chica, Mediana, Grande)
- Ejemplo 2: Producto con múltiples grupos de variantes (Hamburguesa con Tamaño + Extras)
- Ejemplo 3: Categoría con atributos múltiples
- Ejemplo 4: Combo con cantidades fraccionarias
- Ejemplo 5: Producto de farmacia
- Consultas útiles para trabajar con el sistema
**Cuándo ejecutar:** Después de `migration_advanced_catalog_system.sql`, para ver ejemplos de uso.  
**Dependencias:** `migration_advanced_catalog_system.sql`  
**Nota:** Este script es solo para referencia y aprendizaje. No es necesario ejecutarlo para el funcionamiento del sistema.

#### 17. **`seed_advanced_catalog_admin.sql`** 🆕
**Descripción:** Catálogo completo y avanzado de tipos de productos y categorías gestionado por administradores.  
**Contiene:**
- Atributos completos para cada tipo de producto (food, beverage, medicine, grocery, non_food)
- Categorías principales globales (Entradas, Platos Principales, Acompañamientos, Bebidas, Postres, Combos)
- Subcategorías jerárquicas (Bebidas Frías, Bebidas Calientes, Bebidas Alcohólicas, Hamburguesas, Pizzas, Tacos, Pastas, Ensaladas, etc.)
- Categorías especiales (Analgésicos, Vitaminas y Suplementos para farmacia)
- Atributos JSONB completos para cada categoría (temperatura, tamaño de porción, sugerencias, etc.)
**Cuándo ejecutar:** Después de `migration_advanced_catalog_system.sql`, para poblar el catálogo base.  
**Dependencias:** `migration_advanced_catalog_system.sql`  
**Nota:** Este catálogo es gestionado exclusivamente por administradores. Los locales solo pueden seleccionar categorías y tipos de producto existentes, no crear nuevos.

### Orden Recomendado de Ejecución

```sql
-- 1. Base (OBLIGATORIO)
\i database/schema.sql

-- 2. Extensiones y sistemas adicionales (OPCIONAL)
\i database/api_keys_schema.sql
\i database/business_categories_catalog.sql
\i database/service_regions.sql

-- 3. Sistema de roles de negocio (OBLIGATORIO para gestión de usuarios)
\i database/business_roles_and_multi_store.sql
\i database/superadmin_account_users.sql

-- 4. Sistema avanzado de catálogos (OPCIONAL pero recomendado)
\i database/migration_advanced_catalog_system.sql

-- 5. Migraciones de usuarios existentes (si aplica)
\i database/migrate_user_to_roles.sql  -- Modificar UUID antes de ejecutar

-- 6. Catálogo avanzado para administradores (RECOMENDADO)
\i database/seed_advanced_catalog_admin.sql  -- Catálogo completo de tipos y categorías

-- 7. Datos de ejemplo (OPCIONAL)
\i database/seed_catalog.sql
\i database/seed_delivery_cycle.sql  -- Requiere usuarios en auth.users
\i database/examples_advanced_catalog.sql  -- Ejemplos del sistema avanzado de catálogos

-- 6. Scripts opcionales
\i database/seed_roles_catalog.sql  -- Solo si necesitas documentación
\i database/create_profiles_only.sql  -- Después de crear usuarios en Dashboard
```

## 🗄️ Estructura de la Base de Datos

### Tecnología
- **SGBD:** PostgreSQL 13+ (Supabase)
- **Extensiones:** `postgis` (geolocalización)
- **UUIDs:** Usa `gen_random_uuid()` nativo (no requiere extensión adicional)
- **Organización:** Schemas por dominio funcional

### Características Principales

✅ **Normalización:** Base de datos completamente normalizada (3NF)  
✅ **Organización por Schemas:** Tablas agrupadas en 7 schemas lógicos  
✅ **Integridad Referencial:** Constraints y foreign keys en todas las relaciones  
✅ **Índices Optimizados:** Índices estratégicos para consultas frecuentes  
✅ **Geolocalización:** Soporte para consultas espaciales con PostGIS  
✅ **Triggers Automáticos:** Actualización de timestamps y métricas  
✅ **Escalabilidad:** Diseño preparado para crecimiento

### Schemas (Organización por Dominio)

La base de datos está organizada en **7 schemas** para mejor mantenibilidad:

1. **`core`** - Entidades principales: usuarios, negocios, repartidores, direcciones
2. **`catalog`** - Catálogo: productos, categorías, colecciones
3. **`orders`** - Pedidos: órdenes, items, entregas
4. **`reviews`** - Evaluaciones: reseñas, propinas
5. **`communication`** - Comunicación: notificaciones, mensajes
6. **`commerce`** - Comercio: promociones, suscripciones, publicidad
7. **`social`** - Red social ecológica: posts, likes, comentarios, perfiles  

## 📋 Tablas Principales

### Schema: `core`
- `user_profiles` - Perfiles de usuario que extienden `auth.users` de Supabase (roles, información personal)
- `addresses` - Direcciones de usuarios con geolocalización
- `businesses` - Locales/negocios registrados
- `business_users` - 🆕 Relación muchos-a-muchos entre usuarios y negocios (roles de negocio y múltiples tiendas por cuenta) - Ver `docs/18-roles-negocio-multi-tiendas.md`
- `repartidores` - Información específica de repartidores

**Nota:** La autenticación se maneja mediante Supabase Auth (`auth.users`). Esta tabla solo contiene información de perfil y roles.

### Schema: `catalog`
- `product_categories` - Categorías de productos (normalizadas, con jerarquía)
- `products` - Productos del menú de cada local
- `collections` - Colecciones de productos (combos, menús del día, paquetes)
- `collection_products` - Relación muchos-a-muchos entre colecciones y productos

### Schema: `orders`
- `orders` - Pedidos realizados por clientes
- `order_items` - Items individuales dentro de un pedido
- `deliveries` - Entregas asignadas a repartidores

### Schema: `reviews`
- `reviews` - Evaluaciones y reseñas
- `tips` - Propinas dadas a repartidores

### Schema: `communication`
- `notifications` - Notificaciones push del sistema
- `messages` - Mensajes de chat entre usuarios

### Schema: `commerce`
- `promotions` - Promociones y ofertas
- `promotion_uses` - Historial de uso de promociones
- `subscriptions` - Suscripciones premium
- `ads` - Publicidad interna de locales

### Schema: `social`
- `social_posts` - Publicaciones en la red social ecológica
- `social_likes` - Likes en publicaciones
- `social_comments` - Comentarios en publicaciones
- `social_follows` - Relaciones de seguimiento
- `user_eco_profile` - Perfil ecológico y métricas de impacto

## 🔐 Integración con Supabase Auth

Este schema está diseñado para trabajar con **Supabase Authentication**:

- **`auth.users`**: Tabla de usuarios de Supabase (email, password, verificación)
- **`core.user_profiles`**: Tabla que extiende `auth.users` con información de perfil y roles

**Función automática:** Se incluye `handle_new_user()` que crea automáticamente un perfil cuando se registra un usuario en Supabase Auth. El trigger debe configurarse en Supabase Dashboard.

**Para crear usuarios:**
- Usa Supabase Auth API desde tu aplicación
- O crea usuarios manualmente desde Supabase Dashboard
- El perfil se crea automáticamente si el trigger está configurado

## 🔗 Integración con Wallet

El sistema de **Wallet (LocalCoins)** es un proyecto separado. Este schema incluye referencias externas mediante campos VARCHAR (pueden ser UUIDs o strings):

- `user_profiles.wallet_user_id` - ID del usuario en el Wallet (VARCHAR)
- `businesses.wallet_business_id` - ID del negocio en el Wallet (VARCHAR)
- `repartidores.wallet_repartidor_id` - ID del repartidor en el Wallet (VARCHAR)
- `orders.wallet_transaction_id` - ID de transacción en el Wallet (VARCHAR)
- `tips.wallet_transaction_id` - ID de transacción en el Wallet (VARCHAR)
- `subscriptions.wallet_subscription_id` - ID de suscripción en el Wallet (VARCHAR)

**Nota:** Los campos de wallet usan `VARCHAR(255)` para permitir tanto UUIDs como identificadores de tipo string (ej: `'wallet-user-cliente-001'`).

Estas referencias permiten la integración mediante APIs sin duplicar datos.

## 🚀 Uso

### Estructura de Scripts

Los scripts están organizados en tres archivos:

1. **`schema.sql`**: Estructura de la base de datos (tablas, índices, triggers, funciones)
   - Debe ejecutarse primero
   - Crea todos los schemas, tablas y relaciones

2. **`seed_catalog.sql`**: Datos de catálogo básicos
   - Categorías globales de ejemplo
   - Útil para tener categorías base sin datos de negocio

3. **`seed_delivery_cycle.sql`**: Ciclo completo de delivery
   - Usuarios (cliente, repartidor, dueño de local)
   - Negocio completo con productos y colecciones
   - Pedido completo con items
   - Entrega realizada
   - Evaluación y propina
   - **Recomendado para pruebas y desarrollo**

### Crear la Base de Datos

```bash
# Conectar a PostgreSQL (como superusuario)
psql -U postgres

# Crear base de datos
CREATE DATABASE delivery_ecosystem;

# Conectar a la base de datos
\c delivery_ecosystem

# IMPORTANTE: Crear extensión PostGIS (requiere permisos de superusuario)
# En Supabase, puedes habilitarla desde el Dashboard: Database > Extensions
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public;

# Nota: Los UUIDs usan gen_random_uuid() nativo, no requiere extensión uuid-ossp

# Ejecutar el schema (estructura)
\i database/schema.sql

# (Opcional) Poblar datos de ejemplo
# Opción 1: Solo catálogo básico
\i database/seed_catalog.sql

# Opción 2: Ciclo completo de delivery (recomendado para pruebas)
\i database/seed_delivery_cycle.sql
```

### Verificar Instalación

```sql
-- Ver todos los schemas
\dn

-- Ver todas las tablas (por schema)
\dt core.*
\dt catalog.*
\dt orders.*
\dt reviews.*
\dt communication.*
\dt commerce.*
\dt social.*

-- Ver estructura de una tabla
\d core.user_profiles
\d catalog.products
\d orders.orders

-- Ver índices
\di

-- Ver triggers
\dy

-- Ver todas las tablas en todos los schemas
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social')
ORDER BY table_schema, table_name;
```

## 📊 Diagrama de Relaciones

### Entidades Principales (por Schema)

```
SCHEMA: core
├── user_profiles (1) ──┬── (N) addresses
│                       ├── (1) repartidores
│                       ├── (N) orders (como client_id)
│                       └── (N) social_posts
│
├── businesses (1) ──┬── (N) product_categories
│                    ├── (N) products
│                    ├── (N) collections
│                    ├── (N) orders
│                    ├── (N) promotions
│                    └── (N) ads
│
└── repartidores (1) ──┬── (N) deliveries
                       └── (N) tips

NOTA: user_profiles.id referencia auth.users.id (Supabase Auth)

SCHEMA: catalog
├── product_categories (1) ──┬── (N) products
│                             └── (1) parent_category (auto-referencia)
│
├── products (1) ──┬── (N) collection_products
│                  └── (N) order_items
│
└── collections (1) ──┬── (N) collection_products
                       └── (N) order_items

SCHEMA: orders
├── orders (1) ──┬── (N) order_items (productos o colecciones)
│                ├── (1) deliveries
│                ├── (1) reviews
│                └── (1) tips
│
└── deliveries (1) ── (N) repartidores

SCHEMA: reviews
├── reviews (1) ── (1) orders
└── tips (1) ──┬── (1) orders
               └── (1) repartidores

SCHEMA: communication
├── notifications (1) ── (N) users
└── messages (1) ──┬── (1) sender (users)
                   └── (1) recipient (users)

SCHEMA: commerce
├── promotions (1) ──┬── (N) promotion_uses
│                    └── (N) businesses
├── subscriptions (1) ── (N) users
└── ads (1) ── (N) businesses

SCHEMA: social
├── social_posts (1) ──┬── (N) social_likes
│                      ├── (N) social_comments
│                      └── (1) users
│
├── social_follows (1) ──┬── (1) follower (users)
│                        └── (1) following (users)
│
└── user_eco_profile (1) ── (1) users
```

## 📦 Sistema de Categorías y Colecciones

### Categorías de Productos

El sistema de categorías está **normalizado** y soporta:

- ✅ **Categorías globales**: Categorías compartidas por todos los negocios (ej: "Entradas", "Bebidas")
- ✅ **Categorías por negocio**: Categorías específicas de un local (ej: "Especialidades de la casa")
- ✅ **Jerarquía**: Categorías padre/hijo para subcategorías (ej: "Bebidas" → "Bebidas frías" → "Jugos")
- ✅ **Orden personalizado**: Control del orden de visualización

**Ejemplo de uso:**
```sql
-- Crear categoría global
INSERT INTO product_categories (name, description) 
VALUES ('Bebidas', 'Todas las bebidas disponibles');

-- Crear subcategoría
INSERT INTO product_categories (name, parent_category_id) 
VALUES ('Bebidas frías', (SELECT id FROM product_categories WHERE name = 'Bebidas'));

-- Asignar producto a categoría
UPDATE products SET category_id = (SELECT id FROM product_categories WHERE name = 'Bebidas')
WHERE id = 'uuid-del-producto';
```

### Colecciones de Productos

Las colecciones permiten agrupar productos en:

- 🍔 **Combos**: Paquetes fijos con precio especial (ej: "Combo Hamburguesa + Papas + Bebida")
- 📅 **Menús del día**: Menús especiales con validez por fecha
- 📦 **Paquetes**: Agrupaciones promocionales
- 🎁 **Bundles promocionales**: Paquetes con descuento

**Características:**
- Precio fijo para la colección (puede ser menor que la suma de productos individuales)
- Múltiples productos con cantidades específicas
- Precios override por producto (opcional)
- Validez por fechas (para menús temporales)
- Orden de visualización personalizado

**Ejemplo de uso:**
```sql
-- Crear combo
INSERT INTO collections (business_id, name, type, price, original_price)
VALUES (
    'uuid-del-negocio',
    'Combo Familiar',
    'combo',
    250.00,  -- Precio del combo
    320.00   -- Precio si se compraran los productos por separado
);

-- Agregar productos al combo
INSERT INTO collection_products (collection_id, product_id, quantity)
VALUES 
    ('uuid-del-combo', 'uuid-hamburguesa', 2),
    ('uuid-del-combo', 'uuid-papas', 2),
    ('uuid-del-combo', 'uuid-bebida', 2);
```

## 🔍 Consultas Útiles

### Usuarios Activos por Rol
```sql
SELECT up.role, COUNT(*) as total
FROM core.user_profiles up
WHERE up.is_active = TRUE
GROUP BY up.role;
```

### Usuarios con Información de Auth
```sql
SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    up.role,
    up.first_name,
    up.last_name,
    up.phone
FROM auth.users au
LEFT JOIN core.user_profiles up ON up.id = au.id
WHERE up.is_active = TRUE;
```

### Pedidos por Estado
```sql
SELECT status, COUNT(*) as total
FROM orders.orders
GROUP BY status
ORDER BY total DESC;
```

### Top Locales por Calificación
```sql
SELECT name, rating_average, total_reviews
FROM core.businesses
WHERE is_active = TRUE
ORDER BY rating_average DESC
LIMIT 10;
```

### Productos por Categoría
```sql
SELECT pc.name as categoria, COUNT(p.id) as total_productos
FROM catalog.product_categories pc
LEFT JOIN catalog.products p ON p.category_id = pc.id
WHERE pc.business_id = 'uuid-del-negocio'
GROUP BY pc.id, pc.name
ORDER BY total_productos DESC;
```

### Colecciones Disponibles de un Negocio
```sql
SELECT c.name, c.type, c.price, c.original_price,
       COUNT(cp.product_id) as productos_incluidos
FROM catalog.collections c
LEFT JOIN catalog.collection_products cp ON cp.collection_id = c.id
WHERE c.business_id = 'uuid-del-negocio'
  AND c.is_available = TRUE
  AND (c.valid_until IS NULL OR c.valid_until >= CURRENT_DATE)
GROUP BY c.id, c.name, c.type, c.price, c.original_price
ORDER BY c.display_order;
```

### Productos de una Colección
```sql
SELECT p.name, p.price, cp.quantity, cp.price_override
FROM catalog.collections c
JOIN catalog.collection_products cp ON cp.collection_id = c.id
JOIN catalog.products p ON p.id = cp.product_id
WHERE c.id = 'uuid-de-la-coleccion'
ORDER BY cp.display_order;
```

### Repartidores Disponibles en Radio
```sql
SELECT r.id, up.first_name, up.last_name, r.current_location
FROM core.repartidores r
JOIN core.user_profiles up ON r.user_id = up.id
WHERE r.is_available = TRUE
  AND ST_DWithin(
    r.current_location::geography,
    ST_MakePoint(-99.1332, 19.4326)::geography, -- Coordenadas ejemplo
    3000 -- 3 km en metros
  );
```

### Publicaciones Ecológicas Más Populares
```sql
SELECT sp.id, up.first_name, sp.co2_saved_kg, sp.likes_count
FROM social.social_posts sp
JOIN core.user_profiles up ON sp.user_id = up.id
WHERE sp.is_visible = TRUE
ORDER BY sp.likes_count DESC
LIMIT 10;
```

### Verificar Schemas Creados
```sql
-- Listar todos los schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');

-- Ver tablas por schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social')
ORDER BY table_schema, table_name;
```

## 🔐 Seguridad

- **Passwords:** Almacenados como hash (no en texto plano)
- **Tokens:** Tokens de verificación y reset con expiración
- **Soft Delete:** Campos `is_active`, `is_blocked` para desactivación sin eliminar
- **Constraints:** Validaciones a nivel de base de datos

## 📈 Optimizaciones

### Índices Estratégicos
- Índices en foreign keys para joins rápidos
- Índices en campos de búsqueda frecuente (email, phone, status)
- Índices GIST para consultas geográficas
- Índices GIN para arrays (tags, badges)

### Triggers Automáticos
- Actualización automática de `updated_at`
- Actualización de ratings promedio de negocios y repartidores
- Actualización de contadores de likes/comentarios en posts sociales

## 🔄 Migraciones Futuras

Para futuras modificaciones del schema, se recomienda:

1. Crear scripts de migración numerados: `migrations/001_add_column.sql`
2. Usar herramientas como `node-pg-migrate` o `knex.js`
3. Mantener versionado del schema
4. Documentar cambios en CHANGELOG.md

## 📝 Notas

- Todos los IDs son UUIDs para mejor distribución y seguridad
- Los timestamps usan `TIMESTAMP` (con timezone implícito)
- Los montos monetarios usan `DECIMAL(10,2)` para precisión
- Las coordenadas geográficas usan PostGIS `POINT` type
- Los arrays (tags, badges) usan tipos nativos de PostgreSQL

## 👥 Crear Usuarios de Prueba

### ⚠️ IMPORTANTE: Crear Usuarios en Supabase Dashboard

**En Supabase, NO puedes crear usuarios directamente en `auth.users` sin permisos de `service_role`.**

### Método Recomendado (Dashboard + Script Simplificado)

1. **Crea los usuarios en Supabase Dashboard:**
   - Ve a **Authentication > Users > Add User**
   - Crea estos 3 usuarios con estos emails exactos:
     - `cliente@example.com`
     - `repartidor@example.com`
     - `local@example.com`
   - Puedes usar cualquier password (ej: `password123`)

2. **Crea los perfiles usando el script simplificado:**
   ```sql
   \i database/create_profiles_only.sql
   ```

Este script:
- ✅ Busca los usuarios por email en `auth.users`
- ✅ Crea los perfiles en `core.user_profiles` automáticamente
- ✅ Muestra mensajes claros si falta algún usuario

### Scripts Disponibles

#### `create_profiles_only.sql` (✅ RECOMENDADO)
Solo crea perfiles. Usa esto después de crear usuarios en el Dashboard.

#### `create_test_users.sql` (⚠️ Puede fallar)
Intenta crear usuarios y perfiles, pero requiere permisos de `service_role`. Generalmente falla con error de `instance_id`.

### Verificar Usuarios Creados

```sql
SELECT id, email FROM auth.users 
WHERE email IN ('cliente@example.com', 'repartidor@example.com', 'local@example.com');
```

## 👥 Roles del Sistema

### Roles Definidos (ENUM - OBLIGATORIO)

Los roles están definidos como **ENUM** en `schema.sql` (esto es lo que realmente usa la base de datos):

```sql
CREATE TYPE user_role AS ENUM (
    'client',      -- Cliente
    'repartidor',  -- Repartidor
    'local',       -- Dueño/Gerente de local
    'admin'        -- Administrador del sistema
);
```

**Estos 4 roles son los únicos válidos en el sistema:**
1. **`client`** - Cliente (usuario final)
2. **`repartidor`** - Repartidor (realiza entregas)
3. **`local`** - Dueño/Gerente de Local (gestiona negocio)
4. **`admin`** - Administrador del Sistema (acceso completo)

### Catálogo de Roles (OPCIONAL - Solo para documentación)

⚠️ **IMPORTANTE:** El script `seed_roles_catalog.sql` es **OPCIONAL**. Solo crea una tabla de documentación.

**Si NO necesitas documentación de permisos, NO ejecutes este script.**

El catálogo crea:
- Tabla `core.roles_catalog` (solo para consultas/documentación)
- Vista `core.roles_with_user_count` (estadísticas)
- Vista `core.user_profiles_with_role_info` (combina user_profiles con info del catálogo)
- Funciones `get_role_permissions()`, `has_permission()`, `get_user_permissions()`, `user_has_permission()`

**Los roles funcionan perfectamente solo con el ENUM.**

### Relación entre `user_profiles` y `roles_catalog`

**Relación lógica (no hay Foreign Key directa):**
- `user_profiles.role` (tipo: `user_role` ENUM) → valores: `'client'`, `'repartidor'`, `'local'`, `'admin'`
- `roles_catalog.role_code` (tipo: `VARCHAR`) → debe coincidir con los valores del ENUM
- **JOIN:** `user_profiles.role::text = roles_catalog.role_code`

**Ejemplo de consulta:**
```sql
-- Ver usuarios con información del catálogo de roles
SELECT 
    up.id,
    up.first_name,
    up.last_name,
    up.role,
    rc.role_name,
    rc.description,
    rc.permissions
FROM core.user_profiles up
LEFT JOIN core.roles_catalog rc ON up.role::text = rc.role_code
WHERE up.is_active = TRUE;
```

**O usar la vista predefinida:**
```sql
-- Vista que ya combina user_profiles con catálogo de roles
SELECT * FROM core.user_profiles_with_role_info WHERE is_active = TRUE;
```

**Verificar permisos de un usuario:**
```sql
-- Obtener todos los permisos de un usuario
SELECT core.get_user_permissions('user-uuid-here');

-- Verificar si un usuario tiene un permiso específico
SELECT core.user_has_permission('user-uuid-here', 'can_order');
```

## 🔄 Migraciones

### migration_fix_wallet_types.sql

Si ya tienes las tablas creadas y necesitas cambiar los campos de wallet de `UUID` a `VARCHAR(255)`:

```sql
\i database/migration_fix_wallet_types.sql
```

Este script altera las siguientes columnas:
- `core.user_profiles.wallet_user_id`
- `core.businesses.wallet_business_id`
- `core.repartidores.wallet_repartidor_id`
- `orders.orders.wallet_transaction_id`
- `reviews.tips.wallet_transaction_id`
- `commerce.subscriptions.wallet_subscription_id`

**Nota:** Si estás creando el schema desde cero, no necesitas ejecutar esta migración.

## 📝 Scripts de Seed Data

### seed_catalog.sql

Incluye categorías globales de ejemplo que pueden ser usadas por cualquier negocio:
- Entradas
- Platos Principales
- Bebidas (con subcategorías: Frías y Calientes)
- Postres
- Especialidades

**Uso:**
```sql
\i database/seed_catalog.sql
```

### seed_delivery_cycle.sql

Script completo que crea un ciclo de delivery de extremo a extremo:

**Incluye:**
- ✅ 3 perfiles de usuario: Cliente, Repartidor, Dueño de Local
- ✅ Direcciones con geolocalización (La Roma, CDMX)
- ✅ Negocio completo: "Restaurante La Roma"
- ✅ 4 categorías de productos específicas del negocio
- ✅ 7 productos: Tacos, Hamburguesas, Bebidas, Postres
- ✅ 1 colección: "Combo Familiar" con productos incluidos
- ✅ Repartidor ecológico (bicicleta)
- ✅ Pedido completo con estado "delivered"
- ✅ Items del pedido (combo + producto individual)
- ✅ Entrega completada (22 minutos, 0.8 km)
- ✅ Evaluación: 5 estrellas a negocio y repartidor
- ✅ Propina: $50 MXN

**Datos de ejemplo:**
- Cliente: `cliente@example.com` (ID: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`)
- Repartidor: `repartidor@example.com` (ID: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`)
- Local: `local@example.com` (ID: `11111111-1111-1111-1111-111111111111`)
- Pedido ID: `order0001-0000-0000-0000-000000000001`

**IMPORTANTE - Uso con Supabase:**
1. **Crear usuarios primero** en Supabase Auth (Dashboard o API)
2. **Ejecutar el script** para crear perfiles y datos:
```sql
\i database/seed_delivery_cycle.sql
```

**Verificar datos insertados:**
El script incluye una consulta al final que muestra un resumen de todos los datos insertados.

## 🔗 Referencias

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [UUID Extension](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

**Última actualización:** Noviembre 2024  
**Versión del Schema:** 1.1

