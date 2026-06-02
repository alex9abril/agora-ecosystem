import type { DeckMeta } from "../types";

/** Meses compartidos — programa completo (may–dic 2026). */
const PROGRAM_RANGE = { start: "2026-05-01", end: "2026-12-31" } as const;

const PROGRAM_MONTHS = [
  { label: "Mayo", sublabel: "2026" },
  { label: "Junio", sublabel: "2026" },
  { label: "Julio", sublabel: "2026" },
  { label: "Agosto", sublabel: "2026" },
  { label: "Sept.", sublabel: "2026" },
  { label: "Oct.", sublabel: "2026" },
  { label: "Nov.", sublabel: "2026" },
  { label: "Dic.", sublabel: "2026" },
];

/** Cadencia comité: miércoles 11:00 h. */
const STATUS_DATE = "27 mayo 2026";
const NEXT_STATUS_DATE = "3 junio 2026";

/** Ventana Hito 2 — definición y prototipo. */
const HITO2_RANGE = { start: "2026-05-01", end: "2026-07-31" } as const;

const HITO2_MONTHS = [
  { label: "Mayo", sublabel: "2026" },
  { label: "Junio", sublabel: "2026" },
  { label: "Julio", sublabel: "2026" },
];

/**
 * Status semanal — Comité Qardeal Core (sesión 27 mayo 2026).
 * Gantt = contexto programa (no tocar). Resto = ciclo semanal: semana reportada → próximo status.
 * Cadencia comité: miércoles 11:00 h.
 */
