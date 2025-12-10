# Prompt para Frontend: Mejoras en Grupos Empresariales y Asignación Automática

## 🎯 Objetivo
Implementar mejoras en el frontend para aprovechar la asignación automática de sucursales a grupos empresariales que se ha implementado en el backend.

## 📋 Cambios Realizados en el Backend

### 1. **Asignación Automática al Crear Sucursal**
Cuando un usuario crea una nueva sucursal (negocio), el sistema ahora:
- ✅ Busca automáticamente si el usuario tiene un grupo empresarial activo
- ✅ Si existe, asigna automáticamente la nueva sucursal a ese grupo
- ✅ Si no existe, la sucursal se crea sin grupo (puede asignarse después)

**Endpoint afectado:** `POST /api/businesses`

### 2. **Asignación Automática al Crear Grupo**
Cuando un usuario crea un nuevo grupo empresarial, el sistema ahora:
- ✅ Crea el grupo empresarial
- ✅ Asigna automáticamente todas las sucursales del usuario (que no tengan grupo) al nuevo grupo
- ✅ Registra en logs cuántas sucursales fueron asignadas

**Endpoint afectado:** `POST /api/businesses/business-groups`

### 3. **Actualización de Sucursal con business_group_id**
Ahora se puede actualizar el `business_group_id` de una sucursal directamente:

**Endpoint:** `PATCH /api/businesses/:id`
```json
{
  "business_group_id": "uuid-del-grupo" // o null para desasignar
}
```

## 🚀 Mejoras a Implementar en el Frontend

### 1. **Formulario de Registro de Sucursal**

**Comportamiento esperado:**
- Al crear una nueva sucursal, mostrar un mensaje informativo si el usuario tiene un grupo empresarial:
  - "Esta sucursal será asignada automáticamente al grupo: [Nombre del Grupo]"
  - O si no tiene grupo: "Puedes crear un grupo empresarial después para organizar tus sucursales"

**Flujo sugerido:**
1. Antes de mostrar el formulario, verificar si el usuario tiene un grupo empresarial:
   ```typescript
   // Llamar a: GET /api/businesses/my-business-group
   // Si existe, mostrar mensaje informativo
   // Si no existe (404), mostrar opción para crear grupo después
   ```

2. Después de crear la sucursal exitosamente:
   - Si se asignó a un grupo automáticamente, mostrar confirmación
   - Mostrar el grupo al que pertenece en la vista de detalles de la sucursal

### 2. **Formulario de Creación de Grupo Empresarial**

**Comportamiento esperado:**
- Al crear un grupo, mostrar información sobre las sucursales que serán asignadas:
  - "Al crear este grupo, se asignarán automáticamente X sucursales sin grupo"
  - Listar las sucursales que serán asignadas

**Flujo sugerido:**
1. Antes de crear el grupo, obtener las sucursales sin grupo:
   ```typescript
   // Llamar a: GET /api/businesses/branches?isActive=true
   // Filtrar las que tienen business_group_id === null
   ```

2. Mostrar preview de sucursales que serán asignadas

3. Después de crear el grupo exitosamente:
   - Mostrar confirmación: "Grupo creado exitosamente. X sucursales asignadas automáticamente"
   - Listar las sucursales asignadas

### 3. **Vista de Gestión de Sucursales**

**Mejoras sugeridas:**
- Mostrar el grupo empresarial al que pertenece cada sucursal
- Permitir cambiar el grupo de una sucursal desde la vista de edición
- Mostrar badge/indicador visual si una sucursal no tiene grupo asignado
- Opción rápida para asignar sucursales sin grupo a un grupo existente

**Componente sugerido:**
```typescript
// Selector de grupo empresarial en el formulario de edición
<Select
  label="Grupo Empresarial"
  value={business.business_group_id}
  onChange={(groupId) => updateBusiness({ business_group_id: groupId })}
  options={[
    { value: null, label: 'Sin grupo' },
    ...businessGroups.map(g => ({ value: g.id, label: g.name }))
  ]}
/>
```

