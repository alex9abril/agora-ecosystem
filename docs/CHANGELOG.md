# Changelog

## Normalizacion de slugs en sucursales web-local (2026-01-16)
- `apps/web-local/src/pages/settings/branches.tsx` ahora normaliza acentos/diacriticos al generar slugs (NFD + sin marcas), evitando que caracteres como `á`, `é`, `í`, `ó`, `ú` o `ñ` se eliminen y garantizando URLs limpias.

## Sliders muestran activos e inactivos en web-local (2026-01-16)
- La gestión de sliders en `apps/web-local/src/pages/sliders/index.tsx` deja de filtrar por `only_active`; siempre lista todos los sliders y muestra su estado activo/inactivo.
- El DTO `ListLandingSlidersDto` ahora interpreta `only_active` con valor por defecto `false`, de modo que el backend devuelve activos e inactivos a menos que se solicite explícitamente `only_active=true`.
- El servicio `landing-sliders` en backend mantiene el filtrado únicamente cuando se envía `only_active=true`, evitando que los sliders desactivados “desaparezcan” al recargar la página.

## Paginacion persistente en clientes web-local (2026-01-15)
- `apps/web-local/src/pages/clients/index.tsx` ahora usa el mismo sistema de paginacion de productos: selector de tamano de pagina (1/10/20/50/100), controles primera/anterior/siguiente/ultima y conteo de rango mostrado.
- Las preferencias de pagina y tamano se guardan en `localStorage` (`clients_current_page`, `clients_page_size`) y se limpian al salir de la seccion de clientes, manteniendo la posicion al volver desde el detalle.
- La busqueda se dispara al enviar el formulario, reseteando a la pagina 1 y enviando el termino al backend junto con los filtros actuales.
- La busqueda de clientes ahora se hace directamente en base de datos (no solo en la pagina actual), enviando el termino y filtros en la peticion de lista.
- `apps/backend/src/modules/clients/clients.service.ts` corrige el uso de parametros en la clausula de busqueda para evitar el error 500 al buscar por nombre/correo/telefono.

## Búsqueda de pedidos por folio en web-local (2026-01-15)
- `apps/backend/src/modules/orders/orders.service.ts` normaliza el término de búsqueda y permite buscar por UUID limpio o por los últimos 8 caracteres del folio, manteniendo el filtro por sucursal.
- `apps/web-local/src/pages/orders/index.tsx` ahora dispara la búsqueda solo al enviar el formulario (botón o Enter) y usa el mismo estilo de botón que productos; el término se manda al backend en cada envío.
- `apps/web-local/src/pages/operations/index.tsx` envía la búsqueda al backend (removiendo `#` inicial) y elimina el filtrado local, asegurando búsqueda en base de datos por sucursal, incluyendo folios, sin depender de la paginación.

## Persistencia de paginacion en productos web-local (2026-01-13)
- El listado de productos en `apps/web-local/src/pages/products/index.tsx` ahora recuerda el tamano de pagina y la pagina actual usando `localStorage` (`products_page_size` y `products_current_page`), evitando que al refrescar o volver desde el detalle se reinicie a los valores por defecto.
- El selector de tamano de pagina sigue ofreciendo 10/20/50/100 (configurado en `PAGE_SIZE_OPTIONS`); al cambiarlo se reinicia a la pagina 1, pero la preferencia queda guardada para futuras visitas.
- La navegacion de busqueda continua reseteando a pagina 1 como antes, mientras la numeracion estandar se conserva entre visitas para mantener la posicion del usuario en el listado.
- Las preferencias se limpian automaticamente al navegar fuera de la seccion de productos, de modo que no se aplican en otras paginas (p. ej. pedidos).

## Selector de categorias en web-local (2026-01-14)
- El selector de categorias en `apps/web-local` ahora pagina hasta obtener todas las categorias globales activas, eliminando el limite efectivo de 100 resultados.
- La lista muestra todas las categorias al enfocar el campo; al escribir se filtra por nombre, descripcion o ruta completa manteniendo padres/hijos visibles.
- Las subcategorias se indentan visualmente segun su nivel para aclarar la jerarquia mientras se busca y selecciona.

## Busqueda de productos en web-local (2026-01-13)
- El listado de productos en `apps/web-local/src/pages/products/index.tsx` ahora dispara la busqueda solo al enviar (Enter o boton **Buscar**) y pasa el termino al backend; se elimino el filtrado en vivo por cada tecla.
- `productsService.getProducts` acepta el parametro `search` y lo agrega a los query params, asegurando que la busqueda use el catalogo completo en base de datos.
- Los filtros por sucursal/no asignados se mantienen en el cliente sobre la pagina de resultados devuelta por el backend.

## Menu de personalizacion clonado a web-local (2026-01-12)
- Se agrego la UI de personalizacion (logos, colores, fuentes, textos, redes sociales, CSS/JS personalizado) a `apps/web-local/src/pages/settings/branches.tsx` mediante la accion **Personalizar** por sucursal, usando el `BrandingManager` compartido.
- `BrandingManager` se copio desde web-admin a `apps/web-local/src/components/branding/BrandingManager.tsx` y se conecto a los endpoints existentes de branding en backend (`/businesses/{id}/branding` y variantes de carga).
- Nueva dependencia en web-local: `react-color` (y `@types/react-color`) agregada en `apps/web-local/package.json`; instalar con `npm install` dentro de `apps/web-local`.
