# 🏪 Roles de Negocio y Múltiples Tiendas por Cuenta

Este documento describe el sistema de roles de negocio y el soporte para múltiples tiendas por cuenta, incluyendo el configurador de permisos del superadmin.

---

## 📋 Descripción General

Este sistema permite que:

1. **Un usuario pueda tener múltiples tiendas** (sucursales o tiendas completamente diferentes)
2. **Cada usuario tenga diferentes roles en diferentes tiendas**
3. **Múltiples usuarios trabajen en la misma tienda** con diferentes niveles de acceso
4. **El superadmin gestione usuarios y permisos** a través de un configurador de permisos

---

## 👥 Roles de Negocio

El sistema define **4 roles** que un usuario puede tener dentro de un negocio específico:

### 1. **Superadmin** (`superadmin`)
- **Acceso completo**: Ve todo y puede hacer todo
- **Configurador de tiendas**: Puede ver y gestionar todas sus tiendas
- **Gestión de usuarios**: Puede asignar, modificar roles y remover usuarios de sus tiendas
- **Configurador de permisos**: Puede controlar qué usuarios acceden a qué tiendas y con qué roles
- **Configuración**: Acceso a todas las configuraciones del negocio
- **Restricción**: Solo puede haber **un superadmin activo por negocio**

### 2. **Admin** (`admin`)
- **Gestión de productos**: Crear, modificar y eliminar productos
- **Gestión de precios**: Modificar precios de productos
- **Promociones**: Crear y gestionar promociones
- **Catálogo**: Gestionar categorías y colecciones
- **No puede**: Crear usuarios ni cambiar configuraciones críticas

### 3. **Operativo Aceptador** (`operativo_aceptador`)
- **Aceptar pedidos**: Cambiar estado de pedidos de `pending` a `confirmed`
- **Poner en marcha**: Cambiar estado de pedidos a `preparing` o `ready`
- **Entregas**: Cuando llega el repartidor, cambiar estado a `picked_up` y `delivered`
- **Gestión de órdenes**: Ver y gestionar órdenes activas
- **No puede**: Modificar productos, precios o crear promociones

### 4. **Operativo Cocina** (`operativo_cocina`) - Opcional
- **Preparación**: Para órdenes ya aceptadas, cambiar estado a `preparing`
- **Listo**: Marcar órdenes como `ready` cuando están preparadas
- **Solo preparación**: Enfocado únicamente en el proceso de cocina
- **No puede**: Aceptar pedidos nuevos ni hacer entregas

---

## 🏗️ Estructura de Base de Datos

### Tabla: `core.business_users`

Relación muchos-a-muchos entre usuarios y negocios.

```sql
CREATE TABLE core.business_users (
    id UUID PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES core.businesses(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role business_role NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(business_id, user_id)
);
```

**Campos importantes:**
- `business_id`: ID del negocio
- `user_id`: ID del usuario (de `auth.users`)
- `role`: Rol del usuario en este negocio (`business_role` ENUM)
- `permissions`: Permisos adicionales en formato JSONB (para futuras extensiones)
- `is_active`: Si el usuario está activo en este negocio
- `created_by`: Usuario que asignó este rol

**Constraints:**
- Un usuario solo puede tener **un rol por negocio** (UNIQUE)
- Solo puede haber **un superadmin activo por negocio** (validado por trigger)

### Tipo ENUM: `business_role`

```sql
CREATE TYPE business_role AS ENUM (
    'superadmin',
    'admin',
    'operativo_aceptador',
    'operativo_cocina'
);
```

---

## 🔄 Flujo de Trabajo con Roles

### Flujo de Pedido con Roles Operativos

1. **Cliente crea pedido** → Estado: `pending`
2. **Operativo Aceptador acepta** → Estado: `confirmed`
3. **Operativo Cocina (opcional) toma la orden** → Estado: `preparing`
4. **Operativo Cocina marca como listo** → Estado: `ready`
5. **Repartidor asigna** → Estado: `assigned`
6. **Repartidor recoge** → Estado: `picked_up`
7. **Operativo Aceptador confirma entrega** → Estado: `delivered`

**Nota**: Si no hay rol de cocina, el Operativo Aceptador puede hacer todos los cambios de estado.

---

## 📊 Casos de Uso

### Caso 1: Múltiples Sucursales

Un usuario tiene 3 restaurantes en diferentes ubicaciones:

```sql
-- Usuario es superadmin en 3 negocios diferentes
INSERT INTO core.business_users (business_id, user_id, role)
VALUES 
    ('restaurant-roma-id', 'user-id', 'superadmin'),
    ('restaurant-condesa-id', 'user-id', 'superadmin'),
    ('restaurant-polanco-id', 'user-id', 'superadmin');
```

