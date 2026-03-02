# 📬 Colecciones de Postman - AGORA Ecosystem API

## 📥 Importar las Colecciones

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Selecciona los archivos:
   - `LOCALIA-Auth.postman_collection.json` - Endpoints de autenticación
   - `KARLOPAY-Webhook.postman_collection.json` - Webhook de confirmación de pago de KarloPay
4. Las colecciones aparecerán en tu workspace

---

## 📦 Colecciones Disponibles

### 1. LOCALIA - Autenticación
Endpoints de autenticación y gestión de usuarios.

### 2. KarloPay - Webhook de Confirmación de Pago
Endpoints para probar el webhook de confirmación de pago de KarloPay con diferentes escenarios.

---

## 🔧 Configurar Variables de Entorno

### Opción 1: Variables de Colección (Recomendado)

Las variables ya están configuradas en la colección:
- `base_url`: `http://localhost:3000`
- `access_token`: Se guarda automáticamente después del login
- `refresh_token`: Se guarda automáticamente después del login
- `user_id`: Se guarda automáticamente después del login

### Opción 2: Crear Environment en Postman

1. Click en **Environments** (izquierda)
2. Click en **+** para crear nuevo environment
3. Agrega estas variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:3000` | `http://localhost:3000` |
| `access_token` | (vacío) | (vacío) |
| `refresh_token` | (vacío) | (vacío) |
| `user_id` | (vacío) | (vacío) |

4. Selecciona el environment antes de usar la colección

---

## 🚀 Endpoints Incluidos

### 1. Registro (Sign Up)
- **POST** `/api/auth/signup`
- Crea un nuevo usuario
- **Ejemplos incluidos:**
  - Cliente
  - Repartidor
  - Local

### 2. Login (Sign In)
- **POST** `/api/auth/signin`
- Inicia sesión y guarda tokens automáticamente
- **Ejemplos incluidos:**
  - Cliente
  - Repartidor
  - Local

### 3. Recuperar Contraseña
- **POST** `/api/auth/password/reset`
- Solicita email de recuperación

### 4. Actualizar Contraseña
- **POST** `/api/auth/password/update`
- Actualiza contraseña con token

### 5. Refrescar Token
- **POST** `/api/auth/refresh`
- Renueva el accessToken

### 6. Obtener Perfil (Protegido)
- **GET** `/api/auth/me`
- Requiere token JWT

### 7. Cerrar Sesión (Protegido)
- **POST** `/api/auth/signout`
- Requiere token JWT

### 8. Health Check
- **GET** `/api/auth/health`
- Verifica estado del servicio

---

## 📝 Datos de Ejemplo

### Registro - Cliente
```json
{
  "email": "cliente@example.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+525512345678",
  "role": "client"
}
```

### Registro - Repartidor
```json
{
  "email": "repartidor@example.com",
  "password": "password123",
  "firstName": "Carlos",
  "lastName": "González",
  "phone": "+525598765432",
  "role": "repartidor"
}
```

### Registro - Local
```json
{
  "email": "local@example.com",
  "password": "password123",
  "firstName": "María",
  "lastName": "Rodríguez",
  "phone": "+525555555555",
  "role": "local"
}
```

### Login
```json
{
  "email": "cliente@example.com",
  "password": "password123"
}
```

### Recuperar Contraseña
```json
{
  "email": "cliente@example.com"
}
```

### Actualizar Contraseña
```json
{
  "token": "token_del_email_aqui",
  "newPassword": "nuevapassword123"
}
```

---

## 🔄 Flujo de Prueba Recomendado

1. **Health Check** → Verifica que el servidor esté funcionando
2. **Registro** → Crea un nuevo usuario (cliente, repartidor o local)
3. **Login** → Inicia sesión (los tokens se guardan automáticamente)
4. **Obtener Perfil** → Verifica que el token funcione
5. **Refrescar Token** → Renueva el token si es necesario
6. **Cerrar Sesión** → Cierra la sesión

