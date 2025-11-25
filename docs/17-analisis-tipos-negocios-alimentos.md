# 🍽️ Análisis de Tipos de Negocios de Alimentos y Categorías de Productos

Este documento presenta un análisis exhaustivo de los tipos de negocios de alimentos más comunes en el mercado de delivery, junto con las categorías de productos típicas para cada uno. Este análisis sirve como base para la configuración del sistema de catálogos y categorías de productos en la plataforma Localia.

---

## 📊 Resumen Ejecutivo

El sector de alimentos para delivery abarca una amplia variedad de tipos de negocios, cada uno con características operativas y categorías de productos específicas. Este análisis identifica **12 tipos principales de negocios** y sus respectivas categorías de productos, proporcionando una guía para la implementación del sistema de catálogos.

### Objetivos del Análisis

1. **Identificar tipos de negocios** más comunes en el mercado de delivery de alimentos
2. **Mapear categorías de productos** típicas para cada tipo de negocio
3. **Proporcionar recomendaciones** para la estructura de catálogos en el sistema
4. **Establecer categorías globales** que puedan ser compartidas entre negocios similares

---

## 🏪 Tipos de Negocios de Alimentos

### 1. 🍔 Restaurantes de Comida Rápida

**Descripción:** Establecimientos que ofrecen alimentos preparados rápidamente, ideales para clientes con poco tiempo. Enfocados en velocidad de servicio y conveniencia.

**Características:**
- Preparación rápida (5-15 minutos)
- Menú limitado y estandarizado
- Precios accesibles
- Alta rotación de productos
- Enfoque en combos y promociones

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Hamburguesas** | - Clásicas<br>- Especiales<br>- Vegetarianas | Hamburguesa Clásica, Hamburguesa BBQ, Hamburguesa Vegana |
| **Papas y Acompañamientos** | - Papas<br>- Aros de cebolla<br>- Nuggets | Papas Fritas, Papas a la Francesa, Aros de Cebolla |
| **Bebidas** | - Refrescos<br>- Aguas<br>- Jugos | Coca-Cola, Sprite, Agua Natural, Jugo de Naranja |
| **Postres** | - Helados<br>- Malteadas<br>- Brownies | Helado de Vainilla, Malteada de Chocolate, Brownie |
| **Combos** | - Individuales<br>- Familiares | Combo Individual, Combo Familiar, Combo para 2 |

**Categorías Globales Recomendadas:**
- `Hamburguesas` (global)
- `Papas y Acompañamientos` (global)
- `Bebidas` (global, con subcategorías)
- `Postres` (global)
- `Combos` (global)

---

### 2. 🍕 Pizzerías

**Descripción:** Negocios especializados en pizzas y productos italianos, con opciones de personalización y tamaños variados.

**Características:**
- Personalización de ingredientes
- Múltiples tamaños (personal, mediana, grande, familiar)
- Tiempo de preparación: 15-30 minutos
- Opciones vegetarianas y veganas
- Combos con bebidas y acompañamientos

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Pizzas** | - Clásicas<br>- Especiales<br>- Personalizadas<br>- Vegetarianas | Pizza Margherita, Pizza Hawaiana, Pizza Personalizada |
| **Pastas** | - Spaghetti<br>- Lasagna<br>- Ravioli | Spaghetti Carbonara, Lasagna de Carne, Ravioli de Queso |
| **Acompañamientos** | - Palitos de Ajo<br>- Ensaladas<br>- Pan de Ajo | Palitos de Ajo, Ensalada César, Pan de Ajo |
| **Bebidas** | - Refrescos<br>- Aguas<br>- Vinos (opcional) | Coca-Cola, Agua Natural, Vino Tinto |
| **Postres** | - Tiramisú<br>- Cannoli<br>- Helado | Tiramisú, Cannoli, Helado de Vainilla |
| **Combos** | - Pizza + Bebida<br>- Pizza + Pasta | Combo Pizza Mediana + Bebida, Combo Familiar |

**Categorías Globales Recomendadas:**
- `Pizzas` (global)
- `Pastas` (global)
- `Acompañamientos` (global)
- `Bebidas` (global)
- `Postres` (global)
- `Combos` (global)

