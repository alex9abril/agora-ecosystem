# Checkout con KarloPay en tienda embebida (iframe)

## Resumen

Solución para permitir pago con KarloPay cuando la tienda está embebida en un iframe. KarloPay no puede abrirse dentro del iframe por restricciones cross-origin del navegador. La solución hace **breakout**: pide al sitio padre que redirija la ventana principal al checkout standalone.

## Estructura de archivos

```
apps/store-front/
├── src/
│   ├── utils/
│   │   ├── embed.ts           # isEmbedded(), tryBreakoutFromIframe()
│   │   └── postMessage.ts     # safePostMessage(), postOpenTopCheckout(), tipos
│   ├── services/
│   │   └── checkout-embed.ts  # beginCheckout(), buildStandaloneCheckoutUrl()
│   ├── pages/
│   │   ├── checkout.tsx       # Integración del breakout (modificado)
│   │   ├── checkout/
│   │   │   └── session/
│   │   │       └── [sessionId].tsx   # Página standalone de checkout
│   │   └── payment/
│   │       └── return.tsx     # Página de retorno del pago
│   └── ...
└── public/
    └── agora-parent-listener.js   # Script para el sitio padre
```

## Flujo

1. **Usuario en iframe** → Completa checkout, hace clic en "Pagar"
2. **Backend** → Crea orden, devuelve `karlopay_payment_url`, `order_group_id`
3. **Store-front (embebido)** → Detecta iframe, envía `postMessage` al parent con URL `/checkout/session/{order_group_id}`
4. **Sitio padre** → Recibe mensaje, valida origen, redirige `window.location` a esa URL
5. **Página standalone** → Carga `/checkout/session/{sessionId}`, obtiene `paymentUrl` del backend, redirige a KarloPay
6. **KarloPay** → Usuario paga (fuera del iframe)
7. **Retorno** → KarloPay redirige a `/payment/return` o similar; se consulta estado real en backend

## Contrato de mensajes (postMessage)

| Tipo | Dirección | Descripción |
|------|-----------|-------------|
| `AGORA_OPEN_TOP_CHECKOUT` | iframe → parent | Pedir redirección al checkout standalone |
| `AGORA_PING` | iframe → parent | Verificar comunicación |
| `AGORA_PONG` | parent → iframe | Respuesta al ping |
| `AGORA_RESIZE_IFRAME` | iframe → parent | (Futuro) Ajustar tamaño del iframe |

### Payload AGORA_OPEN_TOP_CHECKOUT

```json
{
  "type": "AGORA_OPEN_TOP_CHECKOUT",
  "payload": {
    "url": "https://store.agoramp.mx/checkout/session/uuid",
    "source": "agora-store",
    "sessionId": "uuid",
    "timestamp": 1234567890
  }
}
```

## Configuración

### allowedOrigins (parent)

Orígenes permitidos para recibir mensajes del iframe:

```javascript
window.AGORA_EMBED_CONFIG = {
  allowedIframeOrigins: [
    'https://store.agoramp.mx',
    'https://staging-store.agoramp.mx',
    'http://localhost:3008'
  ],
  allowedRedirectHosts: [
    'agoramp.mx',
    'store.agoramp.mx',
    'staging-store.agoramp.mx',
    'localhost'
  ],
  debug: true
};
```

### allowedRedirectHosts

Hosts permitidos para URLs de redirección (evitar open redirect).

## Endpoints backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders/checkout-session/:orderGroupId` | Obtener sesión (paymentUrl) para checkout standalone. Requiere auth. |
| GET | `/api/payments/karlopay/status/:orderGroupIdOrNumberOfOrder` | Estado real del pago. Requiere auth. |
| POST | `/api/payments/karlopay/webhook/payment` | Webhook KarloPay (existente) |
| POST | `/api/payments/karlopay/confirm-redirect` | Confirmación redirect (existente) |

## Integración en el sitio padre

```html
<!-- Antes del cierre de </body> -->
<script>
  window.AGORA_EMBED_CONFIG = {
    allowedIframeOrigins: ['https://store.agoramp.mx'],
    allowedRedirectHosts: ['store.agoramp.mx', 'agoramp.mx'],
    debug: false
  };
</script>
<script src="https://store.agoramp.mx/agora-parent-listener.js"></script>
```

## Pasos para probar

### Local

1. **Tienda**: `cd apps/store-front && npm run dev` (puerto 3008)
2. **Backend**: `cd apps/backend && npm run start:dev` (puerto 3000)
3. **Página de prueba** (sitio padre): Crear HTML con iframe que apunte a `http://localhost:3008/grupo/tu-slug`
4. Incluir `agora-parent-listener.js` en la página padre
5. Configurar `allowedIframeOrigins: ['http://localhost:3008']`
6. Hacer checkout con tarjeta desde el iframe

### Staging

1. Desplegar store-front y backend
2. En el sitio del cliente, incluir el script con la URL del store staging
3. Agregar el origen del store a `allowedIframeOrigins`

## Checklist de validación

- [ ] Tienda embebida: al pagar, se envía postMessage
- [ ] Parent con listener: redirige a `/checkout/session/{id}`
- [ ] Página standalone: carga, obtiene sesión, redirige a KarloPay
- [ ] KarloPay abre en top window (no en iframe)
- [ ] Retorno: `/payment/return` muestra estado correcto
- [ ] Sin listener: fallback a `window.open` en nueva pestaña
- [ ] Orígenes no permitidos: mensajes ignorados
- [ ] URLs malformadas: no se redirige

## Error "Blocked a frame... from accessing a cross-origin frame"

Si KarloPay muestra este error al intentar setear `onbeforeunload`, significa que **KarloPay se cargó dentro de un iframe**. Su código intenta acceder a `window.top` y el navegador lo bloquea.

**Solución**: El parent listener usa `window.top.location.assign()` para redirigir la ventana superior (no solo el iframe padre). Así, el checkout y KarloPay cargan en top window.

**Requisito**: La página que incluye el script `agora-parent-listener.js` debe poder acceder a `window.top`. Si esa página está en un iframe cross-origin, no podrá redirigir el top. En ese caso, la página del cliente que embebe la tienda debe ser top-level.

## Qué problemas resuelve

1. **Cross-origin en iframe**: KarloPay nunca se abre dentro del iframe; el pago ocurre en top window.
2. **Bloqueo de navegador**: Evita "Blocked a frame with origin X from accessing a cross-origin frame".
3. **Experiencia de pago**: El usuario completa el pago en una ventana/pestaña limpia.
4. **Seguridad**: Validación de orígenes y hosts; no se redirige a URLs arbitrarias.
5. **Fallback**: Si el parent no responde, se abre en nueva pestaña.

## Qué no resuelve (requiere KarloPay)

1. **SDK embebido**: Si KarloPay ofreciera hosted fields o iframe de pago, no sería necesario el breakout. Actualmente no existe.
2. **postMessage desde KarloPay**: Si KarloPay redirige de vuelta a nuestro dominio, el retorno funciona. No hay integración postMessage con KarloPay.
3. **Popup bloqueado**: Si el usuario bloquea popups y el parent no tiene el listener, el fallback `window.open` puede ser bloqueado. Mostrar mensaje claro.
