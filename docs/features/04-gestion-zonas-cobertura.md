# Gestión de Zonas de Cobertura

Este documento explica cómo gestionar las zonas de cobertura (service regions) en LOCALIA, incluyendo cómo actualizar los polígonos que definen las áreas de servicio.

## 📍 Conceptos Básicos

### Zonas de Cobertura (Service Regions)

Las zonas de cobertura definen las áreas geográficas donde LOCALIA opera. Cada zona tiene:

- **Polígono de cobertura**: Define el área exacta usando PostGIS (GEOMETRY(POLYGON, 4326))
- **Punto central**: Coordenadas del centro de la zona (POINT)
- **Radio máximo de entrega**: Distancia máxima en metros para entregas
- **Monto mínimo de pedido**: Valor mínimo requerido para esta zona
- **Estado**: Activa/Inactiva
- **Por defecto**: Solo una zona puede ser la zona por defecto

### Validación de Ubicaciones

El sistema valida si una ubicación (negocio o dirección) está dentro de una zona usando:

1. **Validación principal**: Verifica si el punto está dentro del polígono usando `ST_Within`
2. **Validación secundaria**: Si no está en el polígono, verifica si está dentro del radio máximo desde el centro usando `ST_DWithin`

## 🛠️ Herramientas para Definir Polígonos

### Opción 1: geojson.io (Recomendado)

**geojson.io** es la herramienta más fácil y directa para dibujar polígonos:

1. **Abre geojson.io**: https://geojson.io
2. **Busca la ubicación**: En el buscador, escribe el nombre de la zona (ej: "La Roma, CDMX")
3. **Dibuja el polígono**:
   - Haz clic en el botón "Draw a Polygon" (icono de polígono en la barra superior)
   - Haz clic en el mapa para crear los vértices del polígono
   - Haz clic en el primer punto para cerrar el polígono
4. **Copia el GeoJSON**:
   - En el panel derecho, verás el GeoJSON generado
   - Copia todo el contenido (debe verse algo como `{"type":"Feature",...}` o `{"type":"Polygon",...}`)

**Nota importante**: Si geojson.io genera un `LineString` o `FeatureCollection`, necesitarás convertirlo a `Polygon` antes de actualizar la base de datos.

### Opción 2: Google My Maps

1. **Crea un mapa**: https://www.google.com/mymaps
2. **Dibuja la forma**:
   - Haz clic en "Dibujar una línea" → "Agregar línea o forma"
   - Dibuja el polígono haciendo clic en los puntos
   - Haz doble clic para terminar
