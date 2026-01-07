# Base de Datos - AGORA Refacciones

Este directorio contiene scripts SQL específicos para la transformación del proyecto a venta de refacciones automotrices.

## 📋 Índice de Migraciones

### Migraciones de Estructura
1. `migration_product_types_refacciones.sql` - Tipos de producto
2. `migration_vehicle_compatibility.sql` - Sistema de compatibilidad de vehículos
3. `migration_site_settings.sql` - Configuraciones del sitio
4. `migration_add_sku_to_products.sql` - Campo SKU en productos
5. `migration_business_vehicle_brands.sql` - Relación sucursales-marcas
6. `migration_product_branch_availability.sql` - Disponibilidad por sucursal
7. `migration_branch_fields.sql` - Campos adicionales en sucursales
8. `migration_business_groups.sql` - Grupos empresariales 🆕

### Seeds de Datos
- `seed_toyota_vehicles.sql` - Catálogo de vehículos Toyota
- `seed_refacciones_catalog.sql` - Categorías de productos

## 📁 Archivos

### `seed_refacciones_catalog.sql` ✅ RECOMENDADO

Script principal que crea el catálogo completo de categorías para refacciones.

**Contenido:**
- ✅ **3 categorías principales** (Nivel 1): Refacciones, Accesorios, Instalación
- ✅ **24 categorías específicas** (Nivel 2): 10 de Refacciones, 7 de Accesorios, 4 de Instalación
- ✅ **80+ subcategorías detalladas** (Nivel 3): Organizadas por categoría específica
- ✅ Estructura completa basada en AutoZone con hasta 3 niveles de jerarquía

**Características:**
- ✅ **Idempotente**: Puede ejecutarse múltiples veces de forma segura
- ✅ **Actualización automática**: Si las categorías ya existen, se actualizan en lugar de fallar
- ✅ **UUIDs solo numéricos**: Todos los UUIDs usan solo números (0-9)

**Uso:**
```sql
-- Ejecutar después de schema.sql
\i database/agora/seed_refacciones_catalog.sql
```

**Notas:**
- Las categorías se crean como globales (sin `business_id`)
- Los productos de ejemplo están comentados y requieren un `business_id` válido
- El script incluye consultas de verificación al final
- Si ya existen categorías con los mismos IDs, se actualizarán automáticamente

### `migration_product_types_refacciones.sql` ⚠️ IMPORTANTE

Script de migración que adapta los tipos de producto de alimentos a refacciones.

**Contenido:**
- ✅ Modifica el ENUM `product_type` para incluir tipos de refacciones:
  - `refaccion` - Refacción (pieza de repuesto)
  - `accesorio` - Accesorio (personalización)
  - `servicio_instalacion` - Servicio de Instalación
  - `servicio_mantenimiento` - Servicio de Mantenimiento
  - `fluido` - Fluidos y Lubricantes
- ✅ Configura campos visibles/requeridos para cada tipo de producto
- ✅ Elimina configuraciones antiguas de alimentos

**⚠️ ADVERTENCIA:**
- Este script **recrea** el tipo ENUM `product_type`
- Si hay productos existentes con tipos antiguos, se establecerán en `NULL`
- Se eliminan configuraciones de tipos antiguos (`food`, `beverage`, etc.)

**Uso:**
```sql
-- Ejecutar ANTES de seed_refacciones_catalog.sql
\i database/agora/migration_product_types_refacciones.sql
```

### `migration_add_sku_to_products.sql` 🆕
- ✅ Campo `sku` en `catalog.products`: Código único de identificación del producto
- ✅ Índice único `idx_products_business_sku`: SKU único por negocio
- ✅ Índice de búsqueda `idx_products_sku`: Para búsquedas rápidas por SKU

**Ejecutar:**
```sql
\i database/agora/migration_add_sku_to_products.sql
```

**Funciones disponibles:**
- El SKU es opcional pero recomendado para gestión de inventario
- SKU debe ser único dentro del mismo negocio
- Diferentes negocios pueden tener el mismo SKU

### `migration_product_branch_availability.sql` 🆕

Script de migración que crea la estructura para gestionar la disponibilidad, precio y stock de productos globales por sucursal.

**Contenido:**
- ✅ Tabla `catalog.product_branch_availability`: Relación producto-sucursal con precio y stock
- ✅ Campos: `is_enabled`, `price`, `stock` por sucursal
- ✅ Vista `catalog.products_with_branch_availability` para consultas
- ✅ Funciones helper para obtener disponibilidad
- ✅ Triggers para actualización automática de `updated_at`

