import type {
  DeckMeta,
  GanttChartSpec,
  GanttMarkerSpec,
  MetricSpec,
  RiskCardSpec,
  SlideSpec,
  TimelinePhaseSpec,
} from "./types";
import { deckRegistry, getDeckById } from "./decks/registry";
import {
  loadSlideCommentsMap,
  normalizeCommentsHtml,
  persistSlideComment,
  sanitizeCommentsHtml,
  slideCommentRowKey,
} from "./slide-comments";
import "./style.css";

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/** Iconos barra de comentarios (solo pictograma; accesible vía aria-label en el botón). */
const ICON_COMMENT_BOLD = `<svg class="utils-comments-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>`;

const ICON_COMMENT_LIST = `<svg class="utils-comments-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>`;

const LAYOUT_LABEL_ES: Record<SlideSpec["layout"], string> = {
  cover: "Portada",
  agenda: "Agenda",
  bullets: "Viñetas",
  table: "Tabla",
  split: "Dos columnas",
  quote: "Cita",
  closing: "Cierre",
  prose: "Texto corrido",
  dashboard: "Panel de avance",
  "progress-board": "Barras de progreso",
  triptych: "Tres columnas",
  "risk-board": "Riesgos",
  gantt: "Gantt / hitos",
};

function ganttPct(date: string, rangeStart: string, rangeEnd: string): number {
  const t = Date.parse(date);
  const a = Date.parse(rangeStart);
  const b = Date.parse(rangeEnd);
  if (b <= a) return 0;
  return Math.max(0, Math.min(100, ((t - a) / (b - a)) * 100));
}

function ganttBarStyle(start: string, end: string, chart: GanttChartSpec): string {
  const left = ganttPct(start, chart.rangeStart, chart.rangeEnd);
  const right = ganttPct(end, chart.rangeStart, chart.rangeEnd);
  const width = Math.max(0.8, right - left);
  return `left:${left.toFixed(2)}%;width:${width.toFixed(2)}%`;
}

function ganttMarkerClass(kind: GanttMarkerSpec["kind"]): string {
  return kind === "now" ? "gantt-marker--now" : "gantt-marker--milestone";
}

function metricToneClass(tone: MetricSpec["tone"]): string {
  if (tone === "success") return "stat-card--success";
  if (tone === "warning") return "stat-card--warning";
  if (tone === "danger") return "stat-card--danger";
  return "stat-card--default";
}

function timelineStatusClass(status: TimelinePhaseSpec["status"]): string {
  if (status === "done") return "timeline-phase--done";
  if (status === "current") return "timeline-phase--current";
  return "timeline-phase--pending";
}

function progressTone(real: number, expected: number): string {
  const delta = real - expected;
  if (delta >= -3) return "progress-bar__fill--ok";
  if (delta >= -5) return "progress-bar__fill--warn";
  return "progress-bar__fill--bad";
}

function riskSeverityClass(severity: RiskCardSpec["severity"]): string {
  if (severity === "alta") return "risk-card--high";
  if (severity === "media") return "risk-card--medium";
  return "risk-card--low";
}

const GANEXUS_LOGO_SRC = "/ganexus-logo.jpg";
const GANEXUS_LOGO_W = 246;
const GANEXUS_LOGO_H = 74;

function renderGanexusLogo(className: string): string {
  return `<img src="${GANEXUS_LOGO_SRC}" alt="GANEXUS" class="${className}" width="${GANEXUS_LOGO_W}" height="${GANEXUS_LOGO_H}" decoding="async" />`;
}

function slideThumbLabel(slide: SlideSpec, index: number): string {
  if (slide.title?.trim()) return slide.title.trim();
  if (slide.kicker?.trim()) return slide.kicker.trim();
  return `Diapositiva ${index + 1}`;
}

function renderThumbnailsStrip(deck: DeckMeta, activeIndex: number): string {
  return deck.slides
    .map((s, i) => {
      const label = esc(slideThumbLabel(s, i));
      const active = i === activeIndex;
      return `<button type="button" class="viewer-thumb${active ? " is-active" : ""}" data-slide-idx="${i}" aria-label="Ir a diapositiva ${i + 1}" aria-current="${active ? "true" : "false"}"><span class="viewer-thumb-num">${i + 1}</span><span class="viewer-thumb-title">${label}</span></button>`;
    })
    .join("");
}

