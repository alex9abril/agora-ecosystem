# Índice de documentación — AGORA Ecosystem

Índice manual para localizar cualquier documento por categoría o por tema.  
Rutas relativas desde `docs/`.

---

## Por categoría (estructura de carpetas)

### Raíz
| Documento | Descripción |
|-----------|-------------|
| [README.md](./README.md) | Punto de entrada y enlaces rápidos |
| [INTRODUCTION.md](./INTRODUCTION.md) | Introducción a la documentación y uso |
| [INDEX.md](./INDEX.md) | Este índice |
| [CHANGELOG.md](./CHANGELOG.md) | Registro de cambios |

---

### 1. Visión y estrategia (`vision-and-strategy/`)
| Documento | Descripción |
|-----------|-------------|
| [01-vision-general.md](./vision-and-strategy/01-vision-general.md) | Visión del proyecto y actores (cliente, local, repartidor) |
| [02-modelo-operacion.md](./vision-and-strategy/02-modelo-operacion.md) | Modelo de operación y LocalCoins |
| [03-arquitectura-mvp.md](./vision-and-strategy/03-arquitectura-mvp.md) | Arquitectura y roadmap MVP |
| [04-modelo-financiero.md](./vision-and-strategy/04-modelo-financiero.md) | Modelo financiero y monetización |
| [05-estrategia-roma.md](./vision-and-strategy/05-estrategia-roma.md) | Estrategia Roma CDMX |
| [06-responsabilidad-social.md](./vision-and-strategy/06-responsabilidad-social.md) | Responsabilidad social y sostenibilidad |
| [07-red-social-ecologica.md](./vision-and-strategy/07-red-social-ecologica.md) | Red social ecológica |
| [08-expansion-impacto.md](./vision-and-strategy/08-expansion-impacto.md) | Expansión y medición de impacto |
| [09-gantt-conceptual.md](./vision-and-strategy/09-gantt-conceptual.md) | Gantt conceptual (Mermaid) |
| [10-gantt-conceptual.csv](./vision-and-strategy/10-gantt-conceptual.csv), [11-gantt-conceptual.mmd](./vision-and-strategy/11-gantt-conceptual.mmd) | Fuente del Gantt |

---

### 2. Desarrollo y configuración (`development/`)
| Documento | Descripción |
|-----------|-------------|
| [01-estructura-repositorio.md](./development/01-estructura-repositorio.md) | Estructura del repositorio (monorepo) |
| [02-recomendacion-backend.md](./development/02-recomendacion-backend.md) | Recomendación backend |
| [03-configuracion-entorno.md](./development/03-configuracion-entorno.md) | Configuración de entorno |
| [04-autenticacion-seguridad.md](./development/04-autenticacion-seguridad.md) | Autenticación y seguridad |
| [05-swagger-documentacion.md](./development/05-swagger-documentacion.md) | Swagger y documentación API |
| [06-api-keys-autenticacion.md](./development/06-api-keys-autenticacion.md) | API Keys y autenticación |
| [07-configuracion-supabase-redirects.md](./development/07-configuracion-supabase-redirects.md) | Configuración Supabase redirects |
| [08-setup-env.md](./development/08-setup-env.md) | Setup rápido variables de entorno |
| [09-setup-supabase-quick.md](./development/09-setup-supabase-quick.md) | Configuración rápida Supabase |
| [10-stack-tecnologico.md](./development/10-stack-tecnologico.md) | Stack tecnológico AGORA |

---

### 3. Operaciones y despliegue (`operations/`)
| Documento | Descripción |
|-----------|-------------|
| [01-jenkins-setup.md](./operations/01-jenkins-setup.md) | Configuración Jenkins para monorepo |
| [02-jenkins-deploy.md](./operations/02-jenkins-deploy.md) | Deploy con Jenkins a producción |
| [03-nginx-agora.example.conf](./operations/03-nginx-agora.example.conf) | Ejemplo configuración nginx AGORA |

---

