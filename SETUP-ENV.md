# 🚀 Setup Rápido de Variables de Entorno

## 📋 Pasos para Configurar

### 1. Obtener Credenciales de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia los siguientes valores:

   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️
   - **Connection string** → `DATABASE_URL` (en Settings → Database)

### 2. Crear Archivo .env

```bash
# Desde la raíz del proyecto
cp env.example .env

# Para el backend específicamente
cp apps/backend/env.example apps/backend/.env
```

### 3. Editar .env con tus Credenciales

Abre `apps/backend/.env` y reemplaza:

```env
SUPABASE_URL=https://tu-proyecto-real.supabase.co
SUPABASE_ANON_KEY=tu-key-anon-real
SUPABASE_SERVICE_ROLE_KEY=tu-key-service-role-real
DATABASE_URL=postgresql://postgres:tu-password@db.tu-proyecto.supabase.co:5432/postgres
```

### 4. Generar JWT Secret

```bash
# Genera un secret seguro para JWT
openssl rand -base64 32
```

Copia el resultado a `JWT_SECRET` en tu `.env`.

### 5. Verificar Configuración

El archivo `apps/backend/src/config/supabase.config.ts` ya está listo para usar estas variables.

## ⚠️ Importante

- **NUNCA** commitees el archivo `.env` (ya está en `.gitignore`)
- **NUNCA** expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend
- Solo usa `SUPABASE_ANON_KEY` en el frontend

## 📚 Documentación Completa

Ver [docs/11-configuracion-entorno.md](./docs/11-configuracion-entorno.md) para más detalles.

