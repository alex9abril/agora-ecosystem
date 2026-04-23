import type { NodeRunExecutionView } from './workflow-run-types';

/** Añadir al <div> raíz del nodo (además de sus clases base). */
export function runExecutionBoxClasses(d: Record<string, unknown> | undefined): string {
  if (!d?.runExecution) return '';
  if (d.executionFocus === true) {
    return '!ring-2 !ring-emerald-500 !ring-offset-2 !ring-offset-white dark:!ring-offset-neutral-900 shadow-md z-10';
  }
  return '!ring-1 !ring-emerald-500/60 dark:!ring-emerald-500/40';
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <span className="text-[8px] font-bold leading-none" aria-hidden>
      !
    </span>
  );
}

/**
 * Solo indicador: anillo (runExecutionBoxClasses en el contenedor) + check o alerta. El detalle está al abrir el nodo.
 */
export function NodeRunSuccessMarker({ data }: { data: Record<string, unknown> | undefined }) {
  const re = data?.runExecution as NodeRunExecutionView | undefined;
  if (!re) return null;
  const ok = !re.error;
  return (
    <div
      className={`pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border shadow ${
        ok
          ? 'border-emerald-200 bg-emerald-600 text-white dark:border-emerald-700'
          : 'border-red-200 bg-red-600 text-white dark:border-red-800'
      }`}
      title={ok ? 'Hubo una ejecución: abre el nodo para ver entrada y salida' : 'Error en la última ejecución: abre el nodo para ver el detalle'}
    >
      {ok ? <IconCheck /> : <IconWarning />}
    </div>
  );
}
