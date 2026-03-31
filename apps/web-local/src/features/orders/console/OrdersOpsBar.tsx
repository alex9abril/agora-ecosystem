import { FormEvent } from 'react';

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
}: OrdersOpsBarProps) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmitSearch();
  };

  return (
    <div className="border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 p-3 mb-3">
      <form onSubmit={onSubmit} className="flex flex-col lg:flex-row lg:items-center gap-2">
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Buscar por folio, cliente, telefono, SKU o guia"
          className="h-9 flex-1 rounded-md border border-gray-300 dark:border-neutral-600 px-3 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
        />
        <div className="flex items-center gap-2">
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
