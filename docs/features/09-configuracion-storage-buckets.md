# Configuración de Políticas RLS para Supabase Storage Buckets

## 📋 Resumen

Esta guía documenta cómo configurar correctamente las políticas RLS (Row Level Security) para buckets de Supabase Storage, permitiendo que el backend suba archivos usando `service_role` key.

## ✅ Políticas que Funcionan

Después de múltiples intentos, se confirmó que las políticas deben seguir **exactamente** esta estructura, replicando el patrón del bucket `personalizacion` que funciona correctamente.

## 🔧 Script Base

El script `database/recreate_products_policies_exact_copy.sql` contiene la estructura correcta que debe replicarse para cualquier nuevo bucket.

## 📝 Estructura de Políticas Requeridas

Para cada bucket nuevo, se deben crear **4 políticas** con esta estructura exacta:

### 1. Política INSERT (Subir archivos)

```sql
CREATE POLICY "Allow service role to upload [bucket_name] images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = '[nombre_bucket]');
```

**Características:**
- **Nombre**: `"Allow service role to upload [bucket_name] images"`
- **Operación**: `INSERT`
- **Roles permitidos**: `authenticated`, `anon`, `service_role` (sin `public`)
- **Condición**: `bucket_id = '[nombre_bucket]'`

### 2. Política SELECT (Leer/Obtener URLs públicas)

```sql
CREATE POLICY "Allow public read access to [bucket_name] images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]');
```

**Características:**
- **Nombre**: `"Allow public read access to [bucket_name] images"`
- **Operación**: `SELECT`
- **Roles permitidos**: `public`, `authenticated`, `anon`, `service_role`
- **Condición**: `bucket_id = '[nombre_bucket]'`

### 3. Política UPDATE (Actualizar archivos)

```sql
CREATE POLICY "Allow service role to update [bucket_name] images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]')
WITH CHECK (bucket_id = '[nombre_bucket]');
```

**Características:**
- **Nombre**: `"Allow service role to update [bucket_name] images"`
- **Operación**: `UPDATE`
- **Roles permitidos**: `authenticated`, `anon`, `service_role` (sin `public`)
- **Condiciones**: 
  - `USING`: `bucket_id = '[nombre_bucket]'`
  - `WITH CHECK`: `bucket_id = '[nombre_bucket]'`

### 4. Política DELETE (Eliminar archivos)

```sql
CREATE POLICY "Allow service role to delete [bucket_name] images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]');
```

**Características:**
- **Nombre**: `"Allow service role to delete [bucket_name] images"`
- **Operación**: `DELETE`
- **Roles permitidos**: `authenticated`, `anon`, `service_role` (sin `public`)
- **Condición**: `bucket_id = '[nombre_bucket]'`

## 🎯 Reglas Importantes

### Roles por Operación

| Operación | Roles Permitidos | ¿Incluye `public`? |
|-----------|------------------|-------------------|
| **INSERT** | `authenticated`, `anon`, `service_role` | ❌ NO |
| **SELECT** | `public`, `authenticated`, `anon`, `service_role` | ✅ SÍ |
| **UPDATE** | `authenticated`, `anon`, `service_role` | ❌ NO |
| **DELETE** | `authenticated`, `anon`, `service_role` | ❌ NO |

### Nombres de Políticas

Los nombres deben seguir este patrón descriptivo:
- `"Allow service role to upload [bucket_name] images"`
- `"Allow public read access to [bucket_name] images"`
- `"Allow service role to update [bucket_name] images"`
- `"Allow service role to delete [bucket_name] images`

**Ejemplo para bucket `products`:**
- `"Allow service role to upload product images"`
- `"Allow public read access to product images"`
- `"Allow service role to update product images"`
- `"Allow service role to delete product images"`

### Condiciones

- **INSERT**: Solo requiere `WITH CHECK (bucket_id = '[nombre_bucket]')`
- **SELECT**: Solo requiere `USING (bucket_id = '[nombre_bucket]')`
- **UPDATE**: Requiere tanto `USING` como `WITH CHECK` con la misma condición
- **DELETE**: Solo requiere `USING (bucket_id = '[nombre_bucket]')`

## 📋 Template para Nuevo Bucket

Para crear políticas para un nuevo bucket, usa este template:

```sql
-- ============================================================================
-- Configurar políticas RLS para bucket: [NOMBRE_BUCKET]
-- ============================================================================

-- 1. INSERT
DROP POLICY IF EXISTS "Allow service role to upload [nombre_bucket] images" ON storage.objects;

CREATE POLICY "Allow service role to upload [nombre_bucket] images"
ON storage.objects
FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = '[nombre_bucket]');

-- 2. SELECT
DROP POLICY IF EXISTS "Allow public read access to [nombre_bucket] images" ON storage.objects;

CREATE POLICY "Allow public read access to [nombre_bucket] images"
ON storage.objects
FOR SELECT
TO public, authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]');

-- 3. UPDATE
DROP POLICY IF EXISTS "Allow service role to update [nombre_bucket] images" ON storage.objects;

CREATE POLICY "Allow service role to update [nombre_bucket] images"
ON storage.objects
FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]')
WITH CHECK (bucket_id = '[nombre_bucket]');

-- 4. DELETE
DROP POLICY IF EXISTS "Allow service role to delete [nombre_bucket] images" ON storage.objects;

CREATE POLICY "Allow service role to delete [nombre_bucket] images"
ON storage.objects
FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = '[nombre_bucket]');
```

