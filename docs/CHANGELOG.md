# Changelog

## Selector de categorías en web-local (2026-01-14)
- El selector de categorías en `apps/web-local` ahora pagina hasta obtener todas las categorías globales activas, eliminando el límite efectivo de 100 resultados.
- La lista muestra todas las categorías al enfocar el campo; al escribir se filtra por nombre, descripción o ruta completa manteniendo padres/hijos visibles.
- Las subcategorías se indentan visualmente según su nivel para aclarar la jerarquía mientras se busca y selecciona.

## Busqueda de productos en web-local (2026-01-13)
- El listado de productos en `apps/web-local/src/pages/products/index.tsx` ahora dispara la busqueda solo al enviar (Enter o boton **Buscar**) y pasa el termino al backend; se elimino el filtrado en vivo por cada tecla.
- `productsService.getProducts` acepta el parametro `search` y lo agrega a los query params, asegurando que la busqueda use el catalogo completo en base de datos.
- Los filtros por sucursal/no asignados se mantienen en el cliente sobre la pagina de resultados devuelta por el backend.

## Menu de personalizacion clonado a web-local (2026-01-12)
- Se agrego la UI de personalizacion (logos, colores, fuentes, textos, redes sociales, CSS/JS personalizado) a `apps/web-local/src/pages/settings/branches.tsx` mediante la accion **Personalizar** por sucursal, usando el `BrandingManager` compartido.
- `BrandingManager` se copio desde web-admin a `apps/web-local/src/components/branding/BrandingManager.tsx` y se conecto a los endpoints existentes de branding en backend (`/businesses/{id}/branding` y variantes de carga).
- Nueva dependencia en web-local: `react-color` (y `@types/react-color`) agregada en `apps/web-local/package.json`; instalar con `npm install` dentro de `apps/web-local`.