### 4. **Vista de Grupos Empresariales**

**Mejoras sugeridas:**
- Mostrar contador de sucursales asignadas al grupo
- Listar las sucursales que pertenecen al grupo
- Opción para asignar sucursales adicionales al grupo
- Opción para desasignar sucursales del grupo

### 5. **Mensajes y Notificaciones**

**Mensajes a implementar:**
- ✅ "Sucursal creada y asignada automáticamente al grupo [Nombre]"
- ✅ "Grupo creado exitosamente. [X] sucursales asignadas automáticamente"
- ⚠️ "Esta sucursal no tiene grupo asignado. Considera crear un grupo para organizar tus sucursales"
- ℹ️ "Al crear un grupo, todas tus sucursales sin grupo serán asignadas automáticamente"

## 📡 Endpoints Disponibles

### Obtener grupo empresarial del usuario
```http
GET /api/businesses/my-business-group
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "name": "Grupo Andrade",
  "slug": "grupo-andrade",
  ...
}
```

**Error 404:** No tiene grupo empresarial

### Crear grupo empresarial
```http
POST /api/businesses/business-groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Grupo Andrade",
  "legal_name": "Grupo Andrade S.A. de C.V.",
  "description": "...",
  ...
}
```

**Respuesta:** Grupo creado + sucursales asignadas automáticamente

### Listar sucursales (con filtro de grupo)
```http
GET /api/businesses/branches?groupId={groupId}&isActive=true
```

### Actualizar sucursal (incluye business_group_id)
```http
PATCH /api/businesses/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "business_group_id": "uuid-del-grupo" // o null
}
```

## 🎨 Consideraciones de UX

1. **Feedback Visual:**
   - Mostrar indicadores visuales (badges, íconos) para sucursales con/sin grupo
   - Usar colores consistentes para identificar grupos

2. **Flujo de Onboarding:**
   - Si un usuario crea su primera sucursal sin grupo, sugerir crear un grupo
   - Si un usuario tiene múltiples sucursales sin grupo, sugerir crear un grupo para organizarlas

3. **Gestión Simplificada:**
   - Permitir asignar múltiples sucursales a un grupo en una sola acción
   - Mostrar vista de "sucursales sin grupo" para facilitar la asignación

## ✅ Checklist de Implementación

- [ ] Verificar grupo empresarial antes de mostrar formulario de registro de sucursal
- [ ] Mostrar mensaje informativo sobre asignación automática
- [ ] Implementar preview de sucursales que serán asignadas al crear grupo
- [ ] Agregar selector de grupo en formulario de edición de sucursal
- [ ] Mostrar grupo empresarial en vista de lista de sucursales
- [ ] Mostrar contador de sucursales en vista de grupos
- [ ] Implementar mensajes de confirmación después de acciones
- [ ] Agregar indicadores visuales (badges) para sucursales con/sin grupo
- [ ] Implementar sugerencias de creación de grupo cuando sea apropiado

## 🔍 Testing

**Casos a probar:**
1. Crear sucursal cuando el usuario tiene grupo → Verificar asignación automática
2. Crear sucursal cuando el usuario NO tiene grupo → Verificar que se crea sin grupo
3. Crear grupo cuando hay sucursales sin grupo → Verificar asignación automática
4. Crear grupo cuando NO hay sucursales sin grupo → Verificar que no hay error
5. Actualizar business_group_id de una sucursal → Verificar cambio
6. Desasignar grupo de una sucursal (business_group_id = null) → Verificar cambio

## 📝 Notas Adicionales

- La asignación automática es **silenciosa** en el backend (no lanza errores si falla)
- Los logs del backend muestran información sobre las asignaciones automáticas
- El campo `business_group_id` es opcional en todas las operaciones
- Las sucursales pueden existir sin grupo empresarial (compatibilidad hacia atrás)

