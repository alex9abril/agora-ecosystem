# 🚀 Instrucciones de Inicialización - AGORA ECOSYSTEM

Este documento explica cómo inicializar la base de datos **agora_ecosystem** desde cero usando el script maestro.

## 📋 Requisitos Previos

1. **PostgreSQL 13+** instalado y ejecutándose
2. **PostGIS** disponible (extensión para geolocalización)
3. **Permisos de superusuario** para crear la base de datos y extensiones
4. **Acceso a Supabase** (si usas Supabase como hosting)

## 🔧 Opción 1: Inicialización Completa (Recomendada)

### Paso 1: Crear la Base de Datos

```bash
# Conectar a PostgreSQL como superusuario
psql -U postgres

# Crear la base de datos
CREATE DATABASE agora_ecosystem;

# Conectar a la nueva base de datos
\c agora_ecosystem
```

### Paso 2: Ejecutar el Script Maestro

```bash
# Desde psql, ejecutar el script maestro
\i database/init_agora_ecosystem.sql
```

O desde la línea de comandos:

```bash
psql -U postgres -d agora_ecosystem -f database/init_agora_ecosystem.sql
```

### Paso 3: Verificar la Instalación

El script mostrará mensajes de progreso y verificaciones automáticas. Al finalizar, deberías ver:

```
✅ INICIALIZACIÓN DE AGORA ECOSYSTEM COMPLETADA
```

## 🔧 Opción 2: Inicialización Manual (Paso a Paso)

Si prefieres ejecutar los scripts individualmente para mayor control:

### 1. Crear Base de Datos y Extensiones

```sql
CREATE DATABASE agora_ecosystem;
\c agora_ecosystem
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public;
```

### 2. Ejecutar Scripts en Orden

```sql
-- Base (OBLIGATORIO)
\i database/schema.sql

-- Sistemas adicionales (OPCIONAL pero recomendado)
\i database/api_keys_schema.sql
\i database/business_categories_catalog.sql
\i database/service_regions.sql
\i database/get_location_region.sql

-- Sistema de roles (OBLIGATORIO para gestión de usuarios)
\i database/business_roles_and_multi_store.sql
\i database/superadmin_account_users.sql

-- Sistema avanzado de catálogos (RECOMENDADO)
\i database/migration_advanced_catalog_system.sql
\i database/migration_product_type_field_config.sql

-- Sistema de impuestos (RECOMENDADO)
\i database/migration_tax_system.sql

-- Sistema de carrito (RECOMENDADO)
\i database/migration_shopping_cart.sql

-- Catálogos y datos iniciales (OPCIONAL)
\i database/seed_advanced_catalog_admin.sql
\i database/seed_catalog.sql
```

## 📊 Verificación de Instalación

### Verificar Schemas Creados

```sql
-- Listar todos los schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;
```

Deberías ver:
- `core`
- `catalog`
- `orders`
- `reviews`
- `communication`
- `commerce`
- `social`

### Verificar Tablas Principales

```sql
-- Ver tablas por schema
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social')
ORDER BY table_schema, table_name;
```

### Verificar Funciones Importantes

```sql
-- Verificar funciones de gestión de usuarios
SELECT routine_name, routine_schema
FROM information_schema.routines
WHERE routine_schema = 'core'
AND routine_name IN ('get_user_businesses', 'get_business_users', 'get_superadmin_businesses');
```

## 👥 Próximos Pasos

### 1. Crear Usuarios en Supabase Auth

**IMPORTANTE:** En Supabase, debes crear usuarios desde el Dashboard o la API.

1. Ve a **Authentication > Users > Add User**
2. Crea usuarios con los emails que necesites
3. Guarda los UUIDs de los usuarios creados

### 2. Crear Perfiles de Usuario

Después de crear usuarios en Supabase Auth, ejecuta:

```sql
\i database/create_profiles_only.sql
```

Este script busca usuarios por email y crea sus perfiles en `core.user_profiles`.

### 3. (Opcional) Datos de Prueba

Si quieres datos de ejemplo para desarrollo:

```sql
-- Requiere usuarios creados en auth.users primero
\i database/seed_delivery_cycle.sql
```

## 🔍 Solución de Problemas

### Error: "extension postgis does not exist"

**Solución:** Necesitas permisos de superusuario para crear extensiones. En Supabase, habilita PostGIS desde el Dashboard: **Database > Extensions**.

### Error: "schema already exists"

**Solución:** Si ya tienes algunos schemas creados, puedes:
1. Eliminar la base de datos y recrearla: `DROP DATABASE agora_ecosystem;`
2. O ejecutar los scripts individuales que faltan

### Error: "relation already exists"

**Solución:** Algunas tablas ya existen. El script usa `CREATE TABLE IF NOT EXISTS`, pero si hay conflictos, elimina las tablas existentes o recrea la base de datos.

### Error: "permission denied for schema"

**Solución:** Asegúrate de tener permisos adecuados. En Supabase, usa el usuario con permisos de `service_role` o ejecuta desde el SQL Editor del Dashboard.

## 📝 Notas Importantes

1. **No ejecutes este script en producción con datos existentes** sin hacer backup primero
2. **El script es idempotente** en la mayoría de los casos (usa `IF NOT EXISTS`), pero algunos scripts pueden fallar si ya existen datos
3. **Los scripts de seed** (`seed_*.sql`) son opcionales y solo para desarrollo
4. **Los scripts de migración** (`migration_*.sql`) están diseñados para ejecutarse una vez

## 🔗 Referencias

- [README Principal](./README.md) - Documentación completa de la base de datos
- [Documentación del Proyecto](../docs/README.md) - Documentación general de AGORA
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)

---

**Última actualización:** Enero 2025  
**Versión del Script:** 1.0

