# 🛒 AGORA — Marketplace de Refacciones y Accesorios

**AGORA** es un *marketplace y tienda en línea* de **refacciones y accesorios** con soporte para **múltiples tiendas**: sucursales, grupos empresariales, marcas de vehículo y vista global.

## 🎯 Propósito

Conectar a **clientes, distribuidores y sucursales** en un solo ecosistema: catálogo de productos por sucursal, compatibilidad por marca de vehículo, grupos empresariales y pedidos con envío. AGORA permite a cada negocio tener su tienda (o varias sucursales bajo un grupo) y al cliente comprar en contexto global, por grupo, por sucursal o por marca.

## ✨ Características Principales

- 🏪 **Multi-tiendas:** Cuatro contextos de compra: global, grupo empresarial, sucursal y marca (ej. Nissan, Toyota)
- 📦 **Catálogo por sucursal:** Productos, precios y stock por negocio/sucursal; compatibilidad con marcas de vehículo
- 🏢 **Grupos empresariales:** Varias sucursales bajo un mismo grupo (distribuidor / grupodealer)
- 💳 **Pagos y envíos:** Integración con KarloPay, envíos y flujo de pedidos completo
- 🌱 **Extensible:** Backend NestJS, store-front Next.js, web-admin y web-local; documentación y agentes en `docs/`

## 📚 Documentación

Esta documentación está organizada en las siguientes secciones:

### 📖 [Visión General y Actores](./docs/01-vision-general.md)
- Objetivos clave del proyecto
- Actores principales (Cliente, Local, Repartidor)
- Modelo de operación básico

### 💰 [Modelo de Operación y LocalCoins](./docs/02-modelo-operacion.md)
- Sistema de créditos LocalCoins (LC)
- Conversión y beneficios
- Seguridad financiera
- Control de emisión de LCs

### 🏗️ [Arquitectura y Roadmap MVP](./docs/03-arquitectura-mvp.md)
- Aplicaciones (Cliente, Repartidor, Local, Admin)
- Stack tecnológico
- Roadmap de 4 semanas
- Infraestructura

### 📁 [Estructura de Repositorio](./docs/09-estructura-repositorio.md)
- Decisión: Monorepo vs Multi-repo
- Estructura propuesta del proyecto
- Gestión de dependencias compartidas
- Scripts de desarrollo

### 📊 [Gantt Conceptual](./docs/GANTT-CONCEPTUAL.md)
- Diagrama de Gantt visual (Mermaid)
- 9 tareas principales del MVP
- Distribución por semana y desarrollador
- Fechas y entregables

### 💵 [Modelo Financiero y Monetización](./docs/04-modelo-financiero.md)
- Roles fiscales y estrategia
- Control de precios
- Fuentes de monetización diversificadas

### 🌆 [Estrategia Roma CDMX](./docs/05-estrategia-roma.md)
- Público internacional y nómadas digitales
- Acciones clave para el lanzamiento
- Métricas de validación

### 🌱 [Responsabilidad Social y Sostenibilidad](./docs/06-responsabilidad-social.md)
- Modelo eco-social
- Recompensas e incentivos verdes
- Impacto esperado

### 📱 [Red Social Ecológica](./docs/07-red-social-ecologica.md)
- Feed de contenido ecológico
- Sistema de tags automáticos
- Compartir impacto en redes sociales
- Viralización y captación de usuarios

### 📈 [Expansión y Medición de Impacto](./docs/08-expansion-impacto.md)
- Estrategia de expansión por barrios
- KPIs ESG (Environmental, Social, Governance)
- Métricas de éxito

## 🚀 Inicio Rápido

Este repositorio es el **ecosistema completo de AGORA** (monorepo): backend, store-front, web-admin, web-local. Para más información, consulta la [documentación](./docs/) y el [stack tecnológico](./docs/stack-tecnologico.md).

## 📝 Próximos Pasos

1. ✅ Documentación del proyecto
2. 🔄 Setup técnico del backend y aplicaciones
3. 🔄 Desarrollo y despliegue (Jenkins, ver `docs/jenkins-deploy.md`)
4. 🔄 Piloto con distribuidores y sucursales

## Product Collections (Colecciones)

- Database: migration `database/migrations/migration_product_classifications_status.sql` creates `catalog.product_colecciones` and `catalog.product_coleccion_assignments` with a status flag to track active/inactive links.
- Backend: catalog service now exposes `/catalog/collections` CRUD and product branch availability accepts `collection_ids`; saving a product with collections marks them active, and removing all clears the assignments.
- Frontend: Catalog shows Collections as its own section; product create/edit forms display a Colecciones box with checkboxes per branch, pre-checking previously assigned collections and a Create button to add new ones.
- Behavior: Assigning (checking) activates the collection for the product; unchecking removes it. Branch availability is enabled automatically when collections are selected.

## 📄 Licencia

[Por definir]

---

**AGORA** — *Marketplace de refacciones y accesorios* 🛒
