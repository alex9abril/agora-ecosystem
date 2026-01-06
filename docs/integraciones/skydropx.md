# Integración con Skydropx

## Descripción General

Skydropx es una plataforma de logística que permite integrar múltiples transportistas (FedEx, DHL, Estafeta, Paquetexpress, etc.) mediante una sola API. Esta integración permite calcular costos de envío, generar guías de envío y hacer seguimiento de paquetes.

## Arquitectura

### Flujo de Cotizaciones

```
Storefront → Backend Endpoint (/api/logistics/quotations) → Skydropx API
```

### Flujo de Creación de Envío

```
Web-Admin → Backend Endpoint → Skydropx API → Guardar tracking en orden
```

## Configuración

### Variables de Entorno

Skydropx usa **OAuth2** para autenticación. Necesitas obtener tus credenciales desde **Conexiones > API** en tu cuenta de Skydropx.

```env
# Opción 1: Usar nombres genéricos (compatibilidad)
SKYDROPPX_API_KEY=tu_client_id
SKYDROPPX_API_SECRET=tu_client_secret

# Opción 2: Usar nombres descriptivos (recomendado)
SKYDROPPX_CLIENT_ID=tu_client_id
SKYDROPPX_CLIENT_SECRET=tu_client_secret
```

**Nota importante**: El sistema obtiene automáticamente un Bearer Token usando OAuth2 (`client_credentials`). El token se cachea y se renueva automáticamente cuando expira (válido por 2 horas).

### Configuración en Web-Admin

La configuración se realiza en la sección **Configuración > Integraciones > Proveedores de Logística**, similar a como se configuran los métodos de pago (Karlopay, Mercado Pago, Stripe).

#### Configuración Disponible

- **Habilitar Skydropx**: Activar/desactivar la integración
- **Endpoint Base**: `https://pro.skydropx.com/api/v1` (configurable por ambiente dev/prod)
  - Se usa para operaciones generales (shipments, tracking, etc.)
- **Endpoint Cotizaciones**: `https://pro.skydropx.com/api/v1` (configurable por ambiente dev/prod)
  - Endpoint específico para cotizaciones
  - En el futuro puede ser un endpoint propio que procese las cotizaciones antes de llamar a Skydropx
- **API Key**: Se toma del `.env` (SKYDROPPX_API_KEY)
- **API Secret**: Se toma del `.env` (SKYDROPPX_API_SECRET)

## Endpoints del Backend

### 1. POST `/api/logistics/quotations`

Endpoint para obtener cotizaciones de envío. Este endpoint:
- Recibe los datos de cotización (origen, destino, peso, dimensiones)
- Internamente puede procesar las cotizaciones en un sistema propio (mejora futura)
- Finalmente llama a `https://pro.skydropx.com/api/v1/quotations`
- Retorna las cotizaciones disponibles

**Request Body:**
```json
{
  "origin": {
    "name": "Tienda Toyota Coyoacan",
    "street": "Avenida Yucatán 67",
    "number": "67",
    "district": "Escandón",
    "city": "Ciudad de México",
    "state": "CDMX",
    "country": "MX",
    "postal_code": "11800",
    "phone": "+525512345678"
  },
  "destination": {
    "name": "Juan Pérez",
    "street": "Calle Principal",
    "number": "123",
    "district": "Centro",
    "city": "Ciudad de México",
    "state": "CDMX",
    "country": "MX",
    "postal_code": "06000",
    "phone": "+525598765432"
  },
  "parcels": [
    {
      "weight": 1.5,
      "distance_unit": "CM",
      "mass_unit": "KG",
      "height": 10,
      "width": 20,
      "length": 30
    }
  ]
}
```

**Response:**
```json
{
  "quotations": [
    {
      "id": "quot_123456",
      "carrier": "fedex",
      "service": "fedex_ground",
      "price": 50.00,
      "currency": "MXN",
      "estimated_delivery": "2025-01-15",
      "estimated_days": 2
    },
    {
      "id": "quot_789012",
      "carrier": "dhl",
      "service": "dhl_express",
      "price": 48.00,
      "currency": "MXN",
      "estimated_delivery": "2025-01-16",
      "estimated_days": 3
    }
  ]
}
```

### 2. POST `/api/logistics/shipments`

Endpoint para crear un envío usando una cotización previamente obtenida.

**Request Body:**
```json
{
  "quotation_id": "quot_123456",
  "order_id": "order_uuid",
  "label_format": "pdf"
}
```

**Response:**
```json
{
  "shipment_id": "ship_123456",
  "tracking_number": "1234567890",
  "label_url": "https://...",
  "status": "created"
}
```

## Integración en Storefront

### Flujo de Cotización en Checkout

1. El usuario selecciona productos de diferentes tiendas
2. Por cada tienda, se hace una petición a `/api/logistics/quotations`
3. Se muestran las opciones de envío disponibles (FedEx, DHL, etc.)
4. El usuario selecciona el método de envío
5. Se guarda el `quotation_id` en el carrito temporalmente

### Al Crear la Orden

1. Al procesar el checkout, se guarda el `quotation_id` en cada item de la orden
2. El `quotation_id` se almacena en la tabla `orders` o `order_items` (según la estructura)
3. Este ID se usará posteriormente para crear el envío real

## Almacenamiento de Cotizaciones

### Tabla `orders`

Se debe agregar un campo para almacenar el número de cotización:

```sql
ALTER TABLE orders.order_items 
ADD COLUMN quotation_id VARCHAR(255) NULL;

COMMENT ON COLUMN orders.order_items.quotation_id IS 'ID de cotización de Skydropx para este item';
```

O si se maneja a nivel de orden completa:

```sql
ALTER TABLE orders.orders 
ADD COLUMN shipping_quotation_id VARCHAR(255) NULL;

COMMENT ON COLUMN orders.orders.shipping_quotation_id IS 'ID de cotización de Skydropx para el envío';
```

## Proceso de Surtir Pedido

Cuando se surte un pedido desde web-admin:

1. Se obtiene el `quotation_id` guardado en la orden
2. Se llama a `/api/logistics/shipments` con el `quotation_id`
3. Se obtiene el `tracking_number` y `label_url`
4. Se actualiza la orden con el tracking number
5. Se puede descargar/imprimir la etiqueta de envío

## Mejora Futura: Sistema Propio de Cotizaciones

En el futuro, el endpoint `/api/logistics/quotations` podrá:
1. Recibir la petición de cotización
2. Procesarla en un sistema propio (base de datos, reglas de negocio, etc.)
3. Luego llamar a Skydropx si es necesario
4. Retornar las cotizaciones procesadas

Esto permitirá:
- Controlar precios de envío
- Aplicar descuentos
- Gestionar promociones de envío
- Analizar costos y márgenes

## Seguridad

- Las credenciales (API Key y Secret) se almacenan en variables de entorno
- No se exponen en el frontend
- Todas las peticiones pasan por el backend
- Se valida autenticación en todos los endpoints

## Modo Desarrollo

Similar a los métodos de pago, Skydropx respeta el modo desarrollo configurado en:
- `integrations.dev_mode`

Cuando está en modo desarrollo, se pueden usar endpoints de prueba de Skydropx (si están disponibles).

## Referencias

- [Documentación de Skydropx](https://docs.skydropx.com/)
- Endpoint base: `https://pro.skydropx.com/api/v1`

