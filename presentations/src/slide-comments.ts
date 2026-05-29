import type { SlideSpec } from "./types";

const STORAGE_NS = "qardeal:slide-comments:v1";

export function slideCommentsStorageKey(deckId: string): string {
  return `${STORAGE_NS}:${deckId}`;
}

/** Clave estable por diapositiva: `slide.id` o índice como respaldo. */
export function slideCommentRowKey(slide: SlideSpec, index: number): string {
  const id = slide.id?.trim();
  if (id) return id;
  return `__idx:${index}`;
}

export function loadSlideCommentsMap(deckId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(slideCommentsStorageKey(deckId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

const ALLOW_COMMENTS_TAGS = new Set(["B", "STRONG", "UL", "LI", "BR", "DIV", "P"]);

/** Deja solo negritas y listas con viñetas; sin atributos. */
export function sanitizeCommentsHtml(html: string): string {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("ol").forEach((ol) => {
    const ul = document.createElement("ul");
    while (ol.firstChild) ul.appendChild(ol.firstChild);
    ol.replaceWith(ul);
  });
  const clean = (parent: ParentNode): void => {
    let child = parent.firstChild;
    while (child) {
      const next = child.nextSibling;
      if (child.nodeType === Node.TEXT_NODE) {
        /* keep */
      } else if (child.nodeType !== Node.ELEMENT_NODE) {
        parent.removeChild(child);
      } else {
        const el = child as HTMLElement;
        const tag = el.tagName;
        if (ALLOW_COMMENTS_TAGS.has(tag)) {
          [...el.attributes].forEach((a) => el.removeAttribute(a.name));
          clean(el);
        } else {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      }
      child = next;
    }
  };
  clean(tpl.content);
  const out = document.createElement("div");
  while (tpl.content.firstChild) out.appendChild(tpl.content.firstChild);
  return out.innerHTML;
}

export function normalizeCommentsHtml(html: string): string {
  const s = sanitizeCommentsHtml(html);
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  const text = tmp.textContent ?? "";
  if (text.replace(/\u00a0/g, " ").trim() === "") return "";
  return s;
}

export function persistSlideComment(
  deckId: string,
  rowKey: string,
  text: string
): { ok: true } | { ok: false; error: string } {
  try {
    const map = loadSlideCommentsMap(deckId);
    if (text === "") delete map[rowKey];
    else map[rowKey] = text;
    localStorage.setItem(slideCommentsStorageKey(deckId), JSON.stringify(map));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo guardar";
    return { ok: false, error: msg };
  }
}
