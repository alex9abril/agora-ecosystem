# Changelog

## Menú de personalización clonado a web-local (2026-01-12)
- Se agregó la UI de personalización (logos, colores, fuentes, textos, redes sociales, CSS/JS personalizado) a `apps/web-local/src/pages/settings/branches.tsx` mediante la acción **Personalizar** por sucursal, usando el `BrandingManager` compartido.
- `BrandingManager` se copió desde web-admin a `apps/web-local/src/components/branding/BrandingManager.tsx` y se conectó a los endpoints existentes de branding en backend (`/businesses/{id}/branding` y variantes de carga).
- Nueva dependencia en web-local: `react-color` (y `@types/react-color`) agregada en `apps/web-local/package.json`; instalar con `npm install` dentro de `apps/web-local`.
