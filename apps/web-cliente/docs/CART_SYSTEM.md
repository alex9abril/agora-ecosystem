# Sistema de Carrito de Compras - Documentación

## 📋 Índice
1. [Comportamiento del Carrito](#comportamiento-del-carrito)
2. [Agrupación de Productos](#agrupación-de-productos)
3. [Manejo de Variantes](#manejo-de-variantes)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Estructura de Datos](#estructura-de-datos)
6. [Referencias de Apps de Delivery](#referencias-de-apps-de-delivery)

---

## 🛒 Comportamiento del Carrito

### Principios Fundamentales

El carrito de compras debe comportarse de manera similar a las principales apps de delivery (Uber Eats, Rappi, DoorDash):

1. **Persistencia en Backend**: El carrito se guarda en la base de datos, no solo en localStorage
2. **Sincronización Multi-dispositivo**: El usuario puede acceder a su carrito desde cualquier dispositivo
3. **Recuperación de Carritos Abandonados**: Los carritos se mantienen para estrategias de remarketing
4. **Agrupación Inteligente**: Productos idénticos se agrupan, productos con variantes diferentes se separan

---

## 🔄 Agrupación de Productos

### Reglas de Agrupación

Un producto se considera **idéntico** y se agrupa cuando:
- ✅ Mismo `product_id`
- ✅ Mismas variantes seleccionadas (mismo `variant_selections` JSON)
- ✅ Mismo `business_id` (no se pueden mezclar productos de diferentes tiendas)
- ✅ Mismas `special_instructions` (notas especiales)

**Ejemplo de Agrupación:**
```
Usuario agrega:
1. Papas Fritas (Tamaño: Chica) → Cantidad: 1
2. Papas Fritas (Tamaño: Chica) → Cantidad: 1

Resultado en carrito:
- Papas Fritas (Tamaño: Chica) → Cantidad: 2
```

### Reglas de Separación

Un producto se considera **diferente** y se mantiene como línea separada cuando:
- ❌ Diferentes variantes seleccionadas
- ❌ Diferentes notas especiales (`special_instructions`)
- ❌ Diferentes productos (aunque sean del mismo tipo)

**Ejemplo de Separación:**
```
Usuario agrega:
1. Papas Fritas (Tamaño: Chica) → Cantidad: 1
2. Papas Fritas (Tamaño: Mediana) → Cantidad: 1

Resultado en carrito:
- Papas Fritas (Tamaño: Chica) → Cantidad: 1
- Papas Fritas (Tamaño: Mediana) → Cantidad: 1
```

---

## 🎯 Manejo de Variantes

### Estructura de Variantes

Las variantes se almacenan en formato JSONB estructurado:

```json
{
  "variant_group_id_1": "variant_id_1",           // Selección única
  "variant_group_id_2": ["variant_id_2", "variant_id_3"]  // Selección múltiple
}
```

### Ejemplos Prácticos

#### Ejemplo 1: Producto con Variante Única (Tamaño)
```json
{
  "product_id": "uuid-papas-fritas",
  "variant_selections": {
    "variant_group_tamaño_id": "variant_chica_id"
  },
  "quantity": 2
}
```

#### Ejemplo 2: Producto con Variantes Múltiples (Tamaño + Toppings)
```json
{
  "product_id": "uuid-pizza",
  "variant_selections": {
    "variant_group_tamaño_id": "variant_mediana_id",
    "variant_group_toppings_id": ["variant_queso_extra_id", "variant_pepperoni_id"]
  },
  "quantity": 1
}
```

#### Ejemplo 3: Dos Productos con Variantes Diferentes (NO se agrupan)
```json
// Item 1
{
  "product_id": "uuid-papas-fritas",
  "variant_selections": {
    "variant_group_tamaño_id": "variant_chica_id"
  },
  "quantity": 1
}

// Item 2 (línea separada)
{
  "product_id": "uuid-papas-fritas",
  "variant_selections": {
    "variant_group_tamaño_id": "variant_mediana_id"
  },
  "quantity": 1
}
```

---

## 🏗️ Arquitectura del Sistema

### Flujo de Datos

```
┌─────────────┐
│  Frontend   │
│ (web-cliente)│
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────┐
│   Backend   │
│  (NestJS)   │
└──────┬──────┘
       │
       │ SQL Query
       ▼
┌─────────────┐
│  PostgreSQL │
│  (Supabase) │
└─────────────┘
```

### Componentes del Sistema

1. **Frontend (web-cliente)**
   - Context/State para carrito local (optimistic updates)
   - Sincronización con backend
   - UI para agregar/modificar/eliminar items

2. **Backend (NestJS)**
   - API REST para operaciones de carrito
   - Lógica de agrupación/separación
   - Validación de productos y variantes
   - Cálculo de precios

3. **Base de Datos (PostgreSQL)**
   - Tabla `orders.shopping_cart` (nueva)
   - Tabla `orders.shopping_cart_items` (nueva)
   - Tabla `orders.orders` (pedidos confirmados)
   - Tabla `orders.order_items` (items de pedidos)

---

## 📊 Estructura de Datos

### Tabla: `orders.shopping_cart`

Almacena el carrito principal de cada usuario.

```sql
CREATE TABLE orders.shopping_cart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES core.businesses(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Para limpieza automática de carritos abandonados
    
    -- Constraint: un usuario solo puede tener un carrito activo
    UNIQUE(user_id)
);
```

**Notas:**
- Un usuario solo puede tener **un carrito activo** a la vez
- El `business_id` se establece cuando se agrega el primer producto
- Todos los productos en el carrito deben ser del mismo `business_id`
- `expires_at` permite limpiar carritos abandonados (ej: 30 días)

### Tabla: `orders.shopping_cart_items`

Almacena los items individuales del carrito.

```sql
CREATE TABLE orders.shopping_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES orders.shopping_cart(id) ON DELETE CASCADE,
    
    -- Producto
    product_id UUID NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    
    -- Variantes seleccionadas (JSONB estructurado)
    variant_selections JSONB, -- {"variant_group_id": "variant_id"} o {"variant_group_id": ["variant_id1", "variant_id2"]}
    
    -- Cantidad
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Precio calculado (snapshot al momento de agregar)
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    variant_price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    item_subtotal DECIMAL(10,2) NOT NULL CHECK (item_subtotal >= 0),
    
    -- Notas especiales
    special_instructions TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: no duplicar items idénticos (se agrupan por cantidad)
    UNIQUE(cart_id, product_id, variant_selections, special_instructions)
);
```

**Notas:**
- El `UNIQUE` constraint previene duplicados y fuerza la agrupación
- `variant_selections` debe ser un JSONB consistente para que funcione el UNIQUE
- `unit_price` y `variant_price_adjustment` son snapshots (precio al momento de agregar)
- `item_subtotal = (unit_price + variant_price_adjustment) * quantity`

---

## 📱 Referencias de Apps de Delivery

### Uber Eats

**Comportamiento observado:**
- ✅ Agrupa productos idénticos (mismo producto + mismas variantes)
- ✅ Separa productos con variantes diferentes
- ✅ Carrito persistente (se mantiene entre sesiones)
- ✅ Un carrito por restaurante (no se pueden mezclar restaurantes)

**Ejemplo:**
```
2x Papas Fritas (Chica) → Se agrupa
1x Papas Fritas (Chica) + 1x Papas Fritas (Mediana) → Líneas separadas
```

### Rappi

**Comportamiento observado:**
- ✅ Similar a Uber Eats
- ✅ Permite notas especiales por item
- ✅ Carrito se sincroniza entre dispositivos
- ✅ Notificaciones de carrito abandonado

### DoorDash

**Comportamiento observado:**
- ✅ Agrupación inteligente
- ✅ Carrito persistente con expiración (7 días)
- ✅ Recuperación de carrito abandonado con descuentos

---

## 🔄 Flujo de Operaciones

### 1. Agregar Producto al Carrito

```
1. Usuario selecciona producto y variantes
2. Frontend envía POST /api/cart/items
3. Backend verifica:
   - ¿Existe carrito activo para el usuario?
   - ¿El producto es del mismo business_id que el carrito?
   - ¿Ya existe un item idéntico (mismo product_id + variant_selections)?
4. Si existe item idéntico:
   - UPDATE quantity = quantity + 1
5. Si NO existe:
   - INSERT nuevo item
6. Recalcular totales del carrito
7. Retornar carrito actualizado
```

### 2. Modificar Cantidad

```
1. Usuario cambia cantidad en UI
2. Frontend envía PATCH /api/cart/items/:item_id
3. Backend actualiza quantity
4. Recalcular item_subtotal
5. Retornar carrito actualizado
```

### 3. Eliminar Item

```
1. Usuario elimina item
2. Frontend envía DELETE /api/cart/items/:item_id
3. Backend elimina item
4. Si carrito queda vacío, eliminar carrito también
5. Retornar carrito actualizado (o null si está vacío)
```

### 4. Convertir Carrito en Pedido

```
1. Usuario procede al checkout
2. Frontend envía POST /api/orders (con cart_id)
3. Backend:
   - Crea order en orders.orders
   - Copia items de shopping_cart_items a order_items
   - Calcula totales finales
   - Elimina carrito (o lo marca como "converted")
4. Retornar order creado
```

---

## 🎨 Consideraciones de UX

### Indicadores Visuales

1. **Badge de cantidad** en icono de carrito
2. **Agrupación visual** de items idénticos
3. **Separación clara** de items con variantes diferentes
4. **Precio total** visible en todo momento

### Validaciones

1. **Mismo restaurante**: No permitir agregar productos de diferentes restaurantes
2. **Disponibilidad**: Verificar que producto y variantes estén disponibles
3. **Stock**: Verificar límites de cantidad (max_quantity_per_order)
4. **Precios actualizados**: Recalcular si el precio cambió desde que se agregó

---

## 🚀 Próximos Pasos

1. ✅ Crear script SQL para tablas de carrito
2. ⏳ Implementar endpoints en backend (NestJS)
3. ⏳ Implementar context/state en frontend
4. ⏳ Implementar UI de carrito
5. ⏳ Implementar conversión de carrito a pedido
6. ⏳ Implementar limpieza automática de carritos abandonados

---

## 📝 Notas Técnicas

### JSONB para variant_selections

El uso de JSONB permite:
- ✅ Comparación eficiente para UNIQUE constraint
- ✅ Consultas flexibles con operadores JSONB
- ✅ Estructura adaptable a diferentes tipos de variantes

**Ejemplo de comparación:**
```sql
-- Verificar si dos variant_selections son iguales
WHERE variant_selections @> '{"variant_group_id": "variant_id"}'::jsonb
  AND variant_selections <@ '{"variant_group_id": "variant_id"}'::jsonb
```

### Optimistic Updates

El frontend puede hacer updates optimistas (actualizar UI antes de respuesta del servidor) para mejor UX, pero siempre debe sincronizar con el backend.

---

**Última actualización:** 2024-11-19
**Autor:** Sistema Localia Admin

