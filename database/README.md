# 📊 Base de Datos — AGORA Ecosystem

Este directorio contiene el esquema de base de datos para la plataforma **AGORA Ecosystem**.

**📑 Para localizar scripts por tema o por carpeta:** [INDEX.md](INDEX.md)

## 📁 Estructura de Carpetas

Los archivos SQL están organizados en carpetas según su propósito:

```
database/
├── schema/              # Esquemas base y estructuras fundamentales
├── migrations/          # Migraciones de la base de datos
├── seeds/               # Datos de ejemplo y catálogos
├── storage/             # Scripts de Supabase Storage (buckets, políticas)
├── fixes/               # Correcciones y hotfixes
├── diagnostics/         # Scripts de diagnóstico y verificación
├── agora/               # Scripts específicos del proyecto Agora
└── segments/             # Segmentos del schema (versión modular)
```

---

## 📂 Descripción de Carpetas

### 📋 `schema/` - Esquemas Base

Contiene los archivos fundamentales que definen la estructura base de la base de datos.

**Archivos principales:**
- **`schema.sql`** ⭐ - Script principal con la estructura completa de la base de datos (schemas, tablas, índices, triggers, funciones, ENUMs). **Debe ejecutarse primero.**
- **`init_agora_ecosystem.sql`** - Inicialización del ecosistema Agora
- **`api_keys_schema.sql`** - Sistema de autenticación mediante API Keys para aplicaciones externas
- **`business_categories_catalog.sql`** - Catálogo de categorías de negocios (tipos de establecimientos)
- **`business_roles_and_multi_store.sql`** - Sistema de roles de negocio y soporte para múltiples tiendas por cuenta
- **`service_regions.sql`** - Sistema de regiones de servicio (áreas de cobertura de delivery)
- **`superadmin_account_users.sql`** - Funciones para gestión de usuarios a nivel de cuenta del superadmin
- **`get_location_region.sql`** - Función SQL para identificar en qué zona de cobertura está un punto específico

**Orden de ejecución recomendado:**
```sql
-- 1. Base (OBLIGATORIO)
\i database/schema/schema.sql

-- 2. Extensiones y sistemas adicionales (OPCIONAL)
\i database/schema/api_keys_schema.sql
\i database/schema/business_categories_catalog.sql
\i database/schema/service_regions.sql
\i database/schema/get_location_region.sql

-- 3. Sistema de roles de negocio (OBLIGATORIO para gestión de usuarios)
\i database/schema/business_roles_and_multi_store.sql
\i database/schema/superadmin_account_users.sql
```

---

### 🔄 `migrations/` - Migraciones

Contiene scripts de migración que modifican la estructura de la base de datos o agregan nuevas funcionalidades.

**Archivos:**
- **`migration_advanced_catalog_system.sql`** - Sistema avanzado de catálogos de productos con funcionalidades completas
- **`migration_product_type_field_config.sql`** - Configuración de campos por tipo de producto
- **`migration_fix_wallet_types.sql`** - Migración para cambiar campos de wallet de UUID a VARCHAR(255)
- **`migration_shopping_cart.sql`** - Sistema de carrito de compras
- **`migration_tax_system.sql`** - Sistema de impuestos
- **`migration_order_tracking_postventa.sql`** - Sistema de seguimiento de pedidos postventa
- **`migration_update_order_status_simplified.sql`** - Actualización simplificada del sistema de estados de pedidos
- **`migration_add_branch_id_to_cart_items.sql`** - Agregar branch_id a items del carrito
- **`migration_add_order_group_id.sql`** - Agregar order_group_id a pedidos
- **`migration_add_receiver_to_addresses.sql`** - Agregar campo receiver a direcciones
- **`migration_fix_product_images_file_path.sql`** - Corrección de rutas de imágenes de productos

**Uso:**
```sql
-- Ejecutar migraciones según necesidad
\i database/migrations/migration_advanced_catalog_system.sql
\i database/migrations/migration_product_type_field_config.sql
```

---

