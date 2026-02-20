# Introduction — AGORA Ecosystem Documentation

This folder contains the **official documentation** for the **AGORA** project: a marketplace and online store for **auto parts and accessories** (refacciones y accesorios), with support for multiple store contexts (global, business group, branch, and vehicle brand).

## Purpose of this documentation

- **Onboard** new developers and stakeholders with a clear structure.
- **Reference** technical decisions, architecture, and operational procedures.
- **Support** development and operations with setup, deployment, and integration guides.
- **Preserve** business context (vision, strategy, features) and domain-specific knowledge (AGORA refacciones, store-front, integrations).

The documentation is organized **by content** into themed folders. Use the **[INDEX](./INDEX.md)** to find any document by topic or by name.

## How to use it

1. **Start here:** [README](./README.md) — entry point and quick links.
2. **Find something:** [INDEX](./INDEX.md) — full manual index by category and topic.
3. **Context when resuming work:** `docs/contexto-trabajo/` — state of a feature, pending items, key decisions.
4. **Stable domain reference:** `docs/agentes/` — how a given area works (e.g. tiendas, pagos); use with `@docs/agentes/...` in AI-assisted workflows.

## Folder structure (by content)

| Folder | Content |
|--------|--------|
| **vision-and-strategy** | Vision, business model, architecture, finance, strategy, sustainability, expansion, Gantt. |
| **development** | Repo structure, backend recommendation, environment setup, auth, Swagger, API keys, Supabase redirects, stack. |
| **operations** | Jenkins (setup and deploy), nginx example. |
| **features** | Catalogs, roles, zones, taxes, orders, storage, wallet, sliders, checkout, flow diagrams. |
| **agora** | AGORA-specific: refacciones, vehicle compatibility, branding, roles per branch, checklist for new branches. |
| **store-front** | Store context (global/grupo/sucursal/marca), navigation, filtering logic. |
| **integrations** | Skydropx, catalog sync, logistics, shipment verification. |
| **infrastructure** | Storage (Supabase buckets, policies, troubleshooting), email (order confirmation flow, image URLs). |
| **security** | Security policy, questionnaire, evidence. |
| **MVP** | MVP scope, strategic questions, planning. |
| **reference** | Reference data (e.g. Toyota autoparts categories). |
| **contexto-trabajo** | Work-in-progress context per topic. |
| **agentes** | Stable domain reference for AI-assisted work (handled separately). |

## Conventions

- **Numbered docs (01–26):** Original sequence is preserved in filenames; they are grouped into the folders above. Use INDEX to locate them.
- **Cross-references:** Some documents still use relative links (e.g. “Anterior / Siguiente”). If a link is broken after reorganization, use [INDEX](./INDEX.md) to find the current path.
- **Language:** Most content is in Spanish; technical terms and folder names may be in English for consistency with code and tooling.

## Maintenance

- When adding new documentation, place it in the folder that matches its **content** and add an entry to [INDEX](./INDEX.md).
- Keep **contexto-trabajo** for “current state of X”; keep **agentes** for “how X works” (stable reference).

---

**Back to:** [README](./README.md) | **Browse all:** [INDEX](./INDEX.md)
