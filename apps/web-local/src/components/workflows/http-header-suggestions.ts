/** Headers de request habituales en APIs REST (MDN / Postman). */

export type HttpHeaderSuggestion = {
  name: string;
  values: string[];
  defaultValue?: string;
};

const MIME_JSON = [
  'application/json',
  'application/json; charset=utf-8',
  'application/xml',
  'text/plain',
  'text/html',
  '*/*',
];

export const HTTP_REQUEST_HEADER_SUGGESTIONS: HttpHeaderSuggestion[] = [
  {
    name: 'Accept',
    values: [...MIME_JSON, 'application/json, text/plain, */*'],
    defaultValue: 'application/json',
  },
  {
    name: 'Accept-Encoding',
    values: ['gzip', 'deflate', 'br', 'gzip, deflate, br', 'identity'],
    defaultValue: 'gzip, deflate, br',
  },
  {
    name: 'Accept-Language',
    values: ['es', 'es-MX', 'en', 'en-US', 'es-MX,es;q=0.9,en;q=0.8'],
    defaultValue: 'es-MX,es;q=0.9,en;q=0.8',
  },
  {
    name: 'Authorization',
    values: ['Bearer ', 'Basic '],
    defaultValue: 'Bearer ',
  },
  {
    name: 'Cache-Control',
    values: ['no-cache', 'no-store', 'max-age=0', 'no-cache, no-store'],
    defaultValue: 'no-cache',
  },
  {
    name: 'Content-Type',
    values: [
      'application/json',
      'application/json; charset=utf-8',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'application/xml',
      'application/octet-stream',
    ],
    defaultValue: 'application/json',
  },
  {
    name: 'Cookie',
    values: [],
  },
  {
    name: 'If-Match',
    values: ['*'],
  },
  {
    name: 'If-None-Match',
    values: ['*'],
  },
  {
    name: 'If-Modified-Since',
    values: [],
  },
  {
    name: 'Origin',
    values: [],
  },
  {
    name: 'Pragma',
    values: ['no-cache'],
    defaultValue: 'no-cache',
  },
  {
    name: 'Prefer',
    values: ['return=representation', 'return=minimal'],
    defaultValue: 'return=representation',
  },
  {
    name: 'Range',
    values: ['bytes=0-'],
    defaultValue: 'bytes=0-',
  },
  {
    name: 'Referer',
    values: [],
  },
  {
    name: 'User-Agent',
    values: ['agora-workflow/1.0'],
    defaultValue: 'agora-workflow/1.0',
  },
  {
    name: 'X-Requested-With',
    values: ['XMLHttpRequest'],
    defaultValue: 'XMLHttpRequest',
  },
  {
    name: 'X-Request-Id',
    values: [],
  },
  {
    name: 'X-Correlation-Id',
    values: [],
  },
  {
    name: 'X-Idempotency-Key',
    values: [],
  },
  {
    name: 'X-CSRF-Token',
    values: [],
  },
];

export const HTTP_REQUEST_HEADER_NAMES = HTTP_REQUEST_HEADER_SUGGESTIONS.map((h) => h.name);

export function findHttpHeaderSuggestion(key: string): HttpHeaderSuggestion | undefined {
  const q = key.trim().toLowerCase();
  if (!q) return undefined;
  return HTTP_REQUEST_HEADER_SUGGESTIONS.find((h) => h.name.toLowerCase() === q);
}

export function filterHttpSuggestions(query: string, options: string[]): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.toLowerCase().includes(q));
}
