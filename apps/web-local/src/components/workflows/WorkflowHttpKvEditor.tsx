import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { HttpKvPair } from '@/lib/integration-workflows';
import {
  filterHttpSuggestions,
  findHttpHeaderSuggestion,
  HTTP_REQUEST_HEADER_NAMES,
} from './http-header-suggestions';

type Props = {
  rows: HttpKvPair[];
  onChange: (rows: HttpKvPair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
  /** Autocomplete de headers HTTP típicos (clave + valor). */
  suggestions?: 'headers';
};

const INPUT_CLASS =
  'w-full rounded border border-gray-200 bg-white px-1.5 py-1 font-mono text-[11px] outline-none focus:border-gray-400 dark:border-neutral-600 dark:bg-neutral-900 dark:focus:border-neutral-400';

function HttpKvSuggestInput({
  value,
  onChange,
  onPick,
  placeholder,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  onPick?: (next: string) => void;
  placeholder?: string;
  options: string[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  const listId = `http-kv-sugg-${useId().replace(/:/g, '')}`;

  const filtered = useMemo(() => filterHttpSuggestions(value, options), [options, value]);

  const syncBox = () => {
    const el = inputRef.current;
    if (el) setBox(el.getBoundingClientRect());
  };

  useEffect(() => {
    if (!open) return;
    syncBox();
    const onMove = () => syncBox();
    window.addEventListener('resize', onMove);
    document.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      document.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (inputRef.current?.contains(t)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [listId, open]);

  const apply = (next: string) => {
    (onPick ?? onChange)(next);
    setOpen(false);
    setHi(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHi((i) => Math.min((i < 0 ? -1 : i) + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && hi >= 0 && filtered[hi]) {
      e.preventDefault();
      apply(filtered[hi]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHi(-1);
    }
  };

  if (options.length === 0) {
    return (
      <input
        className={INPUT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
    );
  }

  const flipUp = box ? window.innerHeight - box.bottom < 196 && box.top > 196 : false;
  const showMenu = open && box && (filtered.length > 0 || value.trim().length === 0);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={`${INPUT_CLASS} pr-5`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(-1);
        }}
        onFocus={() => {
          setOpen(true);
          syncBox();
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        role="combobox"
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded px-0.5 text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        aria-label="Ver sugerencias"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
          syncBox();
          inputRef.current?.focus();
        }}
      >
        ▾
      </button>
      {showMenu &&
        box &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 text-[11px] shadow-lg dark:border-neutral-600 dark:bg-neutral-800"
            style={{
              position: 'fixed',
              left: box.left,
              width: Math.max(box.width, 220),
              zIndex: 400,
              ...(flipUp
                ? { bottom: window.innerHeight - box.top + 2 }
                : { top: box.bottom + 2 }),
            }}
          >
            {filtered.length === 0 ? (
              <li className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400">
                Sin coincidencias. Puedes escribir un valor propio.
              </li>
            ) : (
              filtered.map((opt, i) => (
                <li key={opt} role="option" aria-selected={i === hi}>
                  <button
                    type="button"
                    className={`w-full px-2.5 py-1.5 text-left font-mono text-gray-900 dark:text-gray-100 ${
                      i === hi ? 'bg-gray-100 dark:bg-neutral-700' : 'hover:bg-gray-100 dark:hover:bg-neutral-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      apply(opt);
                    }}
                    onMouseEnter={() => setHi(i)}
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}

export function emptyHttpKvPair(): HttpKvPair {
  return { key: '', value: '', enabled: true };
}

export function normalizeHttpKvPairs(raw: unknown): HttpKvPair[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyHttpKvPair()];
  const rows: HttpKvPair[] = raw.map((item) => {
    const r = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      key: typeof r.key === 'string' ? r.key : '',
      value: typeof r.value === 'string' ? r.value : r.value != null ? String(r.value) : '',
      enabled: r.enabled !== false,
    };
  });
  return rows.length > 0 ? rows : [emptyHttpKvPair()];
}

export function compactHttpKvPairs(rows: HttpKvPair[]): HttpKvPair[] {
  return rows.filter((r) => r.key.trim().length > 0).map((r) => ({
    key: r.key.trim(),
    value: r.value,
    enabled: r.enabled !== false,
  }));
}

/** Ruta sin query string. `/inventario?page=1` → `/inventario` */
export function pathnameOnly(raw: string): string {
  const trimmed = raw.trim();
  const q = trimmed.indexOf('?');
  return q >= 0 ? trimmed.slice(0, q) : trimmed;
}

export function splitPathAndQuery(raw: string): { path: string; params: HttpKvPair[] } {
  const trimmed = raw.trim();
  const q = trimmed.indexOf('?');
  if (q < 0) return { path: trimmed, params: [] };
  const path = trimmed.slice(0, q);
  const search = trimmed.slice(q + 1);
  const params: HttpKvPair[] = [];
  if (search) {
    const usp = new URLSearchParams(search);
    usp.forEach((value, key) => {
      params.push({ key, value, enabled: true });
    });
  }
  return { path, params };
}

/** Une pares; si la clave ya existe, no se duplica (gana el que ya estaba). */
export function mergeHttpKvPairs(base: HttpKvPair[], extra: HttpKvPair[]): HttpKvPair[] {
  const out = compactHttpKvPairs(base);
  const keys = new Set(out.map((r) => r.key.toLowerCase()));
  for (const row of extra) {
    const key = row.key.trim();
    if (!key || keys.has(key.toLowerCase())) continue;
    out.push({ key, value: row.value, enabled: row.enabled !== false });
    keys.add(key.toLowerCase());
  }
  return out.length > 0 ? out : [emptyHttpKvPair()];
}

export function WorkflowHttpKvEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  addLabel = 'Agregar',
  suggestions,
}: Props) {
  const headerMode = suggestions === 'headers';

  const update = (index: number, patch: Partial<HttpKvPair>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const pickHeaderKey = (index: number, key: string) => {
    const row = rows[index];
    const hint = findHttpHeaderSuggestion(key);
    const nextValue =
      row?.value.trim() || hint?.defaultValue || row?.value || '';
    update(index, { key, value: nextValue });
  };

  const remove = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyHttpKvPair()]);
  };

  const add = () => {
    onChange([...rows, emptyHttpKvPair()]);
  };

  return (
    <div className="overflow-visible rounded-md border border-gray-200 dark:border-neutral-700">
      <table className="w-full table-fixed text-[11px]">
        <thead className="bg-gray-50 text-left text-[10px] uppercase tracking-wide text-gray-500 dark:bg-neutral-900 dark:text-gray-400">
          <tr>
            <th className="w-8 px-1.5 py-1.5 font-medium" />
            <th className="px-1.5 py-1.5 font-medium">Key</th>
            <th className="px-1.5 py-1.5 font-medium">Value</th>
            <th className="w-16 px-1 py-1.5 font-medium text-right"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const headerHint = headerMode ? findHttpHeaderSuggestion(row.key) : undefined;
            const valueOptions = headerHint?.values ?? [];
            return (
            <tr key={i} className="border-t border-gray-100 dark:border-neutral-800">
              <td className="px-1.5 py-1 align-middle">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => update(i, { enabled: e.target.checked })}
                  aria-label={`Usar ${row.key || 'par'}`}
                  className="h-3.5 w-3.5 accent-black"
                />
              </td>
              <td className="px-1 py-1">
                {headerMode ? (
                  <HttpKvSuggestInput
                    value={row.key}
                    onChange={(key) => update(i, { key })}
                    onPick={(key) => pickHeaderKey(i, key)}
                    placeholder={keyPlaceholder}
                    options={HTTP_REQUEST_HEADER_NAMES}
                    ariaLabel="Nombre del header"
                  />
                ) : (
                  <input
                    className={INPUT_CLASS}
                    value={row.key}
                    onChange={(e) => update(i, { key: e.target.value })}
                    placeholder={keyPlaceholder}
                  />
                )}
              </td>
              <td className="px-1 py-1">
                {headerMode ? (
                  <HttpKvSuggestInput
                    value={row.value}
                    onChange={(value) => update(i, { value })}
                    placeholder={headerHint?.defaultValue || valuePlaceholder}
                    options={valueOptions}
                    ariaLabel="Valor del header"
                  />
                ) : (
                  <input
                    className={INPUT_CLASS}
                    value={row.value}
                    onChange={(e) => update(i, { value: e.target.value })}
                    placeholder={valuePlaceholder}
                  />
                )}
              </td>
              <td className="px-1 py-1 text-right">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-neutral-800 dark:hover:text-red-400"
                  aria-label="Quitar"
                >
                  Quitar
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-gray-100 bg-gray-50 px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/80">
        <button
          type="button"
          onClick={add}
          className="rounded-md bg-black px-2.5 py-1 text-[11px] font-medium text-white hover:bg-neutral-800"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}