---

### 3. 🍜 Restaurantes (Comida Completa)

**Descripción:** Establecimientos que ofrecen menús completos con entradas, platos principales, bebidas y postres. Pueden ser de cocina mexicana, internacional, asiática, etc.

**Características:**
- Menú extenso y variado
- Platos de preparación más elaborada (20-45 minutos)
- Opciones para diferentes ocasiones
- Menús del día y especialidades
- Precios variables según tipo de restaurante

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Entradas** | - Ensaladas<br>- Sopas<br>- Antojitos<br>- Botanas | Ensalada César, Sopa de Tortilla, Nachos, Queso Fundido |
| **Platos Principales** | - Carnes<br>- Pescados<br>- Pollo<br>- Vegetarianos | Ribeye, Salmón a la Plancha, Pollo al Horno, Risotto Vegetariano |
| **Guarniciones** | - Arroz<br>- Frijoles<br>- Verduras<br>- Papas | Arroz Blanco, Frijoles Refritos, Verduras al Vapor, Papas Fritas |
| **Bebidas** | - Bebidas Frías<br>- Bebidas Calientes<br>- Alcohólicas (opcional) | Refrescos, Aguas Frescas, Café, Vino, Cerveza |
| **Postres** | - Pasteles<br>- Flanes<br>- Helados | Pastel de Chocolate, Flan Napolitano, Helado de Vainilla |
| **Menús del Día** | - Comida corrida<br>- Menú ejecutivo | Menú del Día, Menú Ejecutivo |
| **Especialidades** | - Platillos de la casa<br>- Temporada | Platillo Especial, Especialidad del Chef |

**Categorías Globales Recomendadas:**
- `Entradas` (global)
- `Platos Principales` (global)
- `Guarniciones` (global)
- `Bebidas` (global, con subcategorías)
- `Postres` (global)
- `Menús del Día` (global)
- `Especialidades` (puede ser por negocio)

---

### 4. ☕ Cafeterías

**Descripción:** Establecimientos especializados en café y bebidas calientes, con opciones de alimentos ligeros, pasteles y snacks.

**Características:**
- Enfoque en bebidas calientes
- Ambiente casual y acogedor
- Productos de panadería y repostería
- Opciones para desayuno y merienda
- Tiempo de preparación: 5-10 minutos

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Café** | - Espresso<br>- Americano<br>- Cappuccino<br>- Latte<br>- Especialidades | Café Americano, Cappuccino, Latte Macchiato, Frappé |
| **Té e Infusiones** | - Tés<br>- Tisanas<br>- Té Helado | Té Verde, Té de Manzanilla, Té Helado |
| **Bebidas Frías** | - Frappés<br>- Smoothies<br>- Jugos | Frappé de Chocolate, Smoothie de Fresa, Jugo de Naranja |
| **Panadería** | - Pan Dulce<br>- Croissants<br>- Muffins | Concha, Croissant, Muffin de Arándanos |
| **Pasteles y Postres** | - Pasteles<br>- Cheesecakes<br>- Galletas | Pastel de Chocolate, Cheesecake, Galletas |
| **Sandwiches y Wraps** | - Sandwiches<br>- Wraps<br>- Bagels | Sandwich de Pollo, Wrap Vegetariano, Bagel con Queso Crema |
| **Desayunos** | - Desayunos Completos<br>- A la Carta | Desayuno Continental, Huevos Rancheros |

**Categorías Globales Recomendadas:**
- `Café` (global, con subcategorías)
- `Té e Infusiones` (global)
- `Bebidas Frías` (global)
- `Panadería` (global)
- `Pasteles y Postres` (global)
- `Sandwiches y Wraps` (global)
- `Desayunos` (global)

---

### 5. 🥖 Panaderías y Pastelerías

**Descripción:** Negocios especializados en pan, pasteles, galletas y productos de repostería, tanto dulces como salados.

