/**
 * Filtros acumulables para tablas.
 * Permite filtrar por columnas con operadores y valor; soporta texto (con autocomplete), número y enum/colección.
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export type FilterFieldType = 'text' | 'number' | 'enum';

export interface FilterColumn {
  id: string;
  label: string;
  type: FilterFieldType;
  /** Opciones para tipo enum (ej. status de pago, tipo de producto) */
  options?: Array<{ value: string; label: string }>;
}

export interface FilterRow {
  id: string;
  field: string;
  operator: string;
  value: string;
}

const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contiene' },
  { value: 'equals', label: 'Igual a' },
  { value: 'starts_with', label: 'Empieza con' },
  { value: 'not_contains', label: 'No contiene' },
  { value: 'not_equals', label: 'Distinto de' },
];

const NUMBER_OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
  { value: '<', label: '<' },
  { value: '>', label: '>' },
  { value: '<=', label: '≤' },
  { value: '>=', label: '≥' },
];

const ENUM_OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '≠' },
];

function getColumnTypeFromId(columns: FilterColumn[], fieldId: string): FilterFieldType {
  return columns.find((c) => c.id === fieldId)?.type ?? 'text';
}

export function getOperatorsForField(
  columns: FilterColumn[],
  fieldId: string,
): Array<{ value: string; label: string }> {
  const t = getColumnTypeFromId(columns, fieldId);
  if (t === 'number') return NUMBER_OPERATORS;
  if (t === 'enum') return ENUM_OPERATORS;
  return TEXT_OPERATORS;
}

interface TableFiltersProps {
  columns: FilterColumn[];
  filters: FilterRow[];
  onChange: (filters: FilterRow[]) => void;
  /** Sugerencias para autocomplete por campo (ej. { name: ['Producto A', 'Producto B'] }) */
  valueSuggestions?: Record<string, string[]>;
  /** Si true, los filtros se aplican al cambiar (no hace falta botón Aplicar) */
  applyOnChange?: boolean;
  onApply?: () => void;
  className?: string;
}

function makeId() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Nueva fila vacía; por defecto usa la primera columna que aún no aparece en `currentFilters` (facilita combinar varios criterios). */
export function createEmptyFilterRow(
  columns: FilterColumn[],
  currentFilters: Pick<FilterRow, 'field'>[] = [],
): FilterRow {
  const used = new Set(currentFilters.map((f) => f.field).filter(Boolean));
  const col = columns.find((c) => !used.has(c.id)) ?? columns[0];
  return {
    id: makeId(),
    field: col?.id ?? '',
    operator: col?.type === 'number' ? '=' : col?.type === 'enum' ? '=' : 'contains',
    value: '',
  };
}

