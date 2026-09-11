import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import type { ProductMetadataSelectionItem } from '@/lib/product-metadata-selection';

type WizardStep = 1 | 2 | 3 | 4 | 5;
type EnrichField = 'photography' | 'name' | 'description' | 'category' | 'shipping' | 'compatibility';

const FIELD_OPTIONS: Array<{ id: EnrichField; title: string; hint: string }> = [
  { id: 'photography', title: 'Fotografía', hint: 'Busca hasta 3 veces. Si no hay foto real, no se muestra.' },
  { id: 'name', title: 'Nombre', hint: 'Título completo de la ficha (tipo, clase, marca y SKU). No se acorta.' },
  { id: 'description', title: 'Descripción', hint: 'Ficha en español. Si viene en inglés, se traduce.' },
  { id: 'category', title: 'Categoría', hint: 'Clasifica solo entre las categorías que ya existen.' },
  { id: 'shipping', title: 'Datos para envío', hint: 'Único dato estimado: peso, largo, ancho y alto empaquetados.' },
  { id: 'compatibility', title: 'Compatibilidad', hint: 'Usa las aplicaciones Fits de Longo / catálogo OEM. Sin inventar.' },
];

const STEPS = [
  { id: 1, label: 'Listado' },
  { id: 2, label: 'Campos' },
  { id: 3, label: 'IA' },
  { id: 4, label: 'Resultados' },
  { id: 5, label: 'Revisar y guardar' },
] as const;

const THINKING_LINES = [
  'Consultando Longo Toyota Parts y el catálogo oficial…',
  'Abriendo la ficha OEM del SKU…',
  'Buscando la foto real de la pieza…',
  'Revisando papeles de compatibilidad…',
  'Clasificando en categorías existentes…',
  'Estimando solo peso y volumen de empaque…',
];

type CompatibilityItem = {
  make: string;
  model: string;
  year_start?: number;
  year_end?: number;
  body_trim?: string | null;
  engine_transmission?: string | null;
  notes?: string;
  source?: string;
};

type EnrichmentDraft = {
  product_id: string;
  sku: string | null;
  original_name: string;
  fields: EnrichField[];
  name?: string;
  description?: string;
  category_id?: string | null;
  category_name?: string | null;
  shipping?: {
    weight_kg: number | null;
    length_cm: number | null;
    width_cm: number | null;
    height_cm: number | null;
    estimated?: boolean;
    rationale?: string;
  };
  compatibility?: {
    is_universal: boolean;
    items: CompatibilityItem[];
    notes?: string;
  };
  image_url?: string | null;
  image_options?: string[];
  selected_image_urls?: string[];
  sources?: string[];
  warnings: string[];
  error?: string;
  selected: boolean;
};

type CategoryOption = { id: string; name: string; business_name?: string };

interface Props {
  items: ProductMetadataSelectionItem[];
}

