# Transformación del Proyecto: De Delivery de Comida a Venta de Refacciones

## 📋 Resumen Ejecutivo

Este documento describe la transformación del proyecto AGORA de una plataforma de delivery de comida a una plataforma de venta de refacciones, accesorios e instalación de servicios.

## 🎯 Objetivo

Adaptar la plataforma existente para soportar el modelo de negocio de venta de refacciones automotrices, accesorios y servicios de instalación, manteniendo la infraestructura de delivery hiperlocal (radio 3 km).

## 🔄 Cambios Principales

### 1. Modelo de Negocio

**Antes (Delivery de Comida):**
- Restaurantes y locales de comida
- Productos: Alimentos, bebidas, combos
- Categorías: Entradas, Platos Principales, Bebidas, Postres

**Después (Refacciones):**
- Tiendas de refacciones automotrices
- Productos: Refacciones, accesorios, servicios de instalación
- Categorías: Refacciones, Accesorios, Instalación

### 2. Estructura de Categorías

#### Categorías Principales de Productos

1. **Refacciones**
   - Motor
   - Transmisión
   - Suspensión
   - Frenos
   - Sistema eléctrico
   - Carrocería

2. **Accesorios**
   - Audio y multimedia
   - Iluminación
   - Seguridad
   - Estética
   - Confort
   - Performance

3. **Instalación**
   - Instalación de refacciones
   - Instalación de accesorios
   - Servicios de mantenimiento
   - Diagnóstico

### 3. Adaptaciones Necesarias

#### Base de Datos
- ✅ Mantener estructura existente (productos, categorías, pedidos)
- ✅ Agregar categorías específicas de refacciones
- ✅ Adaptar campos de productos para refacciones (marca, modelo, año, compatibilidad)

#### Frontend
- Adaptar formularios de productos
- Actualizar catálogo visual
- Modificar filtros de búsqueda

#### Backend
- Mantener APIs existentes
- Agregar endpoints específicos si es necesario
- Adaptar validaciones

## 📊 Estructura de Datos

### Categorías de Negocios

Las tiendas de refacciones se clasifican como:
- **Refaccionaria General**: Amplio catálogo de refacciones
- **Refaccionaria Especializada**: Enfoque en marcas específicas
- **Taller con Refacciones**: Combina venta e instalación
- **Tienda de Accesorios**: Enfoque en accesorios y personalización

### Campos Específicos para Refacciones

Los productos de refacciones requieren información adicional:
- **Marca del vehículo**: Toyota, Nissan, Honda, etc.
- **Modelo**: Corolla, Sentra, Civic, etc.
- **Año**: Rango de años compatibles
- **Número de parte**: OEM o alternativo
- **Compatibilidad**: Lista de modelos compatibles
- **Garantía**: Tiempo y condiciones de garantía

## 🗂️ Organización de Archivos

### Documentación
- `/docs/agora/` - Documentación específica de AGORA Refacciones

### Base de Datos
- `/database/agora/` - Scripts SQL específicos para refacciones
  - `seed_refacciones_catalog.sql` - Catálogo de categorías y datos de ejemplo
  - `migration_refacciones_fields.sql` - Migración de campos específicos (si es necesario)

## 📝 Próximos Pasos

1. ✅ Crear estructura de carpetas
2. ✅ Crear scripts SQL con datos de ejemplo
3. ⏳ Adaptar formularios de productos
4. ⏳ Actualizar interfaz de usuario
5. ⏳ Configurar filtros de búsqueda
6. ⏳ Pruebas de integración

## 🔗 Referencias

- [Sistema de Catálogos Avanzado](../20-sistema-catalogos-productos-avanzado.md)
- [Gestión de Catálogos](../16-catalogos-gestion.md)
- [Estructura de Base de Datos](../../database/README.md)

