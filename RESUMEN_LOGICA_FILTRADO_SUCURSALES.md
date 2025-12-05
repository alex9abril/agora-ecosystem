# Resumen de Lógica de Filtrado de Sucursales

## Contextos y Reglas de Filtrado

### 1. **Contexto GLOBAL** (`/products/[id]` o `/`)
**Comportamiento:**
- Muestra **todas las sucursales activas** que tienen el producto disponible
- No aplica ningún filtro de grupo, sucursal o marca
- El usuario puede seleccionar cualquier sucursal de la lista

**Backend:**
- `getProductBranchAvailability(productId)` sin `groupId` ni `brandId`
- Query SQL: `INNER JOIN` con `product_branch_availability` donde `is_enabled = TRUE`
- Condiciones WHERE: `b.is_active = TRUE` y `pba.is_enabled = TRUE`

**Frontend:**
- `contextType === 'global'`
- `loadBranchAvailabilities()` se llama sin filtros
- Se muestra `BranchAvailabilityGrid` con todas las sucursales disponibles

---

### 2. **Contexto GRUPO** (`/grupo/{slug}/products/[id]`)
**Comportamiento:**
- Muestra **solo las sucursales que pertenecen al grupo especificado** y que tienen el producto disponible
- El usuario solo puede seleccionar sucursales del grupo
- Si una sucursal no pertenece al grupo, no aparece en la lista

**Backend:**
- `getProductBranchAvailability(productId, groupId)` con `groupId`
- Query SQL: `INNER JOIN` con `product_branch_availability` + filtro `b.business_group_id = $groupId`
- Condiciones WHERE:
  - `b.is_active = TRUE`
  - `b.business_group_id = $groupId` ← **Filtro por grupo**
  - `pba.is_enabled = TRUE`
  - `pba.is_active = TRUE`

**Frontend:**
- `contextType === 'grupo'`
- `loadBranchAvailabilities()` se llama con `filterGroupId = groupId`
- Se muestra `BranchAvailabilityGrid` solo con sucursales del grupo

---

### 3. **Contexto SUCURSAL** (`/sucursal/{slug}/products/[id]`)
**Comportamiento:**
- **NO muestra lista de sucursales disponibles**
- Muestra **solo la información de la sucursal actual** (precio, stock, disponibilidad)
- El usuario **NO puede cambiar de sucursal** (está fijado por la URL)
- Si el producto no está disponible en esa sucursal, se muestra un mensaje de error o advertencia

**Backend:**
- `findOne(productId, branchId)` con `branchId` del contexto
- Query SQL: `LEFT JOIN` con `product_branch_availability` para obtener `branch_price`, `branch_stock`, `branch_is_enabled`
- **NO se llama** a `getProductBranchAvailability()` desde el frontend

**Frontend:**
- `contextType === 'sucursal'`
- `loadBranchAvailabilities()` **NO se llama** (se omite)
- `selectedBranchId` se establece automáticamente con `branchId` del contexto
- `BranchAvailabilityGrid` **NO se muestra** (`contextType !== 'sucursal'`)
- Se muestra precio y stock específicos de la sucursal usando `product.branch_price` y `product.branch_stock`

---

### 4. **Contexto BRAND** (`/brand/{code}/products/[id]`)
**Comportamiento:**
- Muestra **solo las sucursales que venden productos compatibles con la marca especificada** y que tienen el producto disponible
- El producto debe ser compatible con la marca (verificado en `product_vehicle_compatibility`)
- El usuario puede seleccionar cualquier sucursal de la lista filtrada

**Backend:**
- `getProductBranchAvailability(productId, undefined, brandId)` con `brandId`
- Query SQL: `INNER JOIN` con `product_branch_availability` + verificación de compatibilidad
- Condiciones WHERE:
  - `b.is_active = TRUE`
  - `pba.is_enabled = TRUE`
  - `pba.is_active = TRUE`
  - `EXISTS (SELECT 1 FROM product_vehicle_compatibility WHERE product_id = $1 AND vehicle_brand_id = $brandId AND is_active = TRUE)` ← **Filtro por compatibilidad de marca**

**Frontend:**
- `contextType === 'brand'`
- `loadBranchAvailabilities()` se llama con `filterBrandId = brandId`
- Se muestra `BranchAvailabilityGrid` solo con sucursales que venden productos de esa marca

---

## Cambios Implementados

### Backend (`products.service.ts` - `getProductBranchAvailability`)

**ANTES (Problema):**
- Usaba `LEFT JOIN` con `product_branch_availability`, lo que permitía mostrar sucursales sin disponibilidad
- El filtro de grupo se aplicaba después del JOIN, permitiendo que aparecieran sucursales de otros grupos

**AHORA (Solución):**
- Usa `INNER JOIN` con `product_branch_availability`, asegurando que solo se muestren sucursales con disponibilidad
- El filtro de grupo se aplica en el WHERE: `b.business_group_id = $groupId`
- Solo se muestran sucursales donde `pba.is_enabled = TRUE` y `pba.is_active = TRUE`
- Para brand, se verifica que el producto sea compatible con la marca usando `EXISTS` subquery

### Frontend (`products/[id].tsx`)

**Reglas de carga:**
- **Global**: Carga todas las disponibilidades sin filtros
- **Grupo**: Carga disponibilidades con `filterGroupId = groupId`
- **Sucursal**: **NO carga disponibilidades**, solo usa datos del producto con `branchId`
- **Brand**: Carga disponibilidades con `filterBrandId = brandId`

**Reglas de visualización:**
- **Global, Grupo, Brand**: Muestra `BranchAvailabilityGrid` con lista de sucursales
- **Sucursal**: **NO muestra** `BranchAvailabilityGrid`, solo muestra precio/stock de la sucursal actual

---

## Ejemplos de URLs y Comportamiento

### Ejemplo 1: Global
```
URL: http://localhost:3008/products/00000001-0000-0000-0000-000000000023
Comportamiento: Muestra todas las sucursales que tienen el producto disponible
```

### Ejemplo 2: Grupo
```
URL: http://localhost:3008/grupo/toyota-satelite-group/products/00000001-0000-0000-0000-000000000023
Comportamiento: Muestra SOLO las sucursales del grupo "toyota-satelite-group" que tienen el producto disponible
```

### Ejemplo 3: Sucursal
```
URL: http://localhost:3008/sucursal/suzuki-pedregal/products/00000001-0000-0000-0000-000000000023
Comportamiento: Muestra SOLO la información de "suzuki-pedregal" (precio, stock). NO muestra lista de otras sucursales.
```

### Ejemplo 4: Brand
```
URL: http://localhost:3008/brand/TOYOTA/products/00000001-0000-0000-0000-000000000023
Comportamiento: Muestra solo las sucursales que venden productos compatibles con TOYOTA y que tienen este producto disponible
```

---

## Validaciones y Seguridad

1. **Sucursales activas**: Solo se muestran sucursales donde `b.is_active = TRUE`
2. **Disponibilidad activa**: Solo se muestran disponibilidades donde `pba.is_active = TRUE`
3. **Producto habilitado**: Solo se muestran disponibilidades donde `pba.is_enabled = TRUE`
4. **Filtro de grupo**: Cuando se especifica un grupo, solo se muestran sucursales de ese grupo
5. **Compatibilidad de marca**: Cuando se especifica una marca, se verifica que el producto sea compatible

