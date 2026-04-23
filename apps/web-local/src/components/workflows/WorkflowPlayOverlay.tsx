type Props = {
  onPlay: () => void;
  disabled?: boolean;
  loading?: boolean;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 translate-x-0.5" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden
    />
  );
}

/**
 * Play abajo y centrado (no bloquea el resto del lienzo; solo el botón recibe clics).
 */
export function WorkflowPlayOverlay({ onPlay, disabled, loading }: Props) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[4] flex justify-center pb-3">
      <button
        type="button"
        onClick={onPlay}
        disabled={disabled || loading}
        className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/90 bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20"
        title="Ejecutar el flujo desde el inicio (no requiere que el flujo esté activo en el listado si usas el grafo del editor)"
        aria-label="Probar flujo"
      >
        {loading ? <Spinner /> : <PlayIcon />}
        <span>{loading ? 'Ejecutando…' : 'Probar flujo'}</span>
      </button>
    </div>
  );
}