**Características:**
- ✅ Permite que productos globales tengan diferentes precios y stock por sucursal
- ✅ Si `price` es NULL, se usa el precio global del producto
- ✅ Si `stock` es NULL, no hay límite de stock para esa sucursal
- ✅ `is_enabled` controla si el producto está disponible en esa sucursal

**Uso:**
```sql
-- Ejecutar después de migration_add_sku_to_products.sql
\i database/agora/migration_product_branch_availability.sql
```

**Funciones disponibles:**
- `catalog.get_product_branch_availability(product_id)`: Obtiene disponibilidad de un producto en todas las sucursales
- `catalog.get_branch_available_products(branch_id)`: Obtiene productos disponibles en una sucursal

**Vista disponible:**
- `catalog.products_with_branch_availability`: Vista que muestra productos con su disponibilidad en cada sucursal

### `migration_site_settings.sql` ✅ RECOMENDADO

Script que crea el sistema genérico y extensible de configuraciones del sitio.

**Contenido:**
- ✅ Tabla `site_settings` - Sistema genérico de configuraciones
- ✅ Funciones útiles para obtener/establecer configuraciones
- ✅ Configuraciones iniciales de impuestos:
  - `taxes.included_in_price` - Si los impuestos están incluidos en el precio
  - `taxes.display_tax_breakdown` - Mostrar desglose de impuestos
  - `taxes.show_tax_included_label` - Mostrar etiqueta "Impuestos incluidos"
- ✅ Configuraciones iniciales de storefront (moneda, símbolo)

**Características:**
- ✅ Sistema extensible para agregar más configuraciones
- ✅ Soporta diferentes tipos de valores (boolean, string, number, object, array)
- ✅ Validación de valores según tipo
- ✅ Agrupación por categorías

**Uso:**
```sql
-- Ejecutar después de migration_vehicle_compatibility.sql
\i database/agora/migration_site_settings.sql
```

### `migration_business_branding.sql` ✅ RECOMENDADO

Script que agrega soporte para personalización de branding tanto a nivel de grupo empresarial como a nivel de sucursal individual.

**Contenido:**
- ✅ Agrega columna `settings` (JSONB) a `core.businesses` para personalización a nivel sucursal
- ✅ Índice GIN para búsquedas eficientes en JSONB
- ✅ Función `core.get_business_branding()` - Obtiene branding completo con herencia del grupo
- ✅ Función `core.get_group_branding()` - Obtiene branding del grupo

**Características:**
- ✅ **Herencia de Branding**: Las sucursales heredan configuración del grupo
- ✅ **Sobrescritura**: Las sucursales pueden sobrescribir valores específicos del grupo
- ✅ **Estructura Flexible**: JSONB permite agregar nuevos campos sin migraciones
- ✅ **Branding Completo**: Logos, colores, fuentes, textos, redes sociales, CSS/JS personalizado

**Estructura de Branding:**
```json
{
  "branding": {
    "logo_url": "...",
    "logo_light_url": "...",
    "logo_dark_url": "...",
    "favicon_url": "...",
    "colors": {
      "primary_color": "#FF5733",
      "secondary_color": "#33C3F0",
      ...
    },
    "fonts": { ... },
    "texts": { ... },
    "social_media": { ... },
    "custom_css": "...",
    "custom_js": "..."
  }
}
```

**Uso:**
```sql
-- Ejecutar después de migration_business_groups.sql
\i database/agora/migration_business_branding.sql
```

**Documentación:** Ver `docs/agora/05-sistema-personalizacion-branding.md`

### `setup_storage_policies_branding.sql` ✅ RECOMENDADO

Script para configurar políticas RLS de Supabase Storage para imágenes de branding.

**Contenido:**
- ✅ Crea el bucket `localia-uploads` si no existe (o usa el configurado en `SUPABASE_STORAGE_BUCKET`)
- ✅ Política para INSERT (subir imágenes de branding)
- ✅ Política para SELECT (lectura pública de imágenes)
- ✅ Política para UPDATE (actualizar imágenes existentes)
- ✅ Política para DELETE (eliminar imágenes)
- ✅ Verificación de políticas creadas

