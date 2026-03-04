'use client';

import { useState, useEffect } from 'react';
import { businessService, BranchTaxSettings } from '@/lib/business';

const TAX_DEFAULTS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

const TAX_FIELDS: { key: keyof BranchTaxSettings; label: string; description?: string; helpText?: string }[] = [
  {
    key: 'included_in_price',
    label: 'Impuestos incluidos en precio',
    description: 'Define si los impuestos ya están incluidos en el precio base de los productos o se agregan al mostrar.',
    helpText: 'Si está activado, el precio mostrado ya incluye impuestos. Si está desactivado, los impuestos se calculan y se agregan al precio base.',
  },
];

export interface TaxSettingsPanelProps {
  businessId: string;
  businessName: string;
  onUpdated?: () => void;
}

export default function TaxSettingsPanel({ businessId, businessName, onUpdated }: TaxSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof BranchTaxSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taxSettings, setTaxSettings] = useState<BranchTaxSettings>(TAX_DEFAULTS);

  const loadTaxSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessService.getBranchTaxSettings(businessId);
      setTaxSettings({
        ...TAX_DEFAULTS,
        included_in_price: response?.included_in_price ?? TAX_DEFAULTS.included_in_price,
      });
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la configuración de impuestos.');
      setTaxSettings(TAX_DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxSettings();
  }, [businessId]);

  const handleToggle = async (key: keyof BranchTaxSettings, value: boolean) => {
    const previous = { ...taxSettings };
    const nextState = { ...taxSettings, [key]: value };
    setTaxSettings(nextState);
    setSavingKey(key);
    setError(null);
    try {
      const updated = await businessService.updateBranchTaxSettings(businessId, { [key]: value });
      setTaxSettings(updated || TAX_DEFAULTS);
      onUpdated?.();
    } catch (err: any) {
      setTaxSettings(previous);
      setError(err?.message || 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-neutral-400">
        Configuración de impuestos para <strong>{businessName}</strong>. Solo afecta a esta sucursal.
      </p>
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      ) : (
        <div className="space-y-4">
          {TAX_FIELDS.map((field) => {
            const isDisabled = savingKey === field.key;
            return (
              <div
                key={field.key}
                className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-4 border border-gray-200 dark:border-neutral-600"
              >
                <label className={`flex items-start gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-black dark:text-white focus:ring-black"
                    checked={!!taxSettings[field.key]}
                    onChange={(e) => handleToggle(field.key, e.target.checked)}
                    disabled={isDisabled}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
                    {field.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{field.description}</p>
                    )}
                    {field.helpText && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{field.helpText}</p>
                    )}
                  </div>
                  {savingKey === field.key && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
                      Guardando...
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