**Características:**
- Productos frescos horneados diariamente
- Amplia variedad de panes y pasteles
- Opciones para desayuno y merienda
- Productos perecederos (alta rotación)
- Precios accesibles

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Pan Dulce** | - Conchas<br>- Cuernos<br>- Orejas<br>- Donas | Concha, Cuerno, Oreja, Dona Glaseada |
| **Pan Salado** | - Bolillo<br>- Telera<br>- Pan de Caja<br>- Baguette | Bolillo, Telera, Pan de Caja, Baguette |
| **Pasteles** | - Pasteles Enteros<br>- Porciones<br>- Personalizados | Pastel de Chocolate, Porción de Tres Leches, Pastel Personalizado |
| **Galletas** | - Galletas Dulces<br>- Galletas Saladas | Galletas de Chocolate, Galletas de Avena, Galletas Saladas |
| **Empanadas y Quesadillas** | - Empanadas<br>- Quesadillas<br>- Enchiladas | Empanada de Carne, Quesadilla de Queso |
| **Bebidas** | - Café<br>- Chocolate<br>- Jugos | Café de Olla, Chocolate Caliente, Jugo de Naranja |
| **Productos Especiales** | - Sin Gluten<br>- Veganos<br>- Orgánicos | Pan Sin Gluten, Pastel Vegano |

**Categorías Globales Recomendadas:**
- `Pan Dulce` (global)
- `Pan Salado` (global)
- `Pasteles` (global)
- `Galletas` (global)
- `Empanadas y Quesadillas` (global)
- `Bebidas` (global)
- `Productos Especiales` (global)

---

### 6. 🌮 Taquerías

**Descripción:** Negocios especializados en tacos y comida mexicana tradicional, con opciones de diferentes tipos de carne y salsas.

**Características:**
- Preparación rápida
- Alta personalización (tipo de tortilla, salsas, guarniciones)
- Precios accesibles
- Productos frescos
- Opciones vegetarianas disponibles

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Tacos** | - De Carne<br>- De Pollo<br>- De Pescado<br>- Vegetarianos | Tacos al Pastor, Tacos de Pollo, Tacos de Pescado, Tacos de Nopal |
| **Quesadillas** | - Quesadillas Clásicas<br>- Quesadillas Especiales | Quesadilla de Queso, Quesadilla de Huitlacoche |
| **Tortas** | - Tortas Clásicas<br>- Tortas Especiales | Torta de Milanesa, Torta Ahogada |
| **Platillos Especiales** | - Alambres<br>- Gringas<br>- Volcanes | Alambre, Gringa, Volcán |
| **Acompañamientos** | - Salsas<br>- Cebollas<br>- Cilantro<br>- Limones | Salsa Roja, Salsa Verde, Cebolla, Cilantro |
| **Bebidas** | - Aguas Frescas<br>- Refrescos<br>- Cerveza (opcional) | Agua de Horchata, Agua de Jamaica, Coca-Cola |
| **Combos** | - Orden de Tacos + Bebida<br>- Combo Familiar | Orden de 5 Tacos + Bebida, Combo Familiar |

**Categorías Globales Recomendadas:**
- `Tacos` (global)
- `Quesadillas` (global)
- `Tortas` (global)
- `Platillos Especiales` (global)
- `Acompañamientos` (global)
- `Bebidas` (global)
- `Combos` (global)

---

### 7. 🍱 Restaurantes Asiáticos (Sushi, Thai, Chino, etc.)

**Descripción:** Establecimientos especializados en cocina asiática, con opciones de sushi, ramen, pad thai, entre otros.

**Características:**
- Ingredientes especializados
- Preparación artesanal
- Opciones vegetarianas y veganas
- Presentación cuidada
- Tiempo de preparación: 15-30 minutos

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Sushi y Sashimi** | - Rolls<br>- Nigiri<br>- Sashimi<br>- Combos | Roll California, Roll de Salmón, Nigiri de Atún, Combo de Sushi |
| **Ramen y Sopas** | - Ramen<br>- Udon<br>- Miso | Ramen de Cerdo, Udon de Pollo, Sopa Miso |
| **Platos Principales** | - Teriyaki<br>- Pad Thai<br>- Curry | Pollo Teriyaki, Pad Thai, Curry Verde |
| **Entradas** | - Edamame<br>- Gyoza<br>- Tempura | Edamame, Gyoza, Tempura de Camarón |
| **Bebidas** | - Té<br>- Refrescos<br>- Sake (opcional) | Té Verde, Coca-Cola, Sake |
| **Postres** | - Mochi<br>- Helado<br>- Frutas | Mochi, Helado de Té Verde, Frutas |

