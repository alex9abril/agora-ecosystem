# 🔐 Sistema de Autenticación y Seguridad - LOCALIA

## 📋 Resumen

Sistema de autenticación implementado usando **Supabase Auth** con **NestJS Guards**. Todos los endpoints están protegidos por defecto, excepto los marcados con el decorador `@Public()`.

---

## 🏗️ Arquitectura

### Componentes Principales

1. **SupabaseAuthGuard**: Guard global que valida tokens JWT de Supabase
2. **@Public()**: Decorador para marcar endpoints públicos
3. **@CurrentUser()**: Decorador para obtener el usuario autenticado
4. **AuthService**: Servicio para operaciones de autenticación
5. **TransformInterceptor**: Interceptor para formatear respuestas
6. **HttpExceptionFilter**: Filtro para manejar errores

---

## 🔒 Cómo Funciona

### 1. Guard Global

Todos los endpoints están protegidos por defecto gracias al `APP_GUARD` configurado en `app.module.ts`:

```typescript
{
  provide: APP_GUARD,
  useClass: SupabaseAuthGuard,
}
```

### 2. Endpoints Públicos

Para hacer un endpoint público, usa el decorador `@Public()`:

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

### 3. Endpoints Protegidos

Los endpoints sin `@Public()` requieren autenticación automáticamente:

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 📝 Ejemplos de Uso

### Endpoint Público

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok' };
  }
}
```

### Endpoint Protegido

```typescript
import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@supabase/supabase-js';

@Controller('orders')
export class OrdersController {
  @Get()
  getOrders(@CurrentUser() user: User) {
    // user está disponible automáticamente
    return {
      userId: user.id,
      email: user.email,
      orders: [],
    };
  }
}
```

### Controller Completo con Mix de Públicos y Protegidos

```typescript
@Controller('orders')
export class OrdersController {
  // Público: Estadísticas generales
  @Public()
  @Get('stats')
  getStats() {
    return { totalOrders: 100 };
  }

  // Protegido: Pedidos del usuario
  @Get()
  getMyOrders(@CurrentUser() user: User) {
    return { userId: user.id, orders: [] };
  }

  // Protegido: Crear pedido
  @Post()
  createOrder(@CurrentUser() user: User, @Body() data: any) {
    return { userId: user.id, order: data };
  }
}
```

---

## 🔑 Autenticación en el Frontend

### Obtener Token de Supabase

```typescript
// En tu app (React Native, Next.js, etc.)
import { supabase } from './supabase-client';

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
});

// Obtener token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Usar Token en Requests

```typescript
// En tus llamadas a la API
const response = await fetch('http://localhost:3000/api/orders', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

---

## 🛡️ Seguridad

### Validación de Tokens

El `SupabaseAuthGuard` valida:
1. ✅ Presencia del token en el header `Authorization`
2. ✅ Formato correcto: `Bearer <token>`
3. ✅ Token válido y no expirado (verificado con Supabase)
4. ✅ Usuario existe y está activo

### Manejo de Errores

- **Sin token**: `401 Unauthorized - Token de autenticación no proporcionado`
- **Token inválido**: `401 Unauthorized - Token inválido o expirado`
- **Usuario no encontrado**: `401 Unauthorized - Token inválido o expirado`

---

## 📊 Formato de Respuestas

### Respuesta Exitosa

```json
{
  "success": true,
  "data": {
    "userId": "123",
    "email": "user@example.com"
  },
  "timestamp": "2024-11-13T10:00:00.000Z"
}
```

### Respuesta de Error

```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2024-11-13T10:00:00.000Z",
  "path": "/api/orders",
  "method": "GET",
  "message": "Token de autenticación no proporcionado"
}
```

---

## 🧪 Testing

### Test de Endpoint Público

```bash
curl http://localhost:3000/api/health
```

### Test de Endpoint Protegido (sin token)

```bash
curl http://localhost:3000/api/auth/me
# Respuesta: 401 Unauthorized
```

### Test de Endpoint Protegido (con token)

```bash
curl -H "Authorization: Bearer TU_TOKEN_AQUI" \
     http://localhost:3000/api/auth/me
```

---

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Estructura de Archivos

```
apps/backend/src/
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts      # @Public()
│   │   └── current-user.decorator.ts # @CurrentUser()
│   ├── guards/
│   │   └── supabase-auth.guard.ts   # Guard de autenticación
│   ├── interceptors/
│   │   └── transform.interceptor.ts  # Formato de respuestas
│   └── filters/
│       └── http-exception.filter.ts  # Manejo de errores
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── auth.controller.ts
│   └── health/
│       └── health.controller.ts
└── app.module.ts
```

---

## 📚 Recursos

- [NestJS Guards](https://docs.nestjs.com/guards)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [JWT Authentication](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## ✅ Checklist de Implementación

- [x] Guard global de autenticación
- [x] Decorador @Public() para endpoints públicos
- [x] Decorador @CurrentUser() para obtener usuario
- [x] Interceptor para formatear respuestas
- [x] Filtro para manejar errores
- [x] Módulo de autenticación
- [x] Ejemplos de uso
- [x] Documentación

---

**Última actualización:** Noviembre 2024