### Caso 2: Diferentes Roles en Diferentes Tiendas

Un usuario es admin en una tienda y operativo en otra:

```sql
-- Admin en tienda principal
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('main-store-id', 'user-id', 'admin');

-- Operativo en sucursal
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('branch-store-id', 'user-id', 'operativo_aceptador');
```

### Caso 3: Equipo de Trabajo

Un negocio tiene múltiples usuarios con diferentes roles:

```sql
-- Superadmin (dueño)
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('store-id', 'owner-id', 'superadmin');

-- Admin (gerente)
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('store-id', 'manager-id', 'admin');

-- Operativo Aceptador (cajero)
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('store-id', 'cashier-id', 'operativo_aceptador');

-- Operativo Cocina (chef)
INSERT INTO core.business_users (business_id, user_id, role)
VALUES ('store-id', 'chef-id', 'operativo_cocina');
```

---

## 🔧 Funciones Útiles

### Funciones Básicas

#### Obtener todos los negocios de un usuario

```sql
SELECT * FROM core.get_user_businesses('user-uuid');
```

#### Obtener todos los usuarios de un negocio

```sql
SELECT * FROM core.get_business_users('business-uuid');
```

#### Verificar si un usuario tiene un rol específico

```sql
SELECT core.user_has_business_role('user-uuid', 'business-uuid', 'admin');
```

#### Ver negocios con estadísticas de usuarios

```sql
SELECT * FROM core.businesses_with_users;
```

### 🔐 Configurador de Permisos (Superadmin)

#### Ver todas las tiendas del superadmin

```sql
SELECT * FROM core.get_superadmin_businesses('superadmin-user-uuid');
```

Esta función devuelve:
- `business_id`: ID de la tienda
- `business_name`: Nombre de la tienda
- `business_email`: Email de contacto
- `business_phone`: Teléfono de contacto
- `is_active`: Si la tienda está activa
- `total_users`: Total de usuarios activos en la tienda
- `created_at`: Fecha de creación

#### Asignar usuario a tienda

```sql
SELECT core.assign_user_to_business(
    'superadmin-user-uuid',  -- ID del superadmin que hace la asignación
    'business-uuid',          -- ID de la tienda
    'new-user-uuid',         -- ID del usuario a asignar
    'admin',                 -- Rol a asignar
    '{"can_edit_prices": true}'::jsonb  -- Permisos adicionales (opcional)
);
```

**Características:**
- Solo el superadmin de la tienda puede ejecutar esta función
- Valida que no se intente asignar otro superadmin si ya existe uno
- Si el usuario ya está asignado, actualiza su rol y permisos
- Retorna el ID de la asignación

#### Cambiar rol de usuario en tienda

```sql
SELECT core.change_user_role_in_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid',             -- ID del usuario
    'operativo_aceptador'    -- Nuevo rol
);
```

**Características:**
- Solo el superadmin puede cambiar roles
- Valida que no se intente asignar otro superadmin si ya existe uno
- Actualiza automáticamente el timestamp

#### Remover usuario de tienda

```sql
SELECT core.remove_user_from_business(
    'superadmin-user-uuid',  -- ID del superadmin
    'business-uuid',          -- ID de la tienda
    'user-uuid'              -- ID del usuario a remover
);
```

**Características:**
- Solo el superadmin puede remover usuarios
- No permite remover al superadmin (debe desactivarse primero)
- Desactiva la asignación (no elimina para mantener historial)

#### Ver usuarios disponibles para asignar

```sql
SELECT * FROM core.get_available_users_for_business(
    'business-uuid',
    'juan'  -- Término de búsqueda (opcional, NULL para todos)
);
```

Esta función devuelve:
- `user_id`: ID del usuario
- `user_email`: Email del usuario
- `first_name`: Nombre
- `last_name`: Apellido
- `phone`: Teléfono
- `is_already_assigned`: Si ya está asignado a la tienda
- `assigned_role`: Rol asignado en la tienda (si está asignado)

**Características:**
- Muestra todos los usuarios del sistema
- Indica cuáles ya están asignados a la tienda
- Permite búsqueda por email, nombre, apellido o teléfono
- Útil para el configurador de permisos

#### Ver resumen de permisos de un usuario

```sql
SELECT * FROM core.get_user_businesses_summary('user-uuid');
```

Esta función devuelve:
- `business_id`: ID de la tienda
- `business_name`: Nombre de la tienda
- `role`: Rol del usuario en esa tienda
- `permissions`: Permisos adicionales (JSONB)
- `is_active`: Si la asignación está activa
- `can_access`: Si el usuario puede acceder (asignación activa Y tienda activa)
- `assigned_at`: Fecha de asignación