export default function ProductMetadataWizard({ items }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [fields, setFields] = useState<EnrichField[]>([]);
  const [drafts, setDrafts] = useState<EnrichmentDraft[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [thinkingLine, setThinkingLine] = useState(THINKING_LINES[0]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (message: string, type: 'success' | 'error' = 'success') => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbar({ open: true, message, type });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
      snackbarTimeoutRef.current = null;
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const all: CategoryOption[] = [];
        let page = 1;
        while (page <= 10) {
          const response = await apiRequest<{ data: CategoryOption[] }>(
            `/catalog/categories?limit=100&page=${page}&isActive=true`,
          );
          const rows = response.data || [];
          all.push(...rows);
          if (rows.length < 100) break;
          page += 1;
        }
        setCategories(all);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    const interval = setInterval(() => {
      setThinkingLine((prev) => {
        const index = THINKING_LINES.indexOf(prev);
        return THINKING_LINES[(index + 1) % THINKING_LINES.length];
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;

    const run = async () => {
      const nextDrafts: EnrichmentDraft[] = [];
      for (let i = 0; i < items.length; i += 1) {
        if (cancelled) return;
        setProcessingIndex(i);
        const product = items[i];
        try {
          const result = await apiRequest<EnrichmentDraft>('/catalog/products/enrich', {
            method: 'POST',
            body: JSON.stringify({
              productId: product.id,
              fields,
            }),
          });
          const imageOptions = result.image_options?.length
            ? result.image_options
            : result.image_url
              ? [result.image_url]
              : [];
          const warnings = [...(result.warnings || [])];
          const compatibilityMissing =
            fields.includes('compatibility') &&
            !result.compatibility?.is_universal &&
            !(result.compatibility?.items?.length);
          if (compatibilityMissing && !warnings.some((item) => /no se confirmó|advertencia/i.test(item))) {
            warnings.push('No se confirmó una aplicación exacta.');
          }
          nextDrafts.push({
            ...result,
            warnings,
            selected_image_urls: imageOptions,
            image_url: imageOptions[0] || result.image_url || null,
            selected: warnings.length === 0,
          });
        } catch (error: any) {
          nextDrafts.push({
            product_id: product.id,
            sku: product.sku || null,
            original_name: product.name,
            fields,
            warnings: [],
            error: error?.message || 'No se pudo completar este producto',
            selected: false,
          });
        }
        setDrafts([...nextDrafts]);
      }
      if (!cancelled) setStep(4);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [step, fields, items]);

  const toggleField = (id: EnrichField) => {
    setFields((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const updateDraft = (productId: string, patch: Partial<EnrichmentDraft>) => {
    setDrafts((prev) => prev.map((draft) => (draft.product_id === productId ? { ...draft, ...patch } : draft)));
  };

  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => draft.selected && !draft.error),
    [drafts],
  );
  const discardedCount = drafts.length - selectedDrafts.length;

  const handleSave = async () => {
    if (selectedDrafts.length === 0) {
      showSnackbar('Selecciona al menos un producto para guardar', 'error');
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest<{ saved: number; failed: number }>('/catalog/products/enrich/apply', {
        method: 'POST',
        body: JSON.stringify({
          products: selectedDrafts
            .map((draft) => ({
              id: draft.product_id,
              fields: draft.fields,
              name: draft.name,
              description: draft.description,
              category_id: draft.category_id || undefined,
              image_url: draft.selected_image_urls?.[0] || draft.image_url || undefined,
              image_urls: draft.selected_image_urls?.length
                ? draft.selected_image_urls
                : draft.image_url
                  ? [draft.image_url]
                  : [],
              shipping: draft.shipping
                ? {
                    weight_kg: draft.shipping.weight_kg ?? undefined,
                    length_cm: draft.shipping.length_cm ?? undefined,
                    width_cm: draft.shipping.width_cm ?? undefined,
                    height_cm: draft.shipping.height_cm ?? undefined,
                  }
                : undefined,
              compatibility_is_universal: draft.compatibility?.is_universal || false,
              compatibility_items: (draft.compatibility?.items || []).map((item) => ({
                make: item.make,
                model: item.model,
                year_start: item.year_start,
                year_end: item.year_end,
                body_trim: item.body_trim || undefined,
                engine_transmission: item.engine_transmission || undefined,
                notes: item.notes,
                source: item.source,
              })),
            })),
        }),
      });
      if (response.saved > 0 && response.failed === 0) {
        showSnackbar(
          response.saved === 1 ? 'Producto guardado correctamente' : `${response.saved} productos guardados correctamente`,
          'success',
        );
      } else if (response.saved > 0) {
        showSnackbar(`Guardados: ${response.saved}. Con error: ${response.failed}.`, 'success');
      } else {
        showSnackbar('No se pudo guardar el producto', 'error');
      }
    } catch (error: any) {
      showSnackbar(error?.message || 'No se pudieron guardar los productos', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentProduct = items[processingIndex];
  const selectedFieldLabels = useMemo(
    () => FIELD_OPTIONS.filter((option) => fields.includes(option.id)).map((option) => option.title),
    [fields],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        {STEPS.map((item, index) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
                  active
                    ? 'bg-black text-white border-black'
                    : done
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                <span>{item.id}</span>
                <span>{item.label}</span>
              </div>
              {index < STEPS.length - 1 && <span className="text-gray-300 text-xs">—</span>}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <section className="space-y-4">
          <p className="text-xs text-gray-600">
            {items.length} producto{items.length === 1 ? '' : 's'} listos para completar con IA.
          </p>
          <ProductPreviewTable items={items} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <p className="text-xs text-gray-600">
            Marca solo lo que quieras buscar. Lo que no esté seleccionado no se consulta ni se modifica.
          </p>
          <p className="text-[11px] text-gray-500">
            {fields.length === 0
              ? 'Ningún campo seleccionado.'
              : `Se buscará solo: ${selectedFieldLabels.join(', ')}.`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FIELD_OPTIONS.map((option) => {
              const checked = fields.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer ${
                    checked ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleField(option.id)}
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <span>
                    <span className="block text-xs font-medium text-gray-900">{option.title}</span>
                    <span className="block text-[11px] text-gray-500 mt-1">{option.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={fields.length === 0}
              onClick={() => {
                setDrafts([]);
                setProcessingIndex(0);
                setStep(3);
              }}
              className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
            >
              Empezar con IA
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="min-h-[360px] flex flex-col items-center justify-center text-center px-6">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-6 text-left shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-black" />
              </span>
              <p className="text-xs text-gray-500">AGORA IA está trabajando</p>
            </div>
            <p className="text-sm text-gray-900">
              {currentProduct ? `Revisando ${currentProduct.name}` : 'Preparando consulta'}
              {currentProduct?.sku ? ` · SKU ${currentProduct.sku}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-2 min-h-[1.25rem]">{thinkingLine}</p>
            <div className="mt-4 flex items-end gap-1 h-4">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:120ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:240ms]" />
            </div>
            <p className="text-[11px] text-gray-400 mt-4">
              Producto {Math.min(processingIndex + 1, items.length)} de {items.length}
              {selectedFieldLabels.length > 0 ? ` · ${selectedFieldLabels.join(', ')}` : ''}
            </p>
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-black transition-all"
                style={{ width: `${Math.round(((processingIndex + 0.35) / Math.max(items.length, 1)) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <p className="text-xs text-gray-600">
            Marca solo los productos que quieras guardar. Si hay advertencia, quedan fuera hasta que los aceptes.
          </p>
          <p className="text-[11px] text-gray-500">
            {selectedDrafts.length} de {drafts.length} seguirán el proceso
            {discardedCount > 0 ? ` · ${discardedCount} se descartan` : ''}.
          </p>
          {drafts.map((draft) => (
            <ResultCard
              key={draft.product_id}
              draft={draft}
              onChange={(patch) => updateDraft(draft.product_id, patch)}
            />
          ))}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Elegir otros campos
            </button>
            <button
              type="button"
              disabled={selectedDrafts.length === 0}
              onClick={() => setStep(5)}
              className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
            >
              Continuar con {selectedDrafts.length} seleccionado{selectedDrafts.length === 1 ? '' : 's'}
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="space-y-4">
          <p className="text-xs text-gray-600">
            Solo estos productos se guardarán. Los no marcados en Resultados ya no entran.
          </p>
          {selectedDrafts.map((draft) => (
            <EditCard
              key={draft.product_id}
              draft={draft}
              categories={categories}
              onChange={(patch) => updateDraft(draft.product_id, patch)}
            />
          ))}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              Atrás
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/products')}
                className="px-4 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Volver al catálogo
              </button>
              <button
                type="button"
                disabled={saving || selectedDrafts.length === 0}
                onClick={handleSave}
                className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : `Guardar ${selectedDrafts.length} producto${selectedDrafts.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </section>
      )}

      {snackbar.open && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-md bg-gray-900 text-white text-xs font-normal shadow-md max-w-md"
          role="status"
          aria-live="polite"
        >
          {snackbar.type === 'success' ? (
            <svg className="w-4 h-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span>{snackbar.message}</span>
        </div>
      )}
    </div>
  );
}

function ProductPreviewTable({ items }: { items: ProductMetadataSelectionItem[] }) {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Imagen</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Producto</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Categoría</th>
            <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Negocio</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((product) => {
            const imageUrl = product.image_url || product.primary_image_url;
            return (
              <tr key={product.id}>
                <td className="px-3 py-2">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-8 w-8 rounded object-cover border border-gray-200" />
                  ) : (
                    <div className="h-8 w-8 rounded border border-gray-200 bg-gray-100" />
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="text-xs font-medium text-gray-900">{product.name}</div>
                  {product.sku && <div className="text-[10px] text-gray-500">SKU: {product.sku}</div>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">{product.category_name || 'Sin categoría'}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{product.business_name || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultCard({
  draft,
  onChange,
}: {
  draft: EnrichmentDraft;
  onChange: (patch: Partial<EnrichmentDraft>) => void;
}) {
  const hasWarning = draft.warnings?.length > 0;
  const canSelect = !draft.error;

  return (
    <div
      className={`rounded-lg p-4 space-y-3 border ${
        draft.selected
          ? 'border-gray-200 bg-white'
          : hasWarning || draft.error
            ? 'border-amber-200 bg-amber-50/40'
            : 'border-gray-200 bg-gray-50'
      }`}
    >
      <label className={`flex items-start gap-3 ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
        <input
          type="checkbox"
          checked={draft.selected}
          disabled={!canSelect}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="mt-0.5 rounded border-gray-300"
        />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-gray-900">{draft.original_name}</span>
          {draft.sku && <span className="block text-[10px] text-gray-500">SKU: {draft.sku}</span>}
          {!draft.selected && (
            <span className="block text-[11px] text-amber-800 mt-1">
              {draft.error
                ? 'Se descarta por error.'
                : hasWarning
                  ? 'Se descarta por advertencia. Márcalo solo si quieres continuar con este resultado.'
                  : 'No se guardará.'}
            </span>
          )}
        </span>
      </label>
      {draft.error ? (
        <p className="text-xs text-red-600">{draft.error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {draft.fields.includes('photography') && (draft.image_options?.length || draft.image_url) && (
            <div className="md:col-span-2">
              <ImageChoicePicker draft={draft} onChange={onChange} />
            </div>
          )}
          {draft.fields.includes('name') && (
            <FieldBlock label="Nombre" value={draft.name} />
          )}
          {draft.fields.includes('description') && (
            <FieldBlock label="Descripción" value={draft.description} />
          )}
          {draft.fields.includes('category') && (
            <FieldBlock label="Categoría" value={draft.category_name || 'Sin coincidencia'} />
          )}
          {draft.fields.includes('shipping') && (
            <FieldBlock
              label="Envío estimado"
              value={
                draft.shipping
                  ? `${draft.shipping.weight_kg ?? '—'} kg · ${draft.shipping.length_cm ?? '—'} × ${draft.shipping.width_cm ?? '—'} × ${draft.shipping.height_cm ?? '—'} cm`
                  : '—'
              }
            />
          )}
          {draft.fields.includes('compatibility') && (
            <div className="md:col-span-2">
              <p className="text-[10px] uppercase text-gray-500 mb-1">Compatibilidad</p>
              {draft.compatibility?.is_universal ? (
                <p className="text-xs text-gray-700">Universal</p>
              ) : draft.compatibility?.items?.length ? (
                <ul className="text-xs text-gray-700 space-y-1">
                  {draft.compatibility.items.map((item, index) => (
                    <li key={`${item.make}-${item.model}-${index}`}>
                      {item.make} {item.model} {item.year_start}
                      {item.year_end && item.year_end !== item.year_start ? `-${item.year_end}` : ''}
                      {item.source ? ` · ${item.source}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-400">
                  {draft.compatibility?.notes || 'No se confirmó una aplicación exacta.'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {draft.warnings?.length > 0 && (
        <p className="text-[11px] text-amber-700">{draft.warnings.join(' ')}</p>
      )}
      {draft.sources?.length ? (
        <p className="text-[10px] text-gray-400 break-all">
          Fuente: {draft.sources.slice(0, 2).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

function EditCard({
  draft,
  categories,
  onChange,
}: {
  draft: EnrichmentDraft;
  categories: CategoryOption[];
  onChange: (patch: Partial<EnrichmentDraft>) => void;
}) {
  if (draft.error) {
    return (
      <div className="border border-red-200 rounded-lg p-4">
        <p className="text-xs font-medium text-gray-900">{draft.original_name}</p>
        <p className="text-xs text-red-600 mt-1">{draft.error}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-900">{draft.original_name}</p>
        {draft.sku && <p className="text-[10px] text-gray-500">SKU: {draft.sku}</p>}
      </div>

      {draft.fields.includes('photography') && (draft.image_options?.length || draft.image_url) && (
        <ImageChoicePicker draft={draft} onChange={onChange} />
      )}

      {draft.fields.includes('name') && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Nombre</label>
          <input
            type="text"
            value={draft.name || ''}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded"
          />
        </div>
      )}

      {draft.fields.includes('description') && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Descripción</label>
          <textarea
            rows={4}
            value={draft.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded"
          />
        </div>
      )}

      {draft.fields.includes('category') && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Categoría</label>
          <select
            value={draft.category_id || ''}
            onChange={(e) => {
              const category = categories.find((c) => c.id === e.target.value);
              onChange({
                category_id: e.target.value || null,
                category_name: category?.name || null,
              });
            }}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded"
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {draft.fields.includes('shipping') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['weight_kg', 'Peso (kg)'],
            ['length_cm', 'Largo (cm)'],
            ['width_cm', 'Ancho (cm)'],
            ['height_cm', 'Alto (cm)'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={(draft.shipping as any)?.[key] ?? ''}
                onChange={(e) =>
                  onChange({
                    shipping: {
                      weight_kg: draft.shipping?.weight_kg ?? null,
                      length_cm: draft.shipping?.length_cm ?? null,
                      width_cm: draft.shipping?.width_cm ?? null,
                      height_cm: draft.shipping?.height_cm ?? null,
                      estimated: true,
                      [key]: e.target.value === '' ? null : Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded"
              />
            </div>
          ))}
        </div>
      )}

      {draft.fields.includes('compatibility') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">Compatibilidad</label>
            <label className="text-[11px] text-gray-500 flex items-center gap-1">
              <input
                type="checkbox"
                checked={Boolean(draft.compatibility?.is_universal)}
                onChange={(e) =>
                  onChange({
                    compatibility: {
                      is_universal: e.target.checked,
                      items: e.target.checked ? [] : draft.compatibility?.items || [],
                    },
                  })
                }
              />
              Universal
            </label>
          </div>
          {(draft.compatibility?.items || []).map((item, index) => (
            <div key={`${item.make}-${index}`} className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                value={item.make}
                onChange={(e) => updateCompatItem(draft, index, { make: e.target.value }, onChange)}
                placeholder="Marca"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded"
              />
              <input
                value={item.model}
                onChange={(e) => updateCompatItem(draft, index, { model: e.target.value }, onChange)}
                placeholder="Modelo"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded"
              />
              <input
                type="number"
                value={item.year_start || ''}
                onChange={(e) =>
                  updateCompatItem(draft, index, { year_start: Number(e.target.value) || undefined }, onChange)
                }
                placeholder="Año inicio"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded"
              />
              <input
                type="number"
                value={item.year_end || ''}
                onChange={(e) =>
                  updateCompatItem(draft, index, { year_end: Number(e.target.value) || undefined }, onChange)
                }
                placeholder="Año fin"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({
                compatibility: {
                  is_universal: false,
                  items: [...(draft.compatibility?.items || []), { make: '', model: '', year_start: undefined }],
                },
              })
            }
            className="px-3 py-1.5 text-[11px] border border-gray-300 rounded hover:bg-gray-50"
          >
            + Agregar aplicación
          </button>
        </div>
      )}
    </div>
  );
}

function updateCompatItem(
  draft: EnrichmentDraft,
  index: number,
  patch: Partial<CompatibilityItem>,
  onChange: (patch: Partial<EnrichmentDraft>) => void,
) {
  const items = [...(draft.compatibility?.items || [])];
  items[index] = { ...items[index], ...patch };
  onChange({
    compatibility: {
      is_universal: false,
      items,
    },
  });
}

function selectedImageUrls(draft: EnrichmentDraft): string[] {
  if (draft.selected_image_urls?.length) return draft.selected_image_urls;
  if (draft.image_url) return [draft.image_url];
  return [];
}

function ImageChoicePicker({
  draft,
  onChange,
}: {
  draft: EnrichmentDraft;
  onChange: (patch: Partial<EnrichmentDraft>) => void;
}) {
  const options = draft.image_options?.length
    ? draft.image_options
    : draft.image_url
      ? [draft.image_url]
      : [];
  const selected = selectedImageUrls(draft);

  if (options.length === 0) return null;

  const toggleImage = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((url) => url !== option)
      : [...selected, option];
    onChange({
      selected_image_urls: next,
      image_url: next[0] || null,
    });
  };

  return (
    <div>
      <p className="text-[10px] uppercase text-gray-500 mb-1">Fotografía</p>
      <p className="text-[11px] text-gray-500 mb-2">
        Puedes marcar más de una foto. La primera seleccionada queda como principal.
        {selected.length ? ` ${selected.length} seleccionada${selected.length === 1 ? '' : 's'}.` : ''}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
        {options.map((option, index) => {
          const isSelected = selected.includes(option);
          const isPrimary = selected[0] === option;
          return (
            <button
              key={`${draft.product_id}-img-${index}`}
              type="button"
              onClick={() => toggleImage(option)}
              className={`text-left rounded-lg border p-2 ${
                isSelected ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={option}
                alt={`Opción ${index + 1}`}
                referrerPolicy="no-referrer"
                className="h-36 w-full object-contain bg-white"
              />
              <p className="text-[11px] text-gray-600 mt-1">
                Opción {index + 1}
                {isPrimary ? ' · principal' : isSelected ? ' · seleccionada' : ''}
              </p>
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={selected.some((url) => !url.startsWith('data:')) ? selected.find((url) => !url.startsWith('data:')) || '' : ''}
        onChange={(e) => {
          const value = e.target.value.trim();
          const nextOptions = value
            ? Array.from(new Set([...(draft.image_options || options), value]))
            : draft.image_options;
          const nextSelected = value
            ? Array.from(new Set([...selected.filter((url) => url.startsWith('data:') || options.includes(url)), value]))
            : selected.filter((url) => url.startsWith('data:') || options.includes(url));
          onChange({
            image_options: nextOptions,
            selected_image_urls: nextSelected,
            image_url: nextSelected[0] || null,
          });
        }}
        placeholder="O pega otra URL de la foto real"
        className="w-full px-3 py-2 text-xs border border-gray-200 rounded"
      />
    </div>
  );
}

function FieldBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-gray-500 mb-1">{label}</p>
      <p className="text-xs text-gray-800 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  );
}
