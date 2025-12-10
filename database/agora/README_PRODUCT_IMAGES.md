# Sistema de Imágenes para Productos

## 📋 Descripción

Este sistema permite gestionar múltiples imágenes por producto, organizadas en Supabase Storage con estructura de carpetas.

## 🗂️ Estructura en Supabase Storage

```
products/
  └── {product_id}/
      ├── image-1234567890-abc123.jpg
      ├── image-1234567891-def456.png
      └── image-1234567892-ghi789.webp
```

**Formato de ruta:** `products/{product_id}/{image_id}.{ext}`

## 🗄️ Base de Datos

### Tabla: `catalog.product_images`

- **id** (UUID): Identificador único de la imagen
- **product_id** (UUID): Referencia al producto
- **file_path** (TEXT): Ruta completa en Storage
- **file_name** (VARCHAR): Nombre original del archivo
- **file_size** (BIGINT): Tamaño en bytes
- **mime_type** (VARCHAR): Tipo MIME (image/jpeg, image/png, etc.)
- **width** (INTEGER): Ancho en píxeles (opcional)
- **height** (INTEGER): Alto en píxeles (opcional)
- **alt_text** (TEXT): Texto alternativo para accesibilidad
- **display_order** (INTEGER): Orden de visualización (0 = primera)
- **is_primary** (BOOLEAN): Si es la imagen principal (solo una por producto)
- **is_active** (BOOLEAN): Si la imagen está activa
- **created_at**, **updated_at** (TIMESTAMP): Fechas de creación y actualización

### Características

- ✅ **Múltiples imágenes por producto**: Sin límite de cantidad
- ✅ **Imagen principal**: Solo una por producto (automático mediante trigger)
- ✅ **Orden de visualización**: Control del orden en la galería
- ✅ **Eliminación en cascada**: Al eliminar un producto, se eliminan sus imágenes
- ✅ **Validación de tipos**: Solo acepta imágenes (JPEG, PNG, WebP, GIF)
- ✅ **Límite de tamaño**: Máximo 10MB por imagen

## 🚀 Instalación

1. **Ejecutar la migración SQL:**
   ```sql
   \i database/agora/migration_product_images.sql
   ```

2. **Crear el bucket en Supabase Storage:**
   - Ve a Supabase Dashboard → Storage
   - Crea un bucket llamado `products`
   - Configura como público si necesitas acceso directo
   - O configura políticas RLS según tus necesidades

3. **Configurar variables de entorno:**
   ```env
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```

## 📡 Endpoints API

### 1. Subir Imagen
```http
POST /api/catalog/products/{productId}/images
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- file: (archivo de imagen)
- alt_text: (opcional) Texto alternativo
- is_primary: (opcional) true/false
- display_order: (opcional) Número de orden
```

**Respuesta:**
```json
{
  "id": "uuid",
  "product_id": "uuid",
  "file_path": "products/{productId}/image-1234567890-abc123.jpg",
  "file_name": "producto.jpg",
  "file_size": 123456,
  "mime_type": "image/jpeg",
  "width": 1920,
  "height": 1080,
  "alt_text": "Imagen del producto",
  "display_order": 0,
  "is_primary": true,
  "is_active": true,
  "public_url": "https://...supabase.co/storage/v1/object/public/products/..."
}
```

### 2. Listar Imágenes de un Producto
```http
GET /api/catalog/products/{productId}/images?includeInactive=false
```

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "product_id": "uuid",
    "file_path": "...",
    "public_url": "https://...",
    "is_primary": true,
    "display_order": 0,
    ...
  }
]
```

### 3. Obtener una Imagen Específica
```http
GET /api/catalog/products/{productId}/images/{imageId}
```

### 4. Actualizar Metadata de Imagen
```http
PATCH /api/catalog/products/{productId}/images/{imageId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "alt_text": "Nuevo texto alternativo",
  "is_primary": true,
  "display_order": 1,
  "is_active": true
}
```

### 5. Eliminar Imagen
```http
DELETE /api/catalog/products/{productId}/images/{imageId}
Authorization: Bearer {token}
```

## 💡 Ejemplos de Uso

### Subir imagen principal
```bash
curl -X POST \
  http://localhost:3000/api/catalog/products/{productId}/images \
  -H "Authorization: Bearer {token}" \
  -F "file=@producto.jpg" \
  -F "is_primary=true" \
  -F "alt_text=Imagen principal del producto"
```

### Subir múltiples imágenes
```bash
# Imagen 1 (principal)
curl -X POST ... -F "file=@imagen1.jpg" -F "is_primary=true" -F "display_order=0"

# Imagen 2
curl -X POST ... -F "file=@imagen2.jpg" -F "display_order=1"

# Imagen 3
curl -X POST ... -F "file=@imagen3.jpg" -F "display_order=2"
```

### Cambiar imagen principal
```bash
curl -X PATCH \
  http://localhost:3000/api/catalog/products/{productId}/images/{imageId} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"is_primary": true}'
```

## 🔒 Seguridad

- ✅ Validación de tipos de archivo (solo imágenes)
- ✅ Límite de tamaño (10MB)
- ✅ Autenticación requerida para subir/actualizar/eliminar
- ✅ Lectura pública (configurable)
- ✅ Validación de permisos en el backend

## 📝 Notas

1. **Organización por carpetas**: Cada producto tiene su propia carpeta en Storage
2. **Nombres únicos**: Los nombres de archivo incluyen timestamp y random string para evitar colisiones
3. **Imagen principal automática**: Si no hay imágenes principales, la primera subida será principal
4. **Orden automático**: Si no se especifica `display_order`, se coloca al final
5. **Eliminación**: Al eliminar una imagen, se elimina tanto de Storage como de la BD

## 🐛 Troubleshooting

### Error: "Supabase Storage no está configurado"
- Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén configurados

### Error: "Bucket 'products' no existe"
- Crea el bucket en Supabase Dashboard → Storage

### Error: "Tipo de archivo no permitido"
- Solo se aceptan: JPEG, JPG, PNG, WebP, GIF

### Error: "El archivo es demasiado grande"
- Límite actual: 10MB por imagen