3. **Exporta**:
   - Menú → "Exportar a KML"
   - Convierte KML a GeoJSON usando una herramienta online (ej: https://mygeodata.cloud/converter/kml-to-geojson)

### Opción 3: DrawingManager de Google Maps API

Para una integración más avanzada, se puede usar el `DrawingManager` de Google Maps API directamente en la aplicación web-admin para dibujar polígonos en el mapa.

## 📝 Actualizar un Polígono en la Base de Datos

### Método 1: Usar ST_GeomFromGeoJSON (Recomendado)

Este método es el más directo si tienes el GeoJSON completo:

```sql
UPDATE core.service_regions
SET coverage_area = ST_SetSRID(
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[-99.17,19.415],[-99.15,19.415],[-99.15,19.43],[-99.17,19.43],[-99.17,19.415]]]}'),
    4326
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'La Roma';
```

**Nota**: Si el GeoJSON es un `FeatureCollection` o `Feature`, extrae solo la parte `geometry`:

```sql
-- Si tienes un FeatureCollection o Feature, usa solo la parte geometry
UPDATE core.service_regions
SET coverage_area = ST_SetSRID(
    ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[...]]}'),
    4326
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'La Roma';
```

### Método 2: Usar ST_GeomFromText

Si `ST_GeomFromGeoJSON` no está disponible en tu versión de PostGIS, puedes convertir manualmente:

```sql
UPDATE core.service_regions
SET coverage_area = ST_SetSRID(
    ST_GeomFromText(
        'POLYGON((
            -99.1700 19.4150,
            -99.1500 19.4150,
            -99.1500 19.4300,
            -99.1700 19.4300,
            -99.1700 19.4150
        ))'
    ),
    4326
),
updated_at = CURRENT_TIMESTAMP
WHERE name = 'La Roma';
```

**Importante**:
- El orden es `longitud latitud` (no latitud longitud)
- El último punto debe ser igual al primero para cerrar el polígono
- Las coordenadas del GeoJSON vienen como `[lon, lat]` en el array `coordinates`

### Conversión de LineString a Polygon

Si geojson.io genera un `LineString`, necesitas convertirlo a `Polygon`:

```json
// LineString original
{
  "type": "LineString",
  "coordinates": [
    [-99.17, 19.415],
    [-99.15, 19.415],
    [-99.15, 19.43],
    [-99.17, 19.43]
  ]
}

// Convertir a Polygon (cerrar el polígono)
{
  "type": "Polygon",
  "coordinates": [[
    [-99.17, 19.415],
    [-99.15, 19.415],
    [-99.15, 19.43],
    [-99.17, 19.43],
    [-99.17, 19.415]  // Último punto = primer punto
  ]]
}
```

## ✅ Verificar el Polígono Actualizado

Después de actualizar, verifica que el polígono se guardó correctamente:

```sql
SELECT 
    sr.name,
    sr.city,
    sr.state,
    ST_AsGeoJSON(sr.coverage_area)::TEXT as polygon_geojson,
    ST_AsText(sr.coverage_area) as polygon_text,
    ST_Area(sr.coverage_area::geography) / 1000000 as area_km2,
    (sr.center_point)[0]::DOUBLE PRECISION as center_longitude,
    (sr.center_point)[1]::DOUBLE PRECISION as center_latitude
FROM core.service_regions sr
WHERE sr.name = 'La Roma';
```

## 🔍 Validar Ubicaciones Dentro de una Zona

Para verificar si una ubicación está dentro de una zona:

```sql
-- Verificar si un punto está dentro del polígono
SELECT 
    core.is_location_in_region(
        -99.1600,  -- longitude
        19.4220,   -- latitude
        (SELECT id FROM core.service_regions WHERE name = 'La Roma' LIMIT 1)
    ) as is_in_zone;

-- O usando ST_Within directamente
SELECT 
    ST_Within(
        ST_SetSRID(ST_MakePoint(-99.1600, 19.4220), 4326),
        sr.coverage_area
    ) as is_in_zone
FROM core.service_regions sr
WHERE sr.name = 'La Roma';
```

## 📋 Scripts Disponibles

- **`database/update_la_roma_polygon.sql`**: Script de ejemplo para actualizar el polígono de La Roma
- **`database/service_regions.sql`**: Script principal que crea la tabla y funciones relacionadas
- **`database/verify_zone_polygon.sql`**: Script de diagnóstico para verificar polígonos

## ⚠️ Consideraciones Importantes

1. **Sistema de Coordenadas**: Todas las coordenadas deben estar en WGS84 (SRID 4326)
2. **Orden de Coordenadas**: Siempre `[longitud, latitud]` o `(longitud latitud)`
3. **Cierre del Polígono**: El último punto debe ser igual al primero
4. **Validación vs Visualización**: 
   - La validación usa el polígono real (`coverage_area`)
   - El círculo visual es solo una aproximación y NO representa la zona real
   - Siempre dibuja el polígono real, no uses círculos como representación

## 🎯 Casos de Uso

### Crear una Nueva Zona

1. Dibuja el polígono en geojson.io
2. Obtén el GeoJSON
3. Calcula el punto central (puedes usar el centroide del polígono)
4. Inserta en la base de datos:

```sql
INSERT INTO core.service_regions (
    name,
    description,
    city,
    state,
    country,
    coverage_area,
    center_point,
    is_active,
    is_default,
    max_delivery_radius_meters,
    min_order_amount
) VALUES (
    'Nueva Zona',
    'Descripción de la zona',
    'Ciudad',
    'Estado',
    'México',
    ST_SetSRID(ST_GeomFromGeoJSON('TU_GEOJSON'), 4326),
    ST_MakePoint(-99.1600, 19.4220)::point,
    TRUE,
    FALSE,
    3000,
    0.00
);
```

### Actualizar una Zona Existente

Sigue los pasos de la sección "Actualizar un Polígono en la Base de Datos" arriba.

### Verificar Tiendas en una Zona

```sql
SELECT 
    b.id,
    b.name,
    (b.location)[0]::DOUBLE PRECISION as longitude,
    (b.location)[1]::DOUBLE PRECISION as latitude
FROM core.businesses b
CROSS JOIN core.service_regions sr
WHERE sr.name = 'La Roma'
  AND sr.is_active = TRUE
  AND b.location IS NOT NULL
  AND ST_Within(
    ST_SetSRID(ST_MakePoint((b.location)[0], (b.location)[1]), 4326),
    sr.coverage_area
  );
```

---

**Anterior:** [Roles de Negocio y Múltiples Tiendas](./03-roles-negocio-multi-tiendas.md)  
**Siguiente:** [Sistema de Catálogos de Productos Avanzado](./20-sistema-catalogos-productos-avanzado.md)  
**Volver al inicio:** [README Principal](./README.md)

---

**Versión:** 1.0  
**Fecha:** 2025-01-17  
**Autor:** Gestión de zonas de cobertura

