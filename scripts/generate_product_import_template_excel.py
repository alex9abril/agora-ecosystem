#!/usr/bin/env python3
"""
Script para generar template Excel para carga masiva de productos
Genera un archivo Excel con:
- Hoja 1: Template de productos con campos de envío
- Hoja 2: Catálogo de categorías con relación padre-hijo
"""

import csv
import re
import unicodedata

def slugify(text):
    """Convierte un texto a slug (sin espacios, minúsculas, sin acentos)"""
    # Normalizar unicode
    text = unicodedata.normalize('NFD', text)
    # Remover acentos
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    # Convertir a minúsculas
    text = text.lower()
    # Reemplazar espacios y caracteres especiales con guiones
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    # Remover guiones al inicio y final
    text = text.strip('-')
    return text

def parse_categories_from_sql():
    """Parsea el INSERT SQL para extraer categorías"""
    sql_insert = """INSERT INTO "catalog"."product_categories" ("id", "business_id", "name", "description", "icon_url", "parent_category_id", "display_order", "is_active", "created_at", "updated_at", "attributes") VALUES ('00000001-0000-0000-0000-000000000001', null, 'Refacciones', 'Piezas de repuesto y componentes originales y alternativos para vehículos', null, null, '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000010', null, 'Motor', 'Componentes del motor y sistema de combustión', null, '00000001-0000-0000-0000-000000000001', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000011', null, 'Filtros', 'Filtros de aceite, aire, combustible y habitáculo', null, '00000001-0000-0000-0000-000000000010', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000012', null, 'Bujías y Encendido', 'Bujías, cables, bobinas y componentes de encendido', null, '00000001-0000-0000-0000-000000000010', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000013', null, 'Correas y Mangueras', 'Correas de distribución, alternador, mangueras de radiador y calefacción', null, '00000001-0000-0000-0000-000000000010', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000014', null, 'Sensores del Motor', 'Sensores de temperatura, presión, posición y otros sensores', null, '00000001-0000-0000-0000-000000000010', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000015', null, 'Radiador y Enfriamiento', 'Radiadores, termostatos, bombas de agua y componentes de enfriamiento', null, '00000001-0000-0000-0000-000000000010', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000016', null, 'Componentes de Sincronización', 'Cadenas, engranajes y componentes de sincronización del motor', null, '00000001-0000-0000-0000-000000000010', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000017', null, 'Aceites y Lubricantes', 'Aceites de motor, aditivos y lubricantes', null, '00000001-0000-0000-0000-000000000010', '7', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000020', null, 'Sistema de Frenos', 'Componentes del sistema de frenos', null, '00000001-0000-0000-0000-000000000001', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000021', null, 'Pastillas de Freno', 'Pastillas de freno delanteras y traseras', null, '00000001-0000-0000-0000-000000000020', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000022', null, 'Discos y Tambores', 'Discos de freno, tambores y componentes relacionados', null, '00000001-0000-0000-0000-000000000020', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000023', null, 'Pinzas y Cilindros', 'Pinzas de freno, cilindros maestros y de rueda', null, '00000001-0000-0000-0000-000000000020', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000024', null, 'Líquido de Frenos', 'Líquido de frenos DOT 3, DOT 4, DOT 5', null, '00000001-0000-0000-0000-000000000020', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000025', null, 'Líneas y Mangueras', 'Mangueras de freno, líneas de freno y conectores', null, '00000001-0000-0000-0000-000000000020', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000026', null, 'Sensores de Freno', 'Sensores de desgaste y sensores ABS', null, '00000001-0000-0000-0000-000000000020', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000030', null, 'Suspensión y Dirección', 'Componentes de suspensión, dirección y alineación', null, '00000001-0000-0000-0000-000000000001', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000031', null, 'Amortiguadores y Puntales', 'Amortiguadores, puntales, resortes y componentes de suspensión', null, '00000001-0000-0000-0000-000000000030', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000032', null, 'Rótulas y Terminales', 'Rótulas, terminales de dirección y componentes de dirección', null, '00000001-0000-0000-0000-000000000030', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000033', null, 'Barras y Cremalleras', 'Barras de dirección, cremalleras y componentes de dirección asistida', null, '00000001-0000-0000-0000-000000000030', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000034', null, 'Baleros y Rodamientos', 'Baleros de rueda, rodamientos y componentes de soporte', null, '00000001-0000-0000-0000-000000000030', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000035', null, 'Componentes de Alineación', 'Brazos de control, bujes y componentes para alineación', null, '00000001-0000-0000-0000-000000000030', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000036', null, 'Líquido de Dirección', 'Líquido de dirección asistida y fluidos hidráulicos', null, '00000001-0000-0000-0000-000000000030', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000040', null, 'Sistema Eléctrico', 'Componentes eléctricos y electrónicos del vehículo', null, '00000001-0000-0000-0000-000000000001', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000041', null, 'Baterías', 'Baterías de auto, baterías de moto y baterías de respaldo', null, '00000001-0000-0000-0000-000000000040', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000042', null, 'Alternadores', 'Alternadores y reguladores de voltaje', null, '00000001-0000-0000-0000-000000000040', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000043', null, 'Arrancadores', 'Motor de arranque y solenoides', null, '00000001-0000-0000-0000-000000000040', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000044', null, 'Fusibles y Relés', 'Fusibles, relés y cajas de fusibles', null, '00000001-0000-0000-0000-000000000040', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000045', null, 'Cables y Terminales', 'Cables de batería, terminales y conectores eléctricos', null, '00000001-0000-0000-0000-000000000040', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000046', null, 'Sensores Eléctricos', 'Sensores de velocidad, posición y otros sensores eléctricos', null, '00000001-0000-0000-0000-000000000040', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000050', null, 'Combustible y Emisiones', 'Sistema de combustible, escape y control de emisiones', null, '00000001-0000-0000-0000-000000000001', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000051', null, 'Filtros de Combustible', 'Filtros de combustible y filtros de inyector', null, '00000001-0000-0000-0000-000000000050', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000052', null, 'Bombas de Combustible', 'Bombas de combustible eléctricas y mecánicas', null, '00000001-0000-0000-0000-000000000050', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000053', null, 'Sistema de Escape', 'Mofles, tubos de escape, convertidores catalíticos', null, '00000001-0000-0000-0000-000000000050', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000054', null, 'Sensores de Emisiones', 'Sensores de oxígeno (O2), sensores de temperatura de escape', null, '00000001-0000-0000-0000-000000000050', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000055', null, 'Inyectores', 'Inyectores de combustible y componentes relacionados', null, '00000001-0000-0000-0000-000000000050', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000056', null, 'Tanque y Líneas', 'Tanques de combustible, líneas y válvulas', null, '00000001-0000-0000-0000-000000000050', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000060', null, 'Transmisión y Tren Motriz', 'Componentes de transmisión y tren motriz', null, '00000001-0000-0000-0000-000000000001', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000061', null, 'Embragues', 'Kits de embrague, discos, platos y componentes', null, '00000001-0000-0000-0000-000000000060', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000062', null, 'Líquido de Transmisión', 'Aceite de transmisión automática y manual', null, '00000001-0000-0000-0000-000000000060', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000063', null, 'Filtros de Transmisión', 'Filtros de transmisión y componentes relacionados', null, '00000001-0000-0000-0000-000000000060', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000064', null, 'Juntas Homocinéticas', 'Juntas homocinéticas, semiejes y componentes del tren motriz', null, '00000001-0000-0000-0000-000000000060', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000065', null, 'Componentes de Transmisión', 'Solenoides, válvulas y componentes internos de transmisión', null, '00000001-0000-0000-0000-000000000060', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000070', null, 'Control de Clima', 'Sistema de aire acondicionado y calefacción', null, '00000001-0000-0000-0000-000000000001', '7', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000071', null, 'Compresor de Aire Acondicionado', 'Compresores, condensadores y componentes del sistema AC', null, '00000001-0000-0000-0000-000000000070', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000072', null, 'Evaporador y Núcleo', 'Evaporadores, núcleos de calefacción y componentes', null, '00000001-0000-0000-0000-000000000070', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000073', null, 'Refrigerante', 'Refrigerante R134a, R1234yf y otros refrigerantes', null, '00000001-0000-0000-0000-000000000070', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000074', null, 'Filtros de Aire de Cabina', 'Filtros de aire de habitáculo y filtros HEPA', null, '00000001-0000-0000-0000-000000000070', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000075', null, 'Ventiladores y Motores', 'Ventiladores de radiador, motores de ventilador y componentes', null, '00000001-0000-0000-0000-000000000070', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000080', null, 'Carrocería y Exterior', 'Componentes de carrocería, cristales y exterior', null, '00000001-0000-0000-0000-000000000001', '8', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000081', null, 'Parabrisas y Cristales', 'Parabrisas, ventanas laterales y cristales traseros', null, '00000001-0000-0000-0000-000000000080', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000082', null, 'Espejos', 'Espejos retrovisores exteriores e interiores', null, '00000001-0000-0000-0000-000000000080', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000083', null, 'Defensas y Parachoques', 'Parachoques delanteros y traseros, defensas', null, '00000001-0000-0000-0000-000000000080', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000084', null, 'Capó y Puertas', 'Capós, puertas, bisagras y componentes de carrocería', null, '00000001-0000-0000-0000-000000000080', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000085', null, 'Emblemas y Logos', 'Emblemas de marca, logos y letreros', null, '00000001-0000-0000-0000-000000000080', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000090', null, 'Mantenimiento y Fluidos', 'Aceites, fluidos y productos de mantenimiento', null, '00000001-0000-0000-0000-000000000001', '9', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000091', null, 'Aceites de Motor', 'Aceites sintéticos, convencionales y de alto kilometraje', null, '00000001-0000-0000-0000-000000000090', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000092', null, 'Aditivos', 'Aditivos para motor, combustible y sistemas', null, '00000001-0000-0000-0000-000000000090', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000093', null, 'Fluidos Hidráulicos', 'Líquido de dirección, líquido de frenos y fluidos hidráulicos', null, '00000001-0000-0000-0000-000000000090', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000094', null, 'Productos de Limpieza', 'Limpiadores de motor, desengrasantes y productos de mantenimiento', null, '00000001-0000-0000-0000-000000000090', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000100', null, 'Iluminación', 'Faros, calaveras, luces y componentes de iluminación', null, '00000001-0000-0000-0000-000000000001', '10', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000101', null, 'Faros y Calaveras', 'Faros delanteros, calaveras traseras y componentes', null, '00000001-0000-0000-0000-000000000100', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000102', null, 'Focos y Bombillas', 'Bombillas H4, H7, LED y otros tipos de focos', null, '00000001-0000-0000-0000-000000000100', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000103', null, 'Luces de Señalización', 'Luces direccionales, intermitentes y de emergencia', null, '00000001-0000-0000-0000-000000000100', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000001-0000-0000-0000-000000000104', null, 'Luces Interiores', 'Luces de techo, luces de cortesía y iluminación interior', null, '00000001-0000-0000-0000-000000000100', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000001', null, 'Accesorios', 'Productos de personalización, mejora y comodidad para vehículos', null, null, '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000010', null, 'Audio y Multimedia', 'Sistemas de audio, pantallas y multimedia', null, '00000002-0000-0000-0000-000000000001', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000011', null, 'Sistemas de Audio', 'Estéreos, pantallas táctiles y sistemas multimedia', null, '00000002-0000-0000-0000-000000000010', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000012', null, 'Bocinas y Altavoces', 'Bocinas, tweeters, subwoofers y sistemas de sonido', null, '00000002-0000-0000-0000-000000000010', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000013', null, 'Amplificadores', 'Amplificadores de audio y procesadores de señal', null, '00000002-0000-0000-0000-000000000010', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000014', null, 'Accesorios de Audio', 'Cables, adaptadores y accesorios para sistemas de audio', null, '00000002-0000-0000-0000-000000000010', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000020', null, 'Iluminación', 'Luces LED, faros auxiliares y accesorios de iluminación', null, '00000002-0000-0000-0000-000000000001', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000021', null, 'Luces LED', 'Kits de luces LED, tiras LED y accesorios LED', null, '00000002-0000-0000-0000-000000000020', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000022', null, 'Faros Auxiliares', 'Faros de niebla, faros de trabajo y luces auxiliares', null, '00000002-0000-0000-0000-000000000020', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000023', null, 'Luces de Neón', 'Tubos de neón, luces de ambiente y efectos de iluminación', null, '00000002-0000-0000-0000-000000000020', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000030', null, 'Seguridad', 'Alarmas, sistemas de seguridad y protección', null, '00000002-0000-0000-0000-000000000001', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000031', null, 'Alarmas', 'Sistemas de alarma, inmovilizadores y seguridad', null, '00000002-0000-0000-0000-000000000030', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000032', null, 'Cámaras y Sensores', 'Cámaras de reversa, sensores de estacionamiento y sistemas de visión', null, '00000002-0000-0000-0000-000000000030', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000033', null, 'Cerraduras y Seguridad', 'Cerraduras eléctricas, bloqueadores y sistemas de seguridad', null, '00000002-0000-0000-0000-000000000030', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000040', null, 'Estética y Personalización', 'Accesorios decorativos y de personalización', null, '00000002-0000-0000-0000-000000000001', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000041', null, 'Calcomanías y Vinilos', 'Calcomanías decorativas, vinilos y gráficos', null, '00000002-0000-0000-0000-000000000040', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000042', null, 'Spoilers y Alerones', 'Spoilers traseros, alerones y componentes aerodinámicos', null, '00000002-0000-0000-0000-000000000040', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000043', null, 'Emblemas y Logos Personalizados', 'Emblemas personalizados, logos y letreros decorativos', null, '00000002-0000-0000-0000-000000000040', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000044', null, 'Accesorios Decorativos', 'Molduras, protectores y accesorios de estilo', null, '00000002-0000-0000-0000-000000000040', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000050', null, 'Confort e Interior', 'Accesorios de comodidad y organización interior', null, '00000002-0000-0000-0000-000000000001', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000051', null, 'Tapetes y Alfombras', 'Tapetes de piso, alfombras y protectores', null, '00000002-0000-0000-0000-000000000050', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000052', null, 'Fundas para Asientos', 'Fundas para asientos, protectores y cobertores', null, '00000002-0000-0000-0000-000000000050', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000053', null, 'Organizadores', 'Organizadores de consola, portaobjetos y accesorios de organización', null, '00000002-0000-0000-0000-000000000050', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000054', null, 'Accesorios de Limpieza', 'Aspiradoras, productos de limpieza y cuidado interior', null, '00000002-0000-0000-0000-000000000050', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000055', null, 'Ambientadores', 'Ambientadores, purificadores y aromatizantes', null, '00000002-0000-0000-0000-000000000050', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000060', null, 'Performance', 'Accesorios para mejorar el rendimiento del vehículo', null, '00000002-0000-0000-0000-000000000001', '6', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000061', null, 'Filtros de Alto Flujo', 'Filtros de aire de alto rendimiento y filtros de aceite', null, '00000002-0000-0000-0000-000000000060', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000062', null, 'Escape Deportivo', 'Sistemas de escape deportivo y componentes de rendimiento', null, '00000002-0000-0000-0000-000000000060', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000063', null, 'Chips y Módulos', 'Chips de potencia, módulos de rendimiento y reprogramación', null, '00000002-0000-0000-0000-000000000060', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000064', null, 'Componentes de Rendimiento', 'Turbos, supercargadores y componentes de potencia', null, '00000002-0000-0000-0000-000000000060', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000070', null, 'Carga y Transporte', 'Portaequipajes, remolques y accesorios de carga', null, '00000002-0000-0000-0000-000000000001', '7', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000071', null, 'Portaequipajes', 'Barras de techo, portaequipajes y sistemas de carga', null, '00000002-0000-0000-0000-000000000070', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000072', null, 'Remolques y Accesorios', 'Bolas de remolque, enganches y accesorios para remolque', null, '00000002-0000-0000-0000-000000000070', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000002-0000-0000-0000-000000000073', null, 'Portabicicletas', 'Portabicicletas de techo y traseros', null, '00000002-0000-0000-0000-000000000070', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000001', null, 'Instalación', 'Servicios de instalación profesional de refacciones y accesorios', null, null, '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000010', null, 'Instalación de Refacciones', 'Servicio profesional de instalación de componentes y piezas de repuesto', null, '00000003-0000-0000-0000-000000000001', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000011', null, 'Instalación de Motor', 'Instalación de componentes del motor: filtros, bujías, correas, sensores', null, '00000003-0000-0000-0000-000000000010', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000012', null, 'Instalación de Frenos', 'Instalación de pastillas, discos, pinzas y componentes de frenos', null, '00000003-0000-0000-0000-000000000010', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000013', null, 'Instalación de Suspensión', 'Instalación de amortiguadores, puntales y componentes de suspensión', null, '00000003-0000-0000-0000-000000000010', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000014', null, 'Instalación Eléctrica', 'Instalación de baterías, alternadores, arrancadores y componentes eléctricos', null, '00000003-0000-0000-0000-000000000010', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000015', null, 'Instalación de Transmisión', 'Instalación de embragues y componentes de transmisión', null, '00000003-0000-0000-0000-000000000010', '5', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000020', null, 'Instalación de Accesorios', 'Instalación profesional de accesorios de audio, iluminación y personalización', null, '00000003-0000-0000-0000-000000000001', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000021', null, 'Instalación de Audio', 'Instalación de sistemas de audio, bocinas y amplificadores', null, '00000003-0000-0000-0000-000000000020', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000022', null, 'Instalación de Iluminación', 'Instalación de luces LED, faros auxiliares y sistemas de iluminación', null, '00000003-0000-0000-0000-000000000020', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000023', null, 'Instalación de Seguridad', 'Instalación de alarmas, cámaras y sistemas de seguridad', null, '00000003-0000-0000-0000-000000000020', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000024', null, 'Instalación de Accesorios Estéticos', 'Instalación de spoilers, alerones y accesorios de personalización', null, '00000003-0000-0000-0000-000000000020', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000030', null, 'Servicios de Mantenimiento', 'Cambio de aceite, alineación, balanceo y mantenimiento preventivo', null, '00000003-0000-0000-0000-000000000001', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000031', null, 'Cambio de Aceite', 'Servicio de cambio de aceite y filtro', null, '00000003-0000-0000-0000-000000000030', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000032', null, 'Alineación y Balanceo', 'Alineación de dirección y balanceo de llantas', null, '00000003-0000-0000-0000-000000000030', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000033', null, 'Mantenimiento Preventivo', 'Revisión general, mantenimiento programado y servicios preventivos', null, '00000003-0000-0000-0000-000000000030', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000034', null, 'Servicio de Fluidos', 'Cambio de fluidos: transmisión, dirección, frenos, refrigerante', null, '00000003-0000-0000-0000-000000000030', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000040', null, 'Diagnóstico y Reparación', 'Escaneo computarizado, diagnóstico de fallas y servicios de reparación', null, '00000003-0000-0000-0000-000000000001', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000041', null, 'Escaneo Computarizado', 'Escaneo OBD-II, lectura de códigos y diagnóstico electrónico', null, '00000003-0000-0000-0000-000000000040', '1', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000042', null, 'Diagnóstico de Fallas', 'Diagnóstico de problemas mecánicos y eléctricos', null, '00000003-0000-0000-0000-000000000040', '2', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000043', null, 'Reparación Mecánica', 'Servicios de reparación de motor, transmisión y sistemas mecánicos', null, '00000003-0000-0000-0000-000000000040', '3', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}'), ('00000003-0000-0000-0000-000000000044', null, 'Reparación Eléctrica', 'Reparación de sistemas eléctricos y electrónicos', null, '00000003-0000-0000-0000-000000000040', '4', 'true', '2025-12-02 16:17:26.466459', '2025-12-02 16:17:26.466459', '{}');"""
    
    # Parsear el SQL para extraer categorías
    categories = {}
    parent_map = {}
    
    # Extraer solo la parte VALUES del INSERT
    values_match = re.search(r'VALUES\s+(.+)', sql_insert, re.DOTALL)
    if not values_match:
        return []
    
    values_section = values_match.group(1)
    
    # Extraer todos los grupos de valores entre paréntesis
    # Usar un enfoque más robusto que maneje comillas anidadas
    all_matches = []
    current = ""
    depth = 0
    in_quotes = False
    escape_next = False
    
    for char in values_section:
        if escape_next:
            current += char
            escape_next = False
            continue
        
        if char == '\\':
            escape_next = True
            current += char
            continue
        
        if char == "'" and not escape_next:
            in_quotes = not in_quotes
            current += char
        elif char == '(' and not in_quotes:
            if depth == 0:
                current = ""
            else:
                current += char
            depth += 1
        elif char == ')' and not in_quotes:
            depth -= 1
            if depth == 0:
                all_matches.append(current)
                current = ""
            else:
                current += char
        else:
            current += char
    
    # Función auxiliar para extraer valores
    def unquote(s):
        s = s.strip()
        if s == 'null':
            return None
        if s.startswith("'") and s.endswith("'"):
            return s[1:-1]
        return s
    
    for match in all_matches:
        # Dividir por comas, pero respetando comillas simples
        parts = []
        current = ""
        in_quotes = False
        escape_next = False
        
        for char in match:
            if escape_next:
                current += char
                escape_next = False
                continue
            
            if char == '\\':
                escape_next = True
                current += char
                continue
            
            if char == "'":
                in_quotes = not in_quotes
                current += char
            elif char == ',' and not in_quotes:
                parts.append(current.strip())
                current = ""
            else:
                current += char
        if current:
            parts.append(current.strip())
        
        if len(parts) < 6:
            continue
        
        # Validar que el primer campo sea un UUID válido
        first_field = unquote(parts[0]) if parts else ""
        if not first_field or not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', first_field, re.IGNORECASE):
            continue
        
        cat_id = unquote(parts[0])
        business_id = unquote(parts[1])
        name = unquote(parts[2])
        description = unquote(parts[3]) or ""
        icon_url = unquote(parts[4])
        parent_id = unquote(parts[5])
        display_order = unquote(parts[6]) or "0"
        is_active = unquote(parts[7]) if len(parts) > 7 else "true"
        
        if not cat_id or not name:
            continue
        
        slug = slugify(name)
        
        categories[cat_id] = {
            'id': cat_id,
            'name': name,
            'slug': slug,
            'description': description,
            'parent_id': parent_id,
            'display_order': int(display_order) if display_order.isdigit() else 0,
            'level': 0  # Se calculará después
        }
        
        if parent_id:
            parent_map[cat_id] = parent_id
    
    # Calcular niveles de jerarquía
    def calculate_level(cat_id, visited=None):
        if visited is None:
            visited = set()
        if cat_id in visited:
            return 0  # Evitar ciclos
        visited.add(cat_id)
        
        cat = categories.get(cat_id)
        if not cat or not cat['parent_id']:
            return 0
        
        parent = categories.get(cat['parent_id'])
        if not parent:
            return 0
        
        return 1 + calculate_level(cat['parent_id'], visited)
    
    for cat_id in categories:
        categories[cat_id]['level'] = calculate_level(cat_id)
    
    # Construir árbol de categorías
    def get_category_path(cat_id):
        cat = categories.get(cat_id)
        if not cat:
            return []
        path = [cat['name']]
        if cat['parent_id']:
            path = get_category_path(cat['parent_id']) + path
        return path
    
    # Crear lista ordenada para mostrar
    categories_list = []
    for cat_id, cat in categories.items():
        path = get_category_path(cat_id)
        categories_list.append({
            'id': cat_id,
            'name': cat['name'],
            'slug': cat['slug'],
            'description': cat['description'],
            'parent_id': cat['parent_id'],
            'parent_name': categories.get(cat['parent_id'], {}).get('name', '') if cat['parent_id'] else '',
            'parent_slug': categories.get(cat['parent_id'], {}).get('slug', '') if cat['parent_id'] else '',
            'path': ' > '.join(path),
            'level': cat['level'],
            'display_order': cat['display_order']
        })
    
    # Ordenar por nivel y display_order
    categories_list.sort(key=lambda x: (x['level'], x['display_order'], x['name']))
    
    return categories_list

