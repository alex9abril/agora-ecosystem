'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

const extensions = [javascript(), EditorView.lineWrapping];

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** El padre debe ser flex con `min-h-0` y altura definida (p. ej. columna del panel Code). */
  fillContainer?: boolean;
};

export function WorkflowCodeEditor({ value, onChange, fillContainer }: Props) {
  const [dark, setDark] = useState(false);
  const cmHolderRef = useRef<HTMLDivElement>(null);
  const [cmHeightPx, setCmHeightPx] = useState(320);

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
  }, [fillContainer]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains('dark'));
    sync();
    const o = new MutationObserver(sync);
    o.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);

  return (
    <div
      ref={fillContainer ? cmHolderRef : undefined}
      className={
        fillContainer
          ? 'mt-0.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-300 bg-white text-xs shadow-sm dark:border-neutral-600 dark:bg-[#1e1e1e]'
          : 'mt-0.5 overflow-hidden rounded-md border border-gray-300 bg-white text-xs shadow-sm dark:border-neutral-600 dark:bg-[#1e1e1e]'
      }
      data-workflow-code-editor
    >
      <CodeMirror
        value={value}
        height={fillContainer ? `${cmHeightPx}px` : '300px'}
        minHeight={fillContainer ? '80px' : '200px'}
        maxHeight={fillContainer ? undefined : '420px'}
        theme={dark ? vscodeDark : vscodeLight}
        extensions={extensions}
        onChange={onChange}
        placeholder={`// Debes usar return.\n// $input.first().json = salida del nodo anterior\nreturn $input.first().json;`}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
        }}
        className="text-[10px] leading-relaxed"
      />
    </div>
  );
}
