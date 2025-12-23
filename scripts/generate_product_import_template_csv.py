#!/usr/bin/env python3
"""
Script para generar template CSV para carga masiva de productos
Genera un archivo CSV con columnas completas y 3 ejemplos de productos
Se puede abrir directamente en Excel
"""

import csv

def create_csv_template():
    """Crea el archivo CSV con el template de carga masiva"""
    
    # Definir columnas
    columns = [
        # Información básica
        ("name", "Nombre del Producto", True),
        ("sku", "SKU (Código)", False),
        ("description", "Descripción", False),
        ("price", "Precio Base", True),
        ("product_type", "Tipo de Producto", True),
        ("category_slug", "Slug de Categoría", False),
        ("is_available", "Disponible", False),
        ("is_featured", "Destacado", False),
        ("display_order", "Orden de Visualización", False),
        
        # Especificaciones técnicas (formato simple)
        ("technical_specs", "Especificaciones Técnicas", False),
    ]
    
    # Ejemplos de productos
    examples = [
        {
            "name": "Filtro de Aire Original Toyota",
            "sku": "FIL-AIR-TOY-001",
            "description": "Filtro de aire original Toyota para modelos Corolla 2020-2023. Filtración eficiente de partículas.",
            "price": "150.00",
            "product_type": "refaccion",
            "category_slug": "filtros-aire",
            "is_available": "true",
            "is_featured": "true",
            "display_order": "1",
            "technical_specs": "marca:Toyota|modelo_compatible:Corolla, Camry|años:2020-2023|tipo_filtro:Aire|material:Papel sintético"
        },
        {
            "name": "Aceite Motor 5W-30 Sintético",
            "sku": "ACE-5W30-SYN-001",
            "description": "Aceite de motor sintético 5W-30 de alto rendimiento. Protección superior del motor.",
            "price": "450.00",
            "product_type": "fluido",
            "category_slug": "aceites-motor",
            "is_available": "true",
            "is_featured": "false",
            "display_order": "2",
            "technical_specs": "viscosidad:5W-30|tipo:Sintético|capacidad_litros:1, 4, 5|certificaciones:API SN Plus, ILSAC GF-6|temperatura_operacion:-30°C a 40°C"
        },
        {
            "name": "Instalación de Sistema de Audio",
            "sku": "SERV-AUDIO-INST-001",
            "description": "Servicio profesional de instalación de sistema de audio completo. Incluye mano de obra y garantía.",
            "price": "1200.00",
            "product_type": "servicio_instalacion",
            "category_slug": "servicios-audio",
            "is_available": "true",
            "is_featured": "true",
            "display_order": "3",
            "technical_specs": "tiempo_estimado:2-6 horas|dificultad:Media-Alta|herramientas_requeridas:Destornilladores, alicates, multímetro|garantia:3 meses|incluye:Instalación, cableado, configuración básica"
        }
    ]
    
    # Crear archivo CSV
    filename = "template_carga_masiva_productos.csv"
    with open(filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.writer(csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        
        # Escribir encabezados
        headers = [col[1] for col in columns]
        writer.writerow(headers)
        
        # Escribir ejemplos
        for example in examples:
            row = [example.get(col[0], "") for col in columns]
            writer.writerow(row)
    
    # Crear archivo de instrucciones
    instructions_filename = "INSTRUCCIONES_CARGA_MASIVA.txt"
    with open(instructions_filename, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("INSTRUCCIONES PARA CARGA MASIVA DE PRODUCTOS\n")
        f.write("=" * 80 + "\n\n")
        
        f.write("COLUMNAS REQUERIDAS (marcadas con *):\n")
        f.write("  * name: Nombre del producto (máximo 255 caracteres)\n")
        f.write("  * price: Precio base del producto (formato: 150.00)\n")
        f.write("  * product_type: Tipo de producto (valores válidos):\n")
        f.write("    - refaccion: Refacción (pieza de repuesto)\n")
        f.write("    - accesorio: Accesorio (personalización)\n")
        f.write("    - servicio_instalacion: Servicio de Instalación\n")
        f.write("    - servicio_mantenimiento: Servicio de Mantenimiento\n")
        f.write("    - fluido: Fluidos y Lubricantes\n\n")
        
        f.write("COLUMNAS OPCIONALES:\n")
        f.write("  • sku: Código único del producto (máximo 100 caracteres)\n")
        f.write("  • description: Descripción del producto\n")
        f.write("  • category_slug: Slug de la categoría (ej: 'filtros-aire', 'aceites-motor')\n")
        f.write("    - El slug es el identificador único de la categoría (sin espacios, en minúsculas)\n")
        f.write("    - Si no se especifica, el producto se puede asignar manualmente después\n")
        f.write("  • is_available: true/false (default: true)\n")
        f.write("  • is_featured: true/false (default: false)\n")
        f.write("  • display_order: Número entero (default: 0)\n\n")
        
        f.write("ESPECIFICACIONES TÉCNICAS:\n")
        f.write("  • technical_specs: Especificaciones técnicas del producto en formato simple\n")
        f.write("  • Formato: campo:valor|campo:valor|campo:valor\n")
        f.write("  • Ejemplos:\n")
        f.write("    marca:Toyota|modelo:Corolla|año:2020-2023\n")
        f.write("    viscosidad:5W-30|tipo:Sintético|certificaciones:API SN Plus\n")
        f.write("    tiempo_estimado:2-6 horas|dificultad:Media-Alta|garantia:3 meses\n\n")
        f.write("  • Puedes usar cualquier campo y valor que necesites\n")
        f.write("  • Separa cada especificación con el símbolo | (pipe)\n")
        f.write("  • Formato: nombre_campo:valor_del_campo\n")
        f.write("  • Si un valor contiene espacios, no es necesario usar comillas\n")
        f.write("  • Ejemplo completo:\n")
        f.write("    marca:Toyota|modelo_compatible:Corolla, Camry|años:2020-2023|material:Papel sintético\n\n")
        
        f.write("NOTAS IMPORTANTES:\n")
        f.write("  • NO incluir campos de stock ni relaciones con sucursales\n")
        f.write("  • Solo se considera el precio base del producto\n")
        f.write("  • El category_slug es opcional pero recomendado\n")
        f.write("  • Si no se especifica category_slug, el producto se puede asignar manualmente después\n")
        f.write("  • El slug de categoría debe coincidir exactamente con el slug existente en el sistema\n")
        f.write("  • Para las especificaciones técnicas, usa el formato campo:valor separado por |\n")
        f.write("  • El archivo CSV usa codificación UTF-8 con BOM para compatibilidad con Excel\n\n")
        
        f.write("EJEMPLOS:\n")
        f.write("  El archivo CSV incluye 3 ejemplos completos:\n")
        f.write("  1. Filtro de Aire Original Toyota (refaccion)\n")
        f.write("  2. Aceite Motor 5W-30 Sintético (fluido)\n")
        f.write("  3. Instalación de Sistema de Audio (servicio_instalacion)\n\n")
        
        f.write("USO:\n")
        f.write("  1. Abre el archivo CSV en Excel o Google Sheets\n")
        f.write("  2. Completa las filas con tus productos\n")
        f.write("  3. Guarda el archivo\n")
        f.write("  4. Importa el archivo usando el sistema de carga masiva\n")
    
    print(f"✅ Template creado exitosamente:")
    print(f"   📄 {filename} - Archivo CSV con template y 3 ejemplos")
    print(f"   📄 {instructions_filename} - Instrucciones detalladas")
    print(f"   - Total de columnas: {len(columns)}")
    print(f"   - Ejemplos incluidos: {len(examples)}")
    print(f"\n💡 El archivo CSV está codificado en UTF-8 con BOM para abrir correctamente en Excel")

if __name__ == "__main__":
    create_csv_template()

