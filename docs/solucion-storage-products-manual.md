# Solución Manual para Storage Products

## El Problema

Las políticas SQL se crean pero no funcionan. `personalizacion` funciona porque probablemente se creó desde el Dashboard.

## Solución: Crear Políticas desde el Dashboard

### Paso 1: Ir al Dashboard de Supabase

1. Ve a tu proyecto en Supabase
2. Navega a **Storage** → **Buckets** → **products**
3. Haz clic en la pestaña **Policies**

### Paso 2: Crear las 4 Políticas Manualmente

Crea estas políticas **exactamente** como están en `personalizacion`:

#### Política 1: INSERT (Subir imágenes)

- **Name**: `Allow service role to upload product images`
- **Command**: `INSERT`
- **Target roles**: Selecciona `authenticated`, `anon`, `service_role`
- **Policy definition**:
  ```sql
  (bucket_id = 'products')
  ```

#### Política 2: SELECT (Leer imágenes)

- **Name**: `Allow public read access to product images`
- **Command**: `SELECT`
- **Target roles**: Selecciona `public`, `authenticated`, `anon`, `service_role`
- **Policy definition**:
  ```sql
  (bucket_id = 'products')
  ```

#### Política 3: UPDATE (Actualizar imágenes)

- **Name**: `Allow service role to update product images`
- **Command**: `UPDATE`
- **Target roles**: Selecciona `authenticated`, `anon`, `service_role`
- **Policy definition**:
  ```sql
  (bucket_id = 'products')
  ```

#### Política 4: DELETE (Eliminar imágenes)

- **Name**: `Allow service role to delete product images`
- **Command**: `DELETE`
- **Target roles**: Selecciona `authenticated`, `anon`, `service_role`
- **Policy definition**:
  ```sql
  (bucket_id = 'products')
  ```

### Paso 3: Verificar

Después de crear las políticas, verifica que aparezcan en la lista y que tengan los roles correctos.

### Paso 4: Reiniciar Backend

```bash
cd apps/backend
npm run dev
```

### Paso 5: Probar Subir Imagen

Intenta subir una imagen nuevamente. Debería funcionar ahora.

## ¿Por qué funciona desde el Dashboard?

Supabase Storage puede tener validaciones adicionales cuando se crean políticas desde el Dashboard que no se aplican cuando se crean con SQL directo. El Dashboard también puede configurar metadatos adicionales que no son visibles en `pg_policies`.

## Alternativa: Verificar Políticas de personalizacion

Si quieres ver exactamente cómo están configuradas las políticas de `personalizacion`:

1. Ve a **Storage** → **Buckets** → **personalizacion** → **Policies**
2. Revisa cada política y copia exactamente:
   - El nombre
   - Los roles seleccionados
   - La definición SQL
3. Aplica lo mismo a `products`

