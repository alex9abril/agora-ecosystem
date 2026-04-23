import * as vm from 'node:vm';

/** Inspirado en el nodo Code de n8n: un único “item” envuelto como `{ json }` y `$input.all()`. */
export type N8nStyleInput = {
  first: () => { json: unknown };
  last: () => { json: unknown };
  all: () => { json: unknown }[];
};

const MAX_CODE_LEN = 200_000;
const DEFAULT_TIMEOUT_MS = 10_000;

function cloneForVm(input: unknown): unknown {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(input);
    }
  } catch {
    /* continuar con JSON */
  }
  const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);
  try {
    return JSON.parse(JSON.stringify(input, replacer));
  } catch {
    return { _uncloneable: true as const, _hint: 'Entrada no clonable; devuelve solo datos JSON-serializables desde el nodo anterior.' };
  }
}

function buildN8nStyleInput(previous: unknown): N8nStyleInput {
  const json = cloneForVm(previous);
  const item = { json };
  return {
    first: () => item,
    last: () => item,
    all: () => [item],
  };
}

/**
 * Ejecuta JavaScript con `node:vm` (sin acceso a require/process/fs).
 * El código actúa como cuerpo de una función: debe usar `return` para el resultado.
 * Expone `$input` e `input` (alias), estilo n8n.
 */
export function executeWorkflowUserCode(
  previous: unknown,
  userCode: string,
  options?: { timeoutMs?: number },
): { ok: true; result: unknown; logs: string[] } | { ok: false; error: string; logs: string[] } {
  const code = (userCode || '').trim();
  const logs: string[] = [];
  if (!code) {
    return { ok: false, error: 'Código vacío', logs: [] };
  }
  if (code.length > MAX_CODE_LEN) {
    return { ok: false, error: `Código supera el límite de ${MAX_CODE_LEN} caracteres`, logs: [] };
  }

  const inputApi = buildN8nStyleInput(previous);
  const con = {
    log: (...args: unknown[]) => {
      const line = args
        .map((a) => {
          if (a === null || a === undefined) return String(a);
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          }
          return String(a);
        })
        .join(' ');
      logs.push(line);
    },
    /** Sin warn/error/info aún (evita confusion con logs reales) */
  };

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const wrapped = `'use strict';
    (function() {
      return (function($input, input, console) {
${code}
      })(__$input, __$input, __$console);
    })();
  `;

  const sandbox: Record<string, unknown> = {
    __$input: inputApi,
    __$console: con,
  };

  const context = vm.createContext(sandbox);
  try {
    const script = new vm.Script(wrapped, { filename: 'workflow-user-code.js' });
    const result = script.runInContext(context, { timeout: timeoutMs });
    return { ok: true, result, logs };
  } catch (e) {
    const err = e as { name?: string; message?: string };
    const isTimeout = err?.name === 'ScriptExecutionTimeout' || /timeout/i.test(String(err?.message));
    if (isTimeout) {
      return { ok: false, error: `Tiempo límite de ejecución (${timeoutMs} ms)`, logs };
    }
    return { ok: false, error: err?.message || 'Error al ejecutar el código', logs };
  }
}

export function toJsonSafeForWorkflow(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  } catch {
    return { _notSerializable: true as const, _hint: 'El resultado no es totalmente JSON-serializable' };
  }
}
