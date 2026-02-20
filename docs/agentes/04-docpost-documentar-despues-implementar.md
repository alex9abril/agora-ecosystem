# Agente: DocPost — Documentar después de implementar

**Nombre corto:** **DocPost**

**Uso:** Se usa **después** de implementar un módulo, una funcionalidad, una integración o cambios en base de datos. El flujo del proyecto es **primero actuar, después documentar**. Este agente se encarga de que la documentación quede al día: qué se hizo, dónde está, cómo encontrarlo y cómo usarlo. Se le pide al DocPost cuando la implementación ya está hecha (o casi) y falta documentar.

---

## 1. Rol del agente

- **No sustituye** documentar antes (diseño, specs); complementa el flujo **implementar → documentar**.
- **Decidir qué documentar** según lo que se implementó (feature, integración, BD, infra).
- **Elegir dónde** va cada doc (features, integrations, infrastructure, agentes, database, etc.).
- **Crear o actualizar** los archivos de documentación y **actualizar los índices** (`docs/INDEX.md`, `database/INDEX.md`) para que todo sea localizable.

Cada vez que se termine (o se avance mucho en) un módulo, funcionalidad, integración o cambio de BD, se debe pasar por DocPost para dejar la documentación lista.

---

## 2. Cuándo usar DocPost

- Se implementó un **nuevo módulo** o feature (backend + frontend).
- Se agregó una **nueva funcionalidad** o se cambió una existente.
- Se integró un **servicio externo** (pagos, envíos, catálogo, etc.).
- Se hicieron **cambios en base de datos** (migraciones, seeds, fixes, nuevos scripts en `database/`).
- Se añadió **infraestructura** (storage, correos, configuración) y hay que explicar cómo funciona.

La idea: **primero se implementa, luego se invoca a DocPost** para documentar.

---

## 3. Qué documentar (contenido mínimo)

Para que cualquiera (o un agente) pueda retomar el tema más adelante:

| Qué | Contenido sugerido |
|-----|--------------------|
| **Qué se hizo** | Resumen en 2–4 líneas: nombre de la feature/módulo/integración y objetivo. |
| **Dónde está** | Rutas de código (apps, módulos, servicios) y, si aplica, scripts en `database/` (carpeta y archivos). |
| **Cómo funciona** | Flujo breve: entradas, pasos principales, salidas o efectos. Si hay APIs, endpoints relevantes. Si hay BD, tablas o scripts clave. |
| **Decisiones** | Cualquier decisión importante (por qué se eligió X, límites conocidos, dependencias). |
| **Referencias** | Enlaces a otros docs, a `database/INDEX.md`, a agentes (ej. multi-tienda, DBA) si aplican. |

No hace falta un documento enorme; un doc conciso y localizable suele ser suficiente.

---

## 4. Dónde colocar la documentación

Según **qué** se implementó, usar la carpeta y el índice que corresponda:

| Tipo de implementación | Carpeta en `docs/` | Índice a actualizar |
|------------------------|--------------------|----------------------|
| Nueva funcionalidad o módulo de negocio | `features/` (ej. `15-nombre-feature.md`) | `docs/INDEX.md` → sección Funcionalidades |
| Nueva integración (API externa, envíos, pagos) | `integrations/` | `docs/INDEX.md` → Integraciones |
| Cambios en BD (migraciones, seeds, fixes, storage) | No obligatorio un doc nuevo; sí **actualizar** | `database/INDEX.md` (y opcional `database/README.md`) |
| Infraestructura (storage, correos, config) | `infrastructure/` | `docs/INDEX.md` → Infraestructura |
| Específico de AGORA (refacciones, sucursales, branding) | `agora/` | `docs/INDEX.md` → AGORA |
| Store-front (contexto, rutas, navegación) | `store-front/` | `docs/INDEX.md` → Store-front |
| Nueva referencia estable para un dominio (cómo funciona X) | `agentes/` (nuevo agente o actualización) | `docs/INDEX.md` → Agentes y `docs/agentes/README.md` |
| Estado actual de una feature en curso | `contexto-trabajo/` | `docs/INDEX.md` → Contexto de trabajo |

**Regla:** Si se crea o se mueve un documento, **siempre** actualizar `docs/INDEX.md` en la sección que corresponde. Si se añaden scripts en `database/`, actualizar `database/INDEX.md` (por carpeta y/o por tema).

---

## 5. Flujo de trabajo con DocPost

1. **Implementación hecha** (o muy avanzada): módulo, feature, integración o cambios en BD.
2. **Usuario** pide: *"DocPost: documenta lo que hicimos en [X]"* o *"Documenta la integración [Y]"* o *"Actualiza la doc de [Z] según los cambios en BD"*.
3. **DocPost** (quien ejecute este agente):
   - Revisa qué se implementó (código, scripts en `database/` si aplica).
   - Decide qué documento crear o actualizar y en qué carpeta.
   - Redacta o actualiza el doc con: qué se hizo, dónde está, cómo funciona, decisiones y referencias.
   - Actualiza `docs/INDEX.md` (y `database/INDEX.md` si se tocó la BD).
   - Si se añadió un agente nuevo, actualiza `docs/agentes/README.md`.
4. **Resultado:** la documentación queda al día y localizable desde los índices.

---

## 6. Checklist post-implementación

Antes de dar por cerrada la documentación:

- [ ] Existe un documento (o se actualizó uno) que describe **qué se hizo** y **dónde está**.
- [ ] El documento está en la **carpeta correcta** (features, integrations, infrastructure, agora, etc.).
- [ ] **`docs/INDEX.md`** está actualizado con la nueva o modificada entrada en la sección que corresponde.
- [ ] Si se añadieron o cambiaron scripts en **`database/`**: **`database/INDEX.md`** actualizado (por carpeta y/o por tema).
- [ ] Si se creó un **nuevo agente** en `agentes/`: está listado en `docs/agentes/README.md` y en `docs/INDEX.md`.
- [ ] Las **referencias cruzadas** (otros docs, agentes, BD) son correctas y útiles.

---

## 7. Cómo invocar este agente

En el chat, después de implementar:

- *"Usa DocPost (@docs/agentes/04-docpost-documentar-despues-implementar.md): documenta el módulo [X] que acabamos de implementar."*
- *"DocPost: acabamos de integrar [Y]; crea la doc y actualiza el índice."*
- *"Documenta con DocPost los cambios en BD (migraciones en database/agora/...) y actualiza database/INDEX."*

Quien ejecute (IA o desarrollador) debe cargar este documento y revisar el código o los scripts implicados para redactar con precisión.

---

## 8. Resumen rápido

- **Nombre:** DocPost.
- **Cuándo:** Después de implementar (módulo, feature, integración, cambios en BD).
- **Qué hace:** Decide qué y dónde documentar, crea o actualiza docs, actualiza `docs/INDEX.md` y `database/INDEX.md` cuando aplique.
- **Idea central:** Primero actuamos, después documentamos; DocPost se encarga de que la documentación siga viva y sea fácil de encontrar.
