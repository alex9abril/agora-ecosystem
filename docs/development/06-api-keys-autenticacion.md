# 🔑 Sistema de API Keys - Autenticación de Aplicaciones

## 📋 Resumen

Sistema de autenticación por **API Keys** separado de la autenticación de usuarios. Permite que múltiples aplicaciones se conecten al backend y rastrea estadísticas de uso por aplicación.

---

## 🏗️ Arquitectura

### Componentes Principales

1. **API Applications**: Registro de aplicaciones que consumen la API
2. **API Keys**: Claves de autenticación por aplicación
3. **API Request Logs**: Registro de todas las peticiones para estadísticas
4. **API Rate Limits**: Control de límites de uso por API key
5. **ApiKeysGuard**: Guard para validar API Keys
6. **ApiLoggingInterceptor**: Interceptor para registrar todas las peticiones

---

## 🗄️ Base de Datos

### Tablas Creadas

1. **`core.api_applications`**
   - Información de las aplicaciones (nombre, tipo, plataforma, versión)
   - Metadata adicional (JSONB)

2. **`core.api_keys`**
   - API Keys (hash SHA-256, nunca en texto plano)
   - Prefijo para identificación
   - Scopes/permisos
   - Rate limits
   - Fecha de expiración

3. **`core.api_request_logs`**
   - Log de todas las peticiones
   - Método, endpoint, status code
   - Tiempo de respuesta
   - IP, User Agent
   - Request/Response body (opcional)

4. **`core.api_rate_limits`**
   - Tracking de rate limits en tiempo real
   - Por ventana de tiempo (minuto, hora, día)

### Vistas Útiles

- **`core.api_application_stats`**: Estadísticas por aplicación
- **`core.api_key_stats`**: Estadísticas por API key

---

## 🚀 Setup

### 1. Crear las Tablas en Supabase

Ejecuta el script SQL:

```bash
# Desde Supabase SQL Editor o psql
\i database/api_keys_schema.sql
```

O copia y pega el contenido de `database/api_keys_schema.sql` en el SQL Editor de Supabase.

### 2. Verificar que las Tablas se Crearon

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'core' 
AND table_name LIKE 'api_%';
```

Deberías ver:
- `api_applications`
- `api_keys`
- `api_request_logs`
- `api_rate_limits`

---

## 🔑 Uso de API Keys

### Crear una Aplicación

```bash
POST /api/api-keys/applications
Authorization: Bearer <JWT_TOKEN>

{
  "name": "App Cliente iOS",
  "description": "Aplicación móvil para clientes en iOS",
  "appType": "mobile-client",
  "platform": "ios",
  "version": "1.0.0"
}
```

### Crear una API Key

```bash
POST /api/api-keys/applications/{applicationId}/keys
Authorization: Bearer <JWT_TOKEN>

{
  "name": "Production Key",
  "description": "API Key para producción",
  "scopes": ["read:orders", "write:orders"],
  "rateLimitPerMinute": 100,
  "rateLimitPerHour": 1000,
  "rateLimitPerDay": 10000
}
```

**Respuesta:**
```json
{
  "apiKey": "locala_abc123def456...",
  "keyData": {
    "id": "...",
    "key_prefix": "locala_abc123def4",
    ...
  }
}
```

⚠️ **IMPORTANTE:** La API key solo se muestra **una vez** al crearla. Guárdala de forma segura.

### Usar la API Key en Requests

#### Opción 1: Header X-API-Key

```bash
curl -H "X-API-Key: locala_abc123def456..." \
     http://localhost:3000/api/orders
```

#### Opción 2: Authorization Bearer

```bash
curl -H "Authorization: Bearer locala_abc123def456..." \
     http://localhost:3000/api/orders
```

---

## 📊 Endpoints Disponibles

### Gestión de Aplicaciones (Requiere JWT de usuario)

- `POST /api/api-keys/applications` - Crear aplicación
- `GET /api/api-keys/applications` - Listar aplicaciones
- `GET /api/api-keys/applications/:id/stats` - Estadísticas de aplicación

### Gestión de API Keys (Requiere JWT de usuario)

- `POST /api/api-keys/applications/:id/keys` - Crear API key
- `GET /api/api-keys/applications/:id/keys` - Listar API keys
- `PUT /api/api-keys/keys/:id/revoke` - Revocar API key

### Endpoints Protegidos con API Key

Usa el decorador `@ApiKeyAuth()` en cualquier controller:

```typescript
@ApiKeyAuth()
@Get('data')
getData(@ApiKey() apiKey: ApiKeyInfo) {
  return {
    message: `Datos para ${apiKey.applicationName}`,
    appType: apiKey.appType,
  };
}
```

---

## 📈 Estadísticas y Tracking

### Ver Estadísticas de una Aplicación

```bash
GET /api/api-keys/applications/{applicationId}/stats
Authorization: Bearer <JWT_TOKEN>
```

**Respuesta:**
```json
{
  "application_id": "...",
  "application_name": "App Cliente iOS",
  "app_type": "mobile-client",
  "total_api_keys": 2,
  "active_api_keys": 1,
  "total_requests": 15420,
  "requests_today": 342,
  "requests_last_hour": 12,
  "avg_response_time_ms": 45.2,
  "error_count": 23,
  "error_rate_percentage": 0.15,
  "last_request_at": "2024-11-13T10:30:00Z"
}
```

### Consultar Logs Directamente en SQL

```sql
-- Requests por aplicación en las últimas 24 horas
SELECT 
  aa.name AS application_name,
  COUNT(*) AS request_count,
  AVG(arl.response_time_ms) AS avg_response_time,
  COUNT(CASE WHEN arl.status_code >= 400 THEN 1 END) AS error_count