### 🌱 `seeds/` - Datos de Ejemplo

Contiene scripts para poblar la base de datos con datos de ejemplo, catálogos y datos de prueba.

**Archivos:**
- **`seed_catalog.sql`** - Datos de catálogo básicos (categorías globales de ejemplo)
- **`seed_delivery_cycle.sql`** - Ciclo completo de delivery de ejemplo para pruebas
- **`seed_advanced_catalog_admin.sql`** - Catálogo completo y avanzado de tipos de productos y categorías gestionado por administradores
- **`seed_roles_catalog.sql`** ⚠️ OPCIONAL - Catálogo de roles para documentación (no necesario para funcionamiento)
- **`seed_test_products_pescaditos.sql`** - Productos de prueba para "Pescaditos"
- **`seed_test_products_pescaditos_set2.sql`** - Segunda versión de productos de prueba
- **`examples_advanced_catalog.sql`** - Ejemplos prácticos de uso del sistema avanzado de catálogos
- **`create_profiles_only.sql`** - Script simplificado para crear perfiles de usuarios existentes en Supabase Auth
- **`create_test_users.sql`** ⚠️ Puede fallar - Intenta crear usuarios y perfiles (requiere permisos de service_role)
- **`insert_la_roma_zone.sql`** - Insertar zona "La Roma" para pruebas
- **`update_la_roma_polygon.sql`** - Actualizar polígono de la zona "La Roma"

**Uso:**
```sql
-- Catálogo básico
\i database/seeds/seed_catalog.sql

-- Ciclo completo de delivery (recomendado para pruebas)
\i database/seeds/seed_delivery_cycle.sql

-- Catálogo avanzado para administradores
\i database/seeds/seed_advanced_catalog_admin.sql
```

---

### 🗄️ `storage/` - Supabase Storage

Contiene todos los scripts relacionados con la configuración y gestión de Supabase Storage (buckets, políticas RLS, permisos).

**Categorías de archivos:**

**Creación de buckets:**
- `create_products_bucket.sql` - Crear bucket de productos
- `create_products_bucket_complete.sql` - Crear bucket de productos (versión completa)
- `create_and_configure_products_bucket.sql` - Crear y configurar bucket de productos

**Configuración de políticas:**
- `setup_storage_policies_products.sql` - Configurar políticas RLS para bucket de productos
- `template_new_bucket_policies.sql` - Plantilla para políticas de nuevos buckets
- `create_permissive_policies_final.sql` - Crear políticas permisivas finales

**Correcciones de políticas:**
- `fix_storage_policies_service_role.sql` - Corregir políticas para service_role
- `fix_storage_policies_add_service_role.sql` - Agregar service_role a políticas
- `fix_storage_permissions_complete.sql` - Corrección completa de permisos de storage
- `fix_products_policies_*.sql` - Múltiples scripts de corrección de políticas de productos
- `fix_policies_*.sql` - Scripts de corrección de políticas generales

**Recreación y restauración:**
- `recreate_products_bucket_from_scratch.sql` - Recrear bucket de productos desde cero
- `recreate_products_policies_exact_copy.sql` - Recrear políticas exactas de productos

**Deshabilitación:**
- `disable_rls_storage_products.sql` - Deshabilitar RLS en storage de productos
- `disable_storage_rls_products.sql` - Deshabilitar RLS en storage de productos (alternativa)

**Verificación:**
- `verify_products_bucket_status.sql` - Verificar estado del bucket de productos
- `verify_and_fix_storage_policies.sql` - Verificar y corregir políticas de storage
- `verify_and_compare_policies.sql` - Verificar y comparar políticas
- `verify_bucket_exists.sql` - Verificar existencia de bucket

**Utilidades:**
- `compare_buckets_and_fix.sql` - Comparar buckets y corregir diferencias
- `copy_personalizacion_policies_to_products.sql` - Copiar políticas de personalización a productos