**Categorías Globales Recomendadas:**
- `Sushi y Sashimi` (global para restaurantes de sushi)
- `Ramen y Sopas` (global)
- `Platos Principales` (global)
- `Entradas` (global)
- `Bebidas` (global)
- `Postres` (global)

---

### 8. 🥗 Restaurantes Saludables / Veganos

**Descripción:** Establecimientos enfocados en comida saludable, orgánica, vegana o vegetariana, con opciones nutritivas y sostenibles.

**Características:**
- Ingredientes orgánicos y naturales
- Opciones sin gluten, veganas, vegetarianas
- Información nutricional detallada
- Enfoque en sostenibilidad
- Precios premium

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Ensaladas** | - Ensaladas Verdes<br>- Ensaladas de Granos<br>- Bowls | Ensalada César Vegana, Bowl de Quinoa, Ensalada de Lentejas |
| **Platos Principales** | - Plant-based<br>- Sin Gluten<br>- Orgánicos | Hamburguesa Vegana, Pasta Sin Gluten, Pollo Orgánico |
| **Smoothies y Jugos** | - Smoothies<br>- Jugos Detox<br>- Batidos | Smoothie Verde, Jugo Detox, Batido de Proteína |
| **Snacks Saludables** | - Barras Energéticas<br>- Frutos Secos<br>- Chips | Barra de Granola, Mix de Frutos Secos, Chips de Kale |
| **Bebidas** | - Tés<br>- Aguas Infusionadas<br>- Kombucha | Té Verde, Agua de Pepino, Kombucha |
| **Postres Saludables** | - Sin Azúcar<br>- Veganos<br>- Sin Gluten | Brownie Sin Azúcar, Cheesecake Vegano, Galletas Sin Gluten |

**Categorías Globales Recomendadas:**
- `Ensaladas` (global)
- `Platos Principales` (global)
- `Smoothies y Jugos` (global)
- `Snacks Saludables` (global)
- `Bebidas` (global)
- `Postres Saludables` (global)

---

### 9. 🍗 Pollerías y Rosticerías

**Descripción:** Negocios especializados en pollo asado, rostizado o frito, con acompañamientos típicos.

**Características:**
- Preparación especializada de pollo
- Opciones de porciones (piezas, medio pollo, pollo entero)
- Acompañamientos estándar
- Precios accesibles
- Tiempo de preparación: 15-25 minutos

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Pollo** | - Pollo Entero<br>- Medio Pollo<br>- Piezas<br>- Pollo Frito | Pollo Entero, Medio Pollo, 4 Piezas, Pollo Frito |
| **Acompañamientos** | - Papas<br>- Arroz<br>- Ensalada<br>- Frijoles | Papas Fritas, Arroz, Ensalada, Frijoles Refritos |
| **Salsas y Aderezos** | - Salsas<br>- Aderezos | Salsa BBQ, Salsa Picante, Aderezo Ranch |
| **Bebidas** | - Refrescos<br>- Aguas<br>- Jugos | Coca-Cola, Agua Natural, Jugo de Naranja |
| **Combos** | - Individuales<br>- Familiares | Combo Individual, Combo Familiar |

**Categorías Globales Recomendadas:**
- `Pollo` (global)
- `Acompañamientos` (global)
- `Salsas y Aderezos` (global)
- `Bebidas` (global)
- `Combos` (global)

---

### 10. 🍦 Heladerías y Postrerías

**Descripción:** Negocios especializados en helados, nieves, paletas y postres congelados.

