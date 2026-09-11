import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import LocalLayout from '@/components/layout/LocalLayout';
import ConnectorManageDialog from '@/components/settings/ConnectorManageDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { usePermission } from '@/lib/role-guards';
import {
  createWorkflow,
  defaultWorkflowDefinition,
  deleteConnector,
  deleteWorkflow,
  fetchConnectors,
  fetchConnectorTypes,
  fetchWorkflows,
  mergeDataBridgeTestExports,
  publishAldenSateliteToStore,
  publishDataBridgeTestExports,
  type ConnectorTypeRow,
  type ConnectorRow,
  type MergeDataBridgeTestExportsResult,
  type PublishAldenSateliteToStoreResult,
  type PublishDataBridgeTestExportsResult,
  type UploadDataBridgeTestExportResult,
  type WorkflowRow,
  updateConnector,
  updateWorkflow,
  uploadDataBridgeTestExportRows,
} from '@/lib/integration-workflows';
import { isOperatorRole, normalizeOperatorPermissions } from '@/lib/operator-permissions';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

type Tab = 'workflows' | 'connectors' | 'uploads';

type ConnectorDialogState = null | { mode: 'create' } | { mode: 'edit'; row: ConnectorRow };

const INVENTORY_BATCH_SIZE = 100;
const PRICES_BATCH_SIZE = 1000;

type ParsedInventoryRow = {
  no_parte: string;
  descripcion: string | null;
  ubica: string | null;
  exist: number | null;
  cells: Record<string, unknown>;
  source_row_number: number;
};

type ParsedPriceRow = {
  ADJSTCLAIM: string;
  ADJSTMNT: string | null;
  'WARR.': string | null;
  CLAIM: number | null;
  cells: Record<string, unknown>;
  source_row_number: number;
};

type UploadState = {
  fileName: string;
  totalRows: number;
  uploadedRows: number;
  batches: number;
  inserted: number;
  failed: number;
  cleared: number;
  importBatchId?: string;
  sampleErrors: string[];
};

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cellValue(sheet: XLSX.WorkSheet, row: number, col: number): unknown {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  return cell?.v ?? null;
}

function toCleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').replace(/[$,\s]/g, '').trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

async function parseInventoryFile(file: File): Promise<ParsedInventoryRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('El archivo no contiene hojas');
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  let headerRow = -1;
  let noParteCol = -1;
  let descripcionCol = -1;
  let ubicaCol = -1;
  let existCol = -1;
  const headerLabels = new Map<number, string>();

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const normalizedByCol = new Map<number, string>();
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const raw = cellValue(sheet, row, col);
      const normalized = normalizeHeader(raw);
      if (normalized) {
        normalizedByCol.set(col, normalized);
        headerLabels.set(col, String(raw ?? '').trim());
      }
    }
    const headerEntries = Array.from(normalizedByCol.entries());
    const foundNoParte = headerEntries.find(([, value]) => value === 'noparte');
    const foundExist = headerEntries.find(([, value]) => value === 'exist');
    if (foundNoParte && foundExist) {
      headerRow = row;
      noParteCol = foundNoParte[0];
      existCol = foundExist[0];
      descripcionCol = headerEntries.find(([, value]) => value.startsWith('descripcion'))?.[0] ?? -1;
      ubicaCol = headerEntries.find(([, value]) => value === 'ubica')?.[0] ?? -1;
      break;
    }
  }

  if (headerRow < 0) throw new Error('No se encontro encabezado con No. Parte y Exist');

  const rows: ParsedInventoryRow[] = [];
  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const cells: Record<string, unknown> = {};
    let hasAnyValue = false;
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const value = cellValue(sheet, row, col);
      if (value !== null && value !== undefined && String(value).trim() !== '') hasAnyValue = true;
      cells[headerLabels.get(col) || `col_${col + 1}`] = value;
    }
    if (!hasAnyValue) continue;
    const noParte = toCleanString(cellValue(sheet, row, noParteCol));
    if (!noParte) continue;
    rows.push({
      no_parte: noParte,
      descripcion: descripcionCol >= 0 ? toCleanString(cellValue(sheet, row, descripcionCol)) : null,
      ubica: ubicaCol >= 0 ? toCleanString(cellValue(sheet, row, ubicaCol)) : null,
      exist: toNumber(cellValue(sheet, row, existCol)),
      cells,
      source_row_number: row + 1,
    });
  }

  const invalidRow = rows.find((row) => Array.isArray(row) || !row.no_parte);
  if (invalidRow) throw new Error('El inventario produjo una fila invalida sin no_parte');
  return rows;
}

