import { FormEvent, useMemo } from 'react';

interface OrdersOpsBarProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSubmitSearch: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
  hasActiveFilters: boolean;
  /** Texto de búsqueda ya aplicado al API (para el resumen). */
  appliedSearchTerm: string;
  onClearFilters?: () => void;
}

function ClearFiltersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function OrdersOpsBar({
  searchInput,
  onSearchInputChange,
  onSubmitSearch,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showAdvancedFilters,
  onToggleAdvancedFilters,
  hasActiveFilters,
  appliedSearchTerm,
  onClearFilters,
}: OrdersOpsBarProps) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmitSearch();
  };

  const summaryParts = useMemo(() => {
    const parts: string[] = [];
    const q = appliedSearchTerm.trim();
    if (q) parts.push(`Búsqueda: "${q}"`);
    if (startDate && endDate) parts.push(`Fechas: ${startDate} — ${endDate}`);
    else if (startDate) parts.push(`Desde: ${startDate}`);
    else if (endDate) parts.push(`Hasta: ${endDate}`);
    return parts;
  }, [appliedSearchTerm, startDate, endDate]);

  const containerClass = hasActiveFilters
    ? 'relative overflow-hidden rounded-lg border-2 border-blue-600 dark:border-blue-500 bg-blue-100 dark:bg-blue-950/60 ring-2 ring-blue-500/35 shadow-md shadow-blue-600/10 dark:shadow-blue-500/15 pl-3 pr-3 pt-3 pb-3 mb-3 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-blue-600 dark:before:bg-blue-400'
    : 'border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 p-3 mb-3';

  return (
    <div className={containerClass}>
      {hasActiveFilters ? (
        <p className="relative mb-2.5 text-sm font-medium text-blue-900 dark:text-blue-100">
          <span className="mr-1.5 inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-blue-500">
            Activo
          </span>
          <span className="font-semibold">Filtros activos</span>
          {summaryParts.length > 0 ? (
            <span className="mt-1 block text-xs font-normal text-blue-800 dark:text-blue-200 sm:mt-0 sm:inline sm:pl-1">
              {summaryParts.join(' · ')}
            </span>
          ) : null}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col lg:flex-row lg:items-center gap-2">
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Buscar por folio, cliente, telefono, SKU o guia"
          className="h-9 flex-1 rounded-md border border-gray-300 dark:border-neutral-600 px-3 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-9 rounded-md border border-gray-300 dark:border-neutral-600 px-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-9 rounded-md border border-gray-300 dark:border-neutral-600 px-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            className="h-9 px-3 rounded-md bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium"
          >
            Buscar
          </button>
          {hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 px-2.5 rounded-md border-2 border-blue-700 dark:border-blue-400 bg-white dark:bg-neutral-900 text-blue-800 dark:text-blue-200 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-blue-200/80 dark:hover:bg-blue-900/70"
              aria-label="Limpiar búsqueda y fechas"
              title="Limpiar búsqueda y fechas"
            >
              <ClearFiltersIcon />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleAdvancedFilters}
            className="h-9 px-3 rounded-md border border-gray-300 dark:border-neutral-600 text-sm text-gray-700 dark:text-gray-200"
          >
            {showAdvancedFilters ? 'Ocultar filtros' : 'Filtros'}
          </button>
        </div>
      </form>
    </div>
  );
}
