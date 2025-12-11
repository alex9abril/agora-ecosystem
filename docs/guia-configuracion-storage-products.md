# Guía: Configuración del Bucket 'products' en Supabase Storage

## Problema
El bucket `products` no se encuentra o no es accesible desde el backend, causando el error:
```
Bucket 'products' no encontrado o no accesible: Bucket not found
```

## Solución Paso a Paso

### Opción 1: Crear el Bucket desde el Dashboard (RECOMENDADO)

1. **Accede al Dashboard de Supabase**
   - Ve a tu proyecto en https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navega a Storage**
   - En el menú lateral, haz clic en **"Storage"**
   - Verás la lista de buckets existentes

3. **Crea el Bucket 'products'**
   - Haz clic en el botón **"New bucket"**
   - **Nombre del bucket**: `products` (exactamente así, en minúsculas)
   - **Marca la casilla "Public bucket"** (esto es CRÍTICO para que las URLs públicas funcionen)
   - Haz clic en **"Create bucket"**

4. **Configura las Políticas RLS**
   - Después de crear el bucket, ejecuta el script SQL:
   ```sql
   database/create_and_configure_products_bucket.sql
   ```
   - Este script creará las políticas necesarias para que `service_role` pueda acceder al bucket

5. **Verifica la Configuración**
   - Ejecuta el script de verificación:
   ```sql
   database/verify_bucket_exists.sql
   ```
   - Deberías ver: `✅ CONFIGURACIÓN CORRECTA`

### Opción 2: Crear el Bucket por SQL (si el Dashboard no funciona)

1. **Ejecuta el Script SQL Completo**
   ```sql
   database/create_and_configure_products_bucket.sql
   ```

2. **Verifica que se Creó**
   ```sql
   database/verify_bucket_exists.sql
   ```

3. **Si el bucket no aparece en el Dashboard**
   - Algunas versiones de Supabase requieren crear el bucket manualmente desde el Dashboard
   - Sigue la Opción 1 en este caso

## Configuración del Backend

### 1. Variables de Entorno

Asegúrate de que en `apps/backend/.env` tengas:

```env
# Supabase Storage - Bucket para productos
SUPABASE_STORAGE_BUCKET_PRODUCTS=products

# NO debe ser una URL completa, solo el nombre del bucket
# ❌ INCORRECTO: SUPABASE_STORAGE_BUCKET_PRODUCTS=https://...
# ✅ CORRECTO: SUPABASE_STORAGE_BUCKET_PRODUCTS=products
```

### 2. Reinicia el Backend

Después de configurar las variables de entorno:
```bash
cd apps/backend
npm run start:dev
```

## Verificación Final

### 1. Verifica los Logs del Backend

Al iniciar el backend, deberías ver:
```
🔍 [ProductImagesService] Constructor inicializado
🔍 [ProductImagesService] Bucket configurado: products
🔍 [ProductImagesService] Variable SUPABASE_STORAGE_BUCKET_PRODUCTS (raw): products
```

### 2. Intenta Subir una Imagen

Si todo está configurado correctamente, deberías poder subir imágenes sin errores.

### 3. Si Aún Hay Problemas

Ejecuta el script de verificación:
```sql
database/verify_bucket_exists.sql
```

Y comparte el resultado para diagnosticar el problema.

## Checklist de Verificación

- [ ] El bucket `products` existe en Supabase Storage (verificado en Dashboard)
- [ ] El bucket está marcado como **"Public bucket"**
- [ ] Las políticas RLS están creadas (4 políticas: INSERT, SELECT, UPDATE, DELETE)
- [ ] La variable `SUPABASE_STORAGE_BUCKET_PRODUCTS=products` está en `.env`
- [ ] El backend ha sido reiniciado después de los cambios
- [ ] Los logs del backend muestran el bucket configurado correctamente

## Notas Importantes

1. **El bucket debe ser público**: Si no es público, las URLs públicas no funcionarán y necesitarás usar URLs firmadas.

2. **service_role vs RLS**: Aunque `service_role` bypass RLS en las tablas de la base de datos, **Storage tiene sus propias políticas RLS** que deben configurarse explícitamente.

3. **Nombre del bucket**: Debe ser exactamente `products` (minúsculas, sin espacios, sin caracteres especiales).

4. **Reinicio del backend**: Siempre reinicia el backend después de cambiar variables de entorno o configuraciones de Storage.

