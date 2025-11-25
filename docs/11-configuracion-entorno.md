# ⚙️ Configuración de Variables de Entorno - LOCALIA

## 📋 Resumen

Este documento explica cómo configurar las variables de entorno necesarias para el proyecto LOCALIA, especialmente la integración con Supabase.

---

## 🚀 Setup Rápido

### 1. Copiar archivos de ejemplo

```bash
# Desde la raíz del proyecto
cp .env.example .env

# Para el backend específicamente
cp apps/backend/.env.example apps/backend/.env
```

### 2. Obtener credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** → **API**
3. Copia los siguientes valores:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **MUY SENSIBLE**
   - **Connection string** → `DATABASE_URL`

### 3. Completar el archivo `.env`

Edita el archivo `.env` y reemplaza los valores de ejemplo con tus credenciales reales.

---

## 🔑 Variables de Supabase

### SUPABASE_URL
- **Qué es:** URL de tu proyecto Supabase
- **Formato:** `https://[tu-proyecto].supabase.co`
- **Dónde obtenerlo:** Settings → API → Project URL
- **Ejemplo:** `https://abcdefghijklmnop.supabase.co`

### SUPABASE_ANON_KEY
- **Qué es:** Clave pública (segura para usar en frontend)
- **Formato:** JWT token largo
- **Dónde obtenerlo:** Settings → API → Project API keys → `anon` `public`
- **Uso:** Frontend y algunas operaciones del backend

### SUPABASE_SERVICE_ROLE_KEY
- **Qué es:** Clave privada con permisos completos ⚠️
- **Formato:** JWT token largo
- **Dónde obtenerlo:** Settings → API → Project API keys → `service_role` `secret`
- **Uso:** SOLO en backend, NUNCA en frontend
- **⚠️ ADVERTENCIA:** Esta clave puede hacer CUALQUIER operación en tu BD

### DATABASE_URL
- **Qué es:** String de conexión a PostgreSQL
- **Formato:** `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`
- **Dónde obtenerlo:** Settings → Database → Connection string → URI
- **Uso:** Conexión directa a la base de datos

---

## 📁 Estructura de Archivos .env

```
localia-platform/
├── .env                    # Variables globales (raíz)
├── .env.example            # Plantilla global
│
└── apps/
    └── backend/
        ├── .env            # Variables específicas del backend
        └── .env.example    # Plantilla del backend
```

---

## 🔒 Seguridad

### ✅ Buenas Prácticas

1. **NUNCA commitees `.env`**
   - Ya está en `.gitignore`
   - Solo commitea `.env.example`

2. **Protege la Service Role Key**
   - Solo úsala en backend
   - Nunca la expongas en frontend
   - No la compartas públicamente

3. **Rota las keys si se comprometen**
   - Ve a Supabase Dashboard
   - Settings → API → Regenerate keys

4. **Usa diferentes keys por ambiente**
   - Desarrollo: proyecto de desarrollo
   - Producción: proyecto de producción

### ⚠️ Variables Sensibles

Estas variables **NUNCA** deben estar en el código:

- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `CONEKTA_SECRET_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `AWS_SECRET_ACCESS_KEY`
- Cualquier password o token privado

---

## 🛠️ Configuración por Ambiente

### Desarrollo Local

```bash
# .env
NODE_ENV=development
SUPABASE_URL=https://dev-project.supabase.co
LOG_LEVEL=debug
```

### Producción

```bash
# .env (en el servidor)
NODE_ENV=production
SUPABASE_URL=https://prod-project.supabase.co
LOG_LEVEL=error
```

**Recomendación:** Usa un servicio de gestión de secrets (AWS Secrets Manager, Vercel Env, etc.) en producción.

---

## 📝 Variables por Categoría

### 🔐 Autenticación y Base de Datos
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

### 🌐 Servidor
- `PORT`
- `NODE_ENV`
- `API_URL`
- `CORS_ORIGIN`

### 💳 Pagos
- `STRIPE_SECRET_KEY`
- `CONEKTA_SECRET_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`

### 📱 Notificaciones
- `FCM_SERVER_KEY`
- `FCM_PROJECT_ID`

### 📦 Almacenamiento
- `SUPABASE_STORAGE_BUCKET`
- `AWS_S3_BUCKET` (si usas S3)

### 🗺️ Geolocalización
- `GOOGLE_MAPS_API_KEY`
- `MAPBOX_ACCESS_TOKEN`

### 💰 Wallet/LocalCoins
- `WALLET_API_URL`
- `WALLET_API_KEY`

### ⚙️ Configuración de Negocio
- `DELIVERY_RADIUS_METERS`
- `STANDARD_COMMISSION_PERCENTAGE`
- `BRANDED_COMMISSION_PERCENTAGE`

---

## 🧪 Verificar Configuración

### Test de Conexión a Supabase

```typescript
// apps/backend/src/config/supabase.config.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Test de Conexión a BD

```bash
# Desde la terminal
psql $DATABASE_URL

# O desde Node.js
node -e "console.log(process.env.DATABASE_URL)"
```

---

## 📚 Recursos

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Docs - Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables)
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys)

---

## ❓ Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que el archivo `.env` existe
- Verifica que las variables están definidas
- Reinicia el servidor después de cambiar `.env`

### Error: "Invalid API key"
- Verifica que copiaste la key completa
- No debe tener espacios al inicio/final
- Regenera la key si es necesario

### Error: "Connection refused" (DATABASE_URL)
- Verifica el password en la connection string
- Verifica que el proyecto Supabase está activo
- Verifica la región del proyecto

---

**Última actualización:** Noviembre 2024