function renderUtilityPanel(deck: DeckMeta, index: number): string {
  const slide = deck.slides[index];
  const total = deck.slides.length;
  const title = esc(slideThumbLabel(slide, index));
  const layout = esc(LAYOUT_LABEL_ES[slide.layout]);
  return `
    <section class="utils-section">
      <h3 class="utils-heading">Diapositiva actual</h3>
      <p class="utils-slide-index"><strong>${index + 1}</strong> / ${total}</p>
      <p class="utils-slide-title">${title}</p>
      <p class="utils-meta"><span class="utils-badge">${layout}</span>${slide.id ? ` · <code class="utils-code">${esc(slide.id)}</code>` : ""}</p>
    </section>
    <section class="utils-section utils-section--comments" aria-labelledby="utils-comments-heading">
      <h3 class="utils-heading" id="utils-comments-heading">Comentarios</h3>
      <p class="utils-comments-hint">Negrita y listas con viñeta. Guardado automático en este dispositivo.</p>
      <div class="utils-comments-editor-shell">
        <div class="utils-comments-toolbar" role="toolbar" aria-label="Formato del comentario">
          <button type="button" class="btn btn--ghost utils-comments-tool utils-comments-tool--icon" id="slide-comments-bold" title="Negrita (Ctrl+B)" aria-label="Negrita">${ICON_COMMENT_BOLD}</button>
          <button type="button" class="btn btn--ghost utils-comments-tool utils-comments-tool--icon" id="slide-comments-bullets" title="Lista con viñetas" aria-label="Lista con viñetas">${ICON_COMMENT_LIST}</button>
        </div>
        <div id="slide-comments-field" class="utils-comments-input" contenteditable="true" role="textbox" spellcheck="true" aria-multiline="true" data-placeholder="Notas para esta diapositiva…" aria-describedby="slide-comments-status"></div>
      </div>
      <p class="utils-comments-status" id="slide-comments-status" aria-live="polite"></p>
    </section>`;
}