**Características:**
- Amplia variedad de sabores
- Opciones de tamaño (cono, vaso, litro)
- Productos artesanales
- Opciones veganas y sin azúcar
- Productos estacionales

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Helados** | - Por Cono<br>- Por Vaso<br>- Por Litro<br>- Sabores Especiales | Cono de Vainilla, Vaso de Chocolate, Litro de Fresa |
| **Nieves** | - Nieve de Agua<br>- Nieve de Leche | Nieve de Limón, Nieve de Mango |
| **Paletas** | - Paletas de Agua<br>- Paletas de Leche | Paleta de Fresa, Paleta de Chocolate |
| **Malteadas y Frappés** | - Malteadas<br>- Frappés | Malteada de Chocolate, Frappé de Vainilla |
| **Postres** | - Sundaes<br>- Bananas Split<br>- Affogato | Sundae de Chocolate, Banana Split, Affogato |
| **Bebidas** | - Aguas<br>- Refrescos | Agua Natural, Coca-Cola |

**Categorías Globales Recomendadas:**
- `Helados` (global)
- `Nieves` (global)
- `Paletas` (global)
- `Malteadas y Frappés` (global)
- `Postres` (global)
- `Bebidas` (global)

---

### 11. 🥪 Sandwich Shops y Delis

**Descripción:** Negocios especializados en sandwiches, wraps, bagels y productos tipo deli.

**Características:**
- Alta personalización
- Ingredientes frescos
- Opciones vegetarianas y veganas
- Preparación rápida (5-10 minutos)
- Combos con papas y bebidas

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Sandwiches** | - Clásicos<br>- Especiales<br>- Vegetarianos | Sandwich de Jamón, Sandwich Club, Sandwich Vegetariano |
| **Wraps** | - Wraps de Pollo<br>- Wraps Vegetarianos | Wrap de Pollo, Wrap Vegetariano |
| **Bagels** | - Bagels Salados<br>- Bagels Dulces | Bagel con Queso Crema, Bagel con Salmón |
| **Ensaladas** | - Ensaladas Verdes<br>- Ensaladas de Pasta | Ensalada César, Ensalada de Pasta |
| **Acompañamientos** | - Papas<br>- Chips<br>- Frutas | Papas Fritas, Chips, Frutas |
| **Bebidas** | - Refrescos<br>- Jugos<br>- Café | Coca-Cola, Jugo de Naranja, Café |
| **Combos** | - Sandwich + Papas + Bebida | Combo Sandwich + Papas + Bebida |

**Categorías Globales Recomendadas:**
- `Sandwiches` (global)
- `Wraps` (global)
- `Bagels` (global)
- `Ensaladas` (global)
- `Acompañamientos` (global)
- `Bebidas` (global)
- `Combos` (global)

---

### 12. 🍰 Repostería Fina y Pastelerías

**Descripción:** Negocios especializados en pasteles, postres finos, chocolates y productos de repostería gourmet.

**Características:**
- Productos artesanales y de alta calidad
- Opciones personalizadas (pasteles de cumpleaños)
- Precios premium
- Productos perecederos
- Pedidos con anticipación para productos especiales

**Categorías de Productos Típicas:**

| Categoría | Subcategorías | Ejemplos de Productos |
|-----------|---------------|----------------------|
| **Pasteles** | - Pasteles Enteros<br>- Porciones<br>- Personalizados | Pastel de Chocolate, Porción de Tres Leches, Pastel Personalizado |
| **Postres Finos** | - Cheesecakes<br>- Tiramisú<br>- Flanes | Cheesecake de Fresa, Tiramisú, Flan Napolitano |
| **Chocolates** | - Trufas<br>- Bombones<br>- Barras | Trufas de Chocolate, Bombones, Barra de Chocolate |
| **Galletas y Brownies** | - Galletas Gourmet<br>- Brownies | Galletas de Chocolate, Brownie de Nuez |
| **Macarons y Petit Fours** | - Macarons<br>- Petit Fours | Macarons de Fresa, Petit Fours |
| **Bebidas** | - Café<br>- Té<br>- Chocolate | Café Espresso, Té de Hierbas, Chocolate Caliente |

