/**
 * Filtros acumulables para tablas.
 * Permite filtrar por columnas con operadores y valor; soporta texto (con autocomplete), número y enum/colección.
 */

import { useState, useRef, useEffect } from 'react';

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

  const getOperators = (fieldId: string) => {
    const col = columns.find((c) => c.id === fieldId);
    if (!col) return TEXT_OPERATORS;
    if (col.type === 'number') return NUMBER_OPERATORS;
    if (col.type === 'enum') return ENUM_OPERATORS;
    return TEXT_OPERATORS;
  };

  const getColumnType = (fieldId: string): FilterFieldType => {
    return columns.find((c) => c.id === fieldId)?.type ?? 'text';
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
