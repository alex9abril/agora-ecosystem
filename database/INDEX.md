# Índice de base de datos — AGORA Ecosystem

Índice para localizar scripts SQL y documentación por carpeta o por tema.  
Rutas relativas desde `database/`.

---

## Por carpeta

### `schema/` — Esquema base

| Archivo | Descripción |
|---------|-------------|
| [schema.sql](schema/schema.sql) | **Principal.** Estructura completa: schemas, tablas, índices, triggers, ENUMs. Ejecutar primero. |
| [init_agora_ecosystem.sql](schema/init_agora_ecosystem.sql) | Inicialización ecosistema AGORA |
| [api_keys_schema.sql](schema/api_keys_schema.sql) | Sistema de API Keys para aplicaciones externas |
| [business_categories_catalog.sql](schema/business_categories_catalog.sql) | Catálogo de categorías de negocios |
| [business_roles_and_multi_store.sql](schema/business_roles_and_multi_store.sql) | Roles de negocio y múltiples tiendas |
| [service_regions.sql](schema/service_regions.sql) | Regiones de servicio (cobertura) |
| [get_location_region.sql](schema/get_location_region.sql) | Función para obtener región de un punto |
| [superadmin_account_users.sql](schema/superadmin_account_users.sql) | Gestión de usuarios cuenta superadmin |

---

### `migrations/` — Migraciones generales

| Archivo | Descripción |
|---------|-------------|
| migration_advanced_catalog_system.sql | Sistema avanzado de catálogos |
| migration_product_type_field_config.sql | Configuración de campos por tipo de producto |
| migration_product_classifications_status.sql | Clasificaciones/colecciones de productos |
| migration_add_description_to_product_collections.sql | Descripción en colecciones |
| migration_add_image_to_product_collections.sql | Imagen en colecciones |
| migration_shopping_cart.sql | Carrito de compras |
| migration_add_branch_id_to_cart_items.sql | branch_id en ítems del carrito |
| migration_add_order_group_id.sql | order_group_id en pedidos (checkout multi-sucursal) |
| migration_tax_system.sql | Sistema de impuestos |
| migration_order_tracking_postventa.sql | Seguimiento y postventa de pedidos |
| migration_update_order_status_simplified.sql | Estados de pedido simplificados |
| migration_add_original_quantity_to_order_items.sql | Cantidad original en ítems |
| migration_create_wallet_system.sql | Sistema de monedero (wallet) |
| migration_fix_wallet_types.sql | Tipos de wallet (UUID → VARCHAR) |
| migration_verify_and_fix_wallet_transaction.sql | Verificación/corrección transacciones wallet |
| migration_create_payment_transactions_table.sql | Tabla de transacciones de pago |
| migration_fix_existing_payment_transactions.sql | Corrección transacciones existentes |
| migration_fix_specific_order.sql | Corrección de pedido específico |
| migration_create_shipping_labels_table.sql | Etiquetas de envío |
| migration_add_metadata_to_shipping_labels.sql | Metadata en etiquetas |
| migration_add_shipping_info_to_order_items.sql | Info de envío en ítems |
| migration_add_skydropx_settings.sql | Configuración Skydropx |
| migration_add_skydropx_settings_verification.sql | Verificación Skydropx |
| migration_add_quotation_id_to_order_items.sql | quotation_id en ítems |
| migration_add_rate_id_to_order_items.sql | rate_id en ítems |
| migration_add_receiver_to_addresses.sql | Campo receiver en direcciones |
| migration_fix_product_images_file_path.sql | Corrección rutas de imágenes de productos |

---

### `seeds/` — Datos de ejemplo y catálogos

| Archivo | Descripción |
|---------|-------------|
| seed_catalog.sql | Catálogo básico (categorías de ejemplo) |
| seed_delivery_cycle.sql | Ciclo de delivery de ejemplo |
| seed_advanced_catalog_admin.sql | Catálogo avanzado (tipos y categorías) |
| seed_roles_catalog.sql | Catálogo de roles (opcional) |
| seed_test_products_pescaditos.sql | Productos de prueba "Pescaditos" |
| seed_test_products_pescaditos_set2.sql | Productos de prueba set 2 |
| examples_advanced_catalog.sql | Ejemplos de uso catálogo avanzado |
| create_profiles_only.sql | Crear perfiles para usuarios en Auth |
| create_test_users.sql | Crear usuarios y perfiles de prueba |
| insert_la_roma_zone.sql | Zona "La Roma" |
| update_la_roma_polygon.sql | Actualizar polígono La Roma |
| insert_mexico_zone.sql | Zona México |
| insert_new_zone_polygon.sql | Insertar nuevo polígono de zona |
| update_address_location.sql | Actualizar ubicación de direcciones |

---