FROM core.api_request_logs arl
JOIN core.api_applications aa ON aa.id = arl.application_id
WHERE arl.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY aa.name
ORDER BY request_count DESC;

-- Endpoints más usados
SELECT 
  endpoint,
  method,
  COUNT(*) AS request_count,
  AVG(response_time_ms) AS avg_response_time
FROM core.api_request_logs
WHERE created_at >= CURRENT_DATE
GROUP BY endpoint, method
ORDER BY request_count DESC
LIMIT 10;
```

---

## 🔒 Seguridad

### Almacenamiento de API Keys

- ✅ **Nunca se almacenan en texto plano**
- ✅ Se almacena el **hash SHA-256** de la key
- ✅ Solo se muestra la key **una vez** al crearla
- ✅ Prefijo almacenado para identificación (sin exponer la key completa)

### Validación

- ✅ Verifica que la key existe y está activa
- ✅ Verifica que la aplicación está activa
- ✅ Verifica que la key no está expirada
- ✅ Verifica que la key no está revocada

### Rate Limiting

Cada API key tiene límites configurables:
- Por minuto
- Por hora
- Por día

---

## 🎯 Casos de Uso

### 1. App Cliente Móvil

```typescript
// En tu app móvil
const apiKey = 'locala_abc123...';

const response = await fetch('https://api.localia.mx/api/orders', {
  headers: {
    'X-API-Key': apiKey,
  },
});
```

### 2. App Local Web

```typescript
// En tu app web
const apiKey = 'locala_def456...';

const response = await fetch('https://api.localia.mx/api/orders', {
  headers: {
    'X-API-Key': apiKey,
  },
});
```

### 3. Tracking de Uso

Todas las peticiones se registran automáticamente:
- Qué aplicación hizo la petición
- Qué endpoint
- Cuándo
- Tiempo de respuesta
- Status code
- IP, User Agent, etc.

---

## 📝 Ejemplos

### Crear Aplicación y API Key

```bash
# 1. Crear aplicación
curl -X POST http://localhost:3000/api/api-keys/applications \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "App Cliente iOS",
    "appType": "mobile-client",
    "platform": "ios",
    "version": "1.0.0"
  }'

# Respuesta: { "id": "app-id-123", ... }

# 2. Crear API key para esa aplicación
curl -X POST http://localhost:3000/api/api-keys/applications/app-id-123/keys \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["read:orders", "write:orders"]
  }'

# Respuesta: { "apiKey": "locala_abc123...", "keyData": {...} }
```

### Usar API Key

```bash
# Probar endpoint con API key
curl -X GET http://localhost:3000/api/api-keys/test \
  -H "X-API-Key: locala_abc123..."
```

---

## 🔧 Configuración

### Scopes/Permisos

Los scopes permiten controlar qué puede hacer cada API key:

```typescript
scopes: [
  'read:orders',      // Leer pedidos
  'write:orders',     // Crear/modificar pedidos
  'read:users',       // Leer usuarios
  'write:users',      // Crear/modificar usuarios
  'admin',            // Acceso completo
]
```

### Rate Limits

Configura límites por API key:

```typescript
{
  rateLimitPerMinute: 100,  // 100 requests/minuto
  rateLimitPerHour: 1000,   // 1000 requests/hora
  rateLimitPerDay: 10000,   // 10000 requests/día
}
```

---

## 📊 Dashboard de Estadísticas (Futuro)

Con los datos en `api_request_logs`, puedes crear:

- Dashboard de uso por aplicación
- Gráficas de requests en el tiempo
- Análisis de endpoints más usados
- Detección de anomalías
- Alertas de rate limits

---

## ✅ Checklist de Implementación

- [x] Esquema de base de datos creado
- [x] Tablas: api_applications, api_keys, api_request_logs, api_rate_limits
- [x] Vistas de estadísticas
- [x] ApiKeysService para gestión
- [x] ApiKeysGuard para validación
- [x] ApiLoggingInterceptor para tracking
- [x] Endpoints de gestión (CRUD)
- [x] Documentación Swagger
- [x] Seguridad (hash, no texto plano)

---

**Última actualización:** Noviembre 2024

