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

### 4. [Recapitulación Compatibilidad Vehículos](./04-recapitulacion-compatibilidad-vehiculos.md)
Recapitulación del sistema de compatibilidad de vehículos.

### 5. [Sistema de Configuraciones e Impuestos](./05-sistema-configuraciones-impuestos.md)
Documentación del sistema de configuraciones del sitio y específicamente la configuración de impuestos.

**Contenido:**
- Sistema genérico de configuraciones
- Configuración de impuestos (incluidos vs agregados)
- Flujo de trabajo y ejemplos de cálculo
- Implementación técnica (backend y frontend)
- Ejemplos de uso en storefront

### 6. [Sistema de Roles (sucursales)](./06-sistema-roles-sucursales.md)
Sistema de roles y permisos para sucursales.

### 7. [Sistema de Personalización y Branding](./07-sistema-personalizacion-branding.md)
Documentación del sistema completo de personalización y branding para grupos y sucursales.

**Contenido:**
- Configuración de logos (principal, light, dark, favicon)
- Configuración de colores (primario, secundario, acento, textos, fondos, estados)
- Configuración de fuentes
- Textos personalizados
- Redes sociales
- CSS/JavaScript personalizado
- Herencia de branding (grupo → sucursal)
- Implementación técnica (backend y frontend)

### 8. [Sistema de Roles y Permisos para Sucursales](./08-sistema-roles-sucursales.md)
Documentación del sistema de roles y permisos para gestionar sucursales.

**Contenido:**
- Asignación automática de roles al crear sucursales
- Roles disponibles (superadmin, admin, operations_staff, kitchen_staff)
- Verificación de permisos para actualizar branding, productos, etc.
- Scripts de mantenimiento y corrección
- Troubleshooting de problemas comunes
- Consultas de verificación

### 9. [Checklist de Alta de Sucursal - Tienda de Refacciones](./09-checklist-alta-sucursal-refacciones.md)
Checklist completo de todos los requisitos, información e insumos necesarios para dar de alta una sucursal activa y ponerla en operación.

**Contenido:** Información del negocio, contacto, ubicación, marcas de vehículos, catálogo, horarios, usuarios, wallet, documentos, comisiones, verificaciones.

### 10. [Mejoras Frontend Grupos Empresariales](./10-prompt-frontend-mejoras-grupos-empresariales.md)
Prompt y especificación de mejoras en frontend para grupos empresariales (asignación automática, mensajes, endpoints).

## 🗂️ Organización

### Documentación
- `/docs/agora/` - Documentación específica de AGORA Refacciones

### Base de Datos
- `/database/agora/` - Scripts SQL específicos para refacciones
  - `migration_product_types_refacciones.sql` - Migración de tipos de producto
  - `migration_vehicle_compatibility.sql` - Sistema de compatibilidad de vehículos
  - `migration_site_settings.sql` - Sistema de configuraciones del sitio
  - `migration_business_branding.sql` - Sistema de personalización y branding
  - `seed_refacciones_catalog.sql` - Catálogo de categorías
  - `trigger_auto_assign_business_owner_role.sql` - Trigger para asignar roles automáticamente
  - `fix_missing_business_users_roles.sql` - Script para corregir sucursales sin roles
  - `assign_user_role_to_business.sql` - Script para asignar roles manualmente
  - `README.md` - Documentación de scripts SQL

## 🚀 Inicio Rápido

1. Leer [Transformación del Proyecto](./01-transformacion-refacciones.md)
2. Revisar [Estructura de Categorías](./02-estructura-categorias-refacciones.md)
3. Revisar [Sistema de Compatibilidad de Vehículos](./03-sistema-compatibilidad-vehiculos.md)
4. Revisar [Sistema de Configuraciones e Impuestos](./05-sistema-configuraciones-impuestos.md)
5. Revisar [Sistema de Personalización y Branding](./07-sistema-personalizacion-branding.md)
6. Revisar [Sistema de Roles y Permisos para Sucursales](./08-sistema-roles-sucursales.md)
7. **Para dar de alta una sucursal**: Consultar [Checklist de Alta de Sucursal](./09-checklist-alta-sucursal-refacciones.md)
8. Ejecutar scripts SQL en `/database/agora/` (ver orden en README)
9. Adaptar formularios y frontend según sea necesario

## 📝 Notas

- Esta documentación está en constante evolución
- Los scripts SQL están listos para ejecutarse
- Los productos de ejemplo requieren negocios creados previamente

## 🔗 Referencias

- [Documentación Principal de Base de Datos](../../database/README.md)
- [Sistema de Catálogos Avanzado](../features/05-sistema-catalogos-productos-avanzado.md)
- [Gestión de Catálogos](../features/01-catalogos-gestion.md)

