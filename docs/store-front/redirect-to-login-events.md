# Eventos que disparan redirect al login (Store-front)

Documento de referencia: qué acciones o condiciones provocan que el usuario sea redirigido a la página de login.

---

## 1. Respuesta 401 en API + refresh fallido (redirect “de repente”)

**Origen:** `apps/store-front/src/lib/api.ts`

Cuando una petición a un **endpoint que requiere autenticación** devuelve **401**:

1. Se intenta refrescar el token (`tryRefreshToken()`).
2. Si el refresh **falla** (o no hay refresh token), se llama a `handleSessionExpired(needsAuth)`.
3. `handleSessionExpired`:
   - Limpia `auth_token`, `auth_refresh_token`, `auth_user` en `localStorage`.
   - Dispara el evento `auth:session-expired` (AuthContext limpia estado).
   - Si `requiresAuth === true` y la ruta actual **no** es `/auth/login` ni algo bajo `/auth/`, hace **redirect**:
     - Con contexto de tienda: `window.location.href = '/auth/login?redirect=...'`
     - Sin contexto: `window.location.href = '/auth/login'`

**Endpoints que requieren autenticación** (y por tanto pueden provocar este redirect):

| Prefijo del endpoint | Uso típico |
|---------------------|------------|
| `/cart` | Carrito (obtener, agregar, actualizar, eliminar ítems) |
| `/orders` | Listado de pedidos, detalle, checkout, cancelar |
| `/addresses` | Direcciones del usuario (checkout, perfil) |
| `/user-vehicles` | Vehículos del usuario (selector, default) |
| `/auth/me` | Perfil del usuario |
| `/auth/refresh` | Refresco de token (si falla, se llama `handleSessionExpired`) |

Definición en `api.ts`:

```ts
const authRequiredEndpoints = [
  '/cart',
  '/orders',
  '/addresses',
  '/user-vehicles',
  '/auth/me',
  '/auth/refresh',
];
```

**Endpoints públicos** (401 no provoca redirect, solo lanza error):

- `/catalog/products`, `/catalog/vehicles`
- `/businesses/branches`, `/businesses/groups`

Cualquier otro endpoint (ej. `/payments`, `/wallet`, `/logistics`) por defecto **no** se considera “requiere auth” en el cliente, así que un 401 ahí no dispara redirect.

---

## 2. Páginas que exigen estar logueado (redirect al cargar)

Si el usuario **no** está autenticado y entra a estas rutas, se redirige a login en un `useEffect`.

### `/profile` (y subrutas)

- **Archivo:** `apps/store-front/src/pages/profile.tsx`
- **Condición:** `!authLoading && !isAuthenticated`
- **Acción:** `router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath))`

### `/orders`

- **Archivo:** `apps/store-front/src/pages/orders/index.tsx`
- **Condición:** `!authLoading && !isAuthenticated`
- **Acción:** `router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath))`

---

## 3. Evento `auth:session-expired`

**Origen:** solo se dispara desde `handleSessionExpired()` en `api.ts` (cuando hay 401 + refresh fallido en endpoint con auth).

**Quién escucha:** `AuthContext.tsx`

- Listener: `window.addEventListener('auth:session-expired', handleSessionExpired)`.
- Efecto: limpia token, user y storage en el contexto (no hace redirect; el redirect lo hace ya `api.ts` con `window.location.href`).

---

## 4. Enlaces / navegación explícita al login (no “de repente”)

- **Header:** enlaces `href="/auth/login"` (ej. para “Iniciar sesión”).
- **Cart:** botón “Iniciar sesión” con `ContextualLink href="/auth/login"`.
- **Register:** después de registrarse, redirige a login con contexto: `router.push(loginPath)`.
- **Login:** tras login exitoso, redirige a `redirect` query o a home/contexto.

Estos son flujos esperados, no redirects inesperados por 401.

---

## Resumen: qué identificar cuando “de repente” redirige al login

1. **¿Hubo una llamada API justo antes?**  
   Revisar en DevTools → Red si hubo petición a algo que empiece por:
   - `/cart`
   - `/orders`
   - `/addresses`
   - `/user-vehicles`
   - `/auth/me`
   - `/auth/refresh`  
   Si esa petición devolvió **401** y el refresh fallió, ese es el evento que disparó el redirect.

2. **¿Está en `/profile` o `/orders`?**  
   Si no está autenticado, el propio `useEffect` de esa página redirige a login.

3. **Para depurar:** en `api.ts` ya hay `console.log('[API] Sesión expirada, cerrando sesión...')` dentro de `handleSessionExpired`. Revisar en consola si aparece justo antes del redirect.

---

## Cambios útiles para depuración

- En `handleSessionExpired`, loguear el `endpoint` o un identificador de la última petición que causó el 401 (si se pasa por parámetro o variable global).
- En `apiRequest`, antes de `handleSessionExpired(needsAuth)`, loguear `endpoint` y `response.status` para ver qué llamada concreta disparó el redirect.
