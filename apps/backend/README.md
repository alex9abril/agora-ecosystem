# ⚙️ LOCALIA Backend API

Backend API construido con NestJS y Supabase.

## 🔐 Sistema de Autenticación

### Características

- ✅ **Protección por defecto**: Todos los endpoints requieren autenticación
- ✅ **Endpoints públicos**: Usa `@Public()` para hacer endpoints públicos
- ✅ **Usuario actual**: Usa `@CurrentUser()` para obtener el usuario autenticado
- ✅ **Validación automática**: Tokens JWT de Supabase validados automáticamente

### Ejemplos

#### Endpoint Público

```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

#### Endpoint Protegido

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

## 🚀 Setup

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp env.example .env
# Editar .env con tus credenciales de Supabase
```

3. Ejecutar en desarrollo:
```bash
npm run dev
```

## 📚 Documentación

- [Configuración de Entorno](../docs/11-configuracion-entorno.md)
- [Sistema de Autenticación](../docs/12-autenticacion-seguridad.md)

## 🔗 Endpoints

### Públicos
- `GET /api/health` - Health check
- `GET /api/auth/health` - Auth service health

### Protegidos (requieren token)
- `GET /api/auth/me` - Perfil del usuario autenticado
- `GET /api/auth/check-role/:role` - Verificar rol del usuario

## 🧪 Testing

### Test de endpoint público
```bash
curl http://localhost:3000/api/health
```

### Test de endpoint protegido
```bash
# Obtener token de Supabase primero, luego:
curl -H "Authorization: Bearer TU_TOKEN" \
     http://localhost:3000/api/auth/me
```