export const statusSemanalQardealCore27MayDeck: DeckMeta = {
  id: "status-semanal-qardeal-core-27may",
  title: "Status Semanal — Qardeal Core V3 · 27 may",
  description:
    "Sesión 27 mayo 2026 · Catálogo de 60 HUs + prototipo navegable admin (33 HUs) y plan hasta el próximo comité.",
  updated: "2026-05-27",
  slides: [
    {
      id: "cover",
      layout: "cover",
      kicker: "Comité de seguimiento",
      title: "Presentación de Avance Semanal",
      subtitle: "Programa Qardeal Core V3 — Plataforma operativa multi-sucursal",
      footnote: `${STATUS_DATE} · Semana reportada: 20–26 mayo · Próximo status: miércoles ${NEXT_STATUS_DATE} · 11:00 h`,
    },
    {
      id: "gantt-program",
      layout: "gantt",
      kicker: "Reporte de avance general",
      title: "¿Dónde estamos en el programa?",
      subtitle:
        "Avance hacia Hito 2: 28% real · 24% esperado · desviación +4 pp (adelantados)",
      gantt: {
        rangeStart: PROGRAM_RANGE.start,
        rangeEnd: PROGRAM_RANGE.end,
        months: PROGRAM_MONTHS,
        groupLabel: "Camino a producción — 4 hitos oficiales",
        markers: [
          { label: "Dónde estamos", date: "2026-05-27", kind: "now" },
          {
            label: "Hito 2",
            date: "2026-07-14",
            kind: "milestone",
            sublabel: "Prototipo validado",
          },
          {
            label: "Hito 3",
            date: "2026-10-12",
            kind: "milestone",
            sublabel: "Staging E2E",
          },
          {
            label: "Hito 4",
            date: "2026-12-04",
            kind: "milestone",
            sublabel: "Productivo",
          },
        ],
        bars: [
          { label: "Hito 1 · Arranque", start: "2026-05-05", end: "2026-05-12" },
          { label: "Hito 2 · Definición", start: "2026-05-12", end: "2026-06-01" },
          { label: "Hito 2 · Prototipo", start: "2026-06-02", end: "2026-07-14" },
          { label: "Hito 3 · Construcción", start: "2026-07-15", end: "2026-10-05" },
          { label: "Hito 3 · Staging / QA", start: "2026-10-06", end: "2026-10-12" },
          { label: "Hito 4 · Go-live", start: "2026-10-13", end: "2026-12-04" },
        ],
      },
      footnote:
        "Hito 1 cumplido · Tramo activo: Hito 2 — definición avanzada + prototipo navegable arrancado anticipadamente",
    },
    {
      id: "gantt-hito2",
      layout: "gantt",
      kicker: "Hito 2 — Definición y prototipo",
      title: "Detalle del tramo activo",
      subtitle:
        "Meta: inmersión cerrada + prototipo navegable validado por PO · 14 jul 2026",
      gantt: {
        rangeStart: HITO2_RANGE.start,
        rangeEnd: HITO2_RANGE.end,
        months: HITO2_MONTHS,
        groupLabel: "Trabajo conceptual y de validación (no construcción productiva aún)",
        markers: [
          { label: "Dónde estamos", date: "2026-05-27", kind: "now" },
          {
            label: "Hito 2",
            date: "2026-07-14",
            kind: "milestone",
            sublabel: "Cierre",
          },
        ],
        bars: [
          { label: "Inmersión / discovery", start: "2026-05-12", end: "2026-06-01" },
          { label: "Reglas de negocio", start: "2026-05-12", end: "2026-06-20" },
          { label: "Req. FN + NFR", start: "2026-05-15", end: "2026-06-25" },
          { label: "Arquitectura dominio", start: "2026-05-19", end: "2026-07-01" },
          { label: "Análisis de flujos", start: "2026-06-01", end: "2026-07-07" },
          { label: "Historias de usuario", start: "2026-05-20", end: "2026-07-10" },
          { label: "Prototipo UX/UI", start: "2026-05-22", end: "2026-07-14" },
          { label: "Validación PO", start: "2026-06-01", end: "2026-07-14" },
        ],
      },
      footnote:
        "HUs y prototipo arrancados antes de lo planeado (29 may → 20 may, 2 jun → 22 may). PO entra al ciclo de validación esta semana.",
    },
    {
      id: "metrics-hito2",
      layout: "dashboard",
      kicker: "Semana 20–26 mayo",
      title: "Avance acumulado — Hito 2",
      subtitle:
        "Catálogo de 60 HUs estructurado + prototipo navegable de 33 HUs admin + base de pulido con PO",
      metrics: [
        { label: "Real", value: "28%", tone: "success" },
        { label: "Esperado", value: "24%", tone: "default" },
        { label: "Desviación", value: "+4 p.p.", tone: "success" },
      ],
      timeline: [
        { label: "Hito 1 · Arranque", status: "done", sublabel: "Cerrado" },
        { label: "Hito 2 · Definición", status: "current", sublabel: "Sem. 3" },
        {
          label: "Hito 2 · Prototipo",
          status: "current",
          sublabel: "Arrancado",
        },
        { label: "Hito 2 · Cierre", status: "pending", sublabel: "14 jul" },
      ],
      footnote:
        "Adelantados (+4 pp) gracias al arranque temprano de HUs y prototipo · próxima fase: pulido iterativo HU por HU con PO",
    },
    {
      id: "tracks",
      layout: "progress-board",
      kicker: "Semana reportada",
      title: "Frentes trabajados 20–26 mayo",
      subtitle: "Frentes con avance real esta semana (sin construcción productiva aún)",
      progressBars: [
        { label: "Catálogo de Historias de Usuario (60 HUs)", real: 75, expected: 55 },
        { label: "Prototipo navegable — módulos admin (33 HUs)", real: 65, expected: 35 },
        { label: "Reglas de negocio (borrador integrado)", real: 55, expected: 50 },
        { label: "Arquitectura dominio + modelo de datos", real: 45, expected: 45 },
        { label: "Doc. pública (docs/historias_usuario)", real: 70, expected: 50 },
        { label: "Validación HU con PO (ciclo de pulido)", real: 5, expected: 8 },
      ],
      footnote:
        "El pulido HU↔PO arranca esta semana en formato cola priorizada por equipo de desarrollo.",
    },
    {
      id: "huy-prototipo",
      layout: "triptych",
      kicker: "Detalle del entregable de la semana",
      title: "Historias de usuario · Prototipo · Documentación",
      triptych: [
        {
          title: "60 HUs estructuradas",
          accent: "mint",
          total: 60,
          items: [
            "Cliente Final (19 HUs) — app móvil, sitio web, reservas y autoservicio",
            "Administración (33 HUs) — operación interna multi-sucursal",
            "Integraciones API (8 HUs) — CFDI, comunicaciones, externos",
            "Cada HU con plantilla: contexto, Gherkin, datos, pendientes",
            "Trazabilidad con reglas de negocio (RN-*) del alcance v3",
          ],
        },
        {
          title: "Prototipo navegable admin",
          accent: "blue",
          total: 33,
          items: [
            "13 módulos administrativos cubiertos en frontend",
            "33 pantallas semi-funcionales con datos JSON simulados",
            "Navegación lateral reorganizada a estructura HU de Qardeal Core",
            "Wizards, tablas, mapa GPS, KPIs, walkaround — todo navegable",
            "Sin backend aún: pensado para validar UX y flujo con PO",
          ],
        },
        {
          title: "Documentación pública",
          accent: "iris",
          total: 4,
          items: [
            "docs/historias_usuario/ con README maestro + 13 READMEs modulares",
            "Reorganización en 3 categorías (cliente / admin / integraciones)",
            "Script publish-docs.sh para sub-tree a repo público",
            "Alineación de cada HU con el §alcance v3 (formal vs propuesto)",
          ],
        },
      ],
      footnote:
        "Próximo paso: abrir el repositorio público de HUs al PO para que pueda navegar y comentar.",
    },
    {
      id: "pedidos-po",
      layout: "table",
      kicker: "Acción solicitada al PO",
      title: "Lo que necesitamos del PO en los próximos días",
      table: {
        headers: ["●", "Tema", "Qué se necesita", "Owner", "Cuándo"],
        rows: [
          [
            "🟢",
            "Usuario de GitHub del PO",
            "Compartir handle para anexarlo al repositorio público de HUs como colaborador (lectura/comentario)",
            "PO → PM",
            "Esta semana",
          ],
          [
            "🟢",
            "Inicio de pulido HU↔PO",
            "Sesiones cortas dirigidas: consultoría se acerca al PO HU por HU según orden del equipo de desarrollo",
            "Consultoría",
            "Desde 28 may",
          ],
          [
            "🟡",
            "Foco de revisión",
            "PO revisa SOLO las HUs que el equipo de desarrollo señale como ‘listas para pulir’; las demás siguen en construcción",
            "PO + Dev",
            "Continuo",
          ],
          [
            "🟡",
            "Validación de reglas de negocio",
            "Confirmar reglas tomadas del §alcance v3 conforme se levanten dudas al pulir HUs",
            "PO",
            "Según surjan",
          ],
        ],
      },
      footnote:
        "Importante: NO revisar todas las HUs en bloque. El equipo de desarrollo prioriza cuáles van primero al PO; el resto permanece en construcción para evitar retrabajo.",
    },
    {
      id: "risks",
      layout: "risk-board",
      kicker: "Seguimiento",
      title: "Riesgos — semana 20–26 mayo",
      risks: [
        {
          id: "R-01",
          severity: "media",
          status: "Mitigación en curso",
          title: "Revisión masiva de HUs por PO puede generar retrabajo",
          action:
            "Acordamos cola priorizada: el equipo de desarrollo indica qué HUs están listas para pulido con PO. Las demás siguen en construcción y no entran a revisión todavía.",
        },
        {
          id: "R-02",
          severity: "baja",
          status: "Acción esta semana",
          title: "PO sin acceso aún al repositorio público de HUs",
          action:
            "Solicitar usuario de GitHub del PO esta semana para anexarlo como colaborador y habilitar revisión/comentarios dentro del repo.",
        },
        {
          id: "R-03",
          severity: "media",
          status: "Acción solicitada al PO",
          title:
            "Integraciones (VerificaMex, CFDI, pagos, ERP) aún sin accesos ni documentación",
          action:
            "Importante contar ya con los accesos / documentación técnica de cada proveedor para empezar a revisarla e incorporar requisitos, validaciones y campos directamente en las HUs antes de cerrar el Hito 2. Sin esto las HUs de integraciones quedarán incompletas y forzarán retrabajo.",
        },
      ],
      footnote:
        "Sin riesgos altos materializados · cadencia comité estable.",
    },
    {
      id: "pending",
      layout: "table",
      kicker: "Para próximo status",
      title: `Qué mostraremos el ${NEXT_STATUS_DATE}`,
      table: {
        headers: ["●", "Tema", "Qué se necesita", "Owner", "Status"],
        rows: [
          [
            "🟢",
            "Onboarding PO al repo HUs",
            "Anexar usuario de GitHub y validar acceso",
            "PM",
            "Pendiente PO",
          ],
          [
            "🟢",
            "Pulido HU — primera tanda",
            "Iniciar revisión de las primeras 3–5 HUs señaladas por desarrollo (objetivo: cerrar v1 con PO)",
            "Consultoría + PO",
            "Inicia 28 may",
          ],
          [
            "🟡",
            "Modelo de datos Supabase — 1.ª iteración",
            "Cerrar entidades núcleo (flota, reservas, contratos, pagos)",
            "Arquitectura",
            "En curso",
          ],
          [
            "🟢",
            "Backlog priorizado por desarrollo",
            "Publicar orden formal de HUs para que el PO sepa qué se va revisando primero",
            "Consultoría",
            "3 jun",
          ],
        ],
      },
      footnote:
        "Construcción productiva (código de backend) sigue fuera del alcance hasta validación HU por HU con PO.",
    },
    {
      id: "deliverables",
      layout: "triptych",
      kicker: "Ciclo semanal",
      title: `Semana 20–26 may · Entregables · Plan hasta ${NEXT_STATUS_DATE}`,
      triptych: [
        {
          title: "Esta semana",
          accent: "mint",
          total: 6,
          items: [
            "60 HUs estructuradas en 3 categorías (cliente / admin / API)",
            "13 módulos administrativos con prototipo navegable (33 HUs)",
            "Navegación lateral reorganizada por HU (152 rutas)",
            "13 READMEs modulares + README maestro de HUs",
            "Script publish-docs.sh (repo público de HUs)",
            "Botones primarios alineados a marca + UI primitivos compartidos",
          ],
        },
        {
          title: "Artefactos",
          accent: "blue",
          total: 5,
          items: [
            "Repositorio público de HUs (listo para invitar al PO)",
            "Prototipo navegable apps/frontend (build limpio · 152 páginas)",
            "Catálogo de mock-data JSON tipado por módulo",
            "13 features Next.js con convención uniforme",
            "Mapa de cobertura legacy vs HUs Qardeal Core (informativo)",
          ],
        },
        {
          title: `Para status ${NEXT_STATUS_DATE}`,
          accent: "iris",
          total: 4,
          items: [
            "PO incorporado al repo HUs (usuario de GitHub recibido)",
            "Primera tanda de HUs pulidas con PO (3–5 prioritarias)",
            "Orden formal de pulido publicado por desarrollo",
            "Modelo de datos Supabase — iteración 1 cerrada",
          ],
        },
      ],
      footnote:
        "Fuera de plan inmediato: integraciones externas, construcción backend productiva, validación E2E.",
    },
    {
      id: "closing",
      layout: "closing",
      kicker: "Cierre",
      title: "Gracias",
      subtitle: `Q&A · Próximo status: miércoles ${NEXT_STATUS_DATE} · 11:00 h`,
      bullets: [
        "Comité Qardeal Core · GANEXUS",
        "PM · PO · Director del desarrollo",
        "Petición clave: usuario de GitHub del PO para anexar al repo de HUs",
      ],
    },
  ],
};