### `storage/` — Supabase Storage (buckets y políticas)

| Archivo | Descripción |
|---------|-------------|
| create_products_bucket.sql | Crear bucket productos |
| create_products_bucket_complete.sql | Crear bucket productos (completo) |
| create_and_configure_products_bucket.sql | Crear y configurar bucket |
| setup_storage_policies_products.sql | Políticas RLS bucket productos |
| template_new_bucket_policies.sql | Plantilla políticas nuevos buckets |
| create_permissive_policies_final.sql | Políticas permisivas |
| fix_products_policies_*.sql | Varios: corrección políticas productos |
| fix_policies_*.sql | Corrección políticas (service_role, etc.) |
| fix_storage_*.sql | Corrección permisos/storage |
| recreate_products_bucket_from_scratch.sql | Recrear bucket desde cero |
| recreate_products_policies_exact_copy.sql | Recrear políticas exactas |
| disable_rls_storage_products.sql / disable_storage_rls_products.sql | Deshabilitar RLS |
| verify_products_bucket_status.sql | Verificar estado bucket |
| verify_and_fix_storage_policies.sql | Verificar y corregir políticas |
| verify_and_compare_policies.sql | Comparar políticas |
| verify_bucket_exists.sql | Verificar existencia bucket |
| compare_buckets_and_fix.sql | Comparar buckets y corregir |
| copy_personalizacion_policies_to_products.sql | Copiar políticas personalización a productos |

---

### `fixes/` — Correcciones y hotfixes

| Archivo | Descripción |
|---------|-------------|
| fix_admin_role.sql / fix_admin_role_for_user.sql | Corrección rol admin |
| fix_business_role_type.sql | Tipos de roles de negocio |
| fix_medicine_allergens_config.sql | Config alérgenos medicamentos |
| fix_missing_business_users.sql | Negocios sin business_users |
| fix_roles_data_after_enum_rename.sql | Datos de roles tras renombrar ENUM |
| fix_product_vehicle_compatibility_logic.sql | Lógica compatibilidad vehículos |
| migrate_existing_businesses_to_business_users.sql | Migrar negocios a business_users |
| migrate_user_to_roles.sql | Migrar usuarios a sistema de roles |
| update_business_roles_data.sql | Actualizar datos de roles |
| reset_password_auth_user.sql | Reset contraseña usuario Auth |

---

### `diagnostics/` — Diagnóstico y verificación

| Archivo | Descripción |
|---------|-------------|
| diagnose_admin_login.sql | Diagnóstico login admin |
| diagnose_web_admin_login_user.sql | Diagnóstico login web-admin |
| diagnose_business_addresses.sql / diagnose_business_addresses_specific.sql | Direcciones de negocios |
| diagnose_businesses_in_zone.sql | Negocios en zona |
| diagnose_location_coordinates.sql | Coordenadas de ubicación |
| diagnose_missing_shipment.sql | Envío faltante |
| check_shipment_response.sql | Respuesta de envío |
| check_tracking_numbers.sql | Números de seguimiento |
| extract_tracking_from_metadata.sql | Extraer tracking de metadata |
| check_product_compatibility_debug.sql | Debug compatibilidad productos |
| verify_product_images.sql | Verificar imágenes de productos |
| test_get_superadmin_businesses.sql | Probar función negocios superadmin |

---

### `agora/` — Scripts específicos AGORA (refacciones, grupos, branding, etc.)

#### Migraciones de estructura
| Archivo | Descripción |
|---------|-------------|
| [migration_business_groups.sql](agora/migration_business_groups.sql) | Grupos empresariales |
| [migration_branch_fields.sql](agora/migration_branch_fields.sql) | Campos de sucursales (slug, etc.) |
| [migration_business_branding.sql](agora/migration_business_branding.sql) | Branding por grupo/sucursal |
| [migration_site_settings.sql](agora/migration_site_settings.sql) | Configuraciones del sitio |
| [migration_product_types_refacciones.sql](agora/migration_product_types_refacciones.sql) | Tipos de producto refacciones |
| [migration_add_sku_to_products.sql](agora/migration_add_sku_to_products.sql) | SKU en productos |
| [migration_product_images.sql](agora/migration_product_images.sql) | Imágenes de productos |
| [migration_product_branch_availability.sql](agora/migration_product_branch_availability.sql) | Disponibilidad por sucursal |
| [migration_product_branch_backorder.sql](agora/migration_product_branch_backorder.sql) | Backorder por sucursal |
| [migration_add_products_metadata.sql](agora/migration_add_products_metadata.sql) | Metadata en productos |
| [migration_business_vehicle_brands.sql](agora/migration_business_vehicle_brands.sql) | Marcas de vehículo por negocio |
| [migration_vehicle_compatibility.sql](agora/migration_vehicle_compatibility.sql) | Compatibilidad de vehículos |
| [migration_user_vehicles.sql](agora/migration_user_vehicles.sql) | Vehículos de usuario |
| [migration_add_store_context_to_orders.sql](agora/migration_add_store_context_to_orders.sql) | store_context en pedidos |
| [migration_integrations_settings.sql](agora/migration_integrations_settings.sql) | Configuración integraciones |
| [migration_integration_logs.sql](agora/migration_integration_logs.sql) / migration_integration_logs_apply.sql | Logs de integración |
| [migration_branch_notification_settings.sql](agora/migration_branch_notification_settings.sql) (+ apply) | Notificaciones por sucursal |
| [migration_email_templates.sql](agora/migration_email_templates.sql) | Templates de correo |
| [migration_notification_type_email_triggers.sql](agora/migration_notification_type_email_triggers.sql) | Triggers notificación/email |
| [migration_landing_sliders.sql](agora/migration_landing_sliders.sql) | Sliders de landing |
| [migration_landing_sliders_global_and_brand.sql](agora/migration_landing_sliders_global_and_brand.sql) | Sliders globales y por marca |
| [fix_landing_sliders_function_unique.sql](agora/fix_landing_sliders_function_unique.sql) | Fix función sliders única (si migración dio "function name is not unique") |