**Características:**
- ✅ **Bucket Público**: Permite acceso directo a las imágenes
- ✅ **Límite de Tamaño**: 5MB por imagen
- ✅ **Tipos Permitidos**: JPEG, JPG, PNG, WebP, SVG
- ✅ **Estructura de Carpetas**: `branding/{type}/{id}/{imageType}-{timestamp}-{random}.{ext}`
- ✅ **Seguridad**: Políticas RLS que solo permiten acceso a la carpeta `branding`

**Uso:**
```sql
-- Ejecutar después de migration_business_branding.sql
\i database/agora/setup_storage_policies_branding.sql
```

**Notas:**
- Ajusta el nombre del bucket si usas uno diferente a `localia-uploads`
- El bucket se configura en la variable de entorno `SUPABASE_STORAGE_BUCKET`
- Las políticas verifican que los archivos estén en la carpeta `branding`

### `migration_business_vehicle_brands.sql` 🆕

Script de migración que crea la relación entre sucursales y marcas de vehículos.

**Contenido:**
- ✅ Tabla `catalog.business_vehicle_brands`: Relación muchos-a-muchos entre sucursales y marcas
- ✅ Funciones auxiliares para consultar marcas por sucursal y viceversa
- ✅ Vista `businesses_with_vehicle_brands` para consultas simplificadas
- ✅ Triggers para actualización automática de timestamps

**Características:**
- ✅ Permite que cada sucursal seleccione múltiples marcas o ninguna
- ✅ Validación de unicidad: una sucursal no puede tener la misma marca duplicada
- ✅ Soft delete: campo `is_active` para desactivar sin eliminar
- ✅ Índices optimizados para consultas frecuentes

**Uso:**
```sql
-- Ejecutar después de migration_vehicle_compatibility.sql
\i database/agora/migration_business_vehicle_brands.sql
```

### `migration_branch_fields.sql` 🆕

Script de migración que agrega campos adicionales a la tabla `core.businesses` (sucursales).

**Contenido:**
- ✅ Campo `accepts_pickup` (BOOLEAN): Indica si la sucursal acepta recolección de productos en la unidad física
- ✅ Campo `slug` (VARCHAR): Identificador amigable para usar en el storefront en lugar del ID
- ✅ Validación de `is_active`: Asegura que el campo existe (ya debería existir)
- ✅ Función `core.generate_slug()`: Genera slugs automáticamente desde nombres
- ✅ Función `core.generate_unique_slug()`: Genera slugs únicos agregando números si es necesario
- ✅ Trigger `trigger_auto_generate_business_slug`: Genera slug automáticamente al crear/actualizar
- ✅ Índice único para `slug` (solo valores no nulos)
- ✅ Actualización automática de slugs para negocios existentes

**Características:**
- ✅ Script idempotente: puede ejecutarse múltiples veces sin errores
- ✅ Generación automática de slugs si no se proporciona uno
- ✅ Validación de unicidad de slugs
- ✅ Los slugs se generan automáticamente desde el nombre del negocio
- ✅ Si un slug ya existe, se agrega un número al final (ej: `sucursal-centro-2`)

**Uso:**
```sql
-- Ejecutar después de schema.sql
\i database/agora/migration_branch_fields.sql
```

**Funciones disponibles:**
- `core.generate_slug(input_text)`: Genera un slug desde un texto
- `core.generate_unique_slug(base_name, exclude_id)`: Genera un slug único para un negocio

**Campos agregados:**
- `accepts_pickup`: BOOLEAN DEFAULT FALSE - Si la sucursal acepta recolección
- `slug`: VARCHAR(255) UNIQUE - Identificador amigable para storefront
- `is_active`: BOOLEAN DEFAULT TRUE - Si la sucursal está activa (validación)

**Funciones disponibles:**
- `catalog.get_business_vehicle_brands(business_id)`: Obtiene marcas de una sucursal
- `catalog.business_commercializes_brand(business_id, brand_id)`: Verifica si una sucursal comercializa una marca
- `catalog.get_businesses_by_vehicle_brand(brand_id)`: Obtiene sucursales que comercializan una marca

**Vista disponible:**
- `catalog.businesses_with_vehicle_brands`: Vista que muestra sucursales con sus marcas en formato JSON

### `setup_storage_policies_sliders.sql` 🆕

Script para configurar políticas RLS de Supabase Storage para la carpeta `sliders/` dentro del bucket `personalizacion`.