function renderSlide(
  slide: SlideSpec,
  index: number,
  total: number,
  opts?: { forPrint?: boolean; pdfCapture?: boolean }
): string {
  const progress = opts?.forPrint
    ? ""
    : `<div class="slide-progress" aria-hidden="true"><span style="width:${((index + 1) / total) * 100}%"></span></div>`;
  const foot = slide.footnote ? `<p class="slide-footnote">${esc(slide.footnote)}</p>` : "";

  if (slide.layout === "cover") {
    return `
      <div class="slide slide--cover" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-cover-inner">
          ${renderGanexusLogo("slide-cover-logo")}
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h1 class="slide-title slide-title--hero">${slide.title ? esc(slide.title) : ""}</h1>
          ${slide.subtitle ? `<p class="slide-subtitle slide-subtitle--hero">${esc(slide.subtitle)}</p>` : ""}
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "closing") {
    const bullets =
      slide.bullets?.map((b) => `<li>${esc(b)}</li>`).join("") ?? "";
    return `
      <div class="slide slide--closing" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-body-standard">
          ${renderGanexusLogo("slide-cover-logo")}
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${bullets ? `<ul class="slide-bullets slide-bullets--compact">${bullets}</ul>` : ""}
          ${slide.subtitle ? `<p class="slide-subtitle">${esc(slide.subtitle)}</p>` : ""}
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "agenda") {
    const items =
      slide.bullets?.map((b, i) => `<li><span class="agenda-num">${i + 1}</span><span>${esc(b)}</span></li>`).join("") ??
      "";
    return `
      <div class="slide slide--agenda" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-body-standard">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          <ol class="slide-agenda">${items}</ol>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "bullets") {
    const items = slide.bullets?.map((b) => `<li>${esc(b)}</li>`).join("") ?? "";
    return `
      <div class="slide slide--bullets" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-body-standard">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${items ? `<ul class="slide-bullets">${items}</ul>` : ""}
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "quote") {
    return `
      <div class="slide slide--quote" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-body-standard slide-quote-inner">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${slide.subtitle ? `<p class="slide-quote-text">${esc(slide.subtitle)}</p>` : ""}
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "split" && slide.split) {
    const leftItems = slide.split.left.bullets.map((b) => `<li>${esc(b)}</li>`).join("");
    const rightItems = slide.split.right.bullets.map((b) => `<li>${esc(b)}</li>`).join("");
    return `
      <div class="slide slide--split" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-split-head">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
        </div>
        <div class="slide-split-grid">
          <div class="slide-split-col">
            ${slide.split.left.title ? `<h3 class="slide-split-subtitle">${esc(slide.split.left.title)}</h3>` : ""}
            <ul class="slide-bullets slide-bullets--small">${leftItems}</ul>
          </div>
          <div class="slide-split-col">
            ${slide.split.right.title ? `<h3 class="slide-split-subtitle">${esc(slide.split.right.title)}</h3>` : ""}
            <ul class="slide-bullets slide-bullets--small">${rightItems}</ul>
          </div>
        </div>
        ${foot ? `<div class="slide-split-foot">${foot}</div>` : ""}
      </div>`;
  }

  if (slide.layout === "prose" && slide.prose?.length) {
    const blocks = slide.prose
      .map(
        (b) =>
          `<p class="slide-prose-p"><strong class="slide-prose-label">${esc(b.label)}</strong> ${esc(b.text)}</p>`
      )
      .join("");
    return `
      <div class="slide slide--prose" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-body-standard slide-prose-inner">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          <div class="slide-prose">${blocks}</div>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "table" && slide.table) {
    const th = slide.table.headers.map((h) => `<th scope="col">${esc(h)}</th>`).join("");
    const tr = slide.table.rows
      .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
      .join("");
    return `
      <div class="slide slide--table" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-table-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          <div class="table-scroll">
            <table class="corp-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
          </div>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "dashboard" && slide.metrics?.length) {
    const stats = slide.metrics
      .map(
        (m) => `
        <div class="stat-card ${metricToneClass(m.tone)}">
          <span class="stat-card__value">${esc(m.value)}</span>
          <span class="stat-card__label">${esc(m.label)}</span>
        </div>`
      )
      .join("");
    const phases =
      slide.timeline
        ?.map(
          (p) => `
        <div class="timeline-phase ${timelineStatusClass(p.status)}">
          <span class="timeline-phase__dot" aria-hidden="true"></span>
          <span class="timeline-phase__label">${esc(p.label)}</span>
          ${p.sublabel ? `<span class="timeline-phase__sub">${esc(p.sublabel)}</span>` : ""}
        </div>`
        )
        .join("") ?? "";
    return `
      <div class="slide slide--dashboard" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-dashboard-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${slide.subtitle ? `<p class="slide-dashboard-sub">${esc(slide.subtitle)}</p>` : ""}
          <div class="stat-row">${stats}</div>
          ${phases ? `<div class="timeline-row" role="list">${phases}</div>` : ""}
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "progress-board" && slide.progressBars?.length) {
    const bars = slide.progressBars
      .map((b) => {
        const delta = b.real - b.expected;
        const deltaLabel = delta >= 0 ? `+${delta}%` : `${delta}%`;
        return `
        <div class="progress-item">
          <div class="progress-item__head">
            <span class="progress-item__label">${esc(b.label)}</span>
            <span class="progress-item__nums">
              <strong>${b.real}%</strong>
              <span class="progress-item__sep">/</span>
              ${b.expected}%
              <span class="progress-item__delta">${esc(deltaLabel)}</span>
            </span>
          </div>
          <div class="progress-bar" aria-hidden="true">
            <span class="progress-bar__track"></span>
            <span class="progress-bar__expected" style="width:${Math.min(100, b.expected)}%"></span>
            <span class="progress-bar__fill ${progressTone(b.real, b.expected)}" style="width:${Math.min(100, b.real)}%"></span>
          </div>
        </div>`;
      })
      .join("");
    const legend = `
      <div class="progress-legend">
        <span><i class="legend-dot legend-dot--ok"></i>En tiempo (0 a −3 pp)</span>
        <span><i class="legend-dot legend-dot--warn"></i>Atención (−3 a −5 pp)</span>
        <span><i class="legend-dot legend-dot--bad"></i>Revisar (&gt; −5 pp)</span>
      </div>`;
    return `
      <div class="slide slide--progress-board" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-progress-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${slide.subtitle ? `<p class="slide-progress-sub">${esc(slide.subtitle)}</p>` : ""}
          ${legend}
          <div class="progress-grid">${bars}</div>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "triptych" && slide.triptych?.length) {
    const cols = slide.triptych
      .map(
        (c) => `
        <div class="triptych-col triptych-col--${c.accent ?? "mint"}">
          <div class="triptych-col__head">
            <h3 class="triptych-col__title">${esc(c.title)}</h3>
            ${c.total != null ? `<span class="triptych-col__badge">${c.total}</span>` : ""}
          </div>
          <ul class="triptych-col__list">
            ${c.items.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>
        </div>`
      )
      .join("");
    return `
      <div class="slide slide--triptych" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-triptych-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${slide.subtitle ? `<p class="slide-triptych-sub">${esc(slide.subtitle)}</p>` : ""}
          <div class="triptych-grid">${cols}</div>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "risk-board" && slide.risks?.length) {
    const cards = slide.risks
      .map(
        (r) => `
        <article class="risk-card ${riskSeverityClass(r.severity)}">
          <header class="risk-card__head">
            <span class="risk-card__id">${esc(r.id)}</span>
            <span class="risk-card__severity">${esc(r.severity.toUpperCase())}</span>
            <span class="risk-card__status">${esc(r.status)}</span>
          </header>
          <h3 class="risk-card__title">${esc(r.title)}</h3>
          <p class="risk-card__action"><strong>Plan:</strong> ${esc(r.action)}</p>
        </article>`
      )
      .join("");
    return `
      <div class="slide slide--risk-board" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-risk-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          <div class="risk-grid">${cards}</div>
          ${foot}
        </div>
      </div>`;
  }

  if (slide.layout === "gantt" && slide.gantt) {
    const g = slide.gantt;
    const months = g.months
      .map(
        (m) => `
        <div class="gantt-month">
          <span class="gantt-month__dot" aria-hidden="true"></span>
          <span class="gantt-month__label">${esc(m.label)}</span>
          ${m.sublabel ? `<span class="gantt-month__sub">${esc(m.sublabel)}</span>` : ""}
        </div>`
      )
      .join("");
    const markers = g.markers
      .map((m) => {
        const pct = ganttPct(m.date, g.rangeStart, g.rangeEnd);
        return `
        <div class="gantt-marker ${ganttMarkerClass(m.kind)}" style="left:${pct.toFixed(2)}%" role="presentation">
          <span class="gantt-marker__tag">${esc(m.label)}</span>
          ${m.sublabel ? `<span class="gantt-marker__sub">${esc(m.sublabel)}</span>` : ""}
          <span class="gantt-marker__line" aria-hidden="true"></span>
        </div>`;
      })
      .join("");
    const rows = g.bars
      .map(
        (b) => `
        <div class="gantt-row">
          <span class="gantt-row__label">${esc(b.label)}</span>
          <div class="gantt-row__track">
            <span class="gantt-bar" style="${ganttBarStyle(b.start, b.end, g)}"></span>
          </div>
        </div>`
      )
      .join("");
    return `
      <div class="slide slide--gantt" data-slide-id="${esc(slide.id)}">
        ${progress}
        <div class="slide-gantt-wrap">
          ${slide.kicker ? `<p class="slide-kicker">${esc(slide.kicker)}</p>` : ""}
          <h2 class="slide-title">${slide.title ? esc(slide.title) : ""}</h2>
          ${slide.subtitle ? `<p class="slide-gantt-sub">${esc(slide.subtitle)}</p>` : ""}
          <div class="gantt-chart" style="--gantt-cols:${g.months.length}">
            <div class="gantt-months">${months}</div>
            <div class="gantt-marker-layer">${markers}</div>
            ${g.groupLabel ? `<p class="gantt-group-label">${esc(g.groupLabel)}</p>` : ""}
            <div class="gantt-rows">${rows}</div>
          </div>
          ${foot}
        </div>
      </div>`;
  }

  return `<div class="slide slide--bullets"><p class="slide-kicker">Sin layout</p></div>`;
}

function renderDeckList(): string {
  const cards = deckRegistry
    .map(
      (d) => `
      <a class="deck-card" href="#/present/${encodeURIComponent(d.id)}">
        <span class="deck-card-kicker">Presentación</span>
        <h2 class="deck-card-title">${esc(d.title)}</h2>
        <p class="deck-card-desc">${esc(d.description)}</p>
        ${d.updated ? `<span class="deck-card-meta">${esc(d.updated)}</span>` : ""}
      </a>`
    )
    .join("");

  return `
    <div class="shell shell--home">
      <header class="home-header">
        <div class="brand-row">
          ${renderGanexusLogo("brand-logo brand-logo--hero")}
          <span class="program-badge">programa qardeal</span>
        </div>
        <p class="home-tagline">
          <span>Presentaciones ejecutivas</span> — modo sala, pantalla completa, sin dependencias de diseño.
        </p>
        <p class="bracket-note">Potenciamos tu operación con software a la medida</p>
      </header>
      <main class="deck-grid">${cards}</main>
      <footer class="home-footer">
        <span>En presentación: ← → o espacio · F pantalla completa · Inicio / Fin primera o última diapositiva</span>
      </footer>
    </div>`;
}

function renderViewer(deck: DeckMeta, index: number): string {
  const slide = deck.slides[index];
  const total = deck.slides.length;
  const slideHtml = renderSlide(slide, index, total);
  const thumbsHtml = renderThumbnailsStrip(deck, index);
  const utilsHtml = renderUtilityPanel(deck, index);

  return `
    <div class="shell shell--viewer" id="viewer-shell" data-deck-id="${esc(deck.id)}">
      <div class="viewer-topbar">
        <div class="viewer-topbar-left">
          <a class="btn btn--ghost" href="#/">← Volver</a>
          ${renderGanexusLogo("viewer-logo")}
        </div>
        <div class="viewer-title-pill">
          <span class="viewer-deck-name">${esc(deck.title)}</span>
          <span class="viewer-counter">${index + 1} / ${total}</span>
        </div>
        <div class="viewer-actions">
          <button type="button" class="btn btn--secondary" id="btn-prev" ${index <= 0 ? "disabled" : ""} aria-label="Anterior">◀</button>
          <button type="button" class="btn btn--secondary" id="btn-next" ${index >= total - 1 ? "disabled" : ""} aria-label="Siguiente">▶</button>
          <button type="button" class="btn btn--secondary" id="btn-download-pdf" title="Genera un PDF horizontal listo para abrir como presentación (puede tardar unos segundos)" aria-label="Descargar presentación como PDF horizontal">Descargar PDF</button>
          <button type="button" class="btn btn--primary" id="btn-fs" aria-label="Pantalla completa">Pantalla completa</button>
        </div>
      </div>
      <div class="viewer-body">
        <aside class="viewer-thumbs" aria-label="Mapa de diapositivas">
          <p class="viewer-thumbs-title">Diapositivas</p>
          <div class="viewer-thumbs-list" id="viewer-thumbs-list">${thumbsHtml}</div>
        </aside>
        <div class="viewer-center">
          <div class="viewer-stage-frame">
            <div class="stage" id="stage" tabindex="0" data-slide-idx="${index}">
              ${slideHtml}
            </div>
          </div>
        </div>
        <aside class="viewer-utils" aria-label="Panel de utilidades">
          <p class="viewer-utils-title">Utilidades</p>
          <div class="viewer-utils-inner" id="viewer-utils-inner">${utilsHtml}</div>
        </aside>
      </div>
      <p class="viewer-hint" aria-hidden="true">← → Espacio · F pantalla completa</p>
    </div>`;
}

function parseRoute(): { type: "home" } | { type: "present"; deckId: string } {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "present" && parts[1]) {
    return { type: "present", deckId: decodeURIComponent(parts[1]) };
  }
  return { type: "home" };
}