#### Seeds AGORA
| Archivo | Descripción |
|---------|-------------|
| [seed_refacciones_catalog.sql](agora/seed_refacciones_catalog.sql) | Catálogo categorías refacciones |
| [seed_toyota_vehicles.sql](agora/seed_toyota_vehicles.sql) | Vehículos Toyota |
| [seed_toyota_products_test_data.sql](agora/seed_toyota_products_test_data.sql) | Productos de prueba Toyota |
| seed_business_groups_from_existing.sql | Crear grupos desde negocios |
| seed_business_groups_specific.sql | Grupos específicos |

#### Roles y asignaciones
| Archivo | Descripción |
|---------|-------------|
| [trigger_auto_assign_business_owner_role.sql](agora/trigger_auto_assign_business_owner_role.sql) | Asignar rol owner al crear negocio |
| [fix_missing_business_users_roles.sql](agora/fix_missing_business_users_roles.sql) | Corregir sucursales sin roles |
| [assign_user_role_to_business.sql](agora/assign_user_role_to_business.sql) | Asignar rol manualmente |
| assign_branches_to_group.sql | Asignar sucursales a grupo |
| assign_missing_branch.sql | Asignar sucursal faltante |

#### Branding y configuración
| Archivo | Descripción |
|---------|-------------|
| fix_branding_functions.sql | Corregir funciones de branding |
| fix_businesses_settings_column.sql | Columna settings de negocios |
| setup_storage_policies.sql | Políticas storage generales |
| setup_storage_policies_branding.sql | Políticas storage branding |
| setup_storage_policies_sliders.sql | Políticas storage sliders |
| fix_storage_policies_products.sql / fix_storage_policies_sliders.sql | Corregir políticas storage |

#### Email (templates y políticas)
| Archivo | Descripción |
|---------|-------------|
| add_logo_url_to_email_templates.sql | Logo en templates de correo |
| add_email_templates_policies_to_personalizacion.sql | Políticas templates en personalización |
| recreate_get_email_template_function.sql | Recrear función get_email_template |
| recreate_order_confirmation_template.sql | Template confirmación pedido |
| recreate_order_status_change_template.sql | Template cambio estado |
| recreate_user_registration_template.sql | Template registro usuario |
| query_email_template_detail.sql | Consulta detalle template |
| [query_sucursales_activas_con_administradores.sql](agora/query_sucursales_activas_con_administradores.sql) | Sucursales activas con usuario administrador (email para entrar) |

#### Integraciones (KarloPay, etc.)
| Archivo | Descripción |
|---------|-------------|
| add_karlopay_redirect_url.sql | URL redirect KarloPay |
| verify_karlopay_redirect_url.sql | Verificar URL KarloPay |
| fix_integrations_karlopay.sql | Corregir integración KarloPay |

#### Productos y catálogo
| Archivo | Descripción |
|---------|-------------|
| cleanup_old_categories.sql | Limpiar categorías antiguas |
| update_products_category_from_mapping.sql | Actualizar categoría desde mapping |
| verify_business_groups_summary.sql | Resumen grupos empresariales |

#### Documentación
| Archivo | Descripción |
|---------|-------------|
| [README.md](agora/README.md) | Guía y orden de ejecución AGORA |
| README_PRODUCT_IMAGES.md | Imágenes de productos |
| strategy_email_templates.md | Estrategia templates de correo |

---

### `segments/` — Schema modular (por segmentos)