## 🔍 Verificación

Después de crear las políticas, verifica que se crearon correctamente:

```sql
SELECT 
  policyname,
  cmd as operacion,
  roles::text as roles_permitidos,
  qual::text as condicion_using,
  with_check::text as condicion_with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    qual::text LIKE '%[nombre_bucket]%' 
    OR with_check::text LIKE '%[nombre_bucket]%'
    OR policyname LIKE '%[nombre_bucket]%'
  )
ORDER BY cmd, policyname;
```

## ⚠️ Problemas Comunes y Soluciones

### Problema: "Bucket not found" aunque el bucket existe

**Causa**: Las políticas no incluyen `service_role` o están mal configuradas.

**Solución**: 
1. Elimina todas las políticas existentes del bucket
2. Recrea las 4 políticas usando el template de arriba
3. Asegúrate de que los roles sean exactamente como se especifica

### Problema: Las políticas muestran solo `{public}` en `pg_policies`

**Causa**: Esto es un problema de visualización en PostgreSQL. Las políticas pueden tener más roles de los que muestra la consulta.

**Solución**: Verifica que las políticas se crearon con la sintaxis correcta `TO authenticated, anon, service_role`. Aunque la consulta muestre solo `{public}`, si la sintaxis es correcta, las políticas funcionarán.

### Problema: `service_role` no puede subir archivos

**Causa**: 
1. Las políticas no incluyen `service_role` en el `TO` clause
2. El backend no está usando `service_role` key correctamente

**Solución**:
1. Verifica que las políticas incluyan `service_role` en el `TO` clause
2. Verifica que el backend esté usando `SUPABASE_SERVICE_ROLE_KEY` correctamente
3. Reinicia el backend después de crear las políticas

## 📚 Referencias

- Script original que funciona: `database/agora/setup_storage_policies_branding.sql` (bucket `personalizacion`)
- Script que replicó la solución: `database/recreate_products_policies_exact_copy.sql` (bucket `products`)
- Template reutilizable: `database/template_new_bucket_policies.sql`

## ✅ Checklist para Nuevo Bucket

- [ ] Bucket creado en Supabase Storage
- [ ] Bucket configurado como público (si se requiere acceso público)
- [ ] 4 políticas creadas (INSERT, SELECT, UPDATE, DELETE)
- [ ] Políticas con nombres descriptivos siguiendo el patrón
- [ ] Roles correctos según la tabla de arriba
- [ ] Condiciones correctas (`bucket_id = '[nombre_bucket]'`)
- [ ] Políticas verificadas con consulta SQL
- [ ] Backend reiniciado después de crear políticas
- [ ] Prueba de subida de archivo exitosa

## 🔄 Proceso Completo

1. **Crear el bucket** (si no existe):
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     '[nombre_bucket]',
     '[nombre_bucket]',
     true, -- o false según se requiera
     10485760, -- 10MB (ajustar según necesidad)
     ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
   )
   ON CONFLICT (id) DO NOTHING;
   ```

2. **Eliminar políticas existentes** (si las hay):
   ```sql
   DO $$
   DECLARE
     policy_record RECORD;
   BEGIN
     FOR policy_record IN 
       SELECT policyname 
       FROM pg_policies 
       WHERE schemaname = 'storage' 
         AND tablename = 'objects'
         AND (
           qual::text LIKE '%[nombre_bucket]%' 
           OR with_check::text LIKE '%[nombre_bucket]%'
           OR policyname LIKE '%[nombre_bucket]%'
         )
     LOOP
       EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
     END LOOP;
   END $$;
   ```

3. **Crear las 4 políticas** usando el template de arriba

4. **Verificar** con la consulta de verificación

5. **Reiniciar el backend**

6. **Probar** subiendo un archivo

## 📝 Notas Finales

- **Importante**: Las políticas deben crearse exactamente como se especifica. Cualquier variación puede causar que no funcionen.
- **service_role**: Aunque `service_role` normalmente bypass RLS en tablas de base de datos, en Supabase Storage **SÍ requiere políticas explícitas**.
- **Nombres descriptivos**: Usar nombres descriptivos ayuda a identificar las políticas en el Dashboard de Supabase.
- **Orden no importa**: Las políticas pueden crearse en cualquier orden, pero es recomendable seguir el orden: INSERT, SELECT, UPDATE, DELETE.

---

**Anterior:** [23. Proceso de Seguimiento de Pedidos y Políticas de Postventa](./23-proceso-seguimiento-pedidos-postventa.md)

**Siguiente:** (Próximo documento en la secuencia)

**Volver al inicio:** [README Principal](./README.md)