let currentSlideIndex = 0;
let currentDeckId: string | null = null;

let slideCommentSaveTimer: ReturnType<typeof setTimeout> | null = null;
const SLIDE_COMMENT_DEBOUNCE_MS = 450;

function cancelScheduledSlideCommentSave(): void {
  if (slideCommentSaveTimer !== null) {
    clearTimeout(slideCommentSaveTimer);
    slideCommentSaveTimer = null;
  }
}

/** Persista notas abiertas antes de reemplazar el panel o salir del visor. */
function flushSlideCommentFromDom(): void {
  cancelScheduledSlideCommentSave();
  const field = document.getElementById("slide-comments-field") as HTMLElement | null;
  if (!field || !field.isContentEditable) return;
  const deckId = field.dataset.commentDeckId;
  const rowKey = field.dataset.commentRowKey;
  if (!deckId || rowKey === undefined || rowKey === "") return;
  const html = normalizeCommentsHtml(field.innerHTML);
  field.innerHTML = html || "";
  toggleCommentFieldEmpty(field);
  persistSlideComment(deckId, rowKey, html);
}

function setSlideCommentStatus(el: HTMLElement | null, message: string, isError: boolean): void {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("is-error", isError);
}

function toggleCommentFieldEmpty(el: HTMLElement): void {
  const empty = (el.textContent ?? "").replace(/\u00a0/g, " ").trim() === "";
  el.toggleAttribute("data-empty", empty);
}

