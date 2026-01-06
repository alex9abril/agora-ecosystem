# Métodos Útiles de Skydropx para el Proceso de Venta

## Métodos Actualmente Implementados ✅

### 1. **POST `/quotations`** - Cotizaciones de Envío
- **Estado**: ✅ Implementado
- **Uso**: Obtener cotizaciones de diferentes carriers antes del checkout
- **Endpoint**: `/api/logistics/quotations`
- **Flujo**: Storefront → Backend → Skydropx

### 2. **POST `/shipments`** - Crear Envío
- **Estado**: ✅ Implementado
- **Uso**: Crear el envío real después de surtir el pedido
- **Endpoint**: `/api/logistics/shipping-labels`
- **Flujo**: Web-Local → Backend → Skydropx
- **Incluye**: Polling automático hasta que `workflow_status: "success"`

### 3. **GET `/shipments/:id`** - Obtener Detalles del Envío
- **Estado**: ⚠️ Parcialmente implementado (solo en polling interno)
- **Uso**: Consultar estado actual de un envío
- **Necesita**: Endpoint público para consultar desde frontend

---

## Métodos Recomendados para Implementar 🚀

### 4. **GET `/shipments/:id/tracking`** - Seguimiento de Envío
- **Prioridad**: 🔴 ALTA
- **Descripción**: Obtener el estado actual del envío (en tránsito, entregado, etc.)
- **Uso en el proceso de venta**:
  - Mostrar estado del envío al cliente en el storefront
  - Actualizar automáticamente el estado en web-local
  - Notificar al cliente cuando el paquete sea entregado
- **Campos útiles**:
  - `status`: Estado actual (created, in_transit, delivered, exception, etc.)
  - `tracking_events`: Array de eventos de seguimiento
  - `estimated_delivery`: Fecha estimada de entrega
  - `current_location`: Ubicación actual del paquete

**Ejemplo de implementación**:
```typescript
async getShipmentTracking(shipmentId: string): Promise<SkydropxTracking> {
  const { endpoint } = await this.getCredentials();
  const headers = await this.getAuthHeaders();
  
  const response = await axios.get(
    `${endpoint}/shipments/${shipmentId}/tracking`,
    { headers }
  );
  
  return {
    status: response.data.attributes.status,
    tracking_events: response.data.attributes.tracking_events,
    estimated_delivery: response.data.attributes.estimated_delivery,
    current_location: response.data.attributes.current_location,
  };
}
```

### 5. **POST `/webhooks`** - Configurar Webhooks
- **Prioridad**: 🔴 ALTA
- **Descripción**: Recibir actualizaciones automáticas cuando cambie el estado del envío
- **Uso en el proceso de venta**:
  - Actualizar automáticamente el estado de la orden cuando el paquete sea recogido
  - Notificar al cliente cuando el paquete esté en tránsito
  - Marcar la orden como "entregada" automáticamente
  - Detectar excepciones (paquete perdido, devuelto, etc.)
- **Eventos útiles**:
  - `shipment.created`: Envío creado
  - `shipment.picked_up`: Paquete recogido por el carrier
  - `shipment.in_transit`: Paquete en tránsito
  - `shipment.delivered`: Paquete entregado
  - `shipment.exception`: Excepción (paquete perdido, devuelto, etc.)
  - `shipment.cancelled`: Envío cancelado

**Ejemplo de implementación**:
```typescript
// Endpoint para recibir webhooks de Skydropx
@Post('webhooks/skydropx')
@Public() // Skydropx necesita poder llamar este endpoint
async handleSkydropxWebhook(@Body() webhook: SkydropxWebhook) {
  const { event, data } = webhook;
  
  switch (event) {
    case 'shipment.delivered':
      await this.updateOrderStatus(data.shipment_id, 'delivered');
      await this.notifyCustomer(data.order_id, 'Tu pedido ha sido entregado');
      break;
    case 'shipment.in_transit':
      await this.updateOrderStatus(data.shipment_id, 'in_transit');
      break;
    case 'shipment.exception':
      await this.handleException(data.shipment_id, data.exception_type);
      break;
  }
}
```

### 6. **DELETE `/shipments/:id`** - Cancelar Envío
- **Prioridad**: 🟡 MEDIA
- **Descripción**: Cancelar un envío antes de que sea recogido
- **Uso en el proceso de venta**:
  - Permitir cancelar envíos si el cliente cancela la orden
  - Reembolsar el costo de envío si aplica
  - Liberar el rate_id para reutilizar
- **Restricciones**: Solo funciona si el envío no ha sido recogido aún

**Ejemplo de implementación**:
```typescript
async cancelShipment(shipmentId: string): Promise<boolean> {
  const { endpoint } = await this.getCredentials();
  const headers = await this.getAuthHeaders();
  
  const response = await axios.delete(
    `${endpoint}/shipments/${shipmentId}`,
    { headers }
  );
  
  return response.status === 200;
}
```

### 7. **GET `/shipments/:id`** - Obtener Detalles Completos
- **Prioridad**: 🟡 MEDIA
- **Descripción**: Obtener toda la información de un envío (más completo que tracking)
- **Uso en el proceso de venta**:
  - Mostrar detalles completos en el detalle de la orden
  - Verificar información del carrier, servicio, costos
  - Obtener URLs de seguimiento del carrier
