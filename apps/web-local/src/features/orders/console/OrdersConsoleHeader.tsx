interface OrdersConsoleHeaderProps {
  subtitle?: string;
  density: 'comfortable' | 'compact';
  onToggleDensity: () => void;
  showSummary: boolean;
  onToggleSummary: () => void;
}

export function OrdersConsoleHeader({
  subtitle,
  density,
  onToggleDensity,
  showSummary,
  onToggleSummary,
}: OrdersConsoleHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pedidos</h1>
        {subtitle ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDensity}
          className="h-8 px-3 rounded-md border border-gray-300 dark:border-neutral-600 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-800"
        >
          Densidad: {density === 'compact' ? 'Compacta' : 'Comoda'}
        </button>
        <button
          type="button"
          onClick={onToggleSummary}
          className="h-8 px-3 rounded-md border border-gray-900 dark:border-white text-xs text-white dark:text-black bg-gray-900 dark:bg-white"
        >
          {showSummary ? 'Ocultar resumen' : 'Mostrar resumen'}
        </button>
      </div>
    </div>
  );
}
