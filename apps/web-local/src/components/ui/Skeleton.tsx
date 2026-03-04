/**
 * Componentes Skeleton para estados de carga en web-local.
 * Se muestran mientras se carga el contenido importante; al terminar se ocultan y se muestra el contenido real.
 */

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

const baseClass = 'animate-pulse rounded bg-gray-200 dark:bg-neutral-600';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(baseClass, className)} {...props} />;
}

/** Una línea de texto placeholder */
export function SkeletonText({
  className,
  width = 'full',
}: {
  className?: string;
  width?: 'full' | '3/4' | '1/2' | '1/3' | '1/4';
}) {
  const widthClass =
    width === 'full'
      ? 'w-full'
      : width === '3/4'
        ? 'w-3/4'
        : width === '1/2'
          ? 'w-1/2'
          : width === '1/3'
            ? 'w-1/3'
            : 'w-1/4';
  return <Skeleton className={cn('h-4', widthClass, className)} />;
}

/** Card con título y valor (KPI) */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-100 dark:border-neutral-700',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Fila de tabla */
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100 dark:border-neutral-700">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton
            className={cn(
              'h-4',
              i === 0 ? 'w-20' : i === cols - 1 ? 'w-16 ml-auto' : 'w-full max-w-[120px]'
            )}
          />
        </td>
      ))}
    </tr>
  );
}

/** Tabla completa con header y filas skeleton */
export function SkeletonTable({
  rows = 8,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
          <thead className="bg-gray-50 dark:bg-neutral-800">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-3 text-left">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonTableRow key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Bloque de gráfica placeholder */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg p-6 border border-gray-100 dark:border-neutral-700',
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="h-64 flex items-end justify-between gap-2">
        {[40, 65, 35, 80, 55, 45, 70, 50, 60, 38, 72, 48].map((pct, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${pct}%` }}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

/** Lista de cards (ej. sliders, items) */
export function SkeletonCardList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden"
        >
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grid de cards de configuración (ej. settings) */
export function SkeletonSettingsCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Panel lateral (lista + detalle) para kitchen/operations */
export function SkeletonPanelList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
        >
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Barra de filtros/búsqueda */
export function SkeletonFilters({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4',
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
