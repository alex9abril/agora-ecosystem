# Karlopay: Modos Redirect y Embedded

## Resumen de hallazgos de la integración actual

### Flujo existente (redirect)
1. **Checkout** (`apps/store-front/src/pages/checkout.tsx`): Usuario selecciona "Tarjeta de crédito/débito" o "Pago directo a sucursal" (karlopay-branch).
2. **Backend** (`apps/backend/src/modules/orders/orders.service.ts`): Al crear la orden, llama a `karlopayService.createOrUpdateOrder()` con `redirectUrl` construida por `integrationsService.buildKarlopayRedirectUrl()`.
3. **Karlopay API**: `POST /api/orders/create-or-update` devuelve `urlPayment` (ej: `short.karlo.io/get?id=...`).
4. **Frontend**: Recibe `karlopay_payment_url` y hace `window.location.href = paymentUrl`.
5. **Retorno**: Karlopay redirige al usuario a `karlopay-redirect?session_id=...`; la página llama `POST /payments/karlopay/confirm-redirect`.
6. **Webhook**: Karlopay envía `POST /payments/karlopay/webhook/payment` con el resultado del pago; el backend actualiza `payment_transactions` y `orders.payment_status`.

### Configuración por sucursal y grupo
- **Ubicación**: `core.businesses.settings.karlopay` (sucursal) y `core.business_groups.settings.karlopay` (grupo).
- **Resolución**: Al hacer checkout, el backend busca credenciales en este orden: 1) sucursal, 2) grupo (si la sucursal pertenece a uno), 3) globales. Así, si configuras Karlopay en Integraciones del grupo, las sucursales del grupo heredan esa configuración.
- **Campos**: `enabled`, `environment` (dev/prod), `dev`/`prod` con `domain`, `login_endpoint`, `orders_endpoint`, `auth_email`, `auth_password`, `redirect_url`.
- **API**: `GET/PUT /businesses/branch/:id/karlopay-settings`, `GET/PUT /businesses/branches/id/:id/karlopay-settings` (público para checkout).

### SDK/Embedded
- **No existe** evidencia de SDK, widget embebido o hosted fields de Karlopay en el proyecto.
- La documentación pública (api2.karlopay.com) no muestra endpoints de tokenización o embedded.
- Se implementó arquitectura preparada con fallback a redirect.

---

## Lista de archivos modificados

### Backend
- `apps/backend/src/modules/businesses/businesses.service.ts` – `mode` en DEFAULT_KARLOPAY_SETTINGS y updateDto
- `apps/backend/src/modules/businesses/dto/update-business-karlopay-settings.dto.ts` – campo `mode`
- `apps/backend/src/modules/settings/integrations.service.ts` – `integrationMode` en KarlopayCredentials
- `apps/backend/src/modules/payments/karlopay/karlopay.service.ts` – `getIntegrationMode`, `createPaymentSession`, `initEmbeddedSession`, `getPaymentStatus`, `integrationMode` en credenciales
- `apps/backend/src/modules/payments/karlopay/karlopay.controller.ts` – endpoints `session`, `embedded/init`, `status`
- `apps/backend/src/modules/orders/orders.service.ts` – respuesta con `karlopay_mode`, `karlopay_order_group_id`, `karlopay_number_of_order`

### Nuevos archivos backend
- `apps/backend/src/modules/payments/karlopay/interfaces/payment-strategy.interface.ts`
- `apps/backend/src/modules/payments/karlopay/dto/create-payment-session.dto.ts`
- `apps/backend/src/modules/payments/karlopay/dto/embedded-init.dto.ts`

### Frontend (store-front)
- `apps/store-front/src/pages/checkout.tsx` – estado `karlopayPaymentData`, flujo embedded, componente KarlopayCheckout
- `apps/store-front/src/components/checkout/KarlopayCheckout.tsx` – **nuevo**

### Frontend (web-local)
- `apps/web-local/src/lib/business.ts` – `BranchKarlopaySettings` con `mode` y `KarlopayMode`
- `apps/web-local/src/pages/settings/branches.tsx` – selector de modo en BranchKarlopaySettings

---

## Nueva arquitectura