**Uso:**
```sql
-- Crear bucket de productos
\i database/storage/create_products_bucket.sql

-- Configurar políticas
\i database/storage/setup_storage_policies_products.sql

-- Verificar estado
\i database/storage/verify_products_bucket_status.sql
```

---

### 🔧 `fixes/` - Correcciones y Hotfixes

Contiene scripts de corrección para problemas específicos y migraciones de datos existentes.

**Archivos:**
- **`fix_admin_role.sql`** - Script de corrección para roles de administrador
- **`fix_business_role_type.sql`** - Corregir tipos de roles de negocio
- **`fix_medicine_allergens_config.sql`** - Corregir configuración de alérgenos de medicamentos
- **`fix_missing_business_users.sql`** - Corrección rápida para negocios sin registro en `business_users`
- **`fix_roles_data_after_enum_rename.sql`** - Corregir datos de roles después de renombrar ENUM
- **`migrate_existing_businesses_to_business_users.sql`** - Migración masiva de negocios existentes al sistema de roles
- **`migrate_user_to_roles.sql`** - Script de migración para usuarios existentes al nuevo sistema de roles
- **`update_business_roles_data.sql`** - Actualizar datos de roles de negocio

**Uso:**
```sql
-- Corregir negocios sin usuarios asignados
\i database/fixes/fix_missing_business_users.sql

-- Migrar negocios existentes al sistema de roles
\i database/fixes/migrate_existing_businesses_to_business_users.sql
```

---

### 🔍 `diagnostics/` - Diagnóstico y Verificación

Contiene scripts para diagnosticar problemas, verificar datos y realizar pruebas.

**Archivos:**
- **`diagnose_business_addresses.sql`** - Diagnosticar direcciones de negocios
- **`diagnose_business_addresses_specific.sql`** - Diagnosticar direcciones específicas de negocios
- **`diagnose_businesses_in_zone.sql`** - Diagnosticar negocios en una zona
- **`diagnose_location_coordinates.sql`** - Diagnosticar coordenadas de ubicación
- **`verify_product_images.sql`** - Verificar imágenes de productos
- **`test_get_superadmin_businesses.sql`** - Probar función de obtención de negocios de superadmin

**Uso:**
```sql
-- Diagnosticar direcciones de negocios
\i database/diagnostics/diagnose_business_addresses.sql

-- Verificar imágenes de productos
\i database/diagnostics/verify_product_images.sql
```

---

### 🏢 `agora/` - Scripts Específicos de Agora

Contiene scripts específicos del proyecto Agora (grupos empresariales, branding, vehículos, refacciones, etc.).

**Categorías:**

**Grupos empresariales:**
- `migration_business_groups.sql` - Migración de grupos empresariales
- `assign_branches_to_group.sql` - Asignar sucursales a grupos
- `assign_missing_branch.sql` - Asignar sucursal faltante a grupo
- `seed_business_groups_from_existing.sql` - Crear grupos desde negocios existentes
- `seed_business_groups_specific.sql` - Crear grupos específicos
- `verify_business_groups_summary.sql` - Verificar resumen de grupos empresariales

**Branding:**
- `migration_business_branding.sql` - Migración de branding de negocios
- `fix_branding_functions.sql` - Corregir funciones de branding
- `setup_storage_policies_branding.sql` - Configurar políticas de storage para branding

**Productos y catálogos:**
- `migration_product_images.sql` - Migración de imágenes de productos
- `migration_add_sku_to_products.sql` - Agregar SKU a productos
- `migration_product_types_refacciones.sql` - Tipos de productos para refacciones
- `migration_product_branch_availability.sql` - Disponibilidad de productos por sucursal
- `seed_refacciones_catalog.sql` - Catálogo de refacciones
- `seed_toyota_products_test_data.sql` - Datos de prueba de productos Toyota
- `cleanup_old_categories.sql` - Limpiar categorías antiguas

**Vehículos:**
- `migration_business_vehicle_brands.sql` - Migración de marcas de vehículos de negocios
- `migration_vehicle_compatibility.sql` - Compatibilidad de vehículos
- `seed_toyota_vehicles.sql` - Datos de vehículos Toyota

