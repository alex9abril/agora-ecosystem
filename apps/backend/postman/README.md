# 📬 Colección de Postman - LOCALIA API

## 📥 Importar la Colección

1. Abre Postman
2. Click en **Import** (arriba a la izquierda)
3. Selecciona el archivo `LOCALIA-Auth.postman_collection.json`
4. La colección aparecerá en tu workspace

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

**Última actualización:** Noviembre 2024