- **Información adicional**:
  - Costo total del envío
  - Información del carrier y servicio
  - URLs de seguimiento del carrier
  - Información de facturación

**Ejemplo de implementación**:
```typescript
async getShipmentDetails(shipmentId: string): Promise<SkydropxShipmentDetails> {
  const { endpoint } = await this.getCredentials();
  const headers = await this.getAuthHeaders();
  
  const response = await axios.get(
    `${endpoint}/shipments/${shipmentId}`,
    { headers }
  );
  
  return {
    ...response.data.attributes,
    tracking_url: response.data.attributes.tracking_url_provider,
    carrier_info: response.data.relationships.carrier,
  };
}
```

### 8. **POST `/addresses/validate`** - Validar Direcciones
- **Prioridad**: 🟢 BAJA (pero útil)
- **Descripción**: Validar que una dirección sea entregable antes de crear la cotización
- **Uso en el proceso de venta**:
  - Validar direcciones durante el checkout
  - Sugerir correcciones si la dirección tiene problemas
  - Prevenir errores al crear el envío
- **Beneficios**:
  - Reduce errores de entrega
  - Mejora la experiencia del usuario
  - Ahorra tiempo al detectar problemas temprano

**Ejemplo de implementación**:
```typescript
async validateAddress(address: SkydropxAddress): Promise<AddressValidationResult> {
  const { endpoint } = await this.getCredentials();
  const headers = await this.getAuthHeaders();
  
  const response = await axios.post(
    `${endpoint}/addresses/validate`,
    { address },
    { headers }
  );
  
  return {
    valid: response.data.valid,
    suggestions: response.data.suggestions,
    normalized_address: response.data.normalized_address,
  };
}
```

### 9. **GET `/carriers`** - Listar Carriers Disponibles
- **Prioridad**: 🟢 BAJA
- **Descripción**: Obtener lista de carriers disponibles y sus servicios
- **Uso en el proceso de venta**:
  - Mostrar solo carriers disponibles en el checkout
  - Filtrar opciones según ubicación
  - Mostrar información de cada carrier (tiempo de entrega, cobertura, etc.)

### 10. **POST `/shipments/:id/labels`** - Regenerar Etiqueta
- **Prioridad**: 🟢 BAJA
- **Descripción**: Regenerar la etiqueta de envío si se perdió o necesita reimprimirse
- **Uso en el proceso de venta**:
  - Permitir reimprimir etiquetas desde web-local
  - Regenerar si hay problemas con la etiqueta original

---

## Priorización Recomendada

### Fase 1: Seguimiento y Estado (Crítico) 🔴
1. **GET `/shipments/:id/tracking`** - Para mostrar estado al cliente
2. **POST `/webhooks`** - Para actualizaciones automáticas

### Fase 2: Gestión de Envíos (Importante) 🟡
3. **GET `/shipments/:id`** - Para detalles completos
4. **DELETE `/shipments/:id`** - Para cancelaciones

### Fase 3: Mejoras (Opcional) 🟢
5. **POST `/addresses/validate`** - Para validación de direcciones
6. **GET `/carriers`** - Para información de carriers
7. **POST `/shipments/:id/labels`** - Para regenerar etiquetas

---

## Implementación de Validación de Status

### Opción 1: Polling Periódico
```typescript
// Ejecutar cada X minutos para actualizar estados
async updateShipmentStatuses() {
  const shipments = await this.getPendingShipments();
  
  for (const shipment of shipments) {
    const tracking = await this.skydropxService.getShipmentTracking(shipment.skydropx_shipment_id);
    
    if (tracking.status !== shipment.status) {
      await this.updateOrderStatus(shipment.order_id, tracking.status);
    }
  }
}
```

### Opción 2: Webhooks (Recomendado)
```typescript
// Recibir actualizaciones en tiempo real
@Post('webhooks/skydropx')
async handleWebhook(@Body() webhook: SkydropxWebhook) {
  // Actualizar estado automáticamente
  // Notificar al cliente
  // Registrar eventos
}
```

---

## Beneficios de Implementar Estos Métodos

1. **Mejor Experiencia del Cliente**:
   - Ver estado del envío en tiempo real
   - Notificaciones automáticas de cambios de estado
   - Información precisa de entrega

2. **Automatización**:
   - Actualizar estados sin intervención manual
   - Detectar problemas automáticamente
   - Reducir trabajo manual

3. **Gestión de Excepciones**:
   - Detectar paquetes perdidos o devueltos
   - Manejar excepciones automáticamente
   - Notificar al cliente de problemas

4. **Optimización de Costos**:
   - Cancelar envíos no necesarios
   - Validar direcciones antes de crear envíos
   - Reducir errores y reenvíos

---

## Próximos Pasos Recomendados

1. **Implementar tracking de status** (GET `/shipments/:id/tracking`)
2. **Configurar webhooks** para actualizaciones automáticas
3. **Crear endpoint para consultar estado** desde el frontend
4. **Implementar notificaciones** cuando cambie el estado
5. **Agregar cancelación de envíos** para casos especiales

