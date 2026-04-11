# Herramientas y Funcionalidades para Nivel Directivo

Propuesta integral de reportes, alertas y notificaciones para los directivos de sucursales y grupos empresariales en AGORA Ecosystem.

---

## 1. Contexto

### 1.1 Jerarquía actual

```
Grupo Empresarial (core.business_groups)
  └── Sucursales (core.businesses)
        └── Usuarios (core.business_users)
              roles: superadmin, admin, operations_staff, kitchen_staff
```

### 1.2 Sistema de notificaciones existente

| Componente | Descripción |
|------------|-------------|
| `communication.branch_notification_settings` | Toggles email/WhatsApp por tipo de notificación por sucursal |
| `communication.business_group_notification_settings` | Toggles a nivel grupo |
| `communication.notification_recipients` | Correos de supervisores por sucursal o grupo |
| `communication.email_templates` (3 niveles) | Templates global → grupo → sucursal con herencia |

### 1.3 Primera pieza implementada

**Notificación para Supervisores** (`supervisor_notification`) — un template de correo genérico que se envía automáticamente a los `notification_recipients` configurados cuando ocurre cualquiera de estos eventos:

- **Nueva venta** — cuando se confirma/paga un pedido
- **Registro de cliente** — cuando un nuevo usuario se registra en la plataforma
- **Cambio de estado de pedido** — cuando un pedido cambia de estado

El template se adapta a cada tipo de evento mediante variables genéricas.

---

## 2. Notificación para Supervisores (Implementado)

### 2.1 Diseño genérico

El template usa variables que se adaptan según el evento:

| Variable | Descripción | Ejemplo (nueva venta) |
|----------|-------------|----------------------|
| `event_title` | Título del evento | "Nueva Venta Registrada" |
| `event_description` | Descripción breve | "Se registró un nuevo pedido de Juan Pérez." |
| `business_name` | Nombre de la sucursal | "Sucursal Centro" |
| `detail_section` | HTML con datos específicos del evento | Tabla con número de orden, total, cliente, items |
| `action_url` | Botón de acción (HTML) o vacío | Botón "Ver Pedido Completo" / vacío para registros |

### 2.2 Comportamiento por evento

| Evento | event_title | detail_section | action_url |
|--------|-------------|----------------|------------|
| Nueva venta | "Nueva Venta Registrada" | Datos del pedido: número, cliente, fecha, total, método de pago, items | Botón "Ver Pedido Completo" |
| Registro de cliente | "Nuevo Cliente Registrado" | Datos del cliente: nombre, correo, teléfono | Sin botón (vacío) |
| Cambio de estado | "Cambio de Estado de Pedido" | Datos: número de pedido, cliente, estado anterior, estado actual | Botón "Ver Pedido" |

### 2.3 Flujo

```
Evento (venta, registro, cambio de estado)
  → Envío normal al cliente (flujo existente)
  → sendSupervisorNotification (fire-and-forget, no bloquea)
      → getNotificationChannels(businessId, 'supervisor_notification')
      → si habilitado:
          → getNotificationRecipients(businessId)
          → getGroupNotificationRecipients(groupId) [opcional]
          → deduplicar por email
          → por cada recipient:
              → emailService.sendSupervisorNotificationEmail()
              → get_email_template('supervisor_notification', businessId)
              → replaceVariables + sendMail
```

### 2.4 Configuración en UI (web-local)

- Aparece en el panel de "Templates de Correo" como "Notificación para Supervisores"
- Se puede activar/desactivar por sucursal en la configuración de notificaciones
- Se puede personalizar el HTML, logo, colores y asunto
- Hereda de grupo → global si no tiene personalización propia
- Las mismas herramientas de edición que los otros 3 templates

---

## 3. Reportes Ejecutivos (Propuesta)

### 3.1 Dashboard Consolidado de Grupo

**Endpoint propuesto**: `GET /business-groups/:groupId/executive-dashboard`