function wireSlideComments(deck: DeckMeta, index: number): void {
  const field = document.getElementById("slide-comments-field") as HTMLElement | null;
  const status = document.getElementById("slide-comments-status");
  const btnBold = document.getElementById("slide-comments-bold");
  const btnBullets = document.getElementById("slide-comments-bullets");
  if (!field || !field.isContentEditable) return;

  const rowKey = slideCommentRowKey(deck.slides[index], index);
  const map = loadSlideCommentsMap(deck.id);
  const raw = map[rowKey] ?? "";
  if (!raw) field.innerHTML = "";
  else if (/^\s*</.test(raw)) field.innerHTML = sanitizeCommentsHtml(raw);
  else field.textContent = raw;
  toggleCommentFieldEmpty(field);
  field.dataset.commentDeckId = deck.id;
  field.dataset.commentRowKey = rowKey;

  const persistWithoutDomRewrite = (): void => {
    const html = normalizeCommentsHtml(field.innerHTML);
    toggleCommentFieldEmpty(field);
    const r = persistSlideComment(deck.id, rowKey, html);
    setSlideCommentStatus(status, r.ok ? "Guardado automáticamente" : r.error, !r.ok);
  };

  const persistAndNormalizeDom = (): void => {
    const html = normalizeCommentsHtml(field.innerHTML);
    field.innerHTML = html || "";
    toggleCommentFieldEmpty(field);
    const r = persistSlideComment(deck.id, rowKey, html);
    setSlideCommentStatus(status, r.ok ? "Guardado automáticamente" : r.error, !r.ok);
  };

  const scheduleSave = (): void => {
    cancelScheduledSlideCommentSave();
    slideCommentSaveTimer = window.setTimeout(() => {
      slideCommentSaveTimer = null;
      persistWithoutDomRewrite();
    }, SLIDE_COMMENT_DEBOUNCE_MS);
  };

  const onFieldInput = (): void => {
    toggleCommentFieldEmpty(field);
    setSlideCommentStatus(status, "Guardando…", false);
    scheduleSave();
  };

  field.oninput = onFieldInput;

  field.onpaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    document.execCommand("insertText", false, text);
  };

  field.onblur = () => {
    cancelScheduledSlideCommentSave();
    persistAndNormalizeDom();
  };

  const fmtDown = (e: Event): void => e.preventDefault();

  btnBold?.addEventListener("mousedown", fmtDown);
  btnBold?.addEventListener("click", () => {
    field.focus({ preventScroll: true });
    document.execCommand("bold");
    onFieldInput();
  });

  btnBullets?.addEventListener("mousedown", fmtDown);
  btnBullets?.addEventListener("click", () => {
    field.focus({ preventScroll: true });
    document.execCommand("insertUnorderedList");
    onFieldInput();
  });
}

