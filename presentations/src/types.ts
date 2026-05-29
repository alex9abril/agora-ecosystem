export type TableSpec = {
  headers: string[];
  rows: string[][];
};

export type ProseBlockSpec = {
  label: string;
  text: string;
};

export type MetricSpec = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export type TimelinePhaseSpec = {
  label: string;
  status: "done" | "current" | "pending";
  sublabel?: string;
};

export type ProgressBarSpec = {
  label: string;
  real: number;
  expected: number;
};

export type TriptychColumnSpec = {
  title: string;
  items: string[];
  accent?: "mint" | "blue" | "iris" | "amber";
  total?: number;
};

export type RiskCardSpec = {
  id: string;
  title: string;
  action: string;
  severity: "alta" | "media" | "baja";
  status: string;
};

export type GanttMonthSpec = {
  label: string;
  sublabel?: string;
};

export type GanttBarSpec = {
  label: string;
  /** ISO YYYY-MM-DD */
  start: string;
  end: string;
};

export type GanttMarkerSpec = {
  label: string;
  /** ISO YYYY-MM-DD */
  date: string;
  kind: "now" | "milestone";
  sublabel?: string;
};

export type GanttChartSpec = {
  rangeStart: string;
  rangeEnd: string;
  months: GanttMonthSpec[];
  groupLabel?: string;
  bars: GanttBarSpec[];
  markers: GanttMarkerSpec[];
};

export type SlideSpec = {
  id: string;
  layout:
    | "cover"
    | "agenda"
    | "bullets"
    | "table"
    | "split"
    | "quote"
    | "closing"
    | "prose"
    | "dashboard"
    | "progress-board"
    | "triptych"
    | "risk-board"
    | "gantt";
  title?: string;
  subtitle?: string;
  kicker?: string;
  bullets?: string[];
  table?: TableSpec;
  /** Label + párrafo (layout prose) */
  prose?: ProseBlockSpec[];
  /** Left column title + bullets; right optional title + bullets */
  split?: { left: { title?: string; bullets: string[] }; right: { title?: string; bullets: string[] } };
  /** Métricas grandes (layout dashboard) */
  metrics?: MetricSpec[];
  /** Línea de tiempo de fases (layout dashboard) */
  timeline?: TimelinePhaseSpec[];
  /** Barras real vs esperado (layout progress-board) */
  progressBars?: ProgressBarSpec[];
  /** Tres columnas visuales (layout triptych) */
  triptych?: TriptychColumnSpec[];
  /** Tarjetas de riesgo (layout risk-board) */
  risks?: RiskCardSpec[];
  /** Diagrama Gantt estilo comité (layout gantt) */
  gantt?: GanttChartSpec;
  footnote?: string;
};

export type DeckMeta = {
  id: string;
  title: string;
  description: string;
  updated?: string;
  slides: SlideSpec[];
};