**Características:**
- Muestra todas las tiendas a las que el usuario tiene acceso
- Indica si puede acceder actualmente
- Útil para verificar permisos de un usuario

---

## 🔐 Permisos por Rol

### Superadmin
- ✅ Ver todo
- ✅ Crear usuarios del negocio
- ✅ Modificar usuarios del negocio
- ✅ Eliminar usuarios del negocio
- ✅ Crear productos
- ✅ Modificar productos
- ✅ Eliminar productos
- ✅ Modificar precios
- ✅ Crear promociones
- ✅ Modificar configuraciones del negocio
- ✅ Aceptar pedidos
- ✅ Cambiar estados de pedidos
- ✅ Ver reportes y estadísticas

### Admin
- ✅ Crear productos
- ✅ Modificar productos
- ✅ Eliminar productos
- ✅ Modificar precios
- ✅ Crear promociones
- ✅ Modificar promociones
- ✅ Gestionar categorías
- ✅ Ver pedidos
- ❌ Crear usuarios
- ❌ Modificar configuraciones críticas

### Operativo Aceptador
- ✅ Ver pedidos
- ✅ Aceptar pedidos (pending → confirmed)
- ✅ Cambiar estado a preparing/ready
- ✅ Confirmar recogida (picked_up)
- ✅ Confirmar entrega (delivered)
- ❌ Modificar productos
- ❌ Modificar precios
- ❌ Crear promociones

### Operativo Cocina
- ✅ Ver pedidos confirmados
- ✅ Cambiar estado a preparing
- ✅ Cambiar estado a ready
- ❌ Aceptar pedidos nuevos
- ❌ Modificar productos
- ❌ Modificar precios

---

## 🎛️ Configurador de Permisos del Superadmin

El superadmin tiene acceso a un **configurador de permisos** que le permite:

### Funcionalidades del Configurador

1. **Ver todas sus tiendas**
   - Lista todas las tiendas donde es superadmin
   - Ve estadísticas de usuarios por tienda
   - Identifica tiendas activas e inactivas

2. **Gestionar usuarios por tienda**
   - Ver todos los usuarios asignados a una tienda
   - Ver usuarios disponibles para asignar
   - Buscar usuarios por email, nombre o teléfono

3. **Asignar permisos de acceso**
   - Asignar usuarios a tiendas específicas
   - Definir el rol de cada usuario en cada tienda
   - Agregar permisos adicionales personalizados (JSONB)

4. **Modificar permisos existentes**
   - Cambiar el rol de un usuario en una tienda
   - Actualizar permisos adicionales
   - Activar/desactivar acceso sin eliminar

5. **Remover acceso**
   - Remover usuarios de tiendas (desactivar acceso)
   - Mantener historial de asignaciones anteriores

### Flujo de Trabajo del Configurador

```
1. Superadmin accede al configurador
   ↓
2. Selecciona una tienda de sus tiendas
   ↓
3. Ve usuarios actuales de la tienda
   ↓
4. Puede:
   - Asignar nuevo usuario → Selecciona usuario → Asigna rol → Confirma
   - Modificar rol existente → Selecciona usuario → Cambia rol → Confirma
   - Remover usuario → Selecciona usuario → Confirma remoción
   ↓
5. El sistema valida permisos y aplica cambios
```

### Seguridad del Configurador

- **Validación de permisos**: Solo el superadmin de la tienda puede gestionar usuarios
- **Validación de superadmin único**: No permite asignar otro superadmin si ya existe uno
- **Protección del superadmin**: No permite remover al superadmin sin transferir el rol primero
- **Auditoría**: Registra quién asignó cada rol (`created_by`)

### Ejemplos Prácticos del Configurador

#### Escenario 1: Superadmin con múltiples tiendas

Un superadmin tiene 3 restaurantes y quiere asignar un gerente (admin) a cada uno:

```sql
-- Tienda 1: Restaurante La Roma
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'restaurant-roma-uuid',
    'manager-1-uuid',
    'admin'
);

-- Tienda 2: Restaurante La Condesa
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'restaurant-condesa-uuid',
    'manager-2-uuid',
    'admin'
);

-- Tienda 3: Restaurante Polanco
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'restaurant-polanco-uuid',
    'manager-3-uuid',
    'admin'
);
```

#### Escenario 2: Asignar equipo operativo a una tienda