**Configuración:**
- `migration_branch_fields.sql` - Campos de sucursales
- `migration_site_settings.sql` - Configuración del sitio
- `fix_businesses_settings_column.sql` - Corregir columna de settings de negocios
- `setup_storage_policies.sql` - Configurar políticas de storage generales
- `fix_storage_policies_products.sql` - Corregir políticas de storage de productos

**Documentación:**
- `README.md` - Documentación específica de Agora
- `README_PRODUCT_IMAGES.md` - Documentación de imágenes de productos

---

### 📦 `segments/` - Segmentos del Schema

Contiene una versión modular del schema, dividido en segmentos temáticos. Útil para desarrollo incremental o para entender partes específicas del schema.

**Estructura:**
- `00_habilitar_postgis.sql` - Habilitar extensión PostGIS
- `00_diagnostico_postgis.sql` - Diagnóstico de PostGIS
- `01_tablas_schema_core.sql` - Tablas del schema core
- `02_tablas_schema_catalog.sql` - Tablas del schema catalog
- `03_tablas_schema_orders.sql` - Tablas del schema orders
- `04_tablas_schema_reviews.sql` - Tablas del schema reviews
- `05_tablas_schema_communication.sql` - Tablas del schema communication
- `06_tablas_schema_commerce.sql` - Tablas del schema commerce
- `07_tablas_schema_social.sql` - Tablas del schema social
- `08_triggers_y_funciones.sql` - Triggers y funciones
- `09_sistema_api_keys.sql` - Sistema de API keys
- `10_catalogo_categorias_negocios.sql` - Catálogo de categorías de negocios
- `11_sistema_regiones_servicio.sql` - Sistema de regiones de servicio
- `12_funcion_get_location_region.sql` - Función get_location_region
- `13_roles_negocio_multi_tiendas.sql` - Roles de negocio y múltiples tiendas
- `14_gestion_usuarios_cuenta_superadmin.sql` - Gestión de usuarios de cuenta superadmin
- `15_sistema_avanzado_catalogos.sql` - Sistema avanzado de catálogos
- `16_config_campos_por_tipo_producto.sql` - Configuración de campos por tipo de producto
- `17_sistema_impuestos.sql` - Sistema de impuestos
- `18_sistema_carrito_compras.sql` - Sistema de carrito de compras

---

## 🚀 Guía de Inicio Rápido

### 1. Crear la Base de Datos

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
```

### 2. Ejecutar el Schema Base

```sql
-- Ejecutar el schema principal (OBLIGATORIO)
\i database/schema/schema.sql

-- Extensiones y sistemas adicionales (OPCIONAL)
\i database/schema/api_keys_schema.sql
\i database/schema/business_categories_catalog.sql
\i database/schema/service_regions.sql
\i database/schema/get_location_region.sql

-- Sistema de roles de negocio (OBLIGATORIO para gestión de usuarios)
\i database/schema/business_roles_and_multi_store.sql
\i database/schema/superadmin_account_users.sql
```

### 3. Ejecutar Migraciones (según necesidad)

```sql
-- Sistema avanzado de catálogos (RECOMENDADO)
\i database/migrations/migration_advanced_catalog_system.sql
\i database/migrations/migration_product_type_field_config.sql

-- Otras migraciones según necesidad
\i database/migrations/migration_shopping_cart.sql
\i database/migrations/migration_tax_system.sql
```

### 4. Poblar Datos de Ejemplo (OPCIONAL)

```sql
-- Catálogo básico
\i database/seeds/seed_catalog.sql

-- Ciclo completo de delivery (recomendado para pruebas)
\i database/seeds/seed_delivery_cycle.sql

-- Catálogo avanzado para administradores
\i database/seeds/seed_advanced_catalog_admin.sql
```

### 5. Configurar Storage (si es necesario)

```sql
-- Crear bucket de productos
\i database/storage/create_products_bucket.sql

-- Configurar políticas
\i database/storage/setup_storage_policies_products.sql