function goToSlide(deck: DeckMeta, index: number): void {
  const i = Math.max(0, Math.min(deck.slides.length - 1, index));
  if (i === currentSlideIndex) return;
  currentSlideIndex = i;
  refreshViewerSlide(deck);
}

function syncViewerSidebar(deck: DeckMeta): void {
  flushSlideCommentFromDom();
  const idx = currentSlideIndex;
  const list = document.getElementById("viewer-thumbs-list");
  if (list)
    list.innerHTML = renderThumbnailsStrip(deck, idx);

  const utils = document.getElementById("viewer-utils-inner");
  if (utils) utils.innerHTML = renderUtilityPanel(deck, idx);

  wireSlideComments(deck, idx);

  requestAnimationFrame(() => {
    document.querySelector(`.viewer-thumb[data-slide-idx="${idx}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function refreshViewerSlide(deck: DeckMeta): void {
  const stage = document.getElementById("stage");
  const counter = document.querySelector(".viewer-counter");
  const btnPrev = document.getElementById("btn-prev") as HTMLButtonElement | null;
  const btnNext = document.getElementById("btn-next") as HTMLButtonElement | null;
  const idx = currentSlideIndex;
  const total = deck.slides.length;

  if (!stage) return;

  stage.setAttribute("data-slide-idx", String(idx));
  stage.innerHTML = renderSlide(deck.slides[idx], idx, total);
  if (counter) counter.textContent = `${idx + 1} / ${total}`;
  if (btnPrev) btnPrev.disabled = idx <= 0;
  if (btnNext) btnNext.disabled = idx >= total - 1;

  syncViewerSidebar(deck);
  stage.focus();
}

function navigateSlideInViewer(delta: number): void {
  const route = parseRoute();
  if (route.type !== "present") return;
  const deck = getDeckById(route.deckId);
  if (!deck) return;
  goToSlide(deck, currentSlideIndex + delta);
}

function syncFullscreenButtonLabel(): void {
  const btn = document.getElementById("btn-fs");
  if (!btn) return;
  const fs = document.fullscreenElement;
  btn.textContent = fs ? "Salir pantalla completa" : "Pantalla completa";
}

async function toggleFullscreen(): Promise<void> {
  const shell = document.getElementById("viewer-shell");
  const target = shell ?? document.documentElement;

  if (!document.fullscreenElement) {
    await target.requestFullscreen().catch(() => {});
  } else {
    await document.exitFullscreen();
  }
  syncFullscreenButtonLabel();
}

function safePdfFileName(title: string): string {
  const t = title
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ_\s.-]+/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return t || "presentacion";
}

/** Captura y página PDF en 16:9 — resolución alineada a pantalla completa típica. */
const PDF_CAPTURE_W_PX = 1920;
const PDF_CAPTURE_H_PX = 1080;
/** Ancho de la página PDF en mm; alto derivado para mantener 16:9 sin franjas. */
const PDF_PAGE_W_MM = 192;
const PDF_PAGE_H_MM = (PDF_CAPTURE_H_PX / PDF_CAPTURE_W_PX) * PDF_PAGE_W_MM;
const PDF_PAGE_FORMAT: [number, number] = [PDF_PAGE_W_MM, PDF_PAGE_H_MM];

/** Contenedor oculto off-screen donde html2canvas toma cada lámina. */
function ensurePdfCaptureHost(): HTMLElement {
  let host = document.getElementById("pdf-capture-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "pdf-capture-host";
    host.className = "pdf-capture-host shell--viewer";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
  return host;
}

function pdfGenerationUserHint(err: unknown): string {
  const msg =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as Error).message === "string"
      ? (err as Error).message
      : "";

  /* file:// suele impedir rutas relativas coherentes para imágenes y fuentes. */
  if (window.location.protocol === "file:") {
    return " No abra los archivos con doble clic: use «npm run dev» o sirva la carpeta con un servidor HTTP (p. ej. npm run preview).";
  }

  if (!msg) return "";

  if (/SecurityError|The operation is insecure|tainted|insecure|cors/i.test(msg)) {
    return " Sugerencia: use la app en http(s) desde el servidor de Vite; no cargue desde disco.";
  }

  return msg.length < 240 ? ` Detalle técnico: ${msg}` : "";
}

function html2canvasStripBackdropFilters(clonedDocument: Document): void {
  const s = clonedDocument.createElement("style");
  s.setAttribute("data-pdf-capture-reset", "");
  s.textContent =
    ".pdf-capture-stage, .pdf-capture-stage * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }";
  clonedDocument.head.appendChild(s);
}

async function rasterizePdfStage(stage: HTMLElement): Promise<HTMLCanvasElement> {
  const pixelRatio = Math.min(window.devicePixelRatio || 2, 2);

  const { toCanvas } = await import("html-to-image");

  const htiVariants = [
    {
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      pixelRatio,
      backgroundColor: "#0e1017",
      cacheBust: true,
    },
    {
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      pixelRatio: 1,
      backgroundColor: "#0e1017",
      cacheBust: true,
    },
    {
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      pixelRatio: 1,
      backgroundColor: "#0e1017",
      cacheBust: true,
      skipFonts: true,
    },
  ] as const;

  for (const o of htiVariants) {
    try {
      const c = await toCanvas(stage, { ...o });
      if (c.width > 0 && c.height > 0) return c;
    } catch (e) {
      console.warn("html-to-image: intento PDF fallido, probando siguiente variante…", e);
    }
  }

  const { default: html2canvas } = await import("html2canvas");

  type H2COptions = Parameters<typeof html2canvas>[1];

  const h2cAttempts: H2COptions[] = [
    {
      scale: pixelRatio,
      backgroundColor: "#0e1017",
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      imageTimeout: 20000,
      logging: false,
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      scrollX: 0,
      scrollY: 0,
      windowWidth: PDF_CAPTURE_W_PX,
      windowHeight: PDF_CAPTURE_H_PX,
      onclone: html2canvasStripBackdropFilters,
    },
    {
      scale: 1,
      backgroundColor: "#0e1017",
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      imageTimeout: 20000,
      logging: false,
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      scrollX: 0,
      scrollY: 0,
      windowWidth: PDF_CAPTURE_W_PX,
      windowHeight: PDF_CAPTURE_H_PX,
      onclone: html2canvasStripBackdropFilters,
    },
    {
      scale: 1,
      backgroundColor: "#0e1017",
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: true,
      imageTimeout: 20000,
      logging: false,
      width: PDF_CAPTURE_W_PX,
      height: PDF_CAPTURE_H_PX,
      scrollX: 0,
      scrollY: 0,
      windowWidth: PDF_CAPTURE_W_PX,
      windowHeight: PDF_CAPTURE_H_PX,
      onclone: html2canvasStripBackdropFilters,
    },
  ];

  let last: unknown = new Error("html2canvas sin intentos");
  for (const opts of h2cAttempts) {
    try {
      return await html2canvas(stage, opts);
    } catch (e) {
      last = e;
      console.warn("html2canvas: intento PDF fallido…", e);
    }
  }
  throw last;
}

function waitForSlideImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = (): void => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 5000);
        })
    )
  ).then(() => undefined);
}

async function downloadDeckPdf(deck: DeckMeta): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const btn = document.getElementById("btn-download-pdf") as HTMLButtonElement | null;
  const prev = btn?.textContent ?? "Descargar PDF";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generando PDF…";
  }

  const host = ensurePdfCaptureHost();
  const total = deck.slides.length;

  try {
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: PDF_PAGE_FORMAT,
    });

    await document.fonts.ready.catch(() => {});

    for (let i = 0; i < total; i++) {
      const frame = document.createElement("div");
      frame.className = "pdf-capture-stage viewer-stage-frame";
      frame.dataset.deckPrint = deck.id;
      frame.dataset.printSlideIdx = String(i);

      const stageInner = document.createElement("div");
      stageInner.className = "stage";
      stageInner.innerHTML = renderSlide(deck.slides[i], i, total, { forPrint: true, pdfCapture: true });
      frame.appendChild(stageInner);

      host.replaceChildren(frame);

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
      );
      await waitForSlideImages(frame);

      const canvas = await rasterizePdfStage(frame);

      let imgData: string;
      let imgFmt: "JPEG" | "PNG" = "JPEG";
      try {
        imgData = canvas.toDataURL("image/jpeg", 0.92);
      } catch {
        imgData = canvas.toDataURL("image/png");
        imgFmt = "PNG";
      }
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      if (i > 0) pdf.addPage(PDF_PAGE_FORMAT, "landscape");
      pdf.addImage(imgData, imgFmt, 0, 0, pageW, pageH);
    }

    pdf.save(`${safePdfFileName(deck.title)}.pdf`);
  } catch (err) {
    console.error(err);
    alert(
      `No se pudo generar el PDF. ${pdfGenerationUserHint(err)} Si el fallo continúa, abra la consola del navegador (F12) y copie el mensaje de error.`
    );
  } finally {
    host.replaceChildren();
    if (btn) {
      btn.disabled = false;
      btn.textContent = prev;
    }
  }
}

function onAppClick(e: MouseEvent): void {
  const route = parseRoute();
  if (route.type !== "present") return;

  const target = e.target as HTMLElement;
  if (target.closest(".viewer-thumb")) {
    e.preventDefault();
    const btn = target.closest(".viewer-thumb") as HTMLButtonElement;
    const raw = btn.dataset.slideIdx;
    const i = raw === undefined ? NaN : Number.parseInt(raw, 10);
    if (!Number.isFinite(i)) return;
    const deck = getDeckById(route.deckId);
    if (!deck) return;
    goToSlide(deck, i);
    return;
  }
  if (target.closest("#btn-prev")) {
    e.preventDefault();
    navigateSlideInViewer(-1);
    return;
  }
  if (target.closest("#btn-next")) {
    e.preventDefault();
    navigateSlideInViewer(1);
    return;
  }
  if (target.closest("#btn-fs")) {
    e.preventDefault();
    void toggleFullscreen();
    return;
  }
  if (target.closest("#btn-download-pdf")) {
    e.preventDefault();
    const deck = getDeckById(route.deckId);
    if (!deck) return;
    if (document.fullscreenElement) void document.exitFullscreen().then(syncFullscreenButtonLabel);
    void downloadDeckPdf(deck);
    return;
  }
}

function mount(): void {
  const app = document.getElementById("app");
  if (!app) return;

  flushSlideCommentFromDom();

  const route = parseRoute();

  if (route.type === "home") {
    currentDeckId = null;
    app.innerHTML = renderDeckList();
    document.title = "Qardeal — Presentaciones";
    document.body.classList.remove("mode-viewer");
    return;
  }

  const deck = getDeckById(route.deckId);
  if (!deck) {
    app.innerHTML = `<div class="shell shell--home"><p class="error">Presentación no encontrada. <a href="#/">Volver al inicio</a></p></div>`;
    document.body.classList.remove("mode-viewer");
    return;
  }

  if (currentDeckId !== deck.id) {
    currentSlideIndex = 0;
    currentDeckId = deck.id;
  }
  currentSlideIndex = Math.max(0, Math.min(deck.slides.length - 1, currentSlideIndex));

  app.innerHTML = renderViewer(deck, currentSlideIndex);
  document.title = `${deck.title} — Qardeal`;
  document.body.classList.add("mode-viewer");
  syncFullscreenButtonLabel();

  wireSlideComments(deck, currentSlideIndex);

  document.getElementById("stage")?.focus();
}

function onGlobalKeydown(e: KeyboardEvent): void {
  const route = parseRoute();
  if (route.type !== "present") return;

  const deck = getDeckById(route.deckId);
  if (!deck) return;

  const t = e.target as HTMLElement;
  if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
  if (t.isContentEditable) return;

  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    const next = Math.min(deck.slides.length - 1, currentSlideIndex + 1);
    if (next !== currentSlideIndex) {
      currentSlideIndex = next;
      refreshViewerSlide(deck);
    }
  }
  if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    const next = Math.max(0, currentSlideIndex - 1);
    if (next !== currentSlideIndex) {
      currentSlideIndex = next;
      refreshViewerSlide(deck);
    }
  }
  if (e.key === "Home") {
    e.preventDefault();
    if (currentSlideIndex !== 0) {
      currentSlideIndex = 0;
      refreshViewerSlide(deck);
    }
  }
  if (e.key === "End") {
    e.preventDefault();
    const last = deck.slides.length - 1;
    if (currentSlideIndex !== last) {
      currentSlideIndex = last;
      refreshViewerSlide(deck);
    }
  }
  if (e.key === "f" || e.key === "F") {
    e.preventDefault();
    void toggleFullscreen();
  }
  if (e.key === "Escape" && document.fullscreenElement) {
    void document.exitFullscreen().then(syncFullscreenButtonLabel);
  }
}

export function initApp(): void {
  const app = document.getElementById("app");
  app?.addEventListener("click", onAppClick);
  document.addEventListener("fullscreenchange", syncFullscreenButtonLabel);

  window.addEventListener("beforeunload", flushSlideCommentFromDom);
  window.addEventListener("hashchange", () => mount());
  window.addEventListener("keydown", onGlobalKeydown);
  mount();
}