def create_csv_with_categories():
    """Crea archivos CSV separados para productos y categorías"""
    
    # Definir columnas de productos (con campos de envío)
    product_columns = [
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
        
        # Campos para cálculo de envío
        ("weight_kg", "Peso (kg)", False),
        ("length_cm", "Largo (cm)", False),
        ("width_cm", "Ancho (cm)", False),
        ("height_cm", "Alto (cm)", False),
        
        # Especificaciones técnicas
        ("technical_specs", "Especificaciones Técnicas", False),
    ]
    
    # Ejemplos de productos con datos de envío
    examples = [
        {
            "name": "Filtro de Aire Original Toyota",
            "sku": "FIL-AIR-TOY-001",
            "description": "Filtro de aire original Toyota para modelos Corolla 2020-2023. Filtración eficiente de partículas.",
            "price": "150.00",
            "product_type": "refaccion",
            "category_slug": "filtros",
            "is_available": "true",
            "is_featured": "true",
            "display_order": "1",
            "weight_kg": "0.5",
            "length_cm": "25",
            "width_cm": "20",
            "height_cm": "5",
            "technical_specs": "marca:Toyota|modelo_compatible:Corolla, Camry|años:2020-2023|tipo_filtro:Aire|material:Papel sintético"
        },
        {
            "name": "Aceite Motor 5W-30 Sintético",
            "sku": "ACE-5W30-SYN-001",
            "description": "Aceite de motor sintético 5W-30 de alto rendimiento. Protección superior del motor.",
            "price": "450.00",
            "product_type": "fluido",
            "category_slug": "aceites-de-motor",
            "is_available": "true",
            "is_featured": "false",
            "display_order": "2",
            "weight_kg": "0.9",
            "length_cm": "10",
            "width_cm": "10",
            "height_cm": "25",
            "technical_specs": "viscosidad:5W-30|tipo:Sintético|capacidad_litros:1, 4, 5|certificaciones:API SN Plus, ILSAC GF-6|temperatura_operacion:-30°C a 40°C"
        },
        {
            "name": "Instalación de Sistema de Audio",
            "sku": "SERV-AUDIO-INST-001",
            "description": "Servicio profesional de instalación de sistema de audio completo. Incluye mano de obra y garantía.",
            "price": "1200.00",
            "product_type": "servicio_instalacion",
            "category_slug": "instalacion-de-audio",
            "is_available": "true",
            "is_featured": "true",
            "display_order": "3",
            "weight_kg": "",
            "length_cm": "",
            "width_cm": "",
            "height_cm": "",
            "technical_specs": "tiempo_estimado:2-6 horas|dificultad:Media-Alta|herramientas_requeridas:Destornilladores, alicates, multímetro|garantia:3 meses|incluye:Instalación, cableado, configuración básica"
        }
    ]
    
    # Crear archivo CSV de productos
    products_filename = "template_carga_masiva_productos.csv"
    with open(products_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.writer(csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        
        # Escribir encabezados
        headers = [col[1] for col in product_columns]
        writer.writerow(headers)
        
        # Escribir ejemplos
        for example in examples:
            row = [example.get(col[0], "") for col in product_columns]
            writer.writerow(row)
    
    # Parsear categorías
    categories = parse_categories_from_sql()
    
    # Crear archivo CSV de categorías
    categories_filename = "catalogo_categorias.csv"
    with open(categories_filename, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.writer(csvfile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        
        # Encabezados
        writer.writerow([
            "Nivel",
            "Ruta Completa",
            "Nombre",
            "Slug",
            "Descripción",
            "Categoría Padre",
            "Slug Padre"
        ])
        
        # Escribir categorías
        for cat in categories:
            indent = "  " * cat['level']
            writer.writerow([
                cat['level'],
                cat['path'],
                cat['name'],
                cat['slug'],
                cat['description'],
                cat['parent_name'],
                cat['parent_slug']
            ])
    
    # Actualizar instrucciones
    instructions_filename = "INSTRUCCIONES_CARGA_MASIVA.txt"
    with open(instructions_filename, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("INSTRUCCIONES PARA CARGA MASIVA DE PRODUCTOS\n")
        f.write("=" * 80 + "\n\n")
        
        f.write("ARCHIVOS INCLUIDOS:\n")
        f.write("  • template_carga_masiva_productos.csv - Template para productos\n")
        f.write("  • catalogo_categorias.csv - Catálogo completo de categorías con relación padre-hijo\n\n")
        
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
        f.write("  • category_slug: Slug de la categoría (ver catalogo_categorias.csv)\n")
        f.write("    - El slug es el identificador único de la categoría\n")
        f.write("    - Consulta el archivo catalogo_categorias.csv para ver todos los slugs disponibles\n")
        f.write("    - Si no se especifica, el producto se puede asignar manualmente después\n")
        f.write("  • is_available: true/false (default: true)\n")
        f.write("  • is_featured: true/false (default: false)\n")
        f.write("  • display_order: Número entero (default: 0)\n\n")
        
        f.write("CAMPOS PARA CÁLCULO DE ENVÍO:\n")
        f.write("  Estos campos son necesarios para calcular el costo de envío con paqueterías:\n")
        f.write("  • weight_kg: Peso del producto en kilogramos (ej: 0.5, 1.2, 2.5)\n")
        f.write("  • length_cm: Largo del producto en centímetros (ej: 25, 30, 50)\n")
        f.write("  • width_cm: Ancho del producto en centímetros (ej: 20, 15, 30)\n")
        f.write("  • height_cm: Alto del producto en centímetros (ej: 5, 10, 20)\n")
        f.write("  • NOTA: Para servicios (instalación, mantenimiento), estos campos pueden dejarse vacíos\n")
        f.write("  • NOTA: Las paqueterías usan peso y dimensiones para calcular el costo de envío\n")
        f.write("  • NOTA: El volumen se calcula automáticamente: largo × ancho × alto (cm³)\n\n")
        
        f.write("ESPECIFICACIONES TÉCNICAS:\n")
        f.write("  • technical_specs: Especificaciones técnicas del producto en formato simple\n")
        f.write("  • Formato: campo:valor|campo:valor|campo:valor\n")
        f.write("  • Ejemplos:\n")
        f.write("    marca:Toyota|modelo:Corolla|año:2020-2023\n")
        f.write("    viscosidad:5W-30|tipo:Sintético|certificaciones:API SN Plus\n")
        f.write("    tiempo_estimado:2-6 horas|dificultad:Media-Alta|garantia:3 meses\n\n")
        f.write("  • Puedes usar cualquier campo y valor que necesites\n")
        f.write("  • Separa cada especificación con el símbolo | (pipe)\n")
        f.write("  • Formato: nombre_campo:valor_del_campo\n\n")
        
        f.write("CATÁLOGO DE CATEGORÍAS:\n")
        f.write("  El archivo catalogo_categorias.csv contiene todas las categorías disponibles.\n")
        f.write("  Columnas del catálogo:\n")
        f.write("    • Nivel: Nivel de jerarquía (0 = categoría principal, 1 = subcategoría, etc.)\n")
        f.write("    • Ruta Completa: Ruta completa de la categoría (ej: Refacciones > Motor > Filtros)\n")
        f.write("    • Nombre: Nombre de la categoría\n")
        f.write("    • Slug: Slug a usar en la columna category_slug del template de productos\n")
        f.write("    • Descripción: Descripción de la categoría\n")
        f.write("    • Categoría Padre: Nombre de la categoría padre (si aplica)\n")
        f.write("    • Slug Padre: Slug de la categoría padre (si aplica)\n\n")
        f.write("  Para usar una categoría en tu producto:\n")
        f.write("    1. Abre catalogo_categorias.csv\n")
        f.write("    2. Busca la categoría que necesitas\n")
        f.write("    3. Copia el valor de la columna 'Slug'\n")
        f.write("    4. Pégalo en la columna 'Slug de Categoría' de tu producto\n\n")
        
        f.write("NOTAS IMPORTANTES:\n")
        f.write("  • NO incluir campos de stock ni relaciones con sucursales\n")
        f.write("  • Solo se considera el precio base del producto\n")
        f.write("  • El category_slug es opcional pero recomendado\n")
        f.write("  • El slug de categoría debe coincidir exactamente con el slug del catálogo\n")
        f.write("  • Los campos de envío son opcionales pero recomendados para productos físicos\n")
        f.write("  • Para servicios, los campos de envío pueden dejarse vacíos\n")
        f.write("  • El archivo CSV usa codificación UTF-8 con BOM para compatibilidad con Excel\n\n")
        
        f.write("EJEMPLOS:\n")
        f.write("  El archivo CSV incluye 3 ejemplos completos:\n")
        f.write("  1. Filtro de Aire Original Toyota (refaccion con datos de envío)\n")
        f.write("  2. Aceite Motor 5W-30 Sintético (fluido con datos de envío)\n")
        f.write("  3. Instalación de Sistema de Audio (servicio sin datos de envío)\n\n")
        
        f.write("USO:\n")
        f.write("  1. Abre template_carga_masiva_productos.csv en Excel o Google Sheets\n")
        f.write("  2. Consulta catalogo_categorias.csv para obtener los slugs de categorías\n")
        f.write("  3. Completa las filas con tus productos\n")
        f.write("  4. Guarda el archivo\n")
        f.write("  5. Importa el archivo usando el sistema de carga masiva\n")
    
    print(f"✅ Templates creados exitosamente:")
    print(f"   📄 {products_filename} - Template de productos con {len(product_columns)} columnas")
    print(f"   📄 {categories_filename} - Catálogo de {len(categories)} categorías")
    print(f"   📄 {instructions_filename} - Instrucciones detalladas")
    print(f"   - Ejemplos de productos incluidos: {len(examples)}")
    print(f"\n💡 Los archivos CSV están codificados en UTF-8 con BOM para abrir correctamente en Excel")

if __name__ == "__main__":
    create_csv_with_categories()