export default function TableFilters({
  columns,
  filters,
  onChange,
  valueSuggestions = {},
  applyOnChange = true,
  onApply,
  className = '',
}: TableFiltersProps) {
  const [openSuggestions, setOpenSuggestions] = useState<string | null>(null);
  const [suggestionInput, setSuggestionInput] = useState('');
  const suggestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setOpenSuggestions(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addFilter = () => {
    onChange([...filters, createEmptyFilterRow(columns, filters)]);
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    onChange(
      filters.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
    if (applyOnChange && onApply) onApply();
  };

  const getOperators = (fieldId: string) => getOperatorsForField(columns, fieldId);

  const getColumnType = (fieldId: string): FilterFieldType => {
    return getColumnTypeFromId(columns, fieldId);
  };

  const suggestionsFor = (fieldId: string, query: string): string[] => {
    const list = valueSuggestions[fieldId] ?? [];
    if (!query.trim()) return list.slice(0, 15);
    const q = query.toLowerCase().trim();
    return list.filter((s) => s.toLowerCase().includes(q)).slice(0, 15);
  };

  const hasActiveFilters = filters.some((f) => f.field && f.value !== undefined && String(f.value).trim() !== '');

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 p-4 ${className}`}>
      {filters.length === 0 ? (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay filtros aplicados a esta vista.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Puedes añadir varios filtros: se combinan y deben cumplirse todos a la vez. Usa el botón de abajo para empezar.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={addFilter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Agregar filtro
            </button>
            <button
              type="button"
              disabled
              className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md cursor-not-allowed"
            >
              Aplicar filtro
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Los criterios se combinan (todos deben cumplirse). Para filtrar por otra columna sin quitar la actual, usa{' '}
            <span className="font-medium text-gray-600 dark:text-gray-300">Agregar filtro</span>.
          </p>
          <div className="space-y-3">
            {filters.map((row) => {
              const col = columns.find((c) => c.id === row.field);
              const type = getColumnType(row.field);
              const operators = getOperators(row.field);
              const isEnum = type === 'enum' && col?.options && col.options.length > 0;

              return (
                <div key={row.id} className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.field}
                    title="Columna de esta fila. Para añadir otro criterio sin quitar este, usa «Agregar filtro»."
                    onChange={(e) => {
                      const newField = e.target.value;
                      const newCol = columns.find((c) => c.id === newField);
                      updateFilter(row.id, {
                        field: newField,
                        operator: newCol?.type === 'number' ? '=' : newCol?.type === 'enum' ? '=' : 'contains',
                        value: '',
                      });
                    }}
                    className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-200 focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500 min-w-[120px]"
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.operator}
                    onChange={(e) => updateFilter(row.id, { operator: e.target.value })}
                    className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-200 focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500 w-[100px]"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1 min-w-[140px]" ref={openSuggestions === row.id ? suggestionRef : undefined}>
                    {isEnum ? (
                      <select
                        value={row.value}
                        onChange={(e) => updateFilter(row.id, { value: e.target.value })}
                        className="w-full px-2.5 py-1.5 pr-9 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-200 focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
                      >
                        <option value="">Seleccionar...</option>
                        {col?.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : type === 'number' ? (
                      <input
                        type="number"
                        value={row.value}
                        onChange={(e) => updateFilter(row.id, { value: e.target.value })}
                        placeholder="Valor"
                        className="w-full px-2.5 py-1.5 pr-9 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            updateFilter(row.id, { value: e.target.value });
                            setSuggestionInput(e.target.value);
                            setOpenSuggestions(row.id);
                          }}
                          onFocus={() => {
                            setSuggestionInput(row.value);
                            setOpenSuggestions(row.id);
                          }}
                          placeholder="Escribe un valor..."
                          className="w-full px-2.5 py-1.5 pr-9 text-sm border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-neutral-500"
                        />
                        {openSuggestions === row.id && valueSuggestions[row.field]?.length > 0 && (
                          <div className="absolute z-10 left-0 right-0 mt-1 py-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {suggestionsFor(row.field, suggestionInput).length === 0 ? (
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                Sin sugerencias
                              </div>
                            ) : (
                              suggestionsFor(row.field, suggestionInput).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700"
                                  onClick={() => {
                                    updateFilter(row.id, { value: s });
                                    setOpenSuggestions(null);
                                  }}
                                >
                                  {s}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => removeFilter(row.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                      title="Quitar filtro"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
            <button
              type="button"
              onClick={addFilter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border-gray-400 dark:hover:border-neutral-500 transition-colors"
            >
              <span className="text-base leading-none">+</span>
              Agregar filtro
            </button>
            {!applyOnChange && onApply && (
              <button
                type="button"
                onClick={onApply}
                disabled={!hasActiveFilters}
                className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Aplicar filtro
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ChipEnumDropdown({
  columnLabel,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  onClose,
  /** Un solo bloque visual: sin borde interior (evita “panel dentro de panel”). */
  embedFlat = true,
}: {
  columnLabel: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (next: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  embedFlat?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [fixedStyle, setFixedStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? value;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      if (!isOpen) setFixedStyle(null);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    setFixedStyle({
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 168),
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onResizeOrScroll = () => onClose();
    window.addEventListener('resize', onResizeOrScroll);
    window.addEventListener('scroll', onResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', onResizeOrScroll);
      window.removeEventListener('scroll', onResizeOrScroll, true);
    };
  }, [isOpen, onClose]);

  const triggerClass = embedFlat
    ? [
        'flex min-w-0 w-full flex-1 max-w-[min(11rem,calc(100vw-12rem))] items-center justify-between gap-1',
        'h-[1.125rem] rounded-md border-0 bg-transparent px-0.5 -mx-0.5 text-left',
        'text-[10px] font-semibold leading-none tracking-tight text-gray-900',
        'transition-colors duration-150',
        'hover:bg-gray-200/55 dark:hover:bg-neutral-700/70',
        'focus:outline-none focus:ring-2 focus:ring-gray-400/35 focus:ring-offset-0 dark:text-gray-100 dark:focus:ring-neutral-500/40',
      ].join(' ')
    : [
        'flex min-w-0 w-full flex-1 max-w-[min(11rem,calc(100vw-12rem))] items-center justify-between gap-0.5',
        'h-5 rounded border border-gray-300 bg-white pl-1.5 pr-1 text-left',
        'text-[11px] font-medium leading-none tracking-tight text-gray-900',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-[border-color,box-shadow,background-color] duration-150',
        'hover:border-gray-400 hover:bg-gray-50/80',
        'focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-400/40',
        'dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
        'dark:hover:border-neutral-500 dark:hover:bg-neutral-800 dark:focus:border-neutral-500',
      ].join(' ');

  const menu =
    isOpen &&
    fixedStyle != null &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-label={columnLabel}
        style={{
          position: 'fixed',
          top: fixedStyle.top,
          left: fixedStyle.left,
          width: fixedStyle.width,
          zIndex: 9999,
        }}
        className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 text-left shadow-xl ring-1 ring-black/5 dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/10"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={active}
              className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors ${
                active
                  ? 'bg-gray-100 font-medium text-gray-900 dark:bg-neutral-800 dark:text-gray-100'
                  : 'text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-neutral-800/80'
              }`}
              onClick={() => {
                onChange(opt.value);
                onClose();
              }}
            >
              <span className="min-w-0 flex-1 leading-snug">{opt.label}</span>
              {active ? (
                <svg
                  className="ml-2 h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        aria-label={`Valor para ${columnLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <svg
          className={`h-2.5 w-2.5 shrink-0 text-gray-600 transition-transform dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {menu}
    </>
  );
}

/**
 * Filtros activos: etiqueta arriba, select/input + quitar abajo; escala acorde al botón de filtros.
 */
export function ActiveFilterChips({
  columns,
  filters,
  onChange,
  valueSuggestions = {},
}: Pick<TableFiltersProps, 'columns' | 'filters' | 'onChange' | 'valueSuggestions'>) {
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const active = filters.filter((f) => f.field && String(f.value).trim() !== '');
  if (active.length === 0) return null;

  const patch = (id: string, partial: Partial<FilterRow>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  };

  const remove = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  const controlClass =
    'h-[1.125rem] min-w-0 max-w-[min(11rem,calc(100vw-12rem))] rounded-md border-0 bg-transparent px-0.5 text-[10px] leading-tight text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 dark:text-gray-100 dark:placeholder:text-neutral-500 dark:focus:ring-neutral-500/35';

  return (
    <div
      className="flex flex-wrap items-center gap-2 min-w-0 flex-1 pl-1"
      role="list"
      aria-label="Filtros aplicados"
    >
      {active.map((row) => {
        const col = columns.find((c) => c.id === row.field);
        if (!col) return null;
        const type = col.type;
        const isEnum = type === 'enum' && col.options && col.options.length > 0;

        return (
          <div
            key={row.id}
            role="listitem"
            className="flex max-w-full min-w-[9rem] flex-col gap-0 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-[3px] text-sm shadow-sm dark:border-neutral-600 dark:bg-neutral-800/90"
          >
            <span className="truncate text-[8px] font-medium uppercase leading-none tracking-wide text-gray-500 dark:text-gray-400">
              {col.label}
            </span>
            <div className="mt-0 flex h-[1.125rem] min-w-0 items-center gap-0.5">
              {isEnum ? (
                <ChipEnumDropdown
                  columnLabel={col.label}
                  options={col.options ?? []}
                  value={row.value}
                  onChange={(v) => patch(row.id, { value: v })}
                  isOpen={openMenuRowId === row.id}
                  onToggle={() =>
                    setOpenMenuRowId((curr) => (curr === row.id ? null : row.id))
                  }
                  onClose={() => setOpenMenuRowId(null)}
                  embedFlat
                />
              ) : type === 'number' ? (
                <input
                  type="number"
                  aria-label={`Valor numérico para ${col.label}`}
                  value={row.value}
                  onChange={(e) => patch(row.id, { value: e.target.value })}
                  className={`${controlClass} min-w-0 flex-1`}
                />
              ) : (
                <input
                  type="text"
                  aria-label={`Texto para ${col.label}`}
                  value={row.value}
                  onChange={(e) => patch(row.id, { value: e.target.value })}
                  list={valueSuggestions[row.field]?.length ? `sugg-${row.id}` : undefined}
                  placeholder="Valor"
                  className={`${controlClass} min-w-0 flex-1`}
                />
              )}
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded p-0 text-gray-400 hover:bg-gray-200/80 hover:text-gray-700 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-gray-200"
                title="Quitar filtro"
                aria-label={`Quitar filtro ${col.label}`}
              >
                <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {valueSuggestions[row.field]?.length ? (
              <datalist id={`sugg-${row.id}`}>
                {valueSuggestions[row.field]!.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