async function parsePricesFile(file: File): Promise<ParsedPriceRow[]> {
  const text = await file.text();
  const rows: ParsedPriceRow[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const sku = line.slice(0, 15).trim();
    if (!sku || /^ADJSTCLAIM$/i.test(sku)) return;

    const rest = line.slice(15).trim();
    const priceMatch = rest.match(/(-?\$?\s*\d[\d,]*(?:\.\d{1,4})?)\s*$/);
    const claim = priceMatch ? toNumber(priceMatch[1]) : null;
    const middle = priceMatch ? rest.slice(0, priceMatch.index).trim() : rest;
    const chunks = middle.split(/\t+|\s{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
    let adjstmnt: string | null = null;
    let warr: string | null = null;

    if (chunks.length >= 2) {
      warr = chunks[chunks.length - 1];
      adjstmnt = chunks.slice(0, -1).join(' ');
    } else {
      const tokens = middle.split(/\s+/).filter(Boolean);
      warr = tokens.length > 1 ? tokens[tokens.length - 1] : null;
      adjstmnt = tokens.length > 1 ? tokens.slice(0, -1).join(' ') : middle || null;
    }

    rows.push({
      ADJSTCLAIM: sku,
      ADJSTMNT: adjstmnt,
      'WARR.': warr,
      CLAIM: claim,
      cells: { raw: line },
      source_row_number: index + 1,
    });
  });

  return rows;
}

function ResultStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/40">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function withoutCells<T extends { cells?: Record<string, unknown> }>(row: T): Omit<T, 'cells'> {
  const { cells: _cells, ...rest } = row;
  return rest;
}

function formatShortDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function IconMssql({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 6.5C4 5.12 7.58 4 12 4s8 1.12 8 2.5S16.42 7 12 7 4 7.88 4 6.5zM4 9v3c0 1.1 2.9 2 8 2s8-.9 8-2V9c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5zM4 15v3c0 1.1 2.9 2 8 2s8-.9 8-2v-3c-1.38 1.1-4.5 1.5-8 1.5-3.5 0-6.62-.4-8-1.5z" />
    </svg>
  );
}

function IconHttpRest({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      />
    </svg>
  );
}

function ActiveToggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm text-gray-600 dark:text-gray-300 select-none tabular-nums w-[4.75rem] text-right">
        {enabled ? 'Activo' : 'Inactivo'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Desactivar' : 'Activar'}
        disabled={disabled}
        onClick={onToggle}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
          'dark:focus:ring-gray-500 dark:focus:ring-offset-neutral-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          enabled ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-300 dark:bg-neutral-600',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition',
            enabled ? 'translate-x-4' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function canAccessWorkflows(
  role: string,
  isSuperadmin: boolean,
  settings?: Record<string, boolean> | null,
) {
  if (isOperatorRole(role) && settings) {
    return settings['branches_integrations_workflows'] === true;
  }
  if (isSuperadmin) return true;
  return isOperatorRole(role) ? false : true;
}

export default function IntegrationsWorkflowsIndexPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedBusiness, isLoading, availableBusinesses } = useSelectedBusiness();
  const canManage = usePermission('canManageSettings');
  const [tab, setTab] = useState<Tab>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [connectorTypes, setConnectorTypes] = useState<ConnectorTypeRow[]>([]);
  const [connectorDialog, setConnectorDialog] = useState<ConnectorDialogState>(null);
  const [connectorMenuId, setConnectorMenuId] = useState<string | null>(null);
  const [testOkById, setTestOkById] = useState<Record<string, true>>({});
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [inventoryState, setInventoryState] = useState<UploadState | null>(null);
  const [pricesState, setPricesState] = useState<UploadState | null>(null);
  const [uploading, setUploading] = useState<'inventory' | 'prices' | null>(null);
  const [merging, setMerging] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [storePublishing, setStorePublishing] = useState(false);
  const [mergeState, setMergeState] = useState<MergeDataBridgeTestExportsResult | null>(null);
  const [publishState, setPublishState] = useState<PublishDataBridgeTestExportsResult | null>(null);
  const [storePublishState, setStorePublishState] = useState<PublishAldenSateliteToStoreResult | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const businessId = selectedBusiness?.business_id;
  const role = selectedBusiness?.role ?? 'operations_staff';
  const operatorPerms = selectedBusiness?.permissions
    ? normalizeOperatorPermissions(selectedBusiness.permissions as Record<string, unknown>)
    : null;
  const canSee =
    canManage && businessId
      ? canAccessWorkflows(role, isSuperadmin, operatorPerms?.settings as Record<string, boolean> | null)
      : false;

  useEffect(() => {
    const run = async () => {
      if (!selectedBusiness?.business_id) return;
      const b = await import('@/lib/business');
      try {
        const res = await b.businessService.getMyBusiness(selectedBusiness.business_id);
        if (res?.user_role === 'superadmin') setIsSuperadmin(true);
        else {
          setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
        }
      } catch {
        setIsSuperadmin(availableBusinesses.some((x) => x.role === 'superadmin'));
      }
    };
    if (user) run();
  }, [user, selectedBusiness?.business_id, availableBusinesses]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoadErr(null);
    try {
      const [w, c, types] = await Promise.all([
        fetchWorkflows(businessId),
        fetchConnectors(businessId),
        fetchConnectorTypes(businessId),
      ]);
      setWorkflows(w);
      setConnectors(c);
      setConnectorTypes(types);
    } catch (e: any) {
      setLoadErr(e?.message || 'Error al cargar');
    }
  }, [businessId]);

  useEffect(() => {
    if (!isLoading && user && canManage && businessId && canSee) {
      load();
    }
  }, [isLoading, user, canManage, businessId, canSee, load]);

  useEffect(() => {
    if (tab !== 'connectors') {
      setConnectorDialog(null);
      setConnectorMenuId(null);
    }
  }, [tab]);

  useEffect(() => {
    if (!connectorMenuId) return;
    const down = (e: MouseEvent) => {
      const el = menuRef.current;
      if (el && !el.contains(e.target as Node)) setConnectorMenuId(null);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [connectorMenuId]);

  const importBusy = uploading !== null || merging || publishing || storePublishing;

  const onCreateWorkflow = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const w = await createWorkflow(businessId, {
        name: 'Nuevo flujo',
        isEnabled: false,
        definition: defaultWorkflowDefinition(),
      });
      router.push(`/settings/integrations-workflows/${w.id}`);
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkflow = async (w: WorkflowRow) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await updateWorkflow(businessId, w.id, { isEnabled: !w.isEnabled });
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removeWorkflow = async (id: string) => {
    if (!businessId || !window.confirm('¿Eliminar este flujo?')) return;
    setSaving(true);
    try {
      await deleteWorkflow(businessId, id);
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleConnector = async (c: ConnectorRow) => {
    if (!businessId) return;
    setSaving(true);
    try {
      await updateConnector(businessId, c.id, { isEnabled: !c.isEnabled });
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const removeConnector = async (id: string) => {
    if (!businessId || !window.confirm('¿Eliminar este conector?')) return;
    setSaving(true);
    try {
      await deleteConnector(businessId, id);
      await load();
    } catch (e: any) {
      setLoadErr(e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const uploadRows = async (
    kind: 'inventory' | 'prices',
    file: File,
    rows: ParsedInventoryRow[] | ParsedPriceRow[],
    batchSize: number,
  ) => {
    if (!businessId) throw new Error('Selecciona una sucursal');
    const importBatchId = randomId();
    const batches = Math.ceil(rows.length / batchSize);
    const nextState: UploadState = {
      fileName: file.name,
      totalRows: rows.length,
      uploadedRows: 0,
      batches,
      inserted: 0,
      failed: 0,
      cleared: 0,
      importBatchId,
      sampleErrors: [],
    };

    if (kind === 'inventory') setInventoryState(nextState);
    else setPricesState(nextState);

    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const result: UploadDataBridgeTestExportResult = await uploadDataBridgeTestExportRows(businessId, {
        tableName: kind === 'inventory' ? 'prueba_inventory_export' : 'prueba_mex_insurance_prices_export',
        sourceFileName: file.name,
        importBatchId,
        clearExisting: replaceExisting && offset === 0,
        rows: batch.map(withoutCells),
      });

      nextState.uploadedRows = Math.min(rows.length, offset + batch.length);
      nextState.inserted += result.inserted;
      nextState.failed += result.failed;
      nextState.cleared += result.cleared;
      nextState.sampleErrors = [...nextState.sampleErrors, ...(result.sampleErrors || [])].slice(0, 10);

      if (kind === 'inventory') setInventoryState({ ...nextState });
      else setPricesState({ ...nextState });
    }
  };

  const handleInventoryFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading('inventory');
    setLoadErr(null);
    setMergeState(null);
    setPublishState(null);
    setStorePublishState(null);
    try {
      const rows = await parseInventoryFile(file);
      await uploadRows('inventory', file, rows, INVENTORY_BATCH_SIZE);
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo subir inventario');
    } finally {
      setUploading(null);
    }
  };

  const handlePricesFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading('prices');
    setLoadErr(null);
    setMergeState(null);
    setPublishState(null);
    setStorePublishState(null);
    try {
      const rows = await parsePricesFile(file);
      await uploadRows('prices', file, rows, PRICES_BATCH_SIZE);
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo subir precios');
    } finally {
      setUploading(null);
    }
  };

  const handleMergeExports = async () => {
    if (!businessId) return;
    setMerging(true);
    setLoadErr(null);
    setPublishState(null);
    setStorePublishState(null);
    try {
      setMergeState(await mergeDataBridgeTestExports(businessId));
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo fusionar');
    } finally {
      setMerging(false);
    }
  };

  const handlePublishExports = async () => {
    if (!businessId) return;
    setPublishing(true);
    setLoadErr(null);
    setStorePublishState(null);
    try {
      setPublishState(await publishDataBridgeTestExports(businessId));
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo publicar');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublishToStore = async () => {
    if (!businessId) return;
    setStorePublishing(true);
    setLoadErr(null);
    try {
      setStorePublishState(await publishAldenSateliteToStore(businessId));
    } catch (e: any) {
      setLoadErr(e?.message || 'No se pudo publicar en tienda');
    } finally {
      setStorePublishing(false);
    }
  };

  const getConnectorTypeLabel = (id: string) =>
    connectorTypes.find((t) => t.id === id)?.label ?? id;

  if (isLoading || !user) {
    return (
      <LocalLayout>
        <div className="p-6 text-sm text-gray-500">Cargando…</div>
      </LocalLayout>
    );
  }

  if (!canManage) {
    router.replace('/');
    return null;
  }

  if (!selectedBusiness && !availableBusinesses.some((b) => b.role === 'superadmin')) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Selecciona una sucursal en la barra superior.</p>
        </div>
      </LocalLayout>
    );
  }

  if (selectedBusiness && !canSee) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">No tienes permiso para automatización en esta sucursal.</p>
        </div>
      </LocalLayout>
    );
  }

  if (!businessId) {
    return (
      <LocalLayout>
        <div className="p-6 max-w-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">Selecciona una sucursal en la barra superior.</p>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Automatización - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="w-full min-w-0 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">Configuración</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona la configuración de tu tienda y personal</p>
          </div>
          <div className="flex gap-6">
            <SettingsSidebar currentPath={router.pathname} />
            <div className="flex-1 min-w-0 w-full">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Automatización</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Flujos y conectores de esta sucursal. Sin webhooks externos; ejecución manual o programación interna
              (futura).
            </p>

            {loadErr && (
              <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200">
                {loadErr}
              </div>
            )}

            <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-neutral-700">
              {(['workflows', 'connectors', 'uploads'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                    tab === t
                      ? 'border-black dark:border-white text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500'
                  }`}
                >
                  {t === 'workflows' ? 'Flujos' : t === 'connectors' ? 'Conectores' : 'Subir y publicar'}
                </button>
              ))}
            </div>

            {tab === 'workflows' && (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Flujos</h2>
                  <button
                    type="button"
                    onClick={onCreateWorkflow}
                    disabled={saving}
                    className="px-4 py-2 rounded-md bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-50"
                  >
                    Nuevo flujo
                  </button>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-neutral-700 rounded-lg border border-gray-200 dark:border-neutral-700">
                  {workflows.length === 0 && (
                    <li className="p-4 text-sm text-gray-500">No hay flujos. Crea uno o ejecuta el seed de demo en BD.</li>
                  )}
                  {workflows.map((w) => (
                    <li key={w.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{w.name}</div>
                        <div className="text-xs text-gray-500">v{w.version}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ActiveToggle
                          enabled={w.isEnabled}
                          onToggle={() => toggleWorkflow(w)}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() => router.push(`/settings/integrations-workflows/${w.id}`)}
                          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-neutral-600"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeWorkflow(w.id)}
                          className="px-3 py-1.5 text-sm text-red-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === 'connectors' && (
                <div className="mt-6">
                  <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Conectores</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                    Orígenes de datos para flujos (SQL, APIs, etc.). La contraseña se cifra en el servidor; no se expone
                    por API. Haz clic en una fila o en «Gestionar» para editar o probar la conexión.
                  </p>

                  <ul className="mt-4 space-y-3">
                    {connectors.length === 0 && (
                      <li className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-sm text-gray-500 dark:border-neutral-700 dark:bg-neutral-800/30 dark:text-gray-400">
                        Aún no hay conectores. Usa &quot;Nuevo conector&quot; para añadir uno.
                      </li>
                    )}
                    {connectors.map((c) => {
                      const typeId = c.connectorTypeId;
                      const isMssql = typeId === 'mssql';
                      const typeLabel = getConnectorTypeLabel(typeId);
                      const showVerified = isMssql && c.hasPassword && testOkById[c.id];
                      return (
                        <li
                          key={c.id}
                          className="group relative flex flex-wrap items-stretch justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:border-neutral-600"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setConnectorDialog({ mode: 'edit', row: c })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setConnectorDialog({ mode: 'edit', row: c });
                              }
                            }}
                            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                          >
                            <span
                              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-200"
                              title={typeLabel}
                            >
                              {isMssql ? (
                                <IconMssql className="h-5 w-5" />
                              ) : (
                                <IconHttpRest className="h-5 w-5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                                {!c.hasPassword && isMssql && (
                                  <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100">
                                    Falta credencial
                                  </span>
                                )}
                                {showVerified && (
                                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100">
                                    Conexión comprobada
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-600 dark:border-neutral-600 dark:bg-neutral-800 dark:text-gray-300">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Esta sucursal
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {typeLabel}
                                {isMssql && (
                                  <>
                                    {' '}
                                    · Última actualización {formatShortDate(c.updatedAt)} · Creado{' '}
                                    {formatShortDate(c.createdAt)}
                                  </>
                                )}
                              </p>
                              {isMssql && (
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                                  Servidor: {(c.config?.server as string) || '—'}
                                  {c.hasPassword ? ' · Credencial almacenada' : ' · Sin credencial'}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <ActiveToggle
                              enabled={c.isEnabled}
                              onToggle={() => toggleConnector(c)}
                              disabled={saving}
                            />
                            <div
                              className="relative"
                              ref={connectorMenuId === c.id ? menuRef : undefined}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setConnectorMenuId((x) => (x === c.id ? null : c.id))
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
                                aria-label="Más acciones"
                              >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>
                              {connectorMenuId === c.id && (
                                <div className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-600 dark:bg-neutral-900">
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-neutral-800"
                                    onClick={() => {
                                      setConnectorMenuId(null);
                                      setConnectorDialog({ mode: 'edit', row: c });
                                    }}
                                  >
                                    Gestionar
                                  </button>
                                  <button
                                    type="button"
                                    className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => {
                                      setConnectorMenuId(null);
                                      removeConnector(c.id);
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setConnectorDialog({ mode: 'create' })}
                      disabled={saving}
                      className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 dark:hover:text-black disabled:opacity-50"
                    >
                      Nuevo conector
                    </button>
                  </div>
                </div>
            )}

            {tab === 'uploads' && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">Subir y publicar</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Carga inventario y precios, fusiona por SKU y publica a la tabla satelite.
                    </p>
                  </div>
                  <label className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(event) => setReplaceExisting(event.target.checked)}
                      disabled={importBusy}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Reemplazar datos previos
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Subir inventario</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">XLS, XLSX o CSV en lotes de {INVENTORY_BATCH_SIZE}</p>
                      </div>
                      <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                        {uploading === 'inventory' ? 'Subiendo...' : 'Elegir archivo'}
                        <input
                          type="file"
                          accept=".xls,.xlsx,.csv"
                          className="hidden"
                          disabled={importBusy}
                          onChange={handleInventoryFile}
                        />
                      </label>
                    </div>
                    {inventoryState && (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                          <ResultStat label="Filas" value={inventoryState.totalRows} />
                          <ResultStat label="Subidas" value={inventoryState.uploadedRows} />
                          <ResultStat label="Insertadas" value={inventoryState.inserted} />
                          <ResultStat label="Fallidas" value={inventoryState.failed} />
                        </div>
                        <p className="mt-3 truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {inventoryState.fileName} · Batch: {inventoryState.importBatchId}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Subir precios</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">TXT en lotes de {PRICES_BATCH_SIZE}</p>
                      </div>
                      <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50">
                        {uploading === 'prices' ? 'Subiendo...' : 'Elegir archivo'}
                        <input
                          type="file"
                          accept=".txt"
                          className="hidden"
                          disabled={importBusy}
                          onChange={handlePricesFile}
                        />
                      </label>
                    </div>
                    {pricesState && (
                      <>
                        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                          <ResultStat label="Filas" value={pricesState.totalRows} />
                          <ResultStat label="Subidas" value={pricesState.uploadedRows} />
                          <ResultStat label="Insertadas" value={pricesState.inserted} />
                          <ResultStat label="Fallidas" value={pricesState.failed} />
                        </div>
                        <p className="mt-3 truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {pricesState.fileName} · Batch: {pricesState.importBatchId}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Fusionar tablas de prueba</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cruza inventario y precios por SKU normalizado.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMergeExports}
                      disabled={importBusy}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {merging ? 'Fusionando...' : 'Fusionar'}
                    </button>
                  </div>
                  {mergeState && (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                        <ResultStat label="Insertadas" value={mergeState.inserted} />
                        <ResultStat label="Esperadas" value={mergeState.expectedRows} />
                        <ResultStat label="Lotes" value={mergeState.batches} />
                        <ResultStat label="Limpiadas" value={mergeState.cleared} />
                        <ResultStat label="Fallos" value={mergeState.failedBatches} />
                      </div>
                      <p className="mt-3 truncate text-[11px] text-gray-500 dark:text-gray-400">
                        Merge batch: {mergeState.mergeBatchId}
                      </p>
                    </>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Publicar</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Actualiza e inserta en integration_alden_satelite.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePublishExports}
                      disabled={importBusy}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {publishing ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                  {publishState && (
                    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <ResultStat label="Origen" value={publishState.sourceRows} />
                      <ResultStat label="Actualizadas" value={publishState.updated} />
                      <ResultStat label="Insertadas" value={publishState.inserted} />
                      <ResultStat label="Publicadas" value={publishState.published} />
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/40">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Publicar en tienda</h3>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ejecuta scripts/017_publish_integracion_alden_satelite_to_store.sql.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePublishToStore}
                      disabled={importBusy}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-black px-4 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {storePublishing ? 'Publicando...' : 'Publicar en tienda'}
                    </button>
                  </div>
                  {storePublishState && (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                        <ResultStat label="SKUs origen" value={storePublishState.sourceSkus} />
                        <ResultStat label="Existentes" value={storePublishState.matchedExistingProducts} />
                        <ResultStat label="Creados" value={storePublishState.insertedProducts} />
                        <ResultStat label="Visibles" value={storePublishState.visibleInStoreCandidates} />
                        <ResultStat label="Precio cero" value={storePublishState.stillHiddenDueToZeroPrice} />
                      </div>
                      <p className="mt-3 truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {storePublishState.storeName} - {storePublishState.branchName}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
        {businessId && (
          <ConnectorManageDialog
            open={!!connectorDialog}
            onClose={() => setConnectorDialog(null)}
            businessId={businessId}
            mode={connectorDialog?.mode === 'edit' ? 'edit' : 'create'}
            connector={connectorDialog?.mode === 'edit' ? connectorDialog.row : null}
            connectorTypes={connectorTypes}
            onSaved={() => {
              setConnectorDialog(null);
              load();
            }}
            onDeleted={() => {
              setConnectorDialog(null);
              load();
            }}
            onTestSuccess={(id) => setTestOkById((m) => ({ ...m, [id]: true }))}
          />
        )}
      </LocalLayout>
    </>
  );
}
