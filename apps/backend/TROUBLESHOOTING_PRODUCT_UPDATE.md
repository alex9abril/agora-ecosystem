# Troubleshooting: Error 500 en PATCH /api/catalog/products/:id

## 🔍 Diagnóstico del Error

Si estás recibiendo un error 500 al actualizar un producto, sigue estos pasos:

### 1. Verificar Logs del Servidor

El servidor ahora muestra información detallada del error. Revisa los logs para ver:
- El mensaje de error completo
- El código de error de PostgreSQL
- Los valores que se intentaron actualizar
- El query SQL que se ejecutó

### 2. Errores Comunes y Soluciones

#### Error: "Producto con ID X no encontrado"
**Causa:** El ID del producto no existe en la base de datos.
**Solución:** Verifica que el ID sea correcto y que el producto exista.

#### Error: "Ya existe un producto con este SKU en este negocio"
**Causa:** Estás intentando asignar un SKU que ya está en uso.
**Solución:** Usa un SKU diferente o deja el campo vacío/null.

#### Error: "La categoría especificada no existe"
**Causa:** El `category_id` proporcionado no existe.
**Solución:** Verifica que el `category_id` sea un UUID válido y que la categoría exista.

#### Error: "Referencia inválida: uno de los valores proporcionados no existe"
**Causa:** Algún campo con foreign key referencia un registro que no existe.
**Solución:** Verifica que todos los IDs referenciados existan.

#### Error: "Faltan campos requeridos"
**Causa:** Se intentó establecer un campo NOT NULL como null.
**Solución:** Asegúrate de proporcionar todos los campos requeridos.

### 3. Verificar Configuración de Supabase Storage

Si el error está relacionado con imágenes:

1. **Verificar variables de entorno:**
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   SUPABASE_STORAGE_BUCKET_PRODUCTS=products  # Opcional, default: 'products'
   ```

2. **Verificar que el bucket existe:**
   - Ve a Supabase Dashboard → Storage
   - Verifica que existe un bucket llamado `products` (o el nombre que configuraste)
   - Verifica que el bucket esté configurado como público o con las políticas RLS correctas

3. **Verificar permisos:**
   - El `SUPABASE_SERVICE_ROLE_KEY` debe tener permisos para escribir en Storage
   - Verifica que la key sea correcta y no haya expirado

### 4. Debugging

Para obtener más información del error:

1. **Revisa los logs del servidor:**
   ```bash
   # En la consola del servidor deberías ver:
   🔍 [UPDATE] Query SQL: ...
   🔍 [UPDATE] Valores a actualizar: ...
   ❌ Error actualizando producto: { message, code, detail, hint }
   ```

2. **Verifica el payload que estás enviando:**
   - Asegúrate de que todos los campos sean del tipo correcto
   - Los UUIDs deben estar en formato válido
   - Los números deben ser números, no strings
   - Los booleans deben ser true/false, no strings

3. **Prueba con un payload mínimo:**
   ```json
   {
     "name": "Nuevo nombre"
   }
   ```

### 5. Verificar la Base de Datos

Ejecuta esta query para verificar que el producto existe:

```sql
SELECT * FROM catalog.products WHERE id = '00000001-0000-0000-0000-000000000023';
```

Si no existe, ese es el problema.

### 6. Verificar la Estructura de la Tabla

Asegúrate de que la tabla tenga todas las columnas necesarias:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'catalog' 
  AND table_name = 'products'
ORDER BY ordinal_position;
```

## 📝 Ejemplo de Request Correcto

```http
PATCH /api/catalog/products/00000001-0000-0000-0000-000000000023
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Producto Actualizado",
  "price": 150.00,
  "is_available": true
}
```

## 🔧 Si el Error Persiste

1. **Revisa los logs completos del servidor** - Ahora incluyen más información
2. **Verifica la conexión a la base de datos** - Asegúrate de que DATABASE_URL esté correcto
3. **Verifica que la migración de imágenes se haya ejecutado** - Si estás usando el sistema de imágenes
4. **Contacta al equipo de desarrollo** con:
   - El ID del producto que intentaste actualizar
   - El payload completo que enviaste
   - Los logs del servidor
   - El código de error específico