**Categorías Globales Recomendadas:**
- `Pasteles` (global)
- `Postres Finos` (global)
- `Chocolates` (global)
- `Galletas y Brownies` (global)
- `Macarons y Petit Fours` (global)
- `Bebidas` (global)

---

## 📋 Análisis Comparativo

### Categorías Más Comunes (Globales)

Las siguientes categorías aparecen en la mayoría de los tipos de negocios y deberían ser **categorías globales** en el sistema:

1. **Bebidas** (100% de los negocios)
   - Subcategorías: Bebidas Frías, Bebidas Calientes, Alcohólicas (opcional)

2. **Postres** (83% de los negocios)
   - Subcategorías: Pasteles, Helados, Postres Finos

3. **Combos** (75% de los negocios)
   - Subcategorías: Individuales, Familiares, Especiales

4. **Acompañamientos** (67% de los negocios)
   - Subcategorías: Papas, Arroz, Ensaladas, Salsas

### Categorías Específicas por Tipo de Negocio

Algunas categorías son específicas de ciertos tipos de negocios y deberían ser **categorías por negocio**:

- **Sushi y Sashimi** → Solo restaurantes asiáticos de sushi
- **Tacos** → Solo taquerías
- **Helados** → Solo heladerías
- **Café** → Cafeterías y algunos restaurantes
- **Pan Dulce** → Solo panaderías

---

## 🎯 Recomendaciones para la Implementación

### 1. Estructura de Categorías Globales

Crear las siguientes categorías globales que pueden ser compartidas por todos los negocios:

```sql
-- Categorías Globales Base
1. Bebidas
   ├── Bebidas Frías
   ├── Bebidas Calientes
   └── Bebidas Alcohólicas (opcional)

2. Postres
   ├── Pasteles
   ├── Helados
   └── Postres Finos

3. Combos
   ├── Individuales
   ├── Familiares
   └── Especiales

4. Acompañamientos
   ├── Papas
   ├── Arroz
   ├── Ensaladas
   └── Salsas
```

### 2. Categorías Específicas por Tipo de Negocio

Cada tipo de negocio debería tener categorías específicas que se crean cuando se registra un negocio de ese tipo:

**Restaurantes de Comida Rápida:**
- Hamburguesas
- Papas y Acompañamientos
- Combos

**Pizzerías:**
- Pizzas
- Pastas
- Acompañamientos

**Restaurantes:**
- Entradas
- Platos Principales
- Guarniciones
- Menús del Día

**Cafeterías:**
- Café
- Té e Infusiones
- Panadería
- Sandwiches y Wraps
- Desayunos

**Panaderías:**
- Pan Dulce
- Pan Salado
- Pasteles
- Galletas

**Taquerías:**
- Tacos
- Quesadillas
- Tortas
- Platillos Especiales

### 3. Sistema de Plantillas de Categorías

Implementar un sistema de **plantillas de categorías** que se asignan automáticamente según el tipo de negocio:

```typescript
interface CategoryTemplate {
  businessType: string;
  categories: {
    name: string;
    description: string;
    isGlobal: boolean;
    subcategories?: string[];
  }[];
}

const categoryTemplates: CategoryTemplate[] = [
  {
    businessType: 'Restaurante',
    categories: [
      { name: 'Entradas', description: 'Platos para comenzar', isGlobal: true },
      { name: 'Platos Principales', description: 'Platos fuertes', isGlobal: true },
      { name: 'Guarniciones', description: 'Acompañamientos', isGlobal: true },
      { name: 'Menús del Día', description: 'Menús especiales', isGlobal: true },
    ]
  },
  // ... más plantillas
];
```

### 4. Jerarquía de Categorías

Implementar jerarquía padre/hijo para:
- **Bebidas** → Bebidas Frías, Bebidas Calientes
- **Postres** → Pasteles, Helados, Postres Finos
- **Café** → Espresso, Americano, Cappuccino, Latte

### 5. Tags y Filtros Adicionales

Además de las categorías, usar **tags** para filtros adicionales:
- `vegano`
- `vegetariano`
- `sin-gluten`
- `orgánico`
- `picante`
- `sin-azúcar`
- `bajo-en-calorías`

