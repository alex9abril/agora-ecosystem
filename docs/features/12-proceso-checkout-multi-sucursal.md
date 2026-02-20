# Proceso de Elaboración de Pedidos - Multi-Sucursal

## 📋 Resumen Ejecutivo

Este documento describe el proceso de creación de pedidos cuando un carrito contiene productos de múltiples sucursales. El sistema debe crear **una orden por cada sucursal**, pero mantener un **pago global único** y una **relación entre las órdenes relacionadas**.

## 🎯 Requisitos

1. **Cada producto debe salir de una sucursal específica**: Los productos en el carrito tienen un `branch_id` o `business_id` que identifica la sucursal de origen.

2. **Una orden por sucursal**: Si el carrito contiene productos de N sucursales diferentes, se deben crear N órdenes separadas.

3. **Pago global único**: Aunque se crean múltiples órdenes, el cliente realiza un solo pago que cubre todas las órdenes.

4. **Relación entre órdenes**: Las órdenes creadas en el mismo checkout deben estar relacionadas mediante un `order_group_id` para poder:
   - Mostrarlas juntas en el historial del cliente
   - Gestionar el pago de forma unificada
   - Rastrear el estado de todas las órdenes relacionadas

## 🔄 Flujo Actual (ANTES de la implementación)

### Estado Actual del Código

**Ubicación**: `apps/backend/src/modules/orders/orders.service.ts` - Método `checkout()`

**Problema identificado**:
```typescript
// Línea 68-72: Valida que todos los productos sean del mismo negocio
const businessIds = [...new Set(itemsResult.rows.map((item: any) => item.business_id))];
if (businessIds.length > 1) {
  throw new BadRequestException('Todos los productos deben ser del mismo negocio');
}
```

**Limitación**: El sistema actual **rechaza** carritos con productos de múltiples sucursales.

### Estructura de Datos Actual

**Carrito (`orders.shopping_cart_items`)**:
- `id`: UUID del item
- `cart_id`: UUID del carrito
- `product_id`: UUID del producto
- `branch_id`: UUID de la sucursal (opcional, para contexto global)
- `quantity`: Cantidad
- `unit_price`: Precio unitario
- `item_subtotal`: Subtotal del item
- `variant_selections`: JSONB con variantes seleccionadas
- `special_instructions`: Notas especiales

**Orden (`orders.orders`)**:
- `id`: UUID de la orden
- `client_id`: UUID del cliente
- `business_id`: UUID de la sucursal/negocio
- `status`: Estado del pedido
- `subtotal`, `tax_amount`, `delivery_fee`, `tip_amount`, `total_amount`: Montos
- `payment_method`, `payment_status`: Información de pago
- `delivery_address_id`, `delivery_address_text`: Dirección de entrega
- `created_at`, `updated_at`: Timestamps

**Problema**: No existe un campo para agrupar órdenes relacionadas.

## 🚀 Flujo Propuesto (DESPUÉS de la implementación)

### 1. Modificación de la Base de Datos

**Migración SQL necesaria**:
```sql
-- Agregar campo para agrupar órdenes relacionadas
ALTER TABLE orders.orders 
ADD COLUMN order_group_id UUID;

-- Crear índice para búsquedas eficientes
CREATE INDEX idx_orders_order_group_id ON orders.orders(order_group_id);

-- Comentario
COMMENT ON COLUMN orders.orders.order_group_id IS 
  'ID del grupo de órdenes relacionadas creadas en el mismo checkout. NULL si la orden no pertenece a un grupo.';
```

### 2. Proceso de Checkout Modificado

#### Paso 1: Obtener y Validar Carrito
- Obtener el carrito del usuario
- Validar que el carrito no esté vacío
- Obtener todos los items del carrito con su información de sucursal

#### Paso 2: Agrupar Items por Sucursal
```typescript
// Agrupar items por business_id (sucursal)
const itemsByBusiness = new Map<string, CartItem[]>();

for (const item of cartItems) {
  const businessId = item.branch_id || item.product.business_id;
  if (!itemsByBusiness.has(businessId)) {
    itemsByBusiness.set(businessId, []);
  }
  itemsByBusiness.get(businessId)!.push(item);
}
```

#### Paso 3: Generar Order Group ID
- Crear un UUID único que será el `order_group_id` para todas las órdenes relacionadas
- Este ID se usará para todas las órdenes creadas en este checkout

#### Paso 4: Crear Orden por Cada Sucursal
Para cada grupo de items (por sucursal):

