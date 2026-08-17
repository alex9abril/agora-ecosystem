export const HTTP_PAGINATION_MAX_PAGES_CAP = 2000;
export const HTTP_PAGINATION_DEFAULT_MAX_PAGES = 500;
export const HTTP_PAGINATION_DEFAULT_PAGE_SIZE = 100;

export type HttpPaginationConfig = {
  enabled: true;
  pageParam: string;
  startPage: number;
  pageSizeParam: string;
  pageSize: number;
  itemsPath: string;
  totalPath: string;
  maxPages: number;
};

export type HttpKvPairLike = { key?: string; value?: string; enabled?: boolean };

export function parseHttpPaginationConfig(data: Record<string, unknown> | null | undefined): HttpPaginationConfig | null {
  const raw = data?.pagination;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  if (p.enabled !== true) return null;
  const pageParam = String(p.pageParam || 'page').trim() || 'page';
  const pageSizeParam = String(p.pageSizeParam ?? 'pageSize').trim();
  const itemsPath = String(p.itemsPath ?? 'items').trim();
  const totalPath = String(p.totalPath ?? 'total').trim();
  const startPage = clampInt(p.startPage, 1, 1_000_000, 1);
  const pageSize = clampInt(p.pageSize, 1, 500, HTTP_PAGINATION_DEFAULT_PAGE_SIZE);
  const maxPages = clampInt(p.maxPages, 1, HTTP_PAGINATION_MAX_PAGES_CAP, HTTP_PAGINATION_DEFAULT_MAX_PAGES);
  return {
    enabled: true,
    pageParam,
    startPage,
    pageSizeParam,
    pageSize,
    itemsPath,
    totalPath,
    maxPages,
  };
}

export function applyHttpPaginationQueryParams(
  base: HttpKvPairLike[] | undefined,
  cfg: HttpPaginationConfig,
  page: number,
): HttpKvPairLike[] {
  const pageKey = cfg.pageParam.toLowerCase();
  const sizeKey = cfg.pageSizeParam.toLowerCase();
  const out: HttpKvPairLike[] = [];
  for (const row of base || []) {
    const k = String(row?.key || '').trim().toLowerCase();
    if (!k) continue;
    if (k === pageKey) continue;
    if (sizeKey && k === sizeKey) continue;
    out.push(row);
  }
  out.push({ key: cfg.pageParam, value: String(page), enabled: true });
  if (cfg.pageSizeParam) {
    out.push({ key: cfg.pageSizeParam, value: String(cfg.pageSize), enabled: true });
  }
  return out;
}

export function readPathValue(root: unknown, path: string): unknown {
  if (!path) return root;
  let cur: unknown = root;
  for (const part of path.split('.').filter(Boolean)) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function httpPaginationItemCount(apiBody: unknown, itemsPath: string): number {
  const v = itemsPath ? readPathValue(apiBody, itemsPath) : apiBody;
  if (Array.isArray(v)) return v.length;
  return 0;
}

export function httpPaginationTotal(apiBody: unknown, totalPath: string): number | null {
  if (!totalPath) return null;
  const v = readPathValue(apiBody, totalPath);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** true = no pedir más páginas (la actual ya se procesó). */
export function httpPaginationShouldStop(args: {
  page: number;
  pageSize: number;
  itemCount: number;
  total: number | null;
}): boolean {
  if (args.itemCount === 0) return true;
  if (args.total != null && args.page * args.pageSize >= args.total) return true;
  if (args.itemCount < args.pageSize) return true;
  return false;
}

export function slimHttpResultForLog(result: Record<string, unknown>, meta: {
  page: number;
  pageSize: number;
  itemCount: number;
  total: number | null;
}): Record<string, unknown> {
  return {
    statusCode: result.statusCode,
    url: result.url,
    method: result.method,
    connectorName: result.connectorName,
    pagination: meta,
    body: {
      _paginated: true,
      page: meta.page,
      itemCount: meta.itemCount,
      total: meta.total,
    },
  };
}

export function slimUnknownForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    if (value.length <= 8) return value;
    return { _truncated: true, length: value.length, sample: value.slice(0, 2) };
  }
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (Array.isArray(rec.items) && rec.items.length > 8) {
      return { ...rec, items: { _truncated: true, length: rec.items.length } };
    }
    if (rec.body && typeof rec.body === 'object' && !Array.isArray(rec.body)) {
      const body = rec.body as Record<string, unknown>;
      if (Array.isArray(body.items) && body.items.length > 8) {
        return { ...rec, body: { ...body, items: { _truncated: true, length: body.items.length } } };
      }
    }
  }
  return value;
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
