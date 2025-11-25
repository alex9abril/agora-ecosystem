# 🚀 Configuración Rápida de Supabase

## ⚠️ Error Actual
```
"Servicio de autenticación no configurado"
```

Esto significa que las variables de entorno de Supabase no están configuradas correctamente.

---

## 📝 Pasos para Configurar

### 1. Obtener Credenciales de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia estos valores:

#### a) Project URL
- Busca **Project URL**
- Ejemplo: `https://abcdefghijklmnop.supabase.co`
- Copia este valor

#### b) API Keys
- Busca la sección **Project API keys**
- Copia la clave **`anon` `public`** → Esta es `SUPABASE_ANON_KEY`
- Copia la clave **`service_role` `secret`** → Esta es `SUPABASE_SERVICE_ROLE_KEY`
  - ⚠️ **ADVERTENCIA:** Esta clave es muy sensible, no la compartas

---

### 2. Editar el archivo `.env`

Abre el archivo: `apps/backend/.env`

Reemplaza estas líneas con tus valores reales:

```bash
# ANTES (valores de ejemplo):
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...ejemplo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...ejemplo

# DESPUÉS (tus valores reales):
SUPABASE_URL=https://TU-PROYECTO-REAL.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...TU-KEY-REAL
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...TU-KEY-REAL
```

---

### 3. Reiniciar el Servidor

Después de editar el `.env`, reinicia el servidor:

```bash
# Detén el servidor (Ctrl+C)
# Luego inicia de nuevo:
cd apps/backend
npm run dev
```

---

### 4. Verificar que Funciona

Intenta el signup nuevamente:

```bash
POST /api/auth/signup
{
  "email": "alex9abril@gmail.com",
  "password": "AGrijalva123",
  "firstName": "Alejandro",
  "lastName": "Grijalva Antonio",
  "phone": "+525512345678",
  "role": "admin"
}
```

---

## 🔍 Verificar Variables

Si quieres verificar que las variables se están leyendo correctamente, puedes agregar un log temporal en `apps/backend/src/config/supabase.config.ts`:

```typescript
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Faltante');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurado' : '❌ Faltante');
```

---

## ❓ ¿No tienes un Proyecto Supabase?

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta (gratis)
3. Crea un nuevo proyecto
4. Espera a que se configure (2-3 minutos)
5. Sigue los pasos de arriba para obtener las credenciales

---

## 📚 Más Información

Ver documentación completa en: `docs/11-configuracion-entorno.md`

