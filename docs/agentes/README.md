# Agentes (contexto de dominio)

Documentos de **referencia estable** por dominio del proyecto. Sirven para que un agente (IA) o un desarrollador retome un tema sin tener que re-explicar: "cómo funciona X en este proyecto", tablas clave, flujos y archivos de referencia.

## Dónde va cada cosa

| Ubicación | Uso |
|-----------|-----|
| **`docs/agentes/`** (esta carpeta) | Referencia **estable** por dominio: tiendas, pagos, carrito, correos, etc. Un archivo por "agente" o área. Contenido: cómo funciona, BD, APIs, convenciones. |
| **`docs/contexto-trabajo/`** | Contexto **de trabajo en curso**: estado actual de una feature, pendientes, decisiones recientes. Ej: "correo confirmación – qué está hecho y qué falta". |

Así no mezclas "cómo funciona las tiendas" (referencia permanente) con "qué estamos haciendo esta semana en correos" (contexto de trabajo).

## Cómo usar los agentes

Cuando retomes un tema, en el chat indica el archivo del agente, por ejemplo:

- *"Mira @docs/agentes/tiendas-multi-contexto.md, necesito que..."*
- *"Según el agente de tiendas, quiero agregar..."*

El agente leerá ese documento y usará ese contexto como base.

## Archivos en esta carpeta

- **`01-multitienda-contexto-global-grupo-sucursal.md`** – **MultiTienda:** contexto global, grupo, sucursal, marca. Los 4 tipos de tienda, URLs, BD (`core.business_groups`, `core.businesses`, `catalog.vehicle_brands`, `orders.store_context`), StoreContext.

- **`02-griant-feature-desde-espec.md`** – **GRIANT** (Grijalva + Antonio): definir y/o implementar features. Puede **definir** reglas, módulo o funcionamiento antes de desarrollar; o **implementar** todas las capas (BD → backend → front). Contexto multi-tienda obligatorio. Uso: *"Mediante GRIANT define [módulo/reglas]"*, *"Usa GRIANT para [implementar X]"*, *"GRIANT: quiero [X]"*.

- **`03-dba-base-datos-reglas.md`** – **DBA:** base de datos, reglas, migraciones, seeds, fixes. Punto único para todo lo que toque la BD; no ejecuta scripts. Uso: *"DBA: quiero [migración/seed/fix/regla]..."*.

- **`04-docpost-documentar-despues-implementar.md`** – **DocPost:** documentar después de implementar. Actualiza docs e índices cuando ya se implementó módulo, feature o integración. Uso: *"DocPost: documenta [lo que implementamos en X]."*

- **`05-apps-tres-fronts-backend.md`** – **Apps:** tres fronts (web-admin, web-local, store-front) y backend. Referencia para saber en qué app va cada UI; GRIANT la usa en la capa frontend. Uso: *"Según Apps, ¿dónde va [pantalla]?"*

Para nuevos dominios: crea un archivo nuevo (ej: `pagos-karlopay.md`, `carrito-checkout.md`) con la misma idea: qué es, tablas/flujos clave, archivos de referencia.
