-- ============================================================================
-- SCRIPT MAESTRO DE INICIALIZACIÓN: AGORA ECOSYSTEM
-- ============================================================================
-- Descripción: Script completo para inicializar la base de datos AGORA
--              desde cero, incluyendo todas las migraciones y mejoras.
-- 
-- Este script ejecuta en orden:
-- 1. Creación de base de datos y extensiones
-- 2. Schema base (tablas, índices, triggers, funciones)
-- 3. Sistemas adicionales (API keys, categorías, regiones)
-- 4. Sistema de roles de negocio y múltiples tiendas
-- 5. Sistema avanzado de catálogos
-- 6. Sistema de impuestos
-- 7. Sistema de carrito de compras
-- 8. Catálogos y datos iniciales
-- 
-- IMPORTANTE: Este script está diseñado para ejecutarse en una base de datos
--             nueva. Si ya tienes datos, usa los scripts individuales.
-- ============================================================================
-- Versión: 1.0
-- Fecha: 2025-01-XX
-- Base de Datos: agora_ecosystem
-- ============================================================================

-- ============================================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================================

-- Nota: La creación de la base de datos debe hacerse desde psql como superusuario
-- o desde el cliente de PostgreSQL con permisos adecuados.
-- 
-- Para crear la base de datos manualmente:
-- CREATE DATABASE agora_ecosystem;
-- \c agora_ecosystem

-- Configurar search_path
SET search_path TO core, catalog, orders, reviews, communication, commerce, social, public;

-- ============================================================================
-- PASO 1: EXTENSIONES REQUERIDAS
-- ============================================================================

-- IMPORTANTE: PostGIS debe habilitarse con permisos de superusuario
-- En Supabase, puedes habilitarla desde el Dashboard: Database > Extensions
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA public;

-- Nota: gen_random_uuid() es nativo en PostgreSQL 13+, no requiere extensión uuid-ossp

-- ============================================================================
-- PASO 2: SCHEMA BASE (OBLIGATORIO)
-- ============================================================================
-- Este es el script principal que crea toda la estructura base de la base de datos

\echo '📦 Ejecutando schema base...'
\i schema.sql

-- ============================================================================
-- PASO 3: SISTEMAS ADICIONALES (OPCIONAL PERO RECOMENDADO)
-- ============================================================================

\echo '🔑 Ejecutando sistema de API Keys...'
\i api_keys_schema.sql

\echo '🏪 Ejecutando catálogo de categorías de negocios...'
\i business_categories_catalog.sql

\echo '🗺️ Ejecutando sistema de regiones de servicio...'
\i service_regions.sql

\echo '📍 Ejecutando función de identificación de regiones...'
\i get_location_region.sql

-- ============================================================================
-- PASO 4: SISTEMA DE ROLES DE NEGOCIO (OBLIGATORIO)
-- ============================================================================
-- Este sistema permite múltiples tiendas por cuenta y roles granulares

\echo '👥 Ejecutando sistema de roles de negocio y múltiples tiendas...'
\i business_roles_and_multi_store.sql

\echo '👤 Ejecutando funciones de gestión de usuarios a nivel de cuenta...'
\i superadmin_account_users.sql

-- ============================================================================
-- PASO 5: SISTEMA AVANZADO DE CATÁLOGOS (RECOMENDADO)
-- ============================================================================
-- Sistema completo de catálogos con tipos de producto, variantes, etc.

\echo '🛍️ Ejecutando sistema avanzado de catálogos...'
\i migration_advanced_catalog_system.sql

\echo '⚙️ Ejecutando configuración de campos por tipo de producto...'
\i migration_product_type_field_config.sql

-- ============================================================================
-- PASO 6: SISTEMA DE IMPUESTOS (RECOMENDADO)
-- ============================================================================
-- Sistema configurable de impuestos para productos y pedidos

\echo '💰 Ejecutando sistema de impuestos configurable...'
\i migration_tax_system.sql

-- ============================================================================
-- PASO 7: SISTEMA DE CARRITO DE COMPRAS (RECOMENDADO)
-- ============================================================================
-- Sistema de carrito persistente en base de datos

\echo '🛒 Ejecutando sistema de carrito de compras...'
\i migration_shopping_cart.sql

-- ============================================================================
-- PASO 8: CATÁLOGOS Y DATOS INICIALES (OPCIONAL)
-- ============================================================================