### 4. Funcionalidades y sistemas (`features/`)
| Documento | Descripción |
|-----------|-------------|
| [01-catalogos-gestion.md](./features/01-catalogos-gestion.md) | Catálogos disponibles para gestión |
| [02-analisis-tipos-negocios-alimentos.md](./features/02-analisis-tipos-negocios-alimentos.md) | Análisis tipos de negocios (alimentos) |
| [03-roles-negocio-multi-tiendas.md](./features/03-roles-negocio-multi-tiendas.md) | Roles de negocio y múltiples tiendas |
| [04-gestion-zonas-cobertura.md](./features/04-gestion-zonas-cobertura.md) | Gestión de zonas de cobertura |
| [05-sistema-catalogos-productos-avanzado.md](./features/05-sistema-catalogos-productos-avanzado.md) | Sistema de catálogos avanzado |
| [06-sistema-impuestos-configurable.md](./features/06-sistema-impuestos-configurable.md) | Sistema de impuestos configurable |
| [07-roles-negocio-interfaces-diferenciadas.md](./features/07-roles-negocio-interfaces-diferenciadas.md) | Roles e interfaces diferenciadas |
| [08-proceso-seguimiento-pedidos-postventa.md](./features/08-proceso-seguimiento-pedidos-postventa.md) | Seguimiento pedidos y postventa |
| [09-configuracion-storage-buckets.md](./features/09-configuracion-storage-buckets.md) | Políticas RLS Storage (Supabase) |
| [10-sistema-monedero-electronico-wallet.md](./features/10-sistema-monedero-electronico-wallet.md) | Sistema monedero electrónico (Wallet) |
| [11-modulo-gestion-sliders-landing.md](./features/11-modulo-gestion-sliders-landing.md) | Módulo sliders landing |
| [12-proceso-checkout-multi-sucursal.md](./features/12-proceso-checkout-multi-sucursal.md) | Proceso checkout multi-sucursal |
| [13-checkout-implementation-plan.md](./features/13-checkout-implementation-plan.md) | Plan implementación checkout |
| [14-diagrama-flujo-estados-pedido.md](./features/14-diagrama-flujo-estados-pedido.md) | Diagrama flujo estados del pedido |

---

### 5. AGORA — Refacciones y producto (`agora/`)
| Documento | Descripción |
|-----------|-------------|
| [README.md](./agora/README.md) | Índice documentación AGORA refacciones |
| [01-transformacion-refacciones.md](./agora/01-transformacion-refacciones.md) | Transformación a refacciones |
| [02-estructura-categorias-refacciones.md](./agora/02-estructura-categorias-refacciones.md) | Estructura categorías refacciones |
| [03-sistema-compatibilidad-vehiculos.md](./agora/03-sistema-compatibilidad-vehiculos.md) | Compatibilidad de vehículos |
| [04-recapitulacion-compatibilidad-vehiculos.md](./agora/04-recapitulacion-compatibilidad-vehiculos.md) | Recapitulación compatibilidad |
| [05-sistema-configuraciones-impuestos.md](./agora/05-sistema-configuraciones-impuestos.md) | Configuraciones e impuestos (AGORA) |
| [06-sistema-roles-sucursales.md](./agora/06-sistema-roles-sucursales.md) | Sistema roles sucursales |
| [07-sistema-personalizacion-branding.md](./agora/07-sistema-personalizacion-branding.md) | Personalización y branding |
| [08-sistema-roles-sucursales.md](./agora/08-sistema-roles-sucursales.md) | Roles y permisos sucursales |
| [09-checklist-alta-sucursal-refacciones.md](./agora/09-checklist-alta-sucursal-refacciones.md) | Checklist alta sucursal refacciones |
| [10-prompt-frontend-mejoras-grupos-empresariales.md](./agora/10-prompt-frontend-mejoras-grupos-empresariales.md) | Mejoras frontend grupos empresariales |

---

### 6. Store-front — Contexto y navegación (`store-front/`)
| Documento | Descripción |
|-----------|-------------|
| [01-resumen-solucion-contexto.md](./store-front/01-resumen-solucion-contexto.md) | Resumen solución contexto (global/grupo/sucursal) |
| [02-contexto-navegacion-mini-tienda.md](./store-front/02-contexto-navegacion-mini-tienda.md) | Contexto navegación mini-tienda |
| [03-ejemplos-implementacion-contexto.md](./store-front/03-ejemplos-implementacion-contexto.md) | Ejemplos implementación contexto |
| [04-resumen-logica-filtrado-sucursales.md](./store-front/04-resumen-logica-filtrado-sucursales.md) | Lógica filtrado por contexto (global/grupo/sucursal/brand) |

---

### 7. Integraciones (`integrations/`)
| Documento | Descripción |
|-----------|-------------|
| [01-catalogo-distribuidores-sync.md](./integrations/01-catalogo-distribuidores-sync.md) | Sincronización catálogo distribuidores |
| [02-logistics-service.md](./integrations/02-logistics-service.md) | Servicio de logística |
| [03-skydropx.md](./integrations/03-skydropx.md) | Integración Skydropx (envíos) |
| [04-skydropx-metodos-utiles.md](./integrations/04-skydropx-metodos-utiles.md) | Métodos útiles Skydropx |
| [05-verificar-shipment-response.md](./integrations/05-verificar-shipment-response.md) | Verificación respuesta envíos |

---

### 8. Infraestructura (`infrastructure/`)
| Documento | Descripción |
|-----------|-------------|
| [01-configuracion-storage-buckets.md](./infrastructure/01-configuracion-storage-buckets.md) | Configuración buckets Storage |
| [02-diagnostico-storage-service-role.md](./infrastructure/02-diagnostico-storage-service-role.md) | Diagnóstico storage (service role) |
| [03-email-order-confirmation-image-url-flow.md](./infrastructure/03-email-order-confirmation-image-url-flow.md) | Flujo URL imagen correo confirmación |
| [04-email-order-confirmation-where-image-comes-from.md](./infrastructure/04-email-order-confirmation-where-image-comes-from.md) | Origen imagen correo confirmación pedido |
| [05-guia-configuracion-storage-products.md](./infrastructure/05-guia-configuracion-storage-products.md) | Guía configuración storage productos |
| [06-solucion-storage-products-manual.md](./infrastructure/06-solucion-storage-products-manual.md) | Solución storage productos (manual) |

