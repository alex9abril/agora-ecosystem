'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

type Props = {
  data: unknown;
  /** Si true, el editor crece con el contenedor (el padre debe ser flex con min-h-0 y altura definida). */
  fillContainer?: boolean;
};

const extensions = [json(), EditorView.lineWrapping];
const LARGE_JSON_FAST_VIEW_THRESHOLD = 80_000;

function IconCopy() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/**
 * JSON formateado con resaltado, scroll interno (no estira toda la página) y acciones de copiado.
 */
export function WorkflowJsonResultViewer({ data, fillContainer }: Props) {
  const [dark, setDark] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'err'>('idle');
  const cmHolderRef = useRef<HTMLDivElement>(null);
  const [cmHeightPx, setCmHeightPx] = useState(320);

  const text = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const stats = useMemo(() => {
    const lines = text.split('\n').length;
    const sizeKb = Math.round((text.length / 1024) * 10) / 10;
    let rowHint: string | null = null;
    if (data && typeof data === 'object' && data !== null && 'rows' in data && Array.isArray((data as { rows: unknown }).rows)) {
      const n = (data as { rows: unknown[] }).rows.length;
      rowHint = `${n} fila${n === 1 ? '' : 's'}`;
    }
    return { lines, sizeKb, rowHint };
  }, [data, text]);
  const shouldDefaultFastMode = text.length >= LARGE_JSON_FAST_VIEW_THRESHOLD;
  const [preferPrettyViewer, setPreferPrettyViewer] = useState(false);
  const usePlainViewer = shouldDefaultFastMode && !preferPrettyViewer;

  useEffect(() => {
    setPreferPrettyViewer(false);
  }, [text]);

  useLayoutEffect(() => {
    if (!fillContainer || !cmHolderRef.current) return;
    const el = cmHolderRef.current;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      setCmHeightPx(Math.max(80, Math.round(h)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillContainer, stats.lines]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains('dark'));
    sync();
    const o = new MutationObserver(sync);
    o.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('ok');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('err');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [text]);

  return (
    <div
      className={
        fillContainer
          ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-hidden'
          : 'flex min-h-0 flex-1 flex-col gap-1.5'
      }
      data-json-result-viewer
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          <span>
            {stats.lines} línea{stats.lines === 1 ? '' : 's'} · ~{stats.sizeKb} KB
          </span>
          {stats.rowHint && <span className="text-gray-400 dark:text-gray-500">· {stats.rowHint}</span>}
          {shouldDefaultFastMode && (
            <span className="text-amber-700 dark:text-amber-300">· Modo rápido activo</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {shouldDefaultFastMode && (
            <button
              type="button"
              onClick={() => setPreferPrettyViewer((v) => !v)}
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
              title={usePlainViewer ? 'Cambiar a vista formateada' : 'Cambiar a vista optimizada'}
            >
              {usePlainViewer ? 'Vista formateada' : 'Vista optimizada'}
            </button>
          )}
          {copyState === 'ok' && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400" role="status">
              Copiado
            </span>
          )}
          {copyState === 'err' && (
            <span className="text-[10px] text-red-600 dark:text-red-400" role="status">
              No se pudo copiar
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
            title="Copiar JSON al portapapeles"
          >
            <IconCopy />
            Copiar
          </button>
        </div>
      </div>
      {text.length > 1_500_000 && (
        <p className="shrink-0 text-[10px] text-amber-700 dark:text-amber-300/90">
          JSON muy grande: el resaltado puede ir lento. La tabla o el esquema suelen ser más ligeros.
        </p>
      )}
      <div
        ref={fillContainer ? cmHolderRef : undefined}
        className={
          fillContainer
            ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-inner dark:border-neutral-600 dark:bg-[#1e1e1e]'
            : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-inner dark:border-neutral-600 dark:bg-[#1e1e1e]'
        }
      >
        {usePlainViewer ? (
          <div className="min-h-0 w-full flex-1 overflow-auto" aria-label="JSON output">
            <pre className="m-0 min-w-full p-2 font-mono text-[10px] leading-snug text-gray-800 dark:text-gray-100">
              {text}
            </pre>
          </div>
        ) : (
          <CodeMirror
            value={text}
            height={fillContainer ? `${cmHeightPx}px` : '400px'}
            minHeight={fillContainer ? '80px' : '180px'}
            maxHeight={fillContainer ? undefined : '480px'}
            theme={dark ? vscodeDark : vscodeLight}
            extensions={extensions}
            readOnly
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              bracketMatching: true,
              dropCursor: false,
            }}
            className="text-[10px] leading-snug"
          />
        )}
      </div>
    </div>
  );
}
