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

/** Cadencia comité: miércoles 11:00 h. Actualizar `NEXT_STATUS_DATE` antes de cada sesión. */
const NEXT_STATUS_DATE = "21 mayo 2026";

/** Ventana Hito 2 — definición y prototipo. */
const HITO2_RANGE = { start: "2026-05-01", end: "2026-07-31" } as const;

const HITO2_MONTHS = [
  { label: "Mayo", sublabel: "2026" },
  { label: "Junio", sublabel: "2026" },
  { label: "Julio", sublabel: "2026" },
];

/**
 * Status semanal — Comité Qardeal Core (v3).
 * Gantt = contexto programa (no tocar). Resto = ciclo semanal: semana reportada → próximo status.
 * Cadencia comité: miércoles 11:00 h. Actualizar fechas antes de cada sesión.
 */
export const statusSemanalQardealCoreDeck: DeckMeta = {
  id: "status-semanal-qardeal-core",
  title: "Status Semanal — Qardeal Core V3",
  description:
    "Reporte semanal: Gantt de contexto + avance de la semana y plan hasta el próximo comité.",
  updated: "2026-05-19",
  slides: [
    {
      id: "cover",
      layout: "cover",
      kicker: "Comité de seguimiento",
      title: "Presentación de Avance Semanal",
      subtitle: "Programa Qardeal Core V3 — Plataforma operativa multi-sucursal",
      footnote: `19 mayo 2026 · Semana reportada: 12–16 mayo · Próximo status: miércoles ${NEXT_STATUS_DATE} · 11:00 h`,
    },
    {
      id: "gantt-program",
      layout: "gantt",
      kicker: "Reporte de avance general",
      title: "¿Dónde estamos en el programa?",
      subtitle: "Avance hacia Hito 2: 16% real · 18% esperado · desviación −2 pp (en tiempo)",
      gantt: {
        rangeStart: PROGRAM_RANGE.start,
        rangeEnd: PROGRAM_RANGE.end,
        months: PROGRAM_MONTHS,
        groupLabel: "Camino a producción — 4 hitos oficiales",
        markers: [
          { label: "Dónde estamos", date: "2026-05-19", kind: "now" },
          { label: "Hito 2", date: "2026-07-14", kind: "milestone", sublabel: "Prototipo validado" },
          { label: "Hito 3", date: "2026-10-12", kind: "milestone", sublabel: "Staging E2E" },
          { label: "Hito 4", date: "2026-12-04", kind: "milestone", sublabel: "Productivo" },
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
      footnote: "Hito 1 cumplido (kickoff y marco operativo) · Tramo activo: Hito 2 — definición y prototipo",
    },
    {
      id: "gantt-hito2",
      layout: "gantt",
      kicker: "Hito 2 — Definición y prototipo",
      title: "Detalle del tramo activo",
      subtitle: "Meta: inmersión cerrada + prototipo navegable validado por PO · 14 jul 2026",
      gantt: {
        rangeStart: HITO2_RANGE.start,
        rangeEnd: HITO2_RANGE.end,
        months: HITO2_MONTHS,
        groupLabel: "Trabajo conceptual y de validación (no construcción productiva aún)",
        markers: [
          { label: "Dónde estamos", date: "2026-05-19", kind: "now" },
          { label: "Hito 2", date: "2026-07-14", kind: "milestone", sublabel: "Cierre" },
        ],
        bars: [
          { label: "Inmersión / discovery", start: "2026-05-12", end: "2026-06-01" },
          { label: "Reglas de negocio", start: "2026-05-12", end: "2026-06-20" },
          { label: "Req. FN + NFR", start: "2026-05-15", end: "2026-06-25" },
          { label: "Arquitectura dominio", start: "2026-05-19", end: "2026-07-01" },
          { label: "Análisis de flujos", start: "2026-06-01", end: "2026-07-07" },
          { label: "Historias de usuario", start: "2026-06-01", end: "2026-07-10" },
          { label: "Prototipo UX/UI", start: "2026-06-02", end: "2026-07-14" },
          { label: "Validación PO", start: "2026-06-15", end: "2026-07-14" },
        ],
      },
      footnote: "Gate acordado: por cada alcance → modelo BD + prototipo propuestos → PO valida → arranca desarrollo",
    },
    {
      id: "metrics-hito2",
      layout: "dashboard",
      kicker: "Semana 12–16 mayo",
      title: "Avance acumulado — Hito 2",
      subtitle: "Semana reportada: inmersión, alcance, reglas (borrador) y arquitectura inicial · integraciones fuera de alcance",
      metrics: [
        { label: "Real", value: "16%", tone: "success" },
        { label: "Esperado", value: "18%", tone: "default" },
        { label: "Desviación", value: "−2 p.p.", tone: "success" },
      ],
      timeline: [
        { label: "Hito 1 · Arranque", status: "done", sublabel: "Cerrado" },
        { label: "Hito 2 · Definición", status: "current", sublabel: "Sem. 2" },
        { label: "Hito 2 · Prototipo", status: "pending", sublabel: "Desde jun" },
        { label: "Hito 2 · Cierre", status: "pending", sublabel: "14 jul" },
      ],
      footnote: "En tiempo (0 a −3 p.p.) · Detalle de la semana en diapositivas siguientes",
    },
    {
      id: "tracks",
      layout: "progress-board",
      kicker: "Semana reportada",
      title: "Frentes trabajados 12–16 mayo",
      subtitle: "Solo frentes en los que hubo actividad real — sin integraciones ni HU aún",
      progressBars: [
        { label: "Gobierno y cadencia comité", real: 90, expected: 85 },
        { label: "Mapa 14 módulos vs alcance", real: 65, expected: 60 },
        { label: "Reglas de negocio (borrador / lectura)", real: 15, expected: 15 },
        { label: "Req. funcionales (inicio por área)", real: 10, expected: 12 },
        { label: "Req. no funcionales (lista referencia)", real: 12, expected: 12 },
      ],
    },
    {
      id: "risks",
      layout: "risk-board",
      kicker: "Seguimiento",
      title: "Riesgos — semana 12–16 mayo",
      risks: [
        {
          id: "—",
          severity: "baja",
          status: "Sin escalamiento",
          title: "Sin riesgos materializados en esta semana",
          action:
            "Fase de inmersión en curso: análisis de insumos, capturas del sistema actual, definición de campos y revisión de flujos compartidos por el PO. Las preguntas se irán formalizando al consolidar.",
        },
      ],
      footnote: "La 1.ª tanda de módulos prioritarios la propone consultoría con base en alcance y flujo operativo — no es pendiente del PO en esta etapa",
    },
    {
      id: "pending",
      layout: "table",
      kicker: "Para próximo status",
      title: "Qué mostraremos el 21 mayo",
      table: {
        headers: ["●", "Tema", "Qué se necesita", "Owner", "Status"],
        rows: [
          [
            "🟢",
            "Inmersión",
            "Seguir capturas, campos y revisión de flujos recibidos del PO",
            "Consultoría",
            "En curso",
          ],
          [
            "🟡",
            "Aclaraciones",
            "Responder dudas del PO cuando formalicemos preguntas del análisis",
            "PO",
            "Según surjan",
          ],
          [
            "🟢",
            "Forma de trabajo",
            "Canal único de pendientes y responsables de validación",
            "PM",
            "En curso",
          ],
        ],
      },
      footnote: "Integraciones (VerificaMex, fiscal, pagos, ERP): no iniciadas — fuera del alcance de esta semana",
    },
    {
      id: "deliverables",
      layout: "triptych",
      kicker: "Ciclo semanal",
      title: "Semana 12–16 may · Entregables · Plan hasta 21 may",
      triptych: [
        {
          title: "Esta semana",
          accent: "mint",
          total: 5,
          items: [
            "Seguimiento post-kickoff y cadencia comité",
            "Capturas del sistema actual + definición de campos",
            "Revisión de flujos compartidos por el PO",
            "Inventario ODS plataforma operativa (referencia)",
            "Borrador modelo dominio + RBAC/ABAC",
          ],
        },
        {
          title: "Artefactos",
          accent: "blue",
          total: 5,
          items: [
            "Guion kickoff + presentación status (web)",
            "21 hojas ODS → Markdown (referencia legacy)",
            "Doc. modelo dominio Supabase (borrador)",
            "Migración base control de acceso (SQL)",
            "Frame navegación dashboard (prototipo menú)",
          ],
        },
        {
          title: "Para status 21 may",
          accent: "iris",
          total: 4,
          items: [
            "Propuesta módulos primordiales — 1.ª tanda (consultoría)",
            "Consolidado de preguntas al PO (si aplica)",
            "Avance modelo dominio — ubicaciones / flota",
            "Checklist NFRs de referencia (borrador)",
          ],
        },
      ],
      footnote: "Fuera de plan inmediato: integraciones, HU masivas, BPMN completo, validación formal de prototipo",
    },
    {
      id: "closing",
      layout: "closing",
      kicker: "Cierre",
      title: "Gracias",
      subtitle: `Q&A · Próximo status: miércoles ${NEXT_STATUS_DATE} · 11:00 h`,
      bullets: ["Comité Qardeal Core · GANEXUS", "PM · PO · Director del desarrollo"],
    },
  ],
};
