import type { DeckMeta } from "../types";

export const kickoffQardealCoreDeck: DeckMeta = {
  id: "kickoff-qardeal-core",
  title: "Kickoff — Qardeal Core V3",
  description:
    "Alineación de alcance, hitos, gobierno e infraestructura. Basado en el guion de kickoff ejecutivo.",
  updated: "2026-05-12",
  slides: [
    {
      id: "cover",
      layout: "cover",
      kicker: "Programa Qardeal",
      title: "Kickoff — Qardeal Core V3",
      subtitle: "Plataforma operativa multi-sucursal — arranque formal del programa",
      footnote: "12 may 2026 · Guion v2 · Arranque efectivo +7 días vs plan 5 may; hitos según cronograma replanificado.",
    },
    {
      id: "meta",
      layout: "prose",
      kicker: "Meta de la sesión",
      title: "Objetivo y salida",
      prose: [
        {
          label: "Objetivo",
          text: "Alinear sponsor, negocio y equipo de entrega sobre: alcance cerrado, hitos, riesgos, modelo de gobierno, infraestructura mínima y la definición explícita de quién decide qué. Se busca asegurar que todos los participantes comprendan el marco de ejecución, los compromisos clave y las dependencias críticas antes de arrancar formalmente el proyecto.",
        },
        {
          label: "Salida esperada",
          text: "Presentación del flujo de trabajo, calendario de seguimiento y asignación de owners.",
        },
      ],
    },
    {
      id: "agenda",
      layout: "agenda",
      kicker: "Agenda",
      title: "Qué cubriremos hoy",
      bullets: [
        "Contexto y objetivos del programa",
        "Hitos y criterios de éxito",
        "Plan por fases",
        "Infraestructura y ambientes",
        "Equipo, roles y gobierno",
        "Comunicación, ceremonias y cambios",
        "Riesgos y aclaraciones obligatorias antes de construir",
        "Cierre: Q&A breve si aplica, y agradecimiento",
      ],
    },
    {
      id: "why",
      layout: "bullets",
      kicker: "Contexto",
      title: "Por qué Qardeal Core",
      bullets: [
        "Digitalizar la operación completa de renta de autos multi-sucursal.",
        "Cobertura punta a punta: cotización → reserva → validación → contrato → entrega → devolución → cargos → facturación CFDI 4.0 → cierre → seguimiento.",
        "14 módulos core en inversión + app móvil cliente incluida, según el alcance funcional acordado para el programa.",
      ],
    },
    {
      id: "scope-components",
      layout: "table",
      kicker: "Alcance",
      title: "Qué sí construiremos (componentes)",
      table: {
        headers: ["Componente", "Descripción breve"],
        rows: [
          [
            "Plataforma web operativa",
            "Front para operadores y administradores; back por módulos de negocio; BD relacional.",
          ],
          [
            "App móvil",
            "Flutter iOS/Android — self-service (registro, reserva, pre-check-in/firma, renta activa, facturas, notificaciones, soporte).",
          ],
          [
            "Integraciones obligatorias",
            "VerificaMex; Damage/QarScan; Facturapi (CFDI); pagos (Stripe/FLAP/Pin Pad/TPV); Oracle Fusion Cloud ERP; conectores del ecosistema.",
          ],
        ],
      },
    },
    {
      id: "scope-rules",
      layout: "bullets",
      kicker: "Alcance",
      title: "Reglas y calidad (extracto ejecutivo)",
      bullets: [
        "Reglas de negocio documentadas por área: reservas, cliente, flota, contratos, pagos, facturación, daños, devoluciones y auditoría.",
        "No funcionales: RBAC, 2FA admin, cifrado en tránsito/reposo, mitigación SQLi/XSS, rate limiting.",
        "PCI DSS (sin almacenar PAN; solo tokens), disponibilidad ≥ 99,5%, operaciones comunes < 2 s, auditoría de acciones críticas.",
      ],
    },
    {
      id: "acceptance",
      layout: "bullets",
      kicker: "Éxito",
      title: "Criterios de aceptación macro (sin ampliar alcance)",
      bullets: [
        "Cada módulo queda trazado al alcance funcional acordado.",
        "Las reglas de negocio definidas para el producto están implementadas, probadas y con evidencia de prueba.",
        "Integraciones obligatorias operativas o con mecanismo de prueba equivalente acordado.",
        "App iOS/Android cubre el flujo self-service descrito.",
        "Reportes/KPIs, comunicaciones y CFDI 4.0 según reglas.",
      ],
    },
    {
      id: "phases-overview",
      layout: "bullets",
      kicker: "Programa",
      title: "Vista ejecutiva (4 etapas)",
      bullets: [
        "Definir y validar — modelo de BD y prototipo por alcance modular, reglas y decisiones de integración; el PO debe validarlo antes de construir.",
        "Construir e integrar — módulos core, APIs, integraciones.",
        "Estabilizar en staging — ciclo punta a punta y pruebas integrales.",
        "Salir a producción — operación real controlada.",
      ],
      footnote: "Alineado al plan por módulo y aplicación del programa.",
    },
    {
      id: "milestones-2026",
      layout: "table",
      kicker: "Hitos",
      title: "Hitos oficiales 2026",
      table: {
        headers: ["Hito", "Fecha", "Nombre orientativo"],
        rows: [
          ["1", "12 may 2026", "Arranque"],
          ["2", "14 jul 2026", "Inmersión + prototipo validado"],
          ["3", "12 oct 2026", "Staging (core operativo punta a punta)"],
          ["4", "4 dic 2026", "Productivo (operación real)"],
        ],
      },
      footnote:
        "Ventana: 12 may → 4 dic 2026 (207 días). Repl.: +7 días desde plan 5 may al arranque real 12 may. El desglose por módulo vive en el cronograma de trabajo del programa.",
    },
    {
      id: "gantt-exec",
      layout: "split",
      kicker: "Plan",
      title: "Plan por fases — lectura ejecutiva",
      split: {
        left: {
          title: "Fase 1 — Transversal (hasta Hito 2)",
          bullets: [
            "Planificación: inmersión, discovery, cierre de requerimientos.",
            "Prototipo funcional: UE/UI, identidad, validación navegable.",
          ],
        },
        right: {
          title: "Fase Core y cierre",
          bullets: [
            "Web: flota, reservas, cotizaciones, entrega/recepción, multi-sede, patio, inteligencia operativa…",
            "Backend: tarifas, promociones, roles, contratos digitales, CFDI.",
            "Mobile: tres incrementos hasta mediados de octubre.",
            "Integraciones: APIs largas hasta ventana previa a QA.",
            "Fase final: QA integral, UAT, hardening → go-live.",
          ],
        },
      },
    },
    {
      id: "milestone-deliverables",
      layout: "split",
      kicker: "Entregables",
      title: "Por hito (resumen)",
      split: {
        left: {
          title: "Hito 1 · Marco listo",
          bullets: [
            "Web: menú y estructura de módulos alineados al alcance; RBAC por sucursal/corporativo.",
            "Backend: arquitectura modular; contratos Customer/Reservation/Contract/Fleet/Payment/Billing; estados.",
            "Mobile: alcance y flujos de firma/validación.",
            "Integraciones: ambientes, credenciales, contratos de intercambio, estrategia de pruebas.",
            "Datos: maestras, auditoría, KPIs/reportes.",
          ],
        },
        right: {
          title: "Hitos 2 · 3 · 4",
          bullets: [
            "H2: prototipos navegables + reglas de negocio validadas; integraciones definidas y excepciones.",
            "H3: staging end-to-end — reglas transaccionales, app staging, integraciones, comunicaciones, reportes con datos staging.",
            "H4: producción — sucursales/usuarios definidos; monitoreo; app publicada; integraciones con trazabilidad.",
          ],
        },
      },
    },
    {
      id: "infra",
      layout: "table",
      kicker: "Infraestructura",
      title: "Marco recomendado (propuesta)",
      table: {
        headers: ["Tema", "Dirección"],
        rows: [
          ["Ambientación", "Dev, staging/pre-prod, prod; datos sintéticos/anonymized en no prod."],
          ["App web", "CDN + hosting SPA o SSR; HTTPS obligatorio."],
          ["API / backend", "Contenedores o PaaS; escalado horizontal donde aplique."],
          ["Datos", "BD relacional administrada; backups; restauración probada; ventanas de mantenimiento."],
          ["Secretos", "Vault/KMS; rotación; nada en código."],
          ["Observabilidad", "Logs, métricas, trazas; alertas disponibilidad y latencia."],
          ["Mobile", "Pipelines iOS/Android; TestFlight/Play Internal → tiendas en go-live."],
          ["Integraciones", "Sandboxes por proveedor; colas/reintentos idempotentes donde aplique."],
          ["Cumplimiento", "PCI (tokenización), LFPDPPP, evidencias para auditoría."],
        ],
      },
      footnote: "Proveedor cloud y SKUs se confirman en kickoff técnico.",
    },
    {
      id: "infra-checklist",
      layout: "bullets",
      kicker: "Dependencias",
      title: "Infra / terceros — asignar owner y fecha",
      bullets: [
        "Cuentas y contratos: VerificaMex, Facturapi, pasarela(s), Oracle ERP, Damage/QarScan.",
        "DNS, certificados, dominios productivos y de staging.",
        "Correo/SMS/WhatsApp para comunicaciones automáticas.",
        "Políticas corporativas: VPN, IdP/SSO, allowlists IP.",
        "Tiendas Apple/Google: cuentas desarrollador, metadata y revisión.",
      ],
    },
    {
      id: "team",
      layout: "table",
      kicker: "Equipo",
      title: "Roles — modelo recomendado",
      table: {
        headers: ["Rol", "Responsabilidad principal", "Nombre"],
        rows: [
          [
            "Product Owner (cliente)",
            "Prioridades funcionales; validación de flujos, modelo de BD y prototipo por alcance antes de desarrollar; UAT y aceptación de entregables.",
            "A definir en kickoff",
          ],
          [
            "CEO",
            "Dirección ejecutiva Icolaborate y BCMC.",
            "Julio Díaz",
          ],
          [
            "Ejecutivo de cuenta",
            "Relación y coordinación con el cliente; alineación de expectativas y seguimiento del encargo.",
            "Edgar Ruiz",
          ],
          [
            "Líder de desarrollo",
            "Arquitectura, NFRs, deuda y trade-offs; lidera la entrega integral (APIs y datos, integraciones, web, app móvil), la operación de plataforma (ambientes, observabilidad, despliegues) y la seguridad y cumplimiento técnico (RBAC, 2FA admin, revisiones, PCI).",
            "Pedro Carrizal",
          ],
          [
            "UX y diseño gráfico",
            "Identidad, prototipos, accesibilidad y consistencia multi-canal.",
            "Adrián Alvarado",
          ],
          [
            "QA y testing",
            "Plan de pruebas, regresión, evidencias de reglas críticas y CFDI.",
            "Fernando Flores",
          ],
          [
            "Representante legal",
            "Representación legal Icolaborate.",
            "Paola Contreras",
          ],
        ],
      },
      footnote:
        "Product Owner (lado cliente): cerrar en sesión quién valida flujos, prototipos y UAT. Nómina orientativa Icolaborate; confirmar sustitutos por rol.",
    },
    {
      id: "governance",
      layout: "bullets",
      kicker: "Operación",
      title: "Gobierno operativo",
      bullets: [
        "Ritmo: sprint/quincena acordada; revisión semanal mínima en tramos críticos.",
        "Por módulo o grupo de módulos (granularidad la acuerdan el líder de desarrollo y el equipo): se gestiona modelo de BD y prototipo; el equipo los propone, el PO valida; recién después arranca el desarrollo de ese alcance.",
        "Backlog: una sola fuente de verdad enlazada al alcance acordado y al catálogo de reglas de negocio.",
        "Cambios: lo no contemplado en el alcance cerrado pasa por control de cambios (impacto, costo, fecha).",
        "Calidad: “terminado” incluye pruebas y evidencia en reglas críticas y fiscalidad.",
      ],
    },
    {
      id: "risks",
      layout: "quote",
      kicker: "Riesgos",
      title: "Aclaraciones obligatorias antes de construir",
      subtitle:
        "Negocio debe dejar explícitas las decisiones pendientes (reservas, lista negra, excepciones, etc.). Mantener tabla viva: pregunta → owner → fecha → impacto si no se cierra.",
      footnote:
        "Usar la lista de pendientes de negocio acordada entre sponsor, PO (cliente) y ejecutivo de cuenta como fuente prioritaria.",
    },
    {
      id: "next-14",
      layout: "table",
      kicker: "Próximos pasos",
      title: "Próximos 14 días (plantilla)",
      table: {
        headers: ["#", "Acción", "Responsable", "Fecha límite"],
        rows: [
          ["1", "Envío de minuta sobre la reunión de Kickoff", "Ejecutivo de cuenta", "…"],
          ["2", "Lista cerrada de pendientes de negocio con owners", "PO + ejecutivo de cuenta", "…"],
          ["3", "Accesos: repos, chat, gestor de tareas, ambientes", "Líder de desarrollo", "…"],
          ["4", "Calendario de talleres (integraciones, fiscal, operación)", "Ejecutivo de cuenta", "…"],
          ["5", "Primera versión de backlog priorizado por hito", "PO + líder de desarrollo", "…"],
        ],
      },
    },
    {
      id: "closing",
      layout: "closing",
      kicker: "Cierre",
      title: "Gracias",
      subtitle: "Por su tiempo y compromiso con el programa.",
    },
  ],
};
