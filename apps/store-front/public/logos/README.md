# Logos de marcas (decorativo)

Las marcas del carrusel en la home se leen de `brands.json`. Las imágenes deben estar en esta misma carpeta.

## Regenerar la lista desde la carpeta

Si agregas o quitas imágenes aquí, regenera el JSON desde la raíz de **store-front**:

```bash
node scripts/generate-brands-json.js
```

El script incluye todos los `.svg` y `.png` de esta carpeta y genera el nombre de la marca a partir del nombre del archivo (ej. `logo_Toyota.png` → "Toyota"). Luego puedes editar `brands.json` a mano si quieres cambiar algún nombre.
