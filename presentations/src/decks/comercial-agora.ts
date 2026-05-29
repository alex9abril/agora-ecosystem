import type { DeckMeta } from "../types";

/**
 * Speech comercial — AGORA.
 * Objetivo: presentar qué es AGORA reposicionándolo: sí es una tienda en línea,
 * pero el valor está en la ADMINISTRACIÓN y en CONECTARSE AL DMS del cliente.
 * Contenido basado en docs/ (integraciones DMS, multi-tienda, apps, refacciones).
 */
export const comercialAgoraDeck: DeckMeta = {
  id: "comercial-agora",
  title: "AGORA — Presentación Comercial",
  description:
    "Speech comercial: qué es AGORA, su conexión con el DMS y la administración multi-tienda, y los problemas del sector que resuelve.",
  updated: "2026-05-28",
  slides: [
    {
      id: "cover",
      layout: "cover",
      kicker: "Presentación comercial",
      title: "AGORA",
      subtitle: "El ecosistema que conecta tu DMS con la venta digital de refacciones",
      footnote: "Más que una tienda en línea: la capa de administración que digitaliza tu operación.",
    },
    {
      id: "que-es",
      layout: "prose",
      kicker: "Qué es AGORA",
      title: "Sí, es una tienda en línea… pero es mucho más",
      prose: [
        {
          label: "La superficie",
          text: "AGORA es un marketplace y tienda en línea de refacciones, accesorios y servicios de instalación para el sector automotriz. El cliente final busca por marca, modelo y año, encuentra la pieza compatible, la compra y la recibe.",
        },
        {
          label: "El verdadero valor",
          text: "Debajo de esa tienda hay una capa de administración que conecta el catálogo que ya vive en tu DMS con un canal de venta digital, y lo gestiona a nivel global, de grupo, de sucursal y de marca. La venta es la consecuencia; la administración y la integración son el motor.",
        },
      ],
    },
    {
      id: "problema",
      layout: "bullets",
      kicker: "El problema del sector",
      title: "Lo que hoy duele en la distribución de refacciones",
      bullets: [
        "El catálogo maestro vive en el DMS/ERP del distribuidor: miles de SKUs, precios y stock que cambian constantemente.",
        "Publicar y mantener eso en un canal digital se hace a mano, sucursal por sucursal: no escala y se desactualiza.",
        "Sin compatibilidad por vehículo, el cliente no sabe si la pieza le sirve; aumentan errores y devoluciones.",
        "La operación queda desconectada: ventas, inventario y administración en sistemas distintos, sin trazabilidad.",
        "Resultado: poca presencia digital, datos inconsistentes y oportunidades de venta perdidas.",
      ],
    },
    {
      id: "idea-central",
      layout: "quote",
      kicker: "La idea central",
      title: "No vendemos otra tienda en línea",
      subtitle:
        "AGORA es la capa de administración que toma el catálogo de tu DMS y lo convierte en venta digital — sincronizada, multi-tienda y auditable — sin cambiar la forma en que ya operas.",
    },
    {
      id: "como-funciona",
      layout: "triptych",
      kicker: "Cómo funciona",
      title: "Tres capas, un solo ecosistema",
      subtitle: "De tu sistema interno a la venta al cliente final, sin trabajo manual repetido.",
      triptych: [
        {
          title: "1 · Conecta",
          accent: "mint",
          items: [
            "Se integra con tu DMS / ERP / SQL.",
            "Conectores SQL (MSSQL) hoy; API/REST en evolución.",
            "Ingesta tu catálogo, precios y stock.",
          ],
        },
        {
          title: "2 · Administra",
          accent: "blue",
          items: [
            "Catálogo y disponibilidad por sucursal.",
            "Multi-tienda: global, grupo, sucursal y marca.",
            "Pedidos, inventario, branding y reglas.",
          ],
        },
        {
          title: "3 · Vende",
          accent: "iris",
          items: [
            "Tienda en línea para el cliente final.",
            "Búsqueda por compatibilidad de vehículo.",
            "Checkout, envíos y seguimiento postventa.",
          ],
        },
      ],
    },
    {
      id: "dms-corazon",
      layout: "prose",
      kicker: "El corazón: conexión al DMS",
      title: "Tu catálogo, siempre sincronizado",
      prose: [
        {
          label: "El problema que elimina",
          text: "Tus distribuidores ya mantienen su catálogo maestro en el DMS. Llevar eso a un canal digital y actualizarlo a mano —sucursal por sucursal— no escala cuando hablamos de miles de SKUs que cambian a diario.",
        },
        {
          label: "Cómo lo resolvemos",
          text: "Un motor de integración propio (inspirado en herramientas tipo n8n, pero ligero y acotado a AGORA) ingesta el catálogo desde tu sistema, lo lleva a un punto medio controlado (staging), aplica reglas de mapeo por distribuidor y actualiza la disponibilidad por sucursal de forma repetible.",
        },
        {
          label: "Por qué da confianza",
          text: "Cada carga queda registrada de forma inmutable para auditoría, con idempotencia, manejo de errores y reproceso por lotes. Disparo manual o programado, siempre con el catálogo maestro de AGORA como fuente de verdad.",
        },
      ],
    },
    {
      id: "dms-beneficios",
      layout: "progress-board",
      kicker: "Integración con el DMS",
      title: "Del trabajo manual a la sincronización automática",
      subtitle: "Comparativo ilustrativo del esfuerzo operativo antes y con AGORA.",
      progressBars: [
        { label: "Catálogo actualizado y disponible", real: 95, expected: 40 },
        { label: "Esfuerzo manual de captura", real: 15, expected: 90 },
        { label: "Trazabilidad y auditoría de cargas", real: 100, expected: 30 },
        { label: "Escalabilidad multi-distribuidor", real: 90, expected: 35 },
      ],
      footnote: "Valores ilustrativos para fines de presentación; no son métricas de un cliente específico.",
    },
    {
      id: "soluciones",
      layout: "table",
      kicker: "Qué resolvemos",
      title: "Problema → cómo lo soluciona AGORA",
      table: {
        headers: ["Problema del negocio", "Solución de AGORA"],
        rows: [
          [
            "El catálogo vive en el DMS y no llega al canal digital",
            "Motor de ingesta que sincroniza catálogo, precios y stock por distribuidor",
          ],
          [
            "Actualizar miles de SKUs a mano no escala",
            "Carga por lotes con staging, reglas de mapeo, idempotencia y reproceso",
          ],
          [
            "El cliente no sabe si la pieza es compatible",
            "Búsqueda por marca, modelo, año y número de parte (OEM/alternativo)",
          ],
          [
            "Operación dispersa entre sistemas y sucursales",
            "Administración multi-tienda: global, grupo, sucursal y marca",
          ],
          [
            "Falta de presencia y canal de venta digital",
            "Tienda en línea lista, con checkout, envíos y seguimiento de pedidos",
          ],
          [
            "Sin visibilidad ni trazabilidad de las ventas",
            "Visibilidad por sucursal, grupo, marca y global; auditoría de cargas",
          ],
        ],
      },
    },
    {
      id: "multitienda",
      layout: "triptych",
      kicker: "Administración multi-tienda",
      title: "Un mismo catálogo, cuatro formas de vender",
      subtitle: "Cada canal promueve la venta; quien surte siempre es el distribuidor (la sucursal con el producto en almacén).",
      triptych: [
        {
          title: "Global y Grupo",
          accent: "mint",
          items: [
            "Tienda global del ecosistema (con margen propio).",
            "Tienda por grupo / dealer con su branding.",
            "Gestión centralizada de sucursales del grupo.",
          ],
        },
        {
          title: "Sucursal",
          accent: "blue",
          items: [
            "Cada sucursal gestiona productos, precios y stock.",
            "Surte los pedidos (fulfillment) y ve todo lo que despacha.",
            "Branding y horarios propios de la tienda.",
          ],
        },
        {
          title: "Marca",
          accent: "iris",
          items: [
            "Tienda por marca de vehículo (Nissan, Ford…).",
            "Cuenta corporativa independiente del dealer.",
            "Branding y promoción de la marca.",
          ],
        },
      ],
    },
    {
      id: "capacidades",
      layout: "bullets",
      kicker: "Capacidades del producto",
      title: "Lo que ya hace la plataforma",
      bullets: [
        "Catálogo avanzado de refacciones, accesorios e instalación, con compatibilidad por vehículo.",
        "Disponibilidad, precios y stock administrados por sucursal / distribuidor.",
        "Checkout multi-sucursal, seguimiento de pedidos y postventa.",
        "Monedero electrónico (wallet), impuestos configurables y zonas de cobertura.",
        "Branding personalizable por grupo, sucursal y marca; sliders y contenido del sitio.",
        "Integración de envíos (Skydropx) y correos de confirmación de pedido.",
      ],
    },
    {
      id: "tres-apps",
      layout: "triptych",
      kicker: "Una plataforma, tres accesos",
      title: "Cada quien con su panel",
      triptych: [
        {
          title: "web-admin",
          accent: "iris",
          items: [
            "Administración global del ecosistema.",
            "Usuarios, negocios, catálogos e integraciones.",
            "Contenido y configuración del sitio.",
          ],
        },
        {
          title: "web-local",
          accent: "blue",
          items: [
            "Panel del dueño / gerente de tienda.",
            "Productos, pedidos, inventario y horarios.",
            "Conectores y workflows de ingesta por sucursal.",
          ],
        },
        {
          title: "store-front",
          accent: "mint",
          items: [
            "La tienda que ve el cliente final.",
            "Catálogo, carrito, checkout y mis órdenes.",
            "Contexto global, grupo, sucursal o marca.",
          ],
        },
      ],
    },
    {
      id: "diferenciadores",
      layout: "bullets",
      kicker: "Por qué AGORA",
      title: "Lo que nos hace distintos",
      bullets: [
        "No reemplazamos tu DMS: nos conectamos a él y lo proyectamos al canal digital.",
        "La administración es el centro: integración, multi-tienda, trazabilidad y control.",
        "Pensado para el sector de refacciones: compatibilidad por vehículo de origen.",
        "Escala a múltiples distribuidores con reglas aisladas y auditoría por lote.",
        "Stack moderno y seguro: backend NestJS, Supabase (Postgres/Auth/Storage) y fronts dedicados.",
      ],
    },
    {
      id: "beneficios-actor",
      layout: "triptych",
      kicker: "A quién le sirve",
      title: "Valor para cada actor",
      triptych: [
        {
          title: "Distribuidor",
          accent: "mint",
          items: [
            "Su catálogo del DMS, vendiendo en línea.",
            "Menos captura manual, menos errores.",
            "Ve todos los pedidos que surte.",
          ],
        },
        {
          title: "Grupo / Dealer",
          accent: "blue",
          items: [
            "Tienda propia con su marca y sucursales.",
            "Administración centralizada del grupo.",
            "Visibilidad de las ventas de su canal.",
          ],
        },
        {
          title: "Cliente final",
          accent: "iris",
          items: [
            "Encuentra la pieza correcta para su auto.",
            "Compra, paga y da seguimiento fácil.",
            "Experiencia de compra moderna.",
          ],
        },
      ],
    },
    {
      id: "closing",
      layout: "closing",
      kicker: "Cierre",
      title: "AGORA: tu operación, ahora digital",
      bullets: [
        "Conectamos tu DMS con la venta en línea.",
        "Administramos catálogo, sucursales y marcas en un solo lugar.",
        "Convertimos datos dispersos en ventas trazables.",
      ],
      subtitle: "Conversemos cómo conectar tu catálogo y abrir tu canal digital.",
    },
  ],
};
