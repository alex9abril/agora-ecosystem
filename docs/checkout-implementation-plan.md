# Plan de Implementación: Checkout y Mi Cuenta

## 📋 Análisis de Base de Datos

### ✅ Estructuras Existentes (No requieren cambios)

1. **`core.addresses`** - Direcciones de usuarios con geolocalización (POINT)
   - Campos: `id`, `user_id`, `label`, `street`, `neighborhood`, `city`, `state`, `postal_code`, `location` (POINT), `is_default`, `is_active`
   - ✅ Listo para usar

2. **`orders.orders`** - Pedidos
   - Campos: `id`, `client_id`, `business_id`, `status`, `delivery_address_id`, `delivery_location` (POINT), montos, `payment_method`, `payment_status`
   - ✅ Listo para usar

3. **`orders.order_items`** - Items de pedido
   - Campos: `id`, `order_id`, `product_id`, `quantity`, `variant_selection` (JSONB), `item_subtotal`, `special_instructions`
   - ✅ Listo para usar

4. **`orders.deliveries`** - Entregas
   - Campos: `id`, `order_id`, `repartidor_id`, `pickup_location` (POINT), `delivery_location` (POINT)
   - ✅ Listo para usar

5. **`core.businesses`** - Negocios con `location` (POINT)
   - ✅ Listo para calcular punto de entrega más cercano

### 🔧 Mejoras Necesarias

**Ninguna** - La estructura actual es suficiente para el checkout.

## 🎯 Funcionalidades a Implementar

### Backend

1. **Módulo de Direcciones (`addresses`)**
   - `GET /api/addresses` - Listar direcciones del usuario
   - `POST /api/addresses` - Crear nueva dirección
   - `GET /api/addresses/:id` - Obtener dirección específica
   - `PATCH /api/addresses/:id` - Actualizar dirección
   - `DELETE /api/addresses/:id` - Eliminar dirección
   - `PATCH /api/addresses/:id/set-default` - Establecer como predeterminada

2. **Módulo de Orders (completar)**
   - `POST /api/orders/checkout` - Crear pedido desde carrito
     - Validar carrito
     - Validar dirección
     - Calcular montos (subtotal, tax, delivery_fee, total)
     - Crear pedido y order_items
     - Limpiar carrito
   - `GET /api/orders` - Listar pedidos del usuario
   - `GET /api/orders/:id` - Detalle de pedido
   - `POST /api/orders/:id/cancel` - Cancelar pedido

3. **Endpoint de Geolocalización**
   - `GET /api/businesses/nearest?latitude=X&longitude=Y` - Obtener negocio más cercano
   - Usar PostGIS `ST_Distance` para calcular distancia

### Frontend

1. **Página de Checkout (`/checkout`)**
   - Paso 1: Seleccionar/Crear dirección
   - Paso 2: Seleccionar punto de entrega (negocio más cercano)
   - Paso 3: Método de pago (solo efectivo por ahora)
   - Paso 4: Resumen y confirmación

2. **Sección Mi Cuenta (`/profile`)**
   - Tabs: Pedidos, Direcciones
   - Lista de pedidos con estados
   - Detalle de pedido
   - Gestión de direcciones (CRUD)

## 📱 Inspiración de Apps

### Uber Eats / Rappi
- Selección de dirección con mapa
- Cálculo de tiempo estimado de entrega
- Métodos de pago claros
- Seguimiento de pedido en tiempo real

### Implementación
- Usar geolocalización del navegador
- Mostrar distancia y tiempo estimado
- Validar que el negocio entregue en la zona
- Confirmación clara antes de crear pedido

## 🚀 Orden de Implementación

1. ✅ Backend: Módulo de direcciones
2. ✅ Backend: Servicio de orders (checkout, listar, detalle)
3. ✅ Backend: Endpoint de negocio más cercano
4. ✅ Frontend: Página de checkout
5. ✅ Frontend: Sección Mi Cuenta
6. ✅ Testing y ajustes