KPIs principales:
- Revenue total del periodo
- Total de pedidos
- Ticket promedio
- Crecimiento vs periodo anterior (%)
- Tasa de cancelación
- Tiempo promedio de fulfillment

Desglose por sucursal con ranking y tendencias.

### 3.2 Reporte de Ventas por Canal

**Endpoint propuesto**: `GET /business-groups/:groupId/sales-by-channel`

Desglose por `store_type` (global, group, branch, brand).

### 3.3 Análisis por Horario (Day-Part Analysis)

**Endpoint propuesto**: `GET /businesses/:businessId/daypart-analysis`

Revenue y pedidos por franja horaria con heatmap.

### 3.4 Análisis de Menú (Menu Engineering)

**Endpoint propuesto**: `GET /businesses/:businessId/menu-engineering`

Clasifica productos: Star, Puzzle, Plow Horse, Dog.

### 3.5 Resumen Financiero Consolidado

**Endpoint propuesto**: `GET /business-groups/:groupId/financial-summary`

Revenue, impuestos, propinas, descuentos, métodos de pago.

---

## 4. Sistema de Alertas Inteligentes (Propuesta)

### 4.1 Categorías de alertas

- **Revenue**: meta diaria alcanzada, caída de ventas, mejor día del mes
- **Orders**: cancelación alta, pedidos atrasados, pico inusual
- **Operations**: preparación lenta, sucursal inactiva, resumen de turno
- **Reviews**: reseña negativa, promedio bajó, racha positiva
- **Staff**: nuevo usuario asignado, cambio de rol, sin operadores
- **Milestones**: pedido #N, mejor mes histórico

### 4.2 Resúmenes programados (propuesta futura)

| Frecuencia | Contenido | Canal |
|------------|-----------|-------|
| Diario (8am) | Snapshot del día anterior | Email + WhatsApp |
| Semanal (lunes 9am) | Comparativa por sucursal | Email |
| Mensual (día 1) | P&L simplificado | Email (PDF) |

---

## 5. Archivos Clave

### Base de datos

| Archivo | Descripción |
|---------|-------------|
| `database/agora/migration_supervisor_order_report_template.sql` | Template global genérico + copia a grupos y sucursales |
| `database/agora/migration_notification_recipients.sql` | Tabla de destinatarios supervisores |

### Backend

| Archivo | Cambio |
|---------|--------|
| `apps/backend/src/modules/email-templates/dto/create-email-template.dto.ts` | Enum `SUPERVISOR_NOTIFICATION` |
| `apps/backend/src/modules/email/email.service.ts` | `sendSupervisorNotificationEmail()` genérico |
| `apps/backend/src/modules/orders/orders.service.ts` | `sendSupervisorNotification()` + helpers para detalle de pedido y botón |
| `apps/backend/src/modules/auth/auth.service.ts` | `sendSupervisorRegistrationNotification()` para registro de clientes |
| `apps/backend/src/modules/businesses/businesses.service.ts` | `supervisor_notification` en settings |

### Frontend

| Archivo | Cambio |
|---------|--------|
| `apps/web-local/src/lib/email-templates.ts` | Type `supervisor_notification` |
| `apps/web-local/src/lib/email-templates-constants.ts` | triggerInfo + defaultTemplates genéricos |
| `apps/web-local/src/components/email-templates/EmailTemplatesPanel.tsx` | allTriggers incluye el template |

---

## 6. Prioridades de Implementación

| Prioridad | Feature | Estado |
|-----------|---------|--------|
| P0 | Notificación genérica para supervisores (3 eventos) | Implementado |
| P0 | Dashboard consolidado de grupo | Propuesta |
| P0 | Alertas de cancelación alta y pedidos atrasados | Propuesta |
| P1 | Digest diario por email/WhatsApp | Propuesta |
| P2 | Resumen financiero consolidado | Propuesta |
| P2 | Análisis de menú (menu engineering) | Propuesta |
| P3 | Day-part analysis y heatmap | Propuesta |
| P3 | Alertas de reseñas y milestones | Propuesta |