### Capa de abstracción
- **Interfaces** (`payment-strategy.interface.ts`): `CreatePaymentSessionInput`, `CreatePaymentSessionResult`, `EmbeddedPaymentConfig`, `PaymentStatusResult`, `BranchPaymentSettings`.
- **KarlopayRedirectStrategy**: Flujo actual (createOrUpdateOrder → urlPayment → redirect).
- **KarlopayEmbeddedStrategy**: Adapter stub; cuando Karlopay ofrezca SDK, se implementará aquí.

### Endpoints API
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/payments/karlopay/session` | Crear sesión (redirect o embedded) |
| POST | `/payments/karlopay/embedded/init` | Inicializar pago embebido (stub: fallback a redirect) |
| GET | `/payments/karlopay/status/:orderGroupIdOrNumberOfOrder` | Consultar estado de pago |
| POST | `/payments/karlopay/webhook/payment` | Webhook (existente) |
| POST | `/payments/karlopay/confirm-redirect` | Confirmación redirect (existente) |

### Flujo por modo
- **redirect**: Igual que antes; checkout devuelve `karlopay_payment_url`, frontend redirige.
- **embedded**: Checkout devuelve `karlopay_mode: 'embedded'`; frontend muestra KarlopayCheckout → llama `embedded/init` → recibe `fallbackToRedirect` → redirige a `urlPayment`.

---

## Pasos de migración

### Esquema/config
- No hay migraciones SQL; `mode` se guarda en `settings.karlopay.mode` (JSONB existente).
- Configuraciones actuales sin `mode` se tratan como `redirect` por defecto.

### Configuración por sucursal
1. En web-local: Configuración → Sucursales → [Sucursal] → Karlopay.
2. Nuevo campo "Modo de integración": Redirect | Embedded.
3. Guardar; el valor se persiste en `core.businesses.settings` o `core.business_groups.settings`.

---

## Riesgos y bloqueos

### Karlopay no ofrece SDK/widget embebido oficial
- El modo embedded está preparado pero hace fallback a redirect.
- Para activar embedded real se necesita:
  - SDK/script oficial de Karlopay para hosted fields o iframe.
  - Endpoint de tokenización o sesión embebida.
  - Documentación de eventos (postMessage, callbacks).

### Dato faltante del proveedor
- URL del script del widget (si existe).
- Parámetros de inicialización (sessionId, clientSecret, publicKey, etc.).
- Contrato de eventos para éxito/error/cancelación.

---

## Cómo ver el cambio (modo embedded)

Para que se muestre el overlay "Iniciando pago..." / "Redirigiendo a la pasarela de pago..." antes de ir a Karlopay:

1. **Configurar la sucursal** en web-local: Configuración → Sucursales → [tu sucursal] → Karlopay.
2. **Activar** Karlopay y elegir **"Modo de integración: Embedded"**.
3. **Guardar**.
4. En el store-front, agregar productos **de esa sucursal** al carrito y hacer checkout.
5. Seleccionar "Tarjeta de crédito/débito" (o "Pago directo a sucursal" si solo esa sucursal tiene Karlopay).
6. Al hacer clic en "Realizar Pedido" deberías ver el overlay ~1.5 s antes de redirigir.

**Nota**: Si usas "Tarjeta" con config global (ninguna sucursal tiene Karlopay), siempre redirige de inmediato. El modo embedded solo aplica cuando la sucursal del carrito tiene Karlopay configurado con mode: embedded.

---

## Checklist de pruebas manuales

- [ ] **Redirect (modo por defecto)**
  - [ ] Sucursal con Karlopay habilitado, modo redirect.
  - [ ] Checkout con tarjeta → redirección a Karlopay.
  - [ ] Pago exitoso → retorno a karlopay-redirect → pedido confirmado.
  - [ ] Webhook actualiza payment_status correctamente.

- [ ] **Embedded (fallback)**
  - [ ] Sucursal con modo embedded.
  - [ ] Checkout con tarjeta → aparece "Iniciando pago..." → redirección a Karlopay.
  - [ ] Mismo flujo de pago y webhook que redirect.

- [ ] **Configuración**
  - [ ] Cambiar modo en BranchKarlopaySettings y guardar.
  - [ ] Verificar que el modo se persiste y se usa en checkout.

- [ ] **Status**
  - [ ] `GET /payments/karlopay/status/:orderGroupId` devuelve estado correcto.

- [ ] **Compatibilidad**
  - [ ] Checkout con wallet + tarjeta secundaria funciona igual.
  - [ ] Configuración por grupo (business-groups) incluye modo.
