type Props = {
  onPlay: () => void;
  disabled?: boolean;
  loading?: boolean;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-0.5" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white"
      aria-hidden
    />
  );
}

/**
 * Play arriba y centrado horizontalmente (no bloquea el resto del lienzo; solo el botón recibe clics).
 */
export function WorkflowPlayOverlay({ onPlay, disabled, loading }: Props) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-[4] flex justify-center pt-2">
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={onPlay}
          disabled={disabled || loading}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/90 bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20"
          title="Ejecutar el flujo desde el inicio siguiendo las conexiones"
          aria-label="Ejecutar flujo"
        >
          {loading ? <Spinner /> : <PlayIcon />}
        </button>
        <span className="pointer-events-auto rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 shadow dark:bg-neutral-800/95 dark:text-gray-300">
          Play
        </span>
      </div>
    </div>
  );
}
