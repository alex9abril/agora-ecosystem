'use client';

import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

const extensions = [javascript(), EditorView.lineWrapping];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function WorkflowCodeEditor({ value, onChange }: Props) {
  const [dark, setDark] = useState(false);

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
      className="mt-0.5 overflow-hidden rounded-md border border-gray-300 bg-white text-xs shadow-sm dark:border-neutral-600 dark:bg-[#1e1e1e]"
      data-workflow-code-editor
    >
      <CodeMirror
        value={value}
        height="300px"
        minHeight="200px"
        maxHeight="420px"
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
        className="text-[11px] leading-relaxed"
      />
    </div>
  );
}