1. **Calcular montos individuales**:
   - `subtotal`: Suma de `item_subtotal` de los items de esta sucursal
   - `tax_amount`: Suma de impuestos de los items de esta sucursal
   - `delivery_fee`: Distribuir proporcionalmente o asignar a una sucursal principal
   - `tip_amount`: Distribuir proporcionalmente o asignar a una sucursal principal
   - `total_amount`: Suma de todos los montos

2. **Crear la orden**:
   ```sql
   INSERT INTO orders.orders (
     client_id, business_id, status,
     delivery_address_id, delivery_address_text, delivery_location,
     subtotal, tax_amount, delivery_fee, discount_amount, tip_amount, total_amount,
     payment_method, payment_status,
     delivery_notes,
     order_group_id  -- ⭐ NUEVO: Relacionar con el grupo
   ) VALUES (...)
   ```

3. **Crear order_items**:
   - Insertar todos los items de esta sucursal en `orders.order_items`
   - Cada item mantiene su información original del carrito

#### Paso 5: Distribución del Pago Global

**Opciones de implementación**:

**Opción A: Pago proporcional por orden**
- Cada orden tiene su propio `payment_status` y `payment_transaction_id`
- El pago global se divide proporcionalmente entre las órdenes
- Ventaja: Cada sucursal puede ver su pago independiente
- Desventaja: Más complejo de gestionar

**Opción B: Pago global con referencia**
- Una orden "principal" tiene el `payment_transaction_id` completo
- Las demás órdenes tienen `payment_status = 'paid'` pero sin `payment_transaction_id`
- Ventaja: Más simple, un solo punto de referencia de pago
- Desventaja: Solo una sucursal tiene la referencia completa

**Opción C: Tabla de pagos separada (RECOMENDADA)**
- Crear una tabla `orders.order_group_payments`:
  ```sql
  CREATE TABLE orders.order_group_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_group_id UUID NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
- Todas las órdenes del grupo referencian este pago
- Ventaja: Separación clara de responsabilidades
- Desventaja: Requiere más cambios en el código

**Recomendación**: Empezar con **Opción B** (más simple) y migrar a **Opción C** si es necesario.

#### Paso 6: Limpiar Carrito
- Eliminar todos los items del carrito
- Eliminar el carrito

#### Paso 7: Retornar Resultado
- Retornar todas las órdenes creadas con su `order_group_id`
- El frontend puede mostrar las órdenes agrupadas

### 3. Distribución de Montos Globales

#### Delivery Fee
- **Opción 1**: Asignar a la primera sucursal (más simple)
- **Opción 2**: Dividir proporcionalmente según el subtotal de cada orden
- **Opción 3**: Asignar a la sucursal con mayor subtotal

#### Tip Amount
- **Opción 1**: Dividir proporcionalmente según el subtotal de cada orden
- **Opción 2**: Asignar a la primera sucursal
- **Opción 3**: Asignar a la sucursal con mayor subtotal

**Recomendación**: Dividir proporcionalmente para ser justos con todas las sucursales.

### 4. Ejemplo de Flujo

**Carrito del cliente**:
- Producto A (Sucursal 1): $100
- Producto B (Sucursal 1): $50
- Producto C (Sucursal 2): $75
- Delivery Fee: $20
- Tip: $10

**Resultado**:
- **Order Group ID**: `abc-123-def-456`

- **Orden 1** (Sucursal 1):
  - Subtotal: $150
  - Tax: $24 (16% IVA)
  - Delivery Fee: $12 (proporcional: 150/225 = 66.67%)
  - Tip: $6.67 (proporcional)
  - Total: $192.67
  - `order_group_id`: `abc-123-def-456`

- **Orden 2** (Sucursal 2):
  - Subtotal: $75
  - Tax: $12 (16% IVA)
  - Delivery Fee: $8 (proporcional: 75/225 = 33.33%)
  - Tip: $3.33 (proporcional)
  - Total: $98.33
  - `order_group_id`: `abc-123-def-456`

- **Pago Global**:
  - Total: $291.00
  - `payment_transaction_id`: `txn-xyz-789`
  - Asignado a Orden 1 (principal)

## 📊 Diagrama de Flujo

```
┌─────────────────┐
│  Cliente hace   │
│   checkout      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Obtener carrito │
│ y validar       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agrupar items   │
│ por sucursal    │
│ (business_id)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generar         │
│ order_group_id  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Para cada       │
│ sucursal:       │
│ 1. Calcular     │
│    montos       │
│ 2. Crear orden  │
│ 3. Crear items  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Procesar pago   │
│ global          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Limpiar carrito │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Retornar todas  │
│ las órdenes     │
│ con order_group │
└─────────────────┘
```

## 🔍 Consultas Útiles

### Obtener todas las órdenes de un grupo
```sql
SELECT * FROM orders.orders 
WHERE order_group_id = 'abc-123-def-456'
ORDER BY created_at;
```

### Obtener total del grupo
```sql
SELECT 
  order_group_id,
  COUNT(*) as order_count,
  SUM(total_amount) as group_total
