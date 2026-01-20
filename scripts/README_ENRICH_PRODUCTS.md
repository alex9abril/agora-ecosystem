# 🚀 Enriquecimiento de Productos con IA

Este script te permite enriquecer automáticamente tus productos usando Inteligencia Artificial. Solo necesitas un Excel básico con número de parte, nombre, existencia y precio, y el script completará toda la información faltante.

## 📋 Requisitos

### Dependencias de Python

```bash
pip install pandas openpyxl openai requests pillow
```

### API Keys (Opcionales)

#### OpenAI API Key (Para enriquecimiento con IA)

Para usar la funcionalidad completa de IA, necesitas una API Key de OpenAI:

1. Crea una cuenta en [OpenAI](https://platform.openai.com/)
2. Genera una API Key en la sección de API Keys
3. Configura la variable de entorno:
   ```bash
   export OPENAI_API_KEY="tu-api-key-aqui"
   ```

**Nota:** Si no tienes API Key, el script funcionará en modo básico usando detección por palabras clave.

#### Unsplash API Key (Para búsqueda de imágenes)

Para buscar imágenes automáticamente, puedes usar Unsplash (gratis):

1. Crea una cuenta en [Unsplash Developers](https://unsplash.com/developers)
2. Crea una aplicación y obtén tu Access Key
3. Configura la variable de entorno:
   ```bash
   export UNSPLASH_ACCESS_KEY="tu-access-key-aqui"
   ```

**Nota:** Si no tienes API Key de Unsplash, el script dejará las URLs de imagen vacías y podrás completarlas manualmente.

## 📊 Formato del Excel de Entrada

Tu Excel debe tener al menos estas columnas (los nombres pueden variar):

| Columna | Descripción | Requerido |
|---------|-------------|-----------|
| **Nombre** | Nombre del producto | ✅ Sí |
| **Precio** | Precio del producto | ✅ Sí |
| **Número de Parte** | SKU o código del producto | ❌ No |
| **Existencia** | Stock disponible | ❌ No |

### Nombres de columnas aceptados:

- **Nombre**: `nombre`, `name`, `producto`, `descripcion`
- **Precio**: `precio`, `price`, `precio_unitario`, `costo`
- **Número de Parte**: `numero_de_parte`, `número_de_parte`, `part_number`, `partnumber`, `sku`, `codigo`, `código`
- **Existencia**: `existencia`, `stock`, `inventario`, `cantidad`

## 🎯 Uso

### Uso Básico

```bash
python scripts/enrich_products_with_ai.py --input productos.xlsx --output productos_completos.xlsx
```

### Con API Key de OpenAI

```bash
python scripts/enrich_products_with_ai.py \
  --input productos.xlsx \
  --output productos_completos.xlsx \
  --openai-key "tu-api-key-aqui"
```

### Con OpenAI y búsqueda de imágenes (Unsplash)

```bash
python scripts/enrich_products_with_ai.py \
  --input productos.xlsx \
  --output productos_completos.xlsx \
  --openai-key "tu-api-key-openai" \
  --unsplash-key "tu-access-key-unsplash"
```

### Sin IA (solo detección básica)

```bash
python scripts/enrich_products_with_ai.py \
  --input productos.xlsx \
  --output productos_completos.xlsx \
  --no-ai
```

### Sin búsqueda de imágenes

```bash
python scripts/enrich_products_with_ai.py \
  --input productos.xlsx \
  --output productos_completos.xlsx \
  --no-images
```

## 📤 Formato del Excel de Salida

El script genera un Excel con las siguientes columnas:

| Columna | Descripción | Fuente |
|---------|-------------|--------|
| **Nombre del Producto** | Nombre del producto | Original |
| **SKU (Número de Parte)** | Código del producto | Original |
| **Descripción** | Descripción detallada generada por IA | IA |
| **URL de Imagen** | URL de imagen (vacía, completar manualmente) | Manual |
| **Precio Base** | Precio del producto | Original |
| **Tipo de Producto** | `refaccion`, `accesorio`, `fluido`, etc. | IA/Detectado |
| **Slug de Categoría** | Slug de categoría (completar manualmente) | Manual |
| **Disponible** | `true`/`false` basado en existencia | Calculado |
| **Destacado** | `false` por defecto | Default |
| **Orden de Visualización** | `0` por defecto | Default |
| **Especificaciones Técnicas** | Especificaciones en formato pipe-separated | IA |
| **Existencia Original** | Stock original del Excel | Original |

## 🤖 ¿Qué hace la IA?

Cuando usas la API de OpenAI, el script:

1. **Genera descripciones detalladas** del producto basadas en el nombre y número de parte
2. **Detecta el tipo de producto** (`refaccion`, `accesorio`, `servicio_instalacion`, `servicio_mantenimiento`, `fluido`)
3. **Sugiere categorías** apropiadas
4. **Extrae especificaciones técnicas** como:
   - Marcas compatibles
   - Modelos compatibles
   - Años compatibles
   - Otras especificaciones relevantes
5. **Genera palabras clave** para búsqueda de imágenes

## 🖼️ Búsqueda de Imágenes

Si configuras la API Key de Unsplash, el script intentará buscar imágenes automáticamente:

- Busca imágenes relacionadas con el nombre del producto y número de parte
- Usa las palabras clave generadas por la IA
- Retorna la URL de la imagen más relevante
- Si no encuentra imagen, deja el campo vacío para completar manualmente

**Nota:** Las imágenes de Unsplash son genéricas. Para productos específicos (como autopartes), es recomendable agregar las URLs manualmente desde el sitio web del fabricante o distribuidor.

## 🔍 Detección de Tipo de Producto

El script detecta automáticamente el tipo de producto basándose en palabras clave:

- **Refacciones**: filtro, pastilla, disco, bujía, sensor, correa, manguera, amortiguador, etc.
- **Accesorios**: audio, bocina, pantalla, led, alarma, cámara, spoiler, etc.
- **Servicios de Instalación**: instalación, montaje, colocación
- **Servicios de Mantenimiento**: mantenimiento, servicio, cambio, revisión, alineación
- **Fluidos**: aceite, líquido, refrigerante, aditivo, lubricante

## 📝 Próximos Pasos Después del Enriquecimiento

1. **Revisa el archivo generado** y verifica que:
   - Las descripciones sean correctas
   - Los tipos de producto sean apropiados
   - Las especificaciones técnicas sean precisas

2. **Completa las URLs de imágenes**:
   - Busca imágenes del producto en internet
   - Agrega las URLs en la columna "URL de Imagen"
   - O sube las imágenes manualmente después de importar

3. **Asigna categorías**:
   - Abre `catalogo_categorias.csv` (generado por `generate_product_import_template_csv.py`)
   - Busca la categoría apropiada
   - Copia el slug de la categoría
   - Pégalo en la columna "Slug de Categoría"

4. **Importa el archivo** usando el sistema de carga masiva del backend

## 💡 Ejemplo de Uso Completo

```bash
# 1. Tienes un Excel con productos básicos
# productos_basicos.xlsx contiene:
#   - Nombre: "Filtro de Aire Toyota"
#   - Precio: 150.00
#   - Número de Parte: "17801-0V010"
#   - Existencia: 10

# 2. Ejecutas el script
python scripts/enrich_products_with_ai.py \
  --input productos_basicos.xlsx \
  --output productos_completos.xlsx \
  --openai-key "sk-..."

# 3. El script genera productos_completos.xlsx con:
#   - Descripción: "Filtro de aire original Toyota para modelos..."
#   - Tipo: "refaccion"
#   - Especificaciones: "marca_compatible:Toyota|modelos_compatibles:Corolla, Camry|..."
#   - Disponible: "true" (porque existencia > 0)

# 4. Revisas y completas:
#   - Agregas URL de imagen
#   - Asignas categoría (ej: "filtros")
#   - Verificas que todo esté correcto

# 5. Importas el archivo al sistema
```

## ⚠️ Limitaciones

1. **Imágenes**: 
   - El script puede buscar imágenes genéricas usando Unsplash, pero para productos específicos (autopartes) es mejor agregar URLs manualmente desde el sitio del fabricante
   - Las imágenes de Unsplash pueden no ser exactamente del producto específico

2. **Categorías**: El script no asigna categorías automáticamente. Debes completarlas usando el catálogo de categorías.

3. **Costo de IA**: Si usas OpenAI API, cada producto consume tokens. El costo aproximado es:
   - GPT-4o-mini: ~$0.001 por producto
   - Para 1000 productos: ~$1 USD

4. **Precisión**: La IA puede cometer errores. Siempre revisa los resultados antes de importar.

5. **Rate Limits**: 
   - OpenAI tiene límites de velocidad. El script procesa productos uno por uno para evitar exceder los límites
   - Unsplash tiene límites de 50 requests por hora (gratis)

## 🛠️ Solución de Problemas

### Error: "Faltan columnas requeridas"
- Verifica que tu Excel tenga al menos las columnas "Nombre" y "Precio"
- Los nombres de columnas pueden variar (ver sección de formato)

### Error: "OpenAI no está disponible"
- Instala OpenAI: `pip install openai`
- O usa el modo básico: `--no-ai`

### El script es muy lento
- El script procesa productos uno por uno para evitar rate limits
- Para muchos productos, considera procesar en lotes

### Las descripciones no son precisas
- Revisa manualmente y ajusta las descripciones
- Considera agregar más contexto en el nombre del producto

## 📚 Archivos Relacionados

- `generate_product_import_template_csv.py`: Genera template para carga masiva
- `catalogo_categorias.csv`: Catálogo de categorías disponibles
- `INSTRUCCIONES_CARGA_MASIVA.txt`: Instrucciones detalladas de importación

## 🤝 Contribuir

Si encuentras problemas o tienes sugerencias, por favor:
1. Revisa los logs del script
2. Verifica que todas las dependencias estén instaladas
3. Asegúrate de que el formato del Excel sea correcto