---

## 📊 Matriz de Categorías por Tipo de Negocio

| Tipo de Negocio | Categorías Principales | Categorías Secundarias | Total Categorías |
|----------------|------------------------|------------------------|------------------|
| Comida Rápida | Hamburguesas, Papas, Combos | Bebidas, Postres | 5 |
| Pizzería | Pizzas, Pastas | Acompañamientos, Bebidas, Postres, Combos | 6 |
| Restaurante | Entradas, Platos Principales, Guarniciones | Bebidas, Postres, Menús del Día | 6 |
| Cafetería | Café, Té, Panadería | Bebidas Frías, Sandwiches, Desayunos, Postres | 7 |
| Panadería | Pan Dulce, Pan Salado, Pasteles | Galletas, Bebidas, Productos Especiales | 6 |
| Taquería | Tacos, Quesadillas, Tortas | Acompañamientos, Bebidas, Combos | 6 |
| Asiático | Sushi/Sashimi, Ramen, Platos Principales | Entradas, Bebidas, Postres | 6 |
| Saludable | Ensaladas, Platos Principales, Smoothies | Snacks, Bebidas, Postres Saludables | 6 |
| Pollería | Pollo, Acompañamientos | Salsas, Bebidas, Combos | 5 |
| Heladería | Helados, Nieves, Paletas | Malteadas, Postres, Bebidas | 6 |
| Sandwich Shop | Sandwiches, Wraps, Bagels | Ensaladas, Acompañamientos, Bebidas, Combos | 7 |
| Repostería Fina | Pasteles, Postres Finos, Chocolates | Galletas, Macarons, Bebidas | 6 |

---

## 🔄 Flujo de Implementación Sugerido

### Fase 1: Categorías Globales Base
1. Crear categorías globales fundamentales:
   - Bebidas (con subcategorías)
   - Postres (con subcategorías)
   - Combos
   - Acompañamientos

### Fase 2: Plantillas por Tipo de Negocio
2. Crear plantillas de categorías para cada tipo de negocio
3. Implementar asignación automática al registrar un negocio

### Fase 3: Categorías Personalizadas
4. Permitir a los negocios crear categorías personalizadas
5. Mantener compatibilidad con categorías globales

### Fase 4: Optimización
6. Analizar uso real de categorías
7. Ajustar plantillas según datos reales
8. Consolidar categorías similares

---

## 📝 Notas Finales

### Consideraciones Importantes

1. **Flexibilidad:** El sistema debe permitir que los negocios creen categorías personalizadas además de las sugeridas.

2. **Migración:** Los negocios existentes pueden necesitar migración de categorías si se implementan plantillas.

3. **Multicategoría:** Algunos productos pueden pertenecer a múltiples categorías (ej: "Combo" y "Hamburguesas").

4. **Localización:** Las categorías deben estar disponibles en español y potencialmente en otros idiomas.

5. **Escalabilidad:** El sistema debe soportar nuevos tipos de negocios sin requerir cambios en la estructura base.

### Próximos Pasos

1. ✅ Revisar y aprobar este análisis
2. ⏳ Implementar categorías globales en la base de datos
3. ⏳ Crear sistema de plantillas de categorías
4. ⏳ Desarrollar UI para gestión de categorías en el admin panel
5. ⏳ Documentar proceso de asignación de categorías a nuevos negocios

---

## 🔗 Referencias

- **Documentación de Catálogos:** `docs/16-catalogos-gestion.md`
- **Schema de Base de Datos:** `database/schema.sql`
- **Seed de Catálogo:** `database/seed_catalog.sql`
- **Sistema de Negocios:** `core.businesses` table

---

**Anterior:** [Catálogos Disponibles para Gestión](./16-catalogos-gestion.md)  
**Siguiente:** [Roles de Negocio y Múltiples Tiendas por Cuenta](./18-roles-negocio-multi-tiendas.md)  
**Volver al inicio:** [README Principal](./README.md)

---

**Versión:** 1.0  
**Fecha:** 2024-11-18  
**Autor:** Análisis basado en investigación de mercado y estructura del sistema Localia

