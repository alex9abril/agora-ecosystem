# 🔗 Configuración de URLs de Redirección en Supabase

## 📋 Problema

Cuando un usuario confirma su email en Supabase, la plataforma redirige a una URL configurada. Si esta URL no está correctamente configurada, puede redirigir al backend en lugar del frontend.

---

## ✅ Solución

### 1. Configurar URLs de Redirección en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. Configura las siguientes URLs:

#### Site URL
```
http://localhost:3002
```
(URL base de tu aplicación frontend)

#### Redirect URLs
Agrega estas URLs permitidas:

```
http://localhost:3002/auth/callback
http://localhost:3002/auth/reset-password
http://localhost:3002/dashboard
```

Para producción, agrega también:
```
https://tu-dominio.com/auth/callback
https://tu-dominio.com/auth/reset-password
https://tu-dominio.com/dashboard
```

---

## 🔄 Flujo de Confirmación de Email

### 1. Usuario se registra
- Backend crea usuario en Supabase Auth
- Supabase envía email de confirmación

### 2. Usuario hace clic en el enlace del email
- Supabase redirige a: `http://localhost:3002/auth/callback#access_token=...`
- La página `/auth/callback` extrae el token del hash
- Guarda el token en localStorage
- Redirige al dashboard

### 3. Usuario inicia sesión automáticamente
- El token está guardado
- Puede acceder al dashboard

---

## 🔄 Flujo de Recuperación de Contraseña

### 1. Usuario solicita recuperación
- Backend envía email de recuperación
- Supabase genera enlace con token

### 2. Usuario hace clic en el enlace
- Supabase redirige a: `http://localhost:3002/auth/reset-password#access_token=...`
- La página `/auth/reset-password` extrae el token
- Usuario ingresa nueva contraseña
- Se actualiza la contraseña

---

## 📝 Páginas Creadas

### `/auth/callback`
- Maneja la confirmación de email
- Extrae `access_token` del hash de la URL
- Guarda tokens en localStorage
- Redirige al dashboard

### `/auth/reset-password`
- Maneja la actualización de contraseña
- Extrae `access_token` del hash de la URL
- Permite ingresar nueva contraseña
- Actualiza la contraseña en el backend

---

## ⚙️ Configuración en Supabase Dashboard

### Authentication → URL Configuration

```
Site URL: http://localhost:3002

Redirect URLs:
- http://localhost:3002/**
- http://localhost:3002/auth/callback
- http://localhost:3002/auth/reset-password
```

**Nota:** El patrón `/**` permite cualquier ruta bajo el dominio, útil para desarrollo.

---

## 🧪 Probar

1. **Registro:**
   - Registra un nuevo usuario
   - Revisa tu email
   - Haz clic en el enlace de confirmación
   - Deberías ser redirigido a `/auth/callback` y luego al dashboard

2. **Recuperación de contraseña:**
   - Solicita recuperación de contraseña
   - Revisa tu email
   - Haz clic en el enlace
   - Deberías ser redirigido a `/auth/reset-password`
   - Ingresa nueva contraseña

---

## 🔒 Seguridad

- Los tokens en el hash (`#access_token=...`) no se envían al servidor
- Solo el frontend puede leerlos
- Los tokens tienen expiración (1 hora por defecto)
- Los refresh tokens permiten renovar el acceso

---

**Última actualización:** Noviembre 2024