-- Verificar estado
\i database/storage/verify_products_bucket_status.sql
```

---

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

---

## 📋 Tablas Principales

### Schema: `core`
- `user_profiles` - Perfiles de usuario que extienden `auth.users` de Supabase (roles, información personal)
- `addresses` - Direcciones de usuarios con geolocalización
- `businesses` - Locales/negocios registrados
- `business_users` - Relación muchos-a-muchos entre usuarios y negocios (roles de negocio y múltiples tiendas por cuenta)
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

---

## 🔐 Integración con Supabase Auth

Este schema está diseñado para trabajar con **Supabase Authentication**:

- **`auth.users`**: Tabla de usuarios de Supabase (email, password, verificación)
- **`core.user_profiles`**: Tabla que extiende `auth.users` con información de perfil y roles

**Función automática:** Se incluye `handle_new_user()` que crea automáticamente un perfil cuando se registra un usuario en Supabase Auth. El trigger debe configurarse en Supabase Dashboard.

**Para crear usuarios:**
- Usa Supabase Auth API desde tu aplicación
- O crea usuarios manualmente desde Supabase Dashboard
- El perfil se crea automáticamente si el trigger está configurado

---

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

---

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

---

## 🔐 Seguridad

- **Passwords:** Almacenados como hash (no en texto plano)
- **Tokens:** Tokens de verificación y reset con expiración
- **Soft Delete:** Campos `is_active`, `is_blocked` para desactivación sin eliminar
- **Constraints:** Validaciones a nivel de base de datos

---

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

---

## 🔄 Migraciones Futuras

Para futuras modificaciones del schema, se recomienda:

1. Crear scripts de migración en `migrations/` con nombres descriptivos
2. Usar herramientas como `node-pg-migrate` o `knex.js`
3. Mantener versionado del schema
4. Documentar cambios en CHANGELOG.md

---

## 📝 Notas

- Todos los IDs son UUIDs para mejor distribución y seguridad
- Los timestamps usan `TIMESTAMP` (con timezone implícito)
- Los montos monetarios usan `DECIMAL(10,2)` para precisión
- Las coordenadas geográficas usan PostGIS `POINT` type
- Los arrays (tags, badges) usan tipos nativos de PostgreSQL

---

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
   \i database/seeds/create_profiles_only.sql
   ```

Este script:
- ✅ Busca los usuarios por email en `auth.users`
- ✅ Crea los perfiles en `core.user_profiles` automáticamente
- ✅ Muestra mensajes claros si falta algún usuario

### Scripts Disponibles

#### `seeds/create_profiles_only.sql` (✅ RECOMENDADO)
Solo crea perfiles. Usa esto después de crear usuarios en el Dashboard.

#### `seeds/create_test_users.sql` (⚠️ Puede fallar)
Intenta crear usuarios y perfiles, pero requiere permisos de `service_role`. Generalmente falla con error de `instance_id`.

### Verificar Usuarios Creados

```sql
SELECT id, email FROM auth.users 
WHERE email IN ('cliente@example.com', 'repartidor@example.com', 'local@example.com');
```

---

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

⚠️ **IMPORTANTE:** El script `seeds/seed_roles_catalog.sql` es **OPCIONAL**. Solo crea una tabla de documentación.

**Si NO necesitas documentación de permisos, NO ejecutes este script.**

El catálogo crea:
- Tabla `core.roles_catalog` (solo para consultas/documentación)
- Vista `core.roles_with_user_count` (estadísticas)
- Vista `core.user_profiles_with_role_info` (combina user_profiles con info del catálogo)
- Funciones `get_role_permissions()`, `has_permission()`, `get_user_permissions()`, `user_has_permission()`

**Los roles funcionan perfectamente solo con el ENUM.**

---

## 🔗 Referencias

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [UUID Extension](https://www.postgresql.org/docs/current/uuid-ossp.html)

---

**Última actualización:** Enero 2025  
**Versión del Schema:** 1.2  
**Estructura:** Reorganizada en carpetas temáticas
