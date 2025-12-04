# Sistema de Compatibilidad de Vehículos

## 📋 Resumen Ejecutivo

Este documento describe el sistema de compatibilidad de vehículos para refacciones y accesorios en AGORA. El sistema permite determinar qué productos son compatibles con qué vehículos específicos, basándose en marca, modelo, año, motor y otras características.

## 🎯 Objetivo

Permitir que cada refacción y accesorio pueda ser clasificado y asociado con vehículos específicos, asegurando que los clientes solo vean y puedan comprar productos compatibles con su vehículo.

## 🏗️ Arquitectura del Sistema

### Modelo de Datos

El sistema utiliza un modelo jerárquico de vehículos:

```
Marca (Brand)
  └── Modelo (Model)
      └── Año/Generación (Year/Generation)
          └── Motor/Transmisión (Engine/Transmission)
```

### Tablas Principales

#### 1. `catalog.vehicle_brands` - Marcas de Vehículos
Almacena las marcas de vehículos (Toyota, Honda, Nissan, etc.)

**Campos:**
- `id` - UUID único
- `name` - Nombre de la marca (ej: "Toyota")
- `code` - Código único de la marca (ej: "TOYOTA")
- `is_active` - Si la marca está activa
- `display_order` - Orden de visualización

#### 2. `catalog.vehicle_models` - Modelos de Vehículos
Almacena los modelos de cada marca (Corolla, Civic, Sentra, etc.)

**Campos:**
- `id` - UUID único
- `brand_id` - Referencia a la marca
- `name` - Nombre del modelo (ej: "Corolla")
- `code` - Código único del modelo
- `is_active` - Si el modelo está activo
- `display_order` - Orden de visualización

#### 3. `catalog.vehicle_years` - Años/Generaciones
Almacena los años o generaciones de cada modelo

**Campos:**
- `id` - UUID único
- `model_id` - Referencia al modelo
- `year_start` - Año de inicio (ej: 2010)
- `year_end` - Año de fin (ej: 2020, NULL si es actual)
- `generation` - Generación del modelo (ej: "11th Gen")
- `is_active` - Si el año está activo

#### 4. `catalog.vehicle_specs` - Especificaciones de Vehículos
Almacena especificaciones adicionales (motor, transmisión, etc.)

**Campos:**
- `id` - UUID único
- `year_id` - Referencia al año/generación
- `engine_code` - Código del motor (ej: "2ZR-FE")
- `engine_displacement` - Cilindrada (ej: "1.8L")
- `transmission_type` - Tipo de transmisión (manual, automática, CVT)
- `drivetrain` - Tracción (FWD, RWD, AWD, 4WD)
- `body_type` - Tipo de carrocería (sedán, hatchback, SUV, etc.)
- `is_active` - Si la especificación está activa

#### 5. `catalog.product_vehicle_compatibility` - Compatibilidad Producto-Vehículo
Tabla de relación que establece qué productos son compatibles con qué vehículos

**Campos:**
- `id` - UUID único
- `product_id` - Referencia al producto
- `vehicle_spec_id` - Referencia a la especificación del vehículo (opcional)
- `vehicle_year_id` - Referencia al año/generación (opcional)
- `vehicle_model_id` - Referencia al modelo (opcional)
- `vehicle_brand_id` - Referencia a la marca (opcional)
- `is_universal` - Si el producto es universal (compatible con todos)
- `notes` - Notas adicionales sobre la compatibilidad
- `is_active` - Si la compatibilidad está activa

**Estrategia de Compatibilidad:**
- **Universal**: `is_universal = TRUE` → Compatible con todos los vehículos
- **Por Marca**: Solo `vehicle_brand_id` → Compatible con toda la marca
- **Por Modelo**: `vehicle_brand_id` + `vehicle_model_id` → Compatible con todo el modelo
- **Por Año**: `vehicle_year_id` → Compatible con años específicos
- **Específico**: `vehicle_spec_id` → Compatible con especificación exacta

## 🔍 Casos de Uso

### Caso 1: Pastillas de Freno Específicas
**Producto**: Pastillas de freno delanteras para Toyota Corolla 2010-2020

**Compatibilidad:**
- `vehicle_brand_id` = Toyota
- `vehicle_model_id` = Corolla
- `vehicle_year_id` = 2010-2020

### Caso 2: Accesorio Universal
**Producto**: Tapetes universales

