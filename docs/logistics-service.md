# 🚚 Microservicio de Logística - AGORA

## 📋 Descripción

Microservicio simulado de logística para generar guías de envío y simular el proceso de recolección y entrega de paquetes. Este servicio está diseñado para demos cuando aún no se tienen los accesos al proveedor real de logística.

## 🎯 Funcionalidades

1. **Generación de guías de envío**: Crea un número de guía único y genera un PDF imprimible
2. **Simulación automática de estados**: Avanza automáticamente los estados de la orden:
   - `completed` → `in_transit` (después de 2 minutos)
   - `in_transit` → `delivered` (después de 7 minutos adicionales)
3. **Seguimiento de paquetes**: Consulta el estado de una guía por número de seguimiento
4. **Descarga de PDFs**: Obtiene el PDF de la guía para imprimir

## 📊 Flujo de Estados

```
Orden en estado 'completed' (listo para recoger)
    ↓
[Generar guía de envío]
    ↓
Guía generada (status: 'generated')
    ↓
[2 minutos] → picked_up (recolectado)
    ↓
Orden cambia a 'in_transit'
    ↓
[5 minutos adicionales] → in_transit (en tránsito)
    ↓
[10 minutos adicionales] → delivered (entregado)
    ↓
Orden cambia a 'delivered'
```

## 🔌 Endpoints

### 1. Generar Guía de Envío

**POST** `/logistics/shipping-labels`

Genera una guía de envío para una orden que esté en estado `completed`.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "packageWeight": 2.5,        // Opcional (kg)
  "packageDimensions": "30x20x15 cm",  // Opcional
  "declaredValue": 1500.00     // Opcional
}
```

**Response:**
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "tracking_number": "AGO-20250115-143022-1234",
  "carrier_name": "AGORA_LOGISTICS",
  "status": "generated",
  "origin_address": "Dirección del negocio",
  "destination_address": "Dirección de entrega",
  "destination_name": "Nombre del cliente",
  "destination_phone": "1234567890",
  "package_weight": 2.5,
  "package_dimensions": "30x20x15 cm",
  "declared_value": 1500.00,
  "pdf_path": "/path/to/shipping-label-AGO-20250115-143022-1234.pdf",
  "generated_at": "2025-01-15T14:30:22Z",
  "created_at": "2025-01-15T14:30:22Z",
  "updated_at": "2025-01-15T14:30:22Z"
}
```

### 2. Obtener Guía por ID de Orden

**GET** `/logistics/shipping-labels/order/:orderId`

Obtiene la guía de envío asociada a una orden.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "tracking_number": "AGO-20250115-143022-1234",
  "status": "in_transit",
  ...
}
```

### 3. Obtener Guía por Número de Seguimiento (Público)

**GET** `/logistics/shipping-labels/tracking/:trackingNumber`

Consulta el estado de una guía usando el número de seguimiento. Este endpoint es público (no requiere autenticación).

**Response:**
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "tracking_number": "AGO-20250115-143022-1234",
  "status": "delivered",
  "picked_up_at": "2025-01-15T14:32:22Z",
  "in_transit_at": "2025-01-15T14:37:22Z",
  "delivered_at": "2025-01-15T14:47:22Z",
  ...
}
```

### 4. Descargar PDF de Guía

**GET** `/logistics/shipping-labels/:orderId/pdf`

Descarga el archivo PDF de la guía de envío para imprimir.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="shipping-label-{orderId}.pdf"`

## 🗄️ Base de Datos

### Tabla: `orders.shipping_labels`

```sql
CREATE TABLE orders.shipping_labels (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    carrier_name VARCHAR(50) DEFAULT 'AGORA_LOGISTICS',
    status VARCHAR(50) DEFAULT 'generated',
    origin_address TEXT,
    destination_address TEXT,
    destination_name VARCHAR(255),
    destination_phone VARCHAR(50),
    package_weight DECIMAL(10,2),
    package_dimensions TEXT,
    declared_value DECIMAL(10,2),
    pdf_url TEXT,
    pdf_path TEXT,
    generated_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    in_transit_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    metadata JSONB
);
```

## 📝 Ejemplo de Uso

### 1. Cuando una orden está lista para recoger

```typescript
// En el frontend o backend, cuando la orden cambia a 'completed'
const response = await fetch('/api/logistics/shipping-labels', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: order.id,
    packageWeight: 2.5,
    packageDimensions: '30x20x15 cm',
    declaredValue: order.total_amount,
  }),
});

const shippingLabel = await response.json();
console.log('Guía generada:', shippingLabel.tracking_number);
```

### 2. Descargar PDF

```typescript
const response = await fetch(`/api/logistics/shipping-labels/${orderId}/pdf`, {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `shipping-label-${orderId}.pdf`;
a.click();
```

### 3. Consultar estado (público)

```typescript
const response = await fetch(
  `/api/logistics/shipping-labels/tracking/${trackingNumber}`
);
const shippingLabel = await response.json();
console.log('Estado:', shippingLabel.status);
```

## ⚙️ Configuración

### Tiempos de Simulación

Los tiempos de simulación están configurados en `logistics.service.ts`:

```typescript
const PICKED_UP_DELAY = 2 * 60 * 1000;      // 2 minutos
const IN_TRANSIT_DELAY = 5 * 60 * 1000;     // 5 minutos
const DELIVERED_DELAY = 10 * 60 * 1000;     // 10 minutos
```

**Total:** ~17 minutos desde la generación hasta la entrega.

### Almacenamiento de PDFs

Los PDFs se almacenan en:
```
{project_root}/storage/shipping-labels/
```

Este directorio se crea automáticamente al iniciar el servicio.

## 🔄 Integración con Órdenes

El servicio actualiza automáticamente el estado de la orden cuando cambia el estado de la guía:

- `picked_up` o `in_transit` → Orden cambia a `in_transit`
- `delivered` → Orden cambia a `delivered`

También registra los cambios en `orders.order_status_history`.

## 📦 Dependencias

- `pdfkit`: Generación de PDFs
- `@types/pdfkit`: Tipos TypeScript para pdfkit
- `fs`: Sistema de archivos (Node.js nativo)
- `path`: Rutas de archivos (Node.js nativo)

## 🚀 Próximos Pasos

Cuando se tenga acceso al proveedor real de logística:

1. Reemplazar la generación de números de guía con la API real
2. Reemplazar la simulación de estados con webhooks del proveedor
3. Integrar con el sistema de impresión de etiquetas del proveedor
4. Agregar tracking en tiempo real desde el proveedor

## ⚠️ Notas

- Este servicio es **solo para demos**. No debe usarse en producción sin un proveedor real.
- Los PDFs se almacenan localmente. En producción, deberían subirse a Supabase Storage.
- Los tiempos de simulación son configurables pero están optimizados para demos rápidas.

