'use client';

import { useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, MSSQL } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';

const PLACEHOLDER = 'SELECT TOP 10 *\n  FROM [dbo].[tabla];';

const extensions = [sql({ dialect: MSSQL, upperCaseKeywords: true }), EditorView.lineWrapping];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

/**
 * Editor SQL (T‑SQL) con resaltado, números de línea y tema claro/oscuro según `html.dark`.
 */
export function WorkflowMssqlQueryEditor({ value, onChange }: Props) {
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
      data-mssql-editor
    >
      <CodeMirror
        value={value}
        height="276px"
        minHeight="176px"
        maxHeight="396px"
        theme={dark ? vscodeDark : vscodeLight}
        extensions={extensions}
        onChange={onChange}
        placeholder={PLACEHOLDER}
        indentWithTab
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
