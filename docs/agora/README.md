# Documentación AGORA - Venta de Refacciones

Bienvenido a la documentación del proyecto AGORA transformado para venta de refacciones automotrices.

## 📚 Índice de Documentación

### 1. [Transformación del Proyecto](./01-transformacion-refacciones.md)
Documento principal que describe la transformación de delivery de comida a venta de refacciones.

**Contenido:**
- Resumen ejecutivo
- Cambios principales
- Adaptaciones necesarias
- Estructura de datos
- Próximos pasos

### 2. [Estructura de Categorías](./02-estructura-categorias-refacciones.md)
Documentación detallada de la estructura de categorías para refacciones.

**Contenido:**
- Categorías principales
- Subcategorías detalladas
- Campos específicos por categoría
- Ejemplos de estructura en base de datos

### 3. [Sistema de Compatibilidad de Vehículos](./03-sistema-compatibilidad-vehiculos.md)
Documentación completa del sistema de compatibilidad de vehículos para refacciones y accesorios.

**Contenido:**
- Arquitectura del sistema
- Modelo de datos (marcas, modelos, años, especificaciones)
- Casos de uso y ejemplos
- Flujo de trabajo
- Consultas SQL principales
- Notas de implementación

### 4. [Sistema de Configuraciones e Impuestos](./04-sistema-configuraciones-impuestos.md)
Documentación del sistema de configuraciones del sitio y específicamente la configuración de impuestos.

**Contenido:**
- Sistema genérico de configuraciones
- Configuración de impuestos (incluidos vs agregados)
- Flujo de trabajo y ejemplos de cálculo
- Implementación técnica (backend y frontend)
- Ejemplos de uso en storefront

## 🗂️ Organización

### Documentación
- `/docs/agora/` - Documentación específica de AGORA Refacciones

### Base de Datos
- `/database/agora/` - Scripts SQL específicos para refacciones
  - `migration_product_types_refacciones.sql` - Migración de tipos de producto
  - `migration_vehicle_compatibility.sql` - Sistema de compatibilidad de vehículos
  - `migration_site_settings.sql` - Sistema de configuraciones del sitio
  - `seed_refacciones_catalog.sql` - Catálogo de categorías
  - `README.md` - Documentación de scripts SQL

## 🚀 Inicio Rápido

1. Leer [Transformación del Proyecto](./01-transformacion-refacciones.md)
2. Revisar [Estructura de Categorías](./02-estructura-categorias-refacciones.md)
3. Revisar [Sistema de Compatibilidad de Vehículos](./03-sistema-compatibilidad-vehiculos.md)
4. Revisar [Sistema de Configuraciones e Impuestos](./04-sistema-configuraciones-impuestos.md)
5. Ejecutar scripts SQL en `/database/agora/` (ver orden en README)
6. Adaptar formularios y frontend según sea necesario

## 📝 Notas

- Esta documentación está en constante evolución
- Los scripts SQL están listos para ejecutarse
- Los productos de ejemplo requieren negocios creados previamente

## 🔗 Referencias

- [Documentación Principal de Base de Datos](../../database/README.md)
- [Sistema de Catálogos Avanzado](../20-sistema-catalogos-productos-avanzado.md)
- [Gestión de Catálogos](../16-catalogos-gestion.md)