\echo '📚 Ejecutando catálogo avanzado para administradores...'
\i seed_advanced_catalog_admin.sql

\echo '📋 Ejecutando catálogo básico de ejemplo...'
\i seed_catalog.sql

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

\echo '✅ Verificando instalación...'

-- Verificar que todos los schemas se crearon
DO $$
DECLARE
    schema_count INTEGER;
    expected_schemas TEXT[] := ARRAY['core', 'catalog', 'orders', 'reviews', 'communication', 'commerce', 'social'];
    schema_name TEXT;
BEGIN
    FOREACH schema_name IN ARRAY expected_schemas
    LOOP
        SELECT COUNT(*) INTO schema_count
        FROM information_schema.schemata
        WHERE schema_name = schema_name;
        
        IF schema_count = 0 THEN
            RAISE WARNING '⚠️ El schema % no se creó correctamente', schema_name;
        ELSE
            RAISE NOTICE '✅ Schema % creado correctamente', schema_name;
        END IF;
    END LOOP;
END $$;

-- Verificar tablas principales
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Verificar tablas principales
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'core'
    AND table_name IN ('user_profiles', 'businesses', 'repartidores', 'addresses', 'business_users');
    
    IF table_count < 5 THEN
        RAISE WARNING '⚠️ Algunas tablas principales del schema core no se crearon correctamente';
    ELSE
        RAISE NOTICE '✅ Tablas principales del schema core creadas correctamente (%)', table_count;
    END IF;
    
    -- Verificar tablas de catálogo
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'catalog'
    AND table_name IN ('products', 'product_categories', 'collections', 'product_type_field_config');
    
    IF table_count < 4 THEN
        RAISE WARNING '⚠️ Algunas tablas del schema catalog no se crearon correctamente';
    ELSE
        RAISE NOTICE '✅ Tablas del schema catalog creadas correctamente (%)', table_count;
    END IF;
    
    -- Verificar tablas de pedidos
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'orders'
    AND table_name IN ('orders', 'order_items', 'deliveries', 'shopping_cart');
    
    IF table_count < 3 THEN
        RAISE WARNING '⚠️ Algunas tablas del schema orders no se crearon correctamente';
    ELSE
        RAISE NOTICE '✅ Tablas del schema orders creadas correctamente (%)', table_count;
    END IF;
END $$;

-- Verificar funciones importantes
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines
    WHERE routine_schema = 'core'
    AND routine_name IN ('get_user_businesses', 'get_business_users', 'get_superadmin_businesses');
    
    IF func_count < 3 THEN
        RAISE WARNING '⚠️ Algunas funciones importantes no se crearon correctamente';
    ELSE
        RAISE NOTICE '✅ Funciones de gestión de usuarios creadas correctamente (%)', func_count;
    END IF;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '✅ INICIALIZACIÓN DE AGORA ECOSYSTEM COMPLETADA'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo '📊 Resumen de la instalación:'
\echo ''
\echo 'Schemas creados:'
\echo '  ✅ core - Entidades principales (usuarios, negocios, repartidores)'
\echo '  ✅ catalog - Catálogo de productos y categorías'
\echo '  ✅ orders - Pedidos, items y entregas'
\echo '  ✅ reviews - Evaluaciones y propinas'
\echo '  ✅ communication - Notificaciones y mensajes'
\echo '  ✅ commerce - Promociones, suscripciones, publicidad'
\echo '  ✅ social - Red social ecológica'
\echo ''
\echo 'Sistemas instalados:'
\echo '  ✅ Sistema de roles de negocio y múltiples tiendas'
\echo '  ✅ Sistema avanzado de catálogos con tipos de producto'
\echo '  ✅ Sistema de impuestos configurable'
\echo '  ✅ Sistema de carrito de compras persistente'
\echo '  ✅ Sistema de regiones de servicio (zonas de cobertura)'
\echo '  ✅ Sistema de API Keys'
\echo ''
\echo 'Próximos pasos:'
\echo '  1. Crear usuarios en Supabase Auth (Dashboard o API)'
\echo '  2. Ejecutar create_profiles_only.sql para crear perfiles de usuarios'
\echo '  3. (Opcional) Ejecutar seed_delivery_cycle.sql para datos de prueba'
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