**Contenido:**
- ✅ Crea políticas para INSERT, SELECT, UPDATE, DELETE en la carpeta `sliders/`
- ✅ Permite operaciones a `authenticated`, `anon`, y `service_role`
- ✅ SELECT es público para acceso a las imágenes
- ✅ Estructura: `sliders/{type}/{id}/slider-{timestamp}-{random}.{ext}`

**Uso:**
```sql
-- Ejecutar después de setup_storage_policies_branding.sql
\i database/agora/setup_storage_policies_sliders.sql
```

**Nota:** El bucket `personalizacion` ya tiene políticas para `branding/`, este script agrega soporte para `sliders/` en el mismo bucket.

### `migration_business_groups.sql` 🆕

Script de migración que crea la tabla `core.business_groups` para almacenar información de grupos empresariales que son propietarios de múltiples sucursales.

**Contenido:**
- ✅ Crea tabla `core.business_groups` con campos:
  - `id` (UUID PRIMARY KEY)
  - `owner_id` (UUID, referencia a `auth.users`)
  - `name` (VARCHAR(255) NOT NULL) - Nombre comercial del grupo
  - `legal_name` (VARCHAR(255)) - Razón social
  - `slug` (VARCHAR(255) UNIQUE NOT NULL) - URL amigable
  - `description` (TEXT) - Descripción del grupo
  - `logo_url` (TEXT) - URL del logo
  - `website_url` (TEXT) - Sitio web
  - `tax_id` (VARCHAR(50)) - RFC/NIT
  - `settings` (JSONB) - Configuraciones adicionales
  - `is_active` (BOOLEAN DEFAULT TRUE)
  - `created_at`, `updated_at` (TIMESTAMP)
- ✅ Agrega columna `business_group_id` a `core.businesses` (opcional, para mantener compatibilidad)
- ✅ Crea función `core.generate_business_group_slug` para generar slugs automáticamente
- ✅ Crea triggers para slug y `updated_at`
- ✅ Crea índices para optimización
- ✅ Crea vista `core.business_groups_with_branches` con información agregada
- ✅ Crea función `core.get_business_group_by_owner` para consultas rápidas

**Características:**
- ✅ **Grupos Empresariales**: Permite agrupar múltiples sucursales bajo un mismo grupo empresarial
- ✅ **Slug Automático**: Genera slugs únicos automáticamente a partir del nombre
- ✅ **Compatibilidad**: La columna `business_group_id` en `businesses` es opcional, permitiendo migración gradual
- ✅ **Configuraciones Flexibles**: Campo `settings` (JSONB) para configuraciones personalizadas por grupo

**Relación:**
```
auth.users (owner_id) 
  → core.business_groups 
    → core.businesses (business_group_id)
```

**Ejemplo de uso:**
```sql
-- Crear un grupo empresarial
INSERT INTO core.business_groups (owner_id, name, legal_name, tax_id)
VALUES (
  '00000001-0000-0000-0000-000000000001', -- owner_id
  'Grupo Andrade',
  'Grupo Andrade S.A. de C.V.',
  'GAN850101ABC'
);

-- Asignar sucursales al grupo
UPDATE core.businesses
SET business_group_id = (SELECT id FROM core.business_groups WHERE slug = 'grupo-andrade')
WHERE owner_id = '00000001-0000-0000-0000-000000000001';
```

**Uso:**
```sql
-- Ejecutar después de migration_branch_fields.sql
\i database/agora/migration_business_groups.sql
```

### `migration_site_settings.sql` ✅ RECOMENDADO

Script que crea el sistema genérico y extensible de configuraciones del sitio.

**Contenido:**
- ✅ Tabla `site_settings` - Sistema genérico de configuraciones
- ✅ Funciones útiles para obtener/establecer configuraciones
- ✅ Configuraciones iniciales de impuestos:
  - `taxes.included_in_price` - Si los impuestos están incluidos en el precio
  - `taxes.display_tax_breakdown` - Mostrar desglose de impuestos
  - `taxes.show_tax_included_label` - Mostrar etiqueta "Impuestos incluidos"
- ✅ Configuraciones iniciales de storefront (moneda, símbolo)

**Características:**
- ✅ Sistema extensible para agregar más configuraciones
- ✅ Soporta diferentes tipos de valores (boolean, string, number, object, array)
- ✅ Validación de valores según tipo
- ✅ Agrupación por categorías

**Uso:**
```sql
-- Ejecutar después de migration_vehicle_compatibility.sql
\i database/agora/migration_site_settings.sql
```