---

## ⚙️ Características Automáticas

- **Auto-guardado de tokens**: Después de login o registro, los tokens se guardan automáticamente en las variables
- **Scripts de prueba**: Cada request tiene scripts que verifican respuestas y guardan datos
- **Variables dinámicas**: Los tokens se actualizan automáticamente

---

## 🐛 Troubleshooting

### Error: "Cannot GET /api/auth/signup"
- Verifica que el servidor esté corriendo en `http://localhost:3000`
- Verifica que `base_url` esté configurado correctamente

### Error: "401 Unauthorized"
- Verifica que el token no haya expirado
- Usa **Refrescar Token** para obtener un nuevo accessToken
- O haz login nuevamente

### Error: "Email already registered"
- El usuario ya existe
- Usa **Login** en lugar de **Registro**
- O cambia el email en el request

### Los tokens no se guardan
- Verifica que los scripts de prueba estén habilitados
- Revisa la consola de Postman (View → Show Postman Console)

---

## 📚 Más Información

- **Swagger UI**: `http://localhost:3000/api/docs`
- **Documentación**: Ver `docs/12-autenticacion-seguridad.md`

---

## 💳 KarloPay - Webhook de Confirmación de Pago

### 📥 Importar la Colección

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Selecciona el archivo `KARLOPAY-Webhook.postman_collection.json`
4. La colección aparecerá en tu workspace

### 🔧 Configurar Variables de Entorno

Las variables ya están configuradas en la colección:
- `base_url`: `http://localhost:3000` (o tu URL de producción)
- `karlopay_ip`: IP de KarloPay para testing (opcional)
- `webhook_signature`: Firma del webhook (opcional, solo si `KARLOPAY_WEBHOOK_SECRET` está configurado)

### 🚀 Endpoints Incluidos

#### 1. Webhook - Confirmación de Pago (Payload Completo)
- **POST** `/api/payments/karlopay/webhook/payment`
- Payload completo con todos los campos del ejemplo proporcionado
- Incluye: `taxData`, `paymentInformation`, `commissions`, `surcharges`, etc.

#### 2. Webhook - Pago Mínimo
- **POST** `/api/payments/karlopay/webhook/payment`
- Solo campos requeridos para pruebas rápidas

#### 3. Webhook - Con Información Fiscal Completa
- **POST** `/api/payments/karlopay/webhook/payment`
- Ejemplo con datos fiscales completos (RFC, régimen fiscal, CFDI)

#### 4. Webhook - Pago con Promoción
- **POST** `/api/payments/karlopay/webhook/payment`
- Ejemplo con `promotion: true`

#### 5. Webhook - Error: IP No Autorizada
- **POST** `/api/payments/karlopay/webhook/payment`
- Prueba del guard de seguridad con IP no autorizada
- Debería retornar 401 si `KARLOPAY_WEBHOOK_ALLOWED_IPS` está configurado

#### 6. Webhook - Error: Firma Inválida
- **POST** `/api/payments/karlopay/webhook/payment`
- Prueba del guard de seguridad con firma inválida
- Debería retornar 401 si `KARLOPAY_WEBHOOK_SECRET` está configurado

#### 7. Webhook - Error: Payload Inválido
- **POST** `/api/payments/karlopay/webhook/payment`
- Prueba de validación con payload inválido
- Debería retornar 400 Bad Request

#### 8. Webhook - Orden No Encontrada
- **POST** `/api/payments/karlopay/webhook/payment`
- Prueba con `numberOfOrder` que no existe
- Retorna 200 OK pero registra warning en logs

### 🔒 Seguridad

El webhook está protegido por:
- **IP Whitelist**: Si `KARLOPAY_WEBHOOK_ALLOWED_IPS` está configurado, solo permite IPs de esa lista
- **Webhook Secret**: Si `KARLOPAY_WEBHOOK_SECRET` está configurado, valida la firma HMAC SHA256
- **Rate Limiting**: 100 requests por minuto por IP

