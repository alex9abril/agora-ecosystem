# 📚 Swagger - Documentación de API

## 📋 Resumen

Swagger está configurado para documentar automáticamente toda la API de LOCALIA. Proporciona una interfaz interactiva para explorar y probar los endpoints.

---

## 🚀 Acceso a Swagger

Una vez que el servidor esté corriendo:

```
http://localhost:3000/api/docs
```

---

## 🎯 Características

### ✅ Documentación Automática

- Todos los endpoints están documentados automáticamente
- Esquemas de request/response generados automáticamente
- Ejemplos de uso incluidos

### ✅ Autenticación Integrada

- Botón "Authorize" en la interfaz de Swagger
- Permite ingresar el token JWT una vez
- El token se mantiene en sesión (`persistAuthorization: true`)

### ✅ Pruebas Interactivas

- Puedes probar endpoints directamente desde Swagger
- No necesitas Postman o curl
- Respuestas en tiempo real

---

## 🔑 Cómo Usar Swagger

### 1. Acceder a la Documentación

1. Inicia el servidor:
   ```bash
   cd apps/backend
   npm run dev
   ```

2. Abre en el navegador:
   ```
   http://localhost:3000/api/docs
   ```

### 2. Autenticarse

1. Haz clic en el botón **"Authorize"** (🔒) en la parte superior
2. Ingresa tu token JWT de Supabase:
   ```
   Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   O simplemente el token sin "Bearer":
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Haz clic en **"Authorize"** y luego **"Close"**

### 3. Probar Endpoints

1. Expande cualquier endpoint (ej: `GET /api/auth/me`)
2. Haz clic en **"Try it out"**
3. Completa los parámetros si es necesario
4. Haz clic en **"Execute"**
5. Ve la respuesta en tiempo real

---

## 📝 Documentar Nuevos Endpoints

### Ejemplo Básico

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar pedidos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  getOrders() {
    return [];
  }
}
```

### Con DTOs

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del negocio', example: '11111111-1111-1111-1111-111111111111' })
  businessId: string;

  @ApiProperty({ description: 'Items del pedido', type: [OrderItemDto] })
  items: OrderItemDto[];
}

@Post()
@ApiBody({ type: CreateOrderDto })
createOrder(@Body() dto: CreateOrderDto) {
  // ...
}
```

---

## 🏷️ Tags Disponibles

Los endpoints están organizados por tags:

- **auth** - Autenticación
- **health** - Health checks
- **orders** - Pedidos
- **users** - Usuarios
- **businesses** - Negocios
- **products** - Productos
- **repartidores** - Repartidores

---

## 🔧 Configuración

La configuración de Swagger está en `apps/backend/src/main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('LOCALIA API')
  .setDescription('API REST para la plataforma de delivery hiperlocal LOCALIA')
  .setVersion('1.0')
  .addBearerAuth(/* ... */)
  .addTag('auth', 'Endpoints de autenticación')
  // ...
  .build();
```

---

## 📊 Ejemplos de Respuestas

### Respuesta Exitosa

```json
{
  "success": true,
  "data": {
    "id": "123",
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
  "message": "Token de autenticación no proporcionado",
  "timestamp": "2024-11-13T10:00:00.000Z",
  "path": "/api/orders",
  "method": "GET"
}
```

---

## 🧪 Testing con Swagger

### Endpoint Público

1. Expande `GET /api/health`
2. Haz clic en **"Try it out"**
3. Haz clic en **"Execute"**
4. ✅ Deberías ver la respuesta sin necesidad de autenticación

### Endpoint Protegido

1. **Primero autentícate** (ver sección "Autenticarse" arriba)
2. Expande `GET /api/auth/me`
3. Haz clic en **"Try it out"**
4. Haz clic en **"Execute"**
5. ✅ Deberías ver tu perfil de usuario

---

## 📚 Recursos

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)

---

## ✅ Checklist de Documentación

Al agregar un nuevo endpoint, asegúrate de:

- [ ] Agregar `@ApiTags()` al controller
- [ ] Agregar `@ApiOperation()` con summary
- [ ] Agregar `@ApiResponse()` para cada código de estado
- [ ] Agregar `@ApiBearerAuth('JWT-auth')` si requiere autenticación
- [ ] Agregar `@ApiBody()` o `@ApiParam()` si aplica
- [ ] Crear DTOs con `@ApiProperty()` para request/response

---

**Última actualización:** Noviembre 2024