FROM orders.orders
WHERE order_group_id = 'abc-123-def-456'
GROUP BY order_group_id;
```

### Obtener órdenes relacionadas de un cliente
```sql
SELECT 
  o.*,
  b.name as business_name
FROM orders.orders o
INNER JOIN core.businesses b ON o.business_id = b.id
WHERE o.client_id = 'user-id'
  AND o.order_group_id IN (
    SELECT DISTINCT order_group_id 
    FROM orders.orders 
    WHERE client_id = 'user-id' 
      AND order_group_id IS NOT NULL
  )
ORDER BY o.order_group_id, o.created_at;
```

## ⚠️ Consideraciones Importantes

1. **Transacciones**: Todo el proceso debe estar dentro de una transacción para garantizar atomicidad.

2. **Rollback**: Si falla la creación de alguna orden, se debe hacer rollback de todas.

3. **Validaciones**: 
   - Validar que todas las sucursales estén activas
   - Validar que todos los productos estén disponibles
   - Validar que la dirección de entrega sea válida

4. **Notificaciones**: 
   - Notificar a cada sucursal sobre su orden
   - Notificar al cliente sobre todas las órdenes creadas

5. **Tracking**: 
   - El cliente debe poder ver todas las órdenes relacionadas juntas
   - Cada sucursal solo ve su propia orden

6. **Cancelación**: 
   - Si se cancela una orden del grupo, las demás continúan
   - Si se cancela el pago global, todas las órdenes se cancelan

## 📝 Checklist de Implementación

- [x] Crear migración SQL para agregar `order_group_id` a `orders.orders`
- [x] Modificar método `checkout()` para agrupar por sucursal
- [x] Implementar generación de `order_group_id`
- [x] Implementar creación de múltiples órdenes
- [x] Implementar distribución proporcional de montos globales
- [ ] Implementar manejo de pago global (pendiente - usar Opción B por ahora)
- [ ] Actualizar queries para obtener órdenes agrupadas
- [ ] Actualizar frontend para mostrar órdenes agrupadas
- [ ] Agregar tests unitarios
- [ ] Agregar tests de integración
- [ ] Documentar cambios en API

## ✅ Cambios Implementados

### 1. Migración SQL
**Archivo**: `database/migration_add_order_group_id.sql`
- Agrega columna `order_group_id UUID` a `orders.orders`
- Crea índice para búsquedas eficientes
- Agrega comentario descriptivo

### 2. Modificación del Método `checkout()`
**Archivo**: `apps/backend/src/modules/orders/orders.service.ts`

**Cambios principales**:
1. **Eliminada validación restrictiva**: Ya no se rechaza carritos con productos de múltiples sucursales
2. **Agrupación por sucursal**: Los items se agrupan por `branch_id` (si existe) o `business_id` del producto
3. **Generación de `order_group_id`**: Se genera un UUID único para todas las órdenes relacionadas
4. **Creación de múltiples órdenes**: Se crea una orden por cada sucursal con items
5. **Distribución proporcional**: `delivery_fee` y `tip_amount` se distribuyen proporcionalmente según el subtotal de cada orden
6. **Respuesta mejorada**: La respuesta incluye `order_group_id`, `related_orders_count` y `related_orders`

**Estructura de la respuesta**:
```typescript
{
  // Orden principal (primera creada)
  id: string,
  business_id: string,
  // ... otros campos de orden ...
  
  // Información del grupo
  order_group_id: string,
  related_orders_count: number,
  related_orders: [
    { id: string, business_id: string, total_amount: number },
    // ... más órdenes ...
  ]
}
```

## 🔗 Referencias

- `apps/backend/src/modules/orders/orders.service.ts` - Servicio de órdenes
- `apps/backend/src/modules/cart/cart.service.ts` - Servicio de carrito
- `database/schema.sql` - Esquema de base de datos
- `database/segments/03_tablas_schema_orders.sql` - Tablas de órdenes

