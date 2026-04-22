# Documentación AGORA Ecosystem

Punto de entrada a la documentación del proyecto **AGORA** (marketplace de refacciones y accesorios).

---

## Cómo empezar

| Documento | Uso |
|-----------|-----|
| **[INTRODUCTION.md](./INTRODUCTION.md)** | Introducción a la documentación, propósito y uso de carpetas. |
| **[INDEX.md](./INDEX.md)** | **Índice manual** — buscar cualquier documento por categoría o por tema. |

---

## Estructura por contenido

La documentación está organizada en carpetas por tema. Para localizar un documento concreto, usar **[INDEX.md](./INDEX.md)**.

| Carpeta | Contenido |
|---------|-----------|
| [vision-and-strategy/](./vision-and-strategy/) | Visión, modelo de operación, arquitectura MVP, financiero, estrategia, sostenibilidad, expansión, Gantt (01–08). |
| [development/](./development/) | Estructura repo, backend, entorno, auth, Swagger, API keys, Supabase, setup rápido, stack (09–15 + guías). |
| [operations/](./operations/) | Jenkins (configuración y deploy), nginx. |
| [features/](./features/) | Catálogos, roles, zonas, impuestos, pedidos, storage, wallet, sliders, checkout (16–26 y procesos). |
| [agora/](./agora/) | Refacciones: transformación, categorías, compatibilidad vehículos, impuestos, branding, roles sucursales, checklist alta. |
| [store-front/](./store-front/) | Contexto de tienda (global/grupo/sucursal/marca), navegación, filtrado. |
| [integrations/](./integrations/) | Skydropx, catálogo distribuidores, workflows de ingesta por distribuidor, logística, envíos. |
| [infrastructure/](./infrastructure/) | Storage (Supabase buckets), correo (confirmación pedido, imágenes). |
| [security/](./security/) | Políticas de seguridad, cuestionario. |
| [MVP/](./MVP/) | Alcance MVP, preguntas estratégicas. |
| [reference/](./reference/) | Categorías Toyota Autoparts (referencia). |
| [contexto-trabajo/](./contexto-trabajo/) | Estado actual de features; usar con `@docs/contexto-trabajo/...`. |
| [agentes/](./agentes/) | Referencia estable por dominio (tiendas, etc.); usar con `@docs/agentes/...`. |

---

## Navegación rápida

- **Visión y negocio:** [vision-and-strategy/](./vision-and-strategy/)
- **Setup y desarrollo:** [development/](./development/) (incl. [10-stack-tecnologico.md](./development/10-stack-tecnologico.md), [08-setup-env.md](./development/08-setup-env.md))
- **Deploy:** [operations/02-jenkins-deploy.md](./operations/02-jenkins-deploy.md), [operations/01-jenkins-setup.md](./operations/01-jenkins-setup.md)
- **AGORA refacciones:** [agora/README.md](./agora/README.md)
- **Store-front (contextos):** [store-front/](./store-front/)
- **Consultar cualquier doc:** [INDEX.md](./INDEX.md)

---

## Notas

- Algunos documentos conservan enlaces “Anterior / Siguiente” que pueden apuntar a rutas antiguas; usar [INDEX.md](./INDEX.md) para encontrar la ruta actual.
- **CHANGELOG:** [CHANGELOG.md](./CHANGELOG.md).

---

**Volver al repo:** [README principal](../README.md)