**Compatibilidad:**
- `is_universal` = TRUE

### Caso 3: Filtro de Aceite por Motor
**Producto**: Filtro de aceite para motor 2ZR-FE

**Compatibilidad:**
- `vehicle_spec_id` = Especificación con engine_code = "2ZR-FE"

### Caso 4: Refacción por Transmisión
**Producto**: Aceite de transmisión para CVT

**Compatibilidad:**
- Múltiples registros con `vehicle_spec_id` donde `transmission_type` = "CVT"

## 📊 Flujo de Trabajo

### 1. Crear Producto
1. Seleccionar tipo: Refacción o Accesorio
2. Si es Refacción/Accesorio → Mostrar opciones de compatibilidad

### 2. Configurar Compatibilidad
1. **Opción Universal**: Marcar como universal
2. **Opción Específica**: Seleccionar:
   - Marca (requerido)
   - Modelo (opcional)
   - Año/Generación (opcional)
   - Especificaciones (opcional)

### 3. Búsqueda y Filtrado
1. Usuario selecciona su vehículo
2. Sistema filtra productos compatibles:
   - Productos universales
   - Productos compatibles con la marca
   - Productos compatibles con el modelo
   - Productos compatibles con el año
   - Productos compatibles con las especificaciones exactas

### 4. Validación en Carrito
1. Al agregar producto al carrito
2. Verificar compatibilidad con vehículo seleccionado
3. Mostrar advertencia si no es compatible

## 🔧 Implementación Técnica

### Consultas SQL Principales

#### Obtener productos compatibles con un vehículo
```sql
SELECT DISTINCT p.*
FROM catalog.products p
LEFT JOIN catalog.product_vehicle_compatibility pvc ON pvc.product_id = p.id
WHERE p.product_type IN ('refaccion', 'accesorio')
  AND (
    -- Compatibilidad universal
    pvc.is_universal = TRUE
    OR
    -- Compatibilidad específica
    (
      pvc.vehicle_brand_id = $brand_id
      AND (pvc.vehicle_model_id IS NULL OR pvc.vehicle_model_id = $model_id)
      AND (pvc.vehicle_year_id IS NULL OR pvc.vehicle_year_id = $year_id)
      AND (pvc.vehicle_spec_id IS NULL OR pvc.vehicle_spec_id = $spec_id)
    )
  )
  AND pvc.is_active = TRUE
  AND p.is_available = TRUE;
```

#### Verificar compatibilidad de un producto específico
```sql
SELECT EXISTS(
  SELECT 1
  FROM catalog.product_vehicle_compatibility pvc
  WHERE pvc.product_id = $product_id
    AND (
      pvc.is_universal = TRUE
      OR (
        pvc.vehicle_brand_id = $brand_id
        AND (pvc.vehicle_model_id IS NULL OR pvc.vehicle_model_id = $model_id)
        AND (pvc.vehicle_year_id IS NULL OR pvc.vehicle_year_id = $year_id)
        AND (pvc.vehicle_spec_id IS NULL OR pvc.vehicle_spec_id = $spec_id)
      )
    )
    AND pvc.is_active = TRUE
) as is_compatible;
```

## 📝 Notas de Implementación

### Ventajas del Diseño

1. **Flexibilidad**: Soporta desde compatibilidad universal hasta específica
2. **Escalabilidad**: Fácil agregar nuevas marcas, modelos y especificaciones
3. **Rendimiento**: Índices optimizados para búsquedas rápidas
4. **Mantenibilidad**: Estructura clara y normalizada

### Consideraciones

1. **Compatibilidad Universal**: Los productos universales deben tener `is_universal = TRUE` y no deben tener otras compatibilidades específicas
2. **Jerarquía**: La compatibilidad sigue una jerarquía (marca → modelo → año → especificación)
3. **Validación**: El frontend debe validar que no se mezclen compatibilidades universales con específicas
4. **Migración**: Los productos existentes pueden migrarse gradualmente

## 🚀 Próximos Pasos

1. ✅ Crear estructura de base de datos
2. ⏳ Poblar catálogo de marcas y modelos comunes
3. ⏳ Implementar API endpoints para compatibilidad
4. ⏳ Crear interfaz de usuario para selección de vehículo
5. ⏳ Implementar filtrado de productos por compatibilidad
6. ⏳ Agregar validación en carrito de compras