| Archivo | Descripción |
|---------|-------------|
| 00_INSTRUCCIONES.md | Instrucciones de uso |
| 00_habilitar_postgis.sql | Habilitar PostGIS |
| 00_diagnostico_postgis.sql | Diagnóstico PostGIS |
| 01_tablas_schema_core.sql | Tablas schema core |
| 02_tablas_schema_catalog.sql | Tablas schema catalog |
| 03_tablas_schema_orders.sql | Tablas schema orders |
| 04_tablas_schema_reviews.sql | Tablas schema reviews |
| 05_tablas_schema_communication.sql | Tablas schema communication |
| 06_tablas_schema_commerce.sql | Tablas schema commerce |
| 07_tablas_schema_social.sql | Tablas schema social |
| 08_triggers_y_funciones.sql | Triggers y funciones |
| 09_sistema_api_keys.sql | API Keys |
| 10_catalogo_categorias_negocios.sql | Categorías de negocios |
| 11_sistema_regiones_servicio.sql | Regiones de servicio |
| 12_funcion_get_location_region.sql | Función get_location_region |
| 13_roles_negocio_multi_tiendas.sql | Roles y multi-tiendas |
| 14_gestion_usuarios_cuenta_superadmin.sql | Usuarios superadmin |
| 15_sistema_avanzado_catalogos.sql | Catálogos avanzados |
| 16_config_campos_por_tipo_producto.sql | Campos por tipo producto |
| 17_sistema_impuestos.sql | Impuestos |
| 18_sistema_carrito_compras.sql | Carrito de compras |
| [README.md](segments/README.md) | Orden de ejecución y estado |

---

## Por tema (consulta rápida)

- **Esquema base:** `schema/schema.sql`, `schema/init_agora_ecosystem.sql`
- **API Keys:** `schema/api_keys_schema.sql`, `segments/09_sistema_api_keys.sql`
- **Roles y multi-tiendas:** `schema/business_roles_and_multi_store.sql`, `agora/trigger_auto_assign_business_owner_role.sql`, `agora/fix_missing_business_users_roles.sql`, `agora/assign_user_role_to_business.sql`, `fixes/` (roles)
- **Grupos empresariales:** `agora/migration_business_groups.sql`, `agora/assign_branches_to_group.sql`, `agora/seed_business_groups_*.sql`
- **Sucursales (branch):** `agora/migration_branch_fields.sql`, `agora/migration_branch_notification_settings*.sql`, `migrations/migration_add_branch_id_to_cart_items.sql`
- **Branding:** `agora/migration_business_branding.sql`, `agora/fix_branding_functions.sql`, `agora/setup_storage_policies_branding.sql`
- **Vehículos y compatibilidad:** `agora/migration_vehicle_compatibility.sql`, `agora/migration_business_vehicle_brands.sql`, `agora/migration_user_vehicles.sql`, `agora/seed_toyota_vehicles.sql`, `fixes/fix_product_vehicle_compatibility_logic.sql`
- **Productos y catálogo:** `agora/migration_product_types_refacciones.sql`, `agora/migration_product_branch_availability.sql`, `agora/seed_refacciones_catalog.sql`, `migrations/migration_advanced_catalog_system.sql`
- **Pedidos y store_context:** `agora/migration_add_store_context_to_orders.sql`, `migrations/migration_add_order_group_id.sql`
- **Carrito:** `migrations/migration_shopping_cart.sql`, `migrations/migration_add_branch_id_to_cart_items.sql`, `segments/18_sistema_carrito_compras.sql`
- **Wallet y pagos:** `migrations/migration_create_wallet_system.sql`, `migrations/migration_create_payment_transactions_table.sql`, `migrations/migration_fix_wallet_types.sql`
- **Envíos (Skydropx):** `migrations/migration_create_shipping_labels_table.sql`, `migrations/migration_add_*_shipping*.sql`, `migrations/migration_add_skydropx_settings*.sql`
- **Email (templates):** `agora/migration_email_templates.sql`, `agora/recreate_*_template.sql`, `agora/add_logo_url_to_email_templates.sql`
- **Storage (Supabase):** `storage/` (crear bucket, políticas, fix, verify)
- **Zonas de cobertura:** `schema/service_regions.sql`, `schema/get_location_region.sql`, `seeds/insert_*_zone.sql`
- **Diagnóstico:** `diagnostics/` (login, direcciones, envíos, imágenes)
- **Correcciones puntuales:** `fixes/`

---

## Documentación en raíz

| Archivo | Descripción |
|---------|-------------|
| [README.md](README.md) | Guía general, estructura y uso |
| [INIT_INSTRUCTIONS.md](INIT_INSTRUCTIONS.md) | Instrucciones de inicialización |

---

**Volver:** [README.md](README.md)