```sql
-- Asignar operativo aceptador (cajero)
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'business-uuid',
    'cashier-uuid',
    'operativo_aceptador'
);

-- Asignar operativo cocina (chef)
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'business-uuid',
    'chef-uuid',
    'operativo_cocina'
);
```

#### Escenario 3: Cambiar rol de un usuario

Un operativo aceptador es promovido a admin:

```sql
SELECT core.change_user_role_in_business(
    'superadmin-uuid',
    'business-uuid',
    'operativo-user-uuid',
    'admin'
);
```

#### Escenario 4: Buscar y asignar usuario

```sql
-- 1. Buscar usuarios disponibles
SELECT * FROM core.get_available_users_for_business(
    'business-uuid',
    'juan'  -- Buscar por nombre, email o teléfono
);

-- 2. Asignar el usuario encontrado
SELECT core.assign_user_to_business(
    'superadmin-uuid',
    'business-uuid',
    'usuario-encontrado-uuid',
    'operativo_aceptador'
);
```

#### Escenario 5: Ver configuración completa

```sql
-- Ver todas las tiendas del superadmin
SELECT * FROM core.get_superadmin_businesses('superadmin-uuid');

-- Para cada tienda, ver sus usuarios
SELECT * FROM core.get_business_users('business-uuid-1');
SELECT * FROM core.get_business_users('business-uuid-2');
SELECT * FROM core.get_business_users('business-uuid-3');
```

---

## 📝 Notas de Implementación

### Migración de Datos Existentes

El script `business_roles_and_multi_store.sql` incluye una migración automática que:
- Asigna el rol `superadmin` a todos los `owner_id` existentes en la tabla `businesses`
- Mantiene la compatibilidad con el sistema anterior

### Compatibilidad con Schema Actual

- La tabla `core.businesses` mantiene el campo `owner_id` para compatibilidad
- El `owner_id` se sincroniza automáticamente con `business_users` (rol superadmin)
- No se requiere modificar código existente que use `owner_id`

### Validaciones

- **Un solo superadmin activo**: Validado por trigger antes de INSERT/UPDATE
- **Un rol por usuario por negocio**: Validado por constraint UNIQUE
- **Integridad referencial**: Foreign keys a `businesses` y `auth.users`
- **Permisos de superadmin**: Validados en todas las funciones de gestión

---

## 🚀 Instalación

1. Ejecutar el script SQL:
```bash
psql -d tu_base_de_datos -f database/business_roles_and_multi_store.sql
```

2. Verificar la instalación:
```sql
-- Verificar que el tipo existe
SELECT * FROM pg_type WHERE typname = 'business_role';

-- Verificar que la tabla existe
SELECT * FROM information_schema.tables 
WHERE table_schema = 'core' AND table_name = 'business_users';
```

---

## ⚠️ Consideraciones Importantes

1. **Un solo superadmin**: Solo puede haber un superadmin activo por negocio. Para cambiar de superadmin, primero desactiva el actual o transfiere el rol usando `change_user_role_in_business`.

2. **Eliminación en cascada**: Si se elimina un negocio, se eliminan todas las relaciones en `business_users`.

3. **Eliminación de usuario**: Si se elimina un usuario de `auth.users`, se eliminan todas sus relaciones en `business_users`.

4. **Rol de cocina opcional**: El sistema funciona perfectamente sin usuarios con rol `operativo_cocina`. El Operativo Aceptador puede manejar todos los estados.

5. **Permisos JSONB**: El campo `permissions` permite agregar permisos personalizados en el futuro sin modificar el schema.

6. **Configurador de permisos**: Todas las funciones de gestión de usuarios validan que solo el superadmin de la tienda pueda ejecutarlas.

7. **Historial de asignaciones**: Al remover un usuario, se desactiva pero no se elimina, manteniendo el historial de quién tenía acceso y cuándo.

8. **Búsqueda de usuarios**: La función `get_available_users_for_business` permite buscar usuarios por email, nombre, apellido o teléfono, facilitando la asignación en el configurador.

---

## 🔗 Referencias

- **Schema principal**: `database/schema.sql`
- **Script de roles**: `database/business_roles_and_multi_store.sql`
- **Documentación de base de datos**: `database/README.md`
- **Autenticación y Seguridad**: `docs/12-autenticacion-seguridad.md`

---

**Anterior:** [Análisis de Tipos de Negocios de Alimentos](./17-analisis-tipos-negocios-alimentos.md)  
**Siguiente:** [Volver al inicio](./README.md)  
**Volver al inicio:** [README Principal](./README.md)

---

**Versión:** 1.0  
**Fecha:** 2025-01-16  
**Autor:** Sistema de roles de negocio y múltiples tiendas por cuenta