### 📝 Payload de Ejemplo (Completo)

```json
{
  "numberOfOrder": "HXYHR3WL",
  "cardType": "CREDIT MASTERCARD",
  "paymentDate": "2026-02-27T13:44:16",
  "cardDC": "mastercard",
  "bankName": "n/a",
  "bankCode": "999",
  "referenceNumber": null,
  "cardHolder": null,
  "postalCode": "63915",
  "meses": 0,
  "paymentMethod": "PUE",
  "paymentForm": "04",
  "promotion": false,
  "taxData": {
    "socialReason": "zuriel test",
    "postalCodeTax": "63915",
    "RFC": "XAXX010101000",
    "taxRegime": "616",
    "CFDI": "S01",
    "email": "zuriel@karlo.io"
  },
  "paymentInformation": {
    "percentageBaseComission": 0.0175,
    "percentageBaseSurcharge": 0,
    "commissions": {
      "baseComission": 211.83,
      "baseComissionIva": 33.89,
      "baseComissionTotal": 245.72
    },
    "surcharges": {
      "baseSurcharge": 0,
      "baseSurchargeIva": 0,
      "baseSurchargeTotal": 0
    },
    "originalAmount": 12001,
    "totalCommissionForTerminalUse": 103.62,
    "totalCommissionForDeferringToMonths": 0,
    "totalCommissionToCustomer": 103.62,
    "totalCommissionToBusiness": 245.72,
    "totalToDepositBusiness": 11858.9,
    "totalPaymentPerMonth": 12104.62,
    "totalPayment": 12104.62
  },
  "additional": {
    "session_id": "HXYHR3WL",
    "order_group_id": "00000000-0000-0000-0000-000000000001"
  }
}
```

### 🔄 Flujo de Prueba Recomendado

1. **Webhook - Confirmación de Pago (Payload Completo)** → Prueba el flujo completo
2. **Webhook - Pago Mínimo** → Prueba rápida con datos mínimos
3. **Webhook - Error: IP No Autorizada** → Verifica seguridad de IP (si está configurada)
4. **Webhook - Error: Firma Inválida** → Verifica seguridad de firma (si está configurada)
5. **Webhook - Error: Payload Inválido** → Verifica validación de datos

### ⚙️ Configuración del Backend

Para que el webhook funcione correctamente, configura estas variables de entorno:

```env
# IPs permitidas (separadas por coma)
KARLOPAY_WEBHOOK_ALLOWED_IPS=192.168.1.1,10.0.0.1

# Secret para validar firma (opcional)
KARLOPAY_WEBHOOK_SECRET=tu_secret_aqui
```

**Nota:** Si estas variables no están configuradas:
- `KARLOPAY_WEBHOOK_ALLOWED_IPS` vacío → Se permiten todas las IPs (menos seguro)
- `KARLOPAY_WEBHOOK_SECRET` vacío → No se valida la firma

### 🐛 Troubleshooting

#### Error: "401 Unauthorized - IP no autorizada"
- Verifica que `KARLOPAY_WEBHOOK_ALLOWED_IPS` incluya tu IP
- O deshabilita la validación de IP (vaciar la variable)

#### Error: "401 Unauthorized - Firma inválida"
- Verifica que `KARLOPAY_WEBHOOK_SECRET` esté configurado correctamente
- La firma debe calcularse con HMAC SHA256 del body del request
- O deshabilita la validación de firma (vaciar la variable)

#### Error: "400 Bad Request"
- Verifica que el payload tenga el campo `numberOfOrder` (requerido)
- Verifica que el formato JSON sea válido

#### Webhook retorna 200 pero no actualiza la orden
- Verifica que el `numberOfOrder` coincida con el guardado en `payment_transactions.external_reference`
- Revisa los logs del backend para ver si encontró la orden
- Verifica que el `paymentInformation.totalPayment` o `totalToDepositBusiness` esté presente

---

**Última actualización:** Febrero 2025