### `migration_vehicle_compatibility.sql` ✅ RECOMENDADO

Script que crea el sistema completo de compatibilidad de vehículos para refacciones y accesorios.

**Contenido:**
- ✅ **5 tablas principales**:
  - `vehicle_brands` - Marcas de vehículos (Toyota, Honda, etc.)
  - `vehicle_models` - Modelos por marca (Corolla, Civic, etc.)
  - `vehicle_years` - Años/generaciones de modelos
  - `vehicle_specs` - Especificaciones técnicas (motor, transmisión, etc.)
  - `product_vehicle_compatibility` - Relación producto-vehículo
- ✅ **2 funciones útiles**:
  - `check_product_vehicle_compatibility()` - Verifica compatibilidad
  - `get_compatible_vehicles()` - Obtiene vehículos compatibles
- ✅ **Datos iniciales**: 12 marcas y modelos comunes pre-cargados

**Características:**
- ✅ Soporta compatibilidad universal (productos para todos los vehículos)
- ✅ Soporta compatibilidad específica (marca, modelo, año, especificaciones)
- ✅ Índices optimizados para búsquedas rápidas
- ✅ Validaciones y constraints para integridad de datos

**Uso:**
```sql
-- Ejecutar después de migration_product_types_refacciones.sql
\i database/agora/migration_vehicle_compatibility.sql
```

**Documentación:** Ver `docs/agora/03-sistema-compatibilidad-vehiculos.md`

**Orden recomendado:**
1. `migration_product_types_refacciones.sql` (migra tipos de producto)
2. `migration_vehicle_compatibility.sql` (crea sistema de compatibilidad)
3. `migration_site_settings.sql` (crea sistema de configuraciones) ✅
4. `migration_business_groups.sql` (crea grupos empresariales y relación con sucursales) ✅
5. `migration_business_branding.sql` (crea sistema de branding) ✅
6. `setup_storage_policies_branding.sql` (configura políticas de Storage para branding) ✅
7. `migration_branch_fields.sql` (agrega campos adicionales a sucursales)
8. `migration_add_sku_to_products.sql` (agrega campo SKU a productos)
9. `migration_business_vehicle_brands.sql` (crea relación sucursales-marcas)
10. `migration_product_branch_availability.sql` (crea disponibilidad por sucursal)
11. `seed_toyota_vehicles.sql` (pobla catálogo de vehículos Toyota)
12. `seed_refacciones_catalog.sql` (crea categorías)

### `cleanup_old_categories.sql` ⚠️ OPCIONAL

Script opcional para eliminar categorías globales antiguas antes de insertar el nuevo catálogo.

**⚠️ ADVERTENCIA:**
- Elimina TODAS las categorías globales existentes (donde `business_id IS NULL`)
- NO elimina categorías asociadas a negocios específicos
- Los productos asociados quedarán con `category_id = NULL`

**Cuándo usar:**
- Si quieres empezar completamente desde cero
- Si tienes categorías antiguas de comida que quieres eliminar
- Si prefieres una instalación limpia

**Uso:**
```sql
-- Ejecutar ANTES de seed_refacciones_catalog.sql si quieres limpiar
\i database/agora/cleanup_old_categories.sql
\i database/agora/seed_refacciones_catalog.sql
```

## 🔄 Orden de Ejecución Recomendado

### Opción 1: Migración Completa (RECOMENDADO) ✅

```sql
-- Paso 1: Migrar tipos de producto
\i database/agora/migration_product_types_refacciones.sql

-- Paso 2: Crear sistema de compatibilidad de vehículos
\i database/agora/migration_vehicle_compatibility.sql

-- Paso 3: Crear sistema de configuraciones
\i database/agora/migration_site_settings.sql

-- Paso 4: Crear relación sucursales-marcas de vehículos
\i database/agora/migration_business_vehicle_brands.sql

-- Paso 5: Crear catálogo de categorías
\i database/agora/seed_refacciones_catalog.sql
```

### Opción 2: Limpieza Completa + Migración ⚠️

Si quieres empezar completamente desde cero:

```sql
-- Paso 1: Limpiar categorías antiguas
\i database/agora/cleanup_old_categories.sql

-- Paso 2: Migrar tipos de producto
\i database/agora/migration_product_types_refacciones.sql

-- Paso 3: Crear sistema de compatibilidad de vehículos
\i database/agora/migration_vehicle_compatibility.sql

-- Paso 4: Crear sistema de configuraciones
\i database/agora/migration_site_settings.sql

-- Paso 5: Crear relación sucursales-marcas de vehículos
\i database/agora/migration_business_vehicle_brands.sql

-- Paso 6: Crear catálogo de categorías
\i database/agora/seed_refacciones_catalog.sql
```