---

### 9. Seguridad (`security/`)
| Documento | Descripción |
|-----------|-------------|
| [securitypolicy/README.md](./security/securitypolicy/README.md) | Cuestionario y contexto política de seguridad |
| [securitypolicy/02-policies.md](./security/securitypolicy/02-policies.md) | Políticas formales de seguridad |

---

### 10. MVP (`MVP/`)
| Documento | Descripción |
|-----------|-------------|
| [README.md](./MVP/README.md) | Índice documentación MVP |
| [01-alcance-mvp.md](./MVP/01-alcance-mvp.md) | Alcance MVP |
| [02-analisis-preguntas-estrategicas.md](./MVP/02-analisis-preguntas-estrategicas.md) | Análisis preguntas estratégicas |
| [03-preguntas-estrategicas-po.md](./MVP/03-preguntas-estrategicas-po.md) | Preguntas estratégicas (PO) |

---

### 11. Referencia (`reference/`)
| Documento | Descripción |
|-----------|-------------|
| [01-categorias-toyota-autoparts.md](./reference/01-categorias-toyota-autoparts.md) | Categorías Toyota Autoparts (resumen) |
| [02-categorias-toyota-autoparts-completo.md](./reference/02-categorias-toyota-autoparts-completo.md) | Categorías Toyota Autoparts (completo) |

---

### 12. Contexto de trabajo (`contexto-trabajo/`)
| Documento | Descripción |
|-----------|-------------|
| [README.md](./contexto-trabajo/README.md) | Uso de contexto de trabajo |
| [correo-confirmacion-pedido.md](./contexto-trabajo/correo-confirmacion-pedido.md) | Estado y decisiones: correo confirmación pedido |
| [01-definicion-modulo-configuracion-por-marca.md](./contexto-trabajo/01-definicion-modulo-configuracion-por-marca.md) | Definición (GRIANT): configuración y branding por marca (tienda por marca) |
| [02-multitienda-reglas-gestion-y-fulfillment.md](./contexto-trabajo/02-multitienda-reglas-gestion-y-fulfillment.md) | Reglas MultiTienda: quién gestiona qué, cuentas (grupo vs marca), fulfillment por distribuidor, visibilidad ventas, margen global |
| [03-tiendas-y-distribuidores.md](./contexto-trabajo/03-tiendas-y-distribuidores.md) | **Tiendas vs distribuidores:** tienda = canal de venta; distribuidor = quien tiene producto en almacén (puede no tener tienda propia y estar montado en una o más tiendas) |

---

### 13. Agentes (`agentes/`)
| Documento | Descripción |
|-----------|-------------|
| [README.md](./agentes/README.md) | Uso de documentación por dominio/agente |
| [01-multitienda-contexto-global-grupo-sucursal.md](./agentes/01-multitienda-contexto-global-grupo-sucursal.md) | **MultiTienda:** contexto global, grupo, sucursal, marca |
| [02-griant-feature-desde-espec.md](./agentes/02-griant-feature-desde-espec.md) | **GRIANT:** feature desde espec (BD → backend → front) |
| [03-dba-base-datos-reglas.md](./agentes/03-dba-base-datos-reglas.md) | **DBA:** base de datos, reglas, migraciones, seeds, fixes |
| [04-docpost-documentar-despues-implementar.md](./agentes/04-docpost-documentar-despues-implementar.md) | **DocPost:** documentar después de implementar |
| [05-apps-tres-fronts-backend.md](./agentes/05-apps-tres-fronts-backend.md) | **Apps:** web-admin, web-local, store-front y backend |

---

## Por tema (consulta rápida)

- **Visión y negocio:** vision-and-strategy (01–11).
- **Setup y desarrollo:** development (01–10).
- **Deploy y servidor:** operations (01–03).
- **Catálogos, roles, pedidos, wallet, sliders, checkout:** features (01–14).
- **Refacciones, compatibilidad vehículos, branding, checklist sucursal:** agora.
- **Tienda por contexto (URL, filtros):** store-front.
- **Skydropx, logística, envíos, catálogo distribuidores:** integrations.
- **Storage (Supabase), correo confirmación:** infrastructure.
- **Políticas de seguridad:** security.
- **Alcance MVP y planificación:** MVP.
- **Categorías Toyota:** reference.
- **Estado actual de una feature:** contexto-trabajo.
- **Referencia estable por dominio (IA):** agentes.

---

**Volver:** [README](./README.md) | [INTRODUCTION](./INTRODUCTION.md)
