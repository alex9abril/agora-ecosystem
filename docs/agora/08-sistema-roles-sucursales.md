# Sistema de Roles y Permisos para Sucursales

## 📋 Resumen Ejecutivo

Este documento describe cómo funciona el sistema de roles y permisos para sucursales en el ecosistema AGORA. Cuando se crea una nueva sucursal, el sistema debe asignar automáticamente el rol `'superadmin'` al usuario que la crea para que pueda gestionarla.

## 🎯 Objetivo

Garantizar que cuando se crea una nueva sucursal:
1. El usuario creador tenga automáticamente el rol `'superadmin'` en esa sucursal
2. El usuario pueda gestionar el branding, productos, y configuraciones de la sucursal
3. No haya problemas de permisos al intentar actualizar información de la sucursal

## 🏗️ Arquitectura

### Tablas Involucradas

- **`core.businesses`**: Almacena las sucursales con su `owner_id`
- **`core.business_users`**: Relación muchos-a-muchos entre usuarios y sucursales con roles
- **`core.business_groups`**: Grupos empresariales que pueden contener múltiples sucursales

### Roles Disponibles

El ENUM `core.business_role` tiene los siguientes valores:
- `'superadmin'`: Acceso completo, puede crear usuarios y gestionar todo
- `'admin'`: Puede crear productos, modificar precios, crear promociones
- `'operations_staff'`: Acepta pedidos, los pone en marcha, hace entregas
- `'kitchen_staff'`: Para órdenes aceptadas, las pone en preparación

## 🔄 Flujo de Creación de Sucursal

### 1. Backend (NestJS)

Cuando se crea una sucursal a través del endpoint `POST /api/businesses`, el método `BusinessesService.create()` realiza lo siguiente:

```typescript
// 1. Crear la sucursal en core.businesses
const business = await pool.query(/* INSERT INTO core.businesses */);

// 2. Asignar automáticamente rol 'superadmin' al owner
await pool.query(
  `INSERT INTO core.business_users (
    business_id, 
    user_id, 
    role, 
    permissions, 
    is_active
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = 'superadmin',
    is_active = TRUE`,
  [business.id, ownerId, 'superadmin', '{}', true]
);
```

**Ubicación**: `apps/backend/src/modules/businesses/businesses.service.ts` (líneas ~966-996)

### 2. Base de Datos (Trigger SQL)

Adicionalmente, existe un trigger en la base de datos que actúa como respaldo:

```sql
CREATE TRIGGER trigger_auto_assign_business_owner_role
    AFTER INSERT ON core.businesses
    FOR EACH ROW
    EXECUTE FUNCTION core.auto_assign_business_owner_role();
```

**Función del trigger**: Si por alguna razón el backend no asigna el rol, el trigger lo hace automáticamente.

**Ubicación**: `database/agora/trigger_auto_assign_business_owner_role.sql`

## 🔧 Verificación de Permisos

Cuando un usuario intenta actualizar información de una sucursal (ej: branding, productos), el sistema verifica permisos en este orden:

1. **¿Es el owner de la sucursal?** → Permite
2. **¿Tiene rol 'superadmin' o 'admin' en la sucursal?** → Permite
3. **¿Es el owner del grupo empresarial?** → Permite
4. **¿Tiene rol 'superadmin' o 'admin' en cualquier sucursal del grupo?** → Permite
5. **Si ninguna de las anteriores** → Deniega (403 Forbidden)

**Ubicación**: `apps/backend/src/modules/businesses/businesses.service.ts` → `checkBusinessPermissions()`

## 🛠️ Scripts de Mantenimiento

### Corregir Sucursales Existentes

Si hay sucursales que fueron creadas antes de implementar este sistema y no tienen roles asignados:

```sql
\i database/agora/fix_missing_business_users_roles.sql
```

Este script:
- Identifica sucursales sin roles asignados
- Asigna automáticamente `'superadmin'` a todos los owners
- Muestra un reporte de correcciones realizadas

### Asignar Rol a Usuario Específico

Si necesitas asignar un rol a un usuario en una sucursal o grupo:

```sql
\i database/agora/assign_user_role_to_business.sql
```

Edita el script para especificar:
- `user_id`: ID del usuario
- `business_id` o `group_id`: Sucursal o grupo
- `role`: Rol a asignar ('superadmin', 'admin', etc.)

## 📝 Checklist para Nuevas Sucursales

Cuando se crea una nueva sucursal, verificar:

- [ ] La sucursal se creó correctamente en `core.businesses`
- [ ] El `owner_id` está asignado correctamente
- [ ] Existe un registro en `core.business_users` con:
  - `business_id` = ID de la sucursal
  - `user_id` = `owner_id` de la sucursal
  - `role` = `'superadmin'`
  - `is_active` = `TRUE`

## 🔍 Consultas de Verificación

### Verificar roles de una sucursal

```sql
SELECT 
    b.name as sucursal,
    au.email as owner_email,
    bu.role,
    bu.is_active
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
LEFT JOIN auth.users au ON b.owner_id = au.id
WHERE b.id = 'SUCURSAL_ID';
```

### Verificar sucursales sin roles

```sql
SELECT 
    b.id,
    b.name,
    b.owner_id,
    au.email as owner_email
FROM core.businesses b
LEFT JOIN core.business_users bu ON b.id = bu.business_id AND b.owner_id = bu.user_id
LEFT JOIN auth.users au ON b.owner_id = au.id
WHERE b.owner_id IS NOT NULL
  AND bu.id IS NULL;
```

## ⚠️ Problemas Comunes y Soluciones

### Error: "No tienes permisos para actualizar esta sucursal"

**Causa**: El usuario no tiene un rol asignado en `core.business_users`.

**Solución**:
1. Verificar si el usuario es el owner: `SELECT owner_id FROM core.businesses WHERE id = 'SUCURSAL_ID'`
2. Si es el owner, ejecutar: `\i database/agora/fix_missing_business_users_roles.sql`
3. Si no es el owner, asignar rol manualmente: `\i database/agora/assign_user_role_to_business.sql`

### Error: "invalid input value for enum core.business_role: 'manager'"

**Causa**: El código intenta usar un rol que no existe en el ENUM.

**Solución**: Los roles válidos son: `'superadmin'`, `'admin'`, `'operations_staff'`, `'kitchen_staff'`. No usar `'manager'`.

## 📚 Referencias

- **Schema de roles**: `database/schema/business_roles_and_multi_store.sql`
- **Trigger automático**: `database/agora/trigger_auto_assign_business_owner_role.sql`
- **Script de corrección**: `database/agora/fix_missing_business_users_roles.sql`
- **Script de asignación manual**: `database/agora/assign_user_role_to_business.sql`
- **Código backend**: `apps/backend/src/modules/businesses/businesses.service.ts`

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0