## 🔍 Verificar Datos

Después de ejecutar los scripts, puedes verificar:

```sql
-- Ver tipos de producto disponibles
SELECT 
    t.typname as tipo,
    e.enumlabel as valor
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'catalog' AND t.typname = 'product_type'
ORDER BY e.enumsortorder;

-- Ver configuraciones de campos por tipo
SELECT 
    product_type::text,
    COUNT(*) as campos_configurados
FROM catalog.product_type_field_config
GROUP BY product_type
ORDER BY product_type;

-- Ver categorías creadas
SELECT 
    pc.name as categoria,
    parent.name as categoria_padre,
    grandparent.name as categoria_principal,
    CASE 
        WHEN pc.parent_category_id IS NULL THEN 'Nivel 1'
        WHEN parent.parent_category_id IS NULL THEN 'Nivel 2'
        ELSE 'Nivel 3'
    END as nivel
FROM catalog.product_categories pc
LEFT JOIN catalog.product_categories parent ON pc.parent_category_id = parent.id
LEFT JOIN catalog.product_categories grandparent ON parent.parent_category_id = grandparent.id
WHERE pc.business_id IS NULL
ORDER BY 
    COALESCE(grandparent.id, parent.id, pc.id),
    COALESCE(parent.display_order, pc.display_order),
    pc.display_order;
```

## 📊 Estructura de Categorías (3 Niveles)

### Nivel 1: Principales
- **Refacciones** (10 categorías nivel 2)
- **Accesorios** (7 categorías nivel 2)
- **Instalación** (4 categorías nivel 2)

### Nivel 2: Refacciones
1. Motor (7 subcategorías)
2. Sistema de Frenos (6 subcategorías)
3. Suspensión y Dirección (6 subcategorías)
4. Sistema Eléctrico (6 subcategorías)
5. Combustible y Emisiones (6 subcategorías)
6. Transmisión y Tren Motriz (5 subcategorías)
7. Control de Clima (5 subcategorías)
8. Carrocería y Exterior (5 subcategorías)
9. Mantenimiento y Fluidos (4 subcategorías)
10. Iluminación (4 subcategorías)

### Nivel 2: Accesorios
1. Audio y Multimedia (4 subcategorías)
2. Iluminación (3 subcategorías)
3. Seguridad (3 subcategorías)
4. Estética y Personalización (4 subcategorías)
5. Confort e Interior (5 subcategorías)
6. Performance (4 subcategorías)
7. Carga y Transporte (3 subcategorías)

### Nivel 2: Instalación
1. Instalación de Refacciones (5 subcategorías)
2. Instalación de Accesorios (4 subcategorías)
3. Servicios de Mantenimiento (4 subcategorías)
4. Diagnóstico y Reparación (4 subcategorías)

**Total**: 3 principales → 24 categorías → 80+ subcategorías

## 📝 Notas Importantes

### Campos Adaptados para Refacciones

Los campos se han adaptado al contexto de refacciones:

- **`variants`** → Se usa para **Compatibilidad de Vehículos** (marca, modelo, año)
- **`nutritional_info`** → Se usa para **Especificaciones Técnicas** (número de parte, garantía, etc.)
- **`allergens`** → NO visible para refacciones (no aplica)
- **`requires_prescription`** → NO visible para refacciones (no aplica)
- **`age_restriction`** → NO visible para refacciones (no aplica)

### Tipos de Producto

Los nuevos tipos de producto son:

1. **Refacción** (`refaccion`) - Piezas de repuesto y componentes
2. **Accesorio** (`accesorio`) - Productos de personalización y mejora
3. **Servicio de Instalación** (`servicio_instalacion`) - Servicios profesionales de instalación
4. **Servicio de Mantenimiento** (`servicio_mantenimiento`) - Servicios de mantenimiento y reparación
5. **Fluidos y Lubricantes** (`fluido`) - Aceites, líquidos y fluidos

## 📝 Próximos Pasos

- Crear productos de ejemplo asociados a negocios
- Adaptar formularios frontend para los nuevos tipos de producto
- Crear migraciones si es necesario para campos adicionales
