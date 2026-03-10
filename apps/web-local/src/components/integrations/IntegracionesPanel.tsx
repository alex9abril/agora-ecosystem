'use client';

import { useState, useEffect } from 'react';
import { businessService } from '@/lib/business';
import { BranchKarbotSettings as KarbotSettingsForm } from '@/pages/settings/branches';
import { BranchKarlopaySettings as KarlopaySettingsForm } from '@/pages/settings/branches';

export interface IntegracionesPanelProps {
  /** Tipo de contexto: sucursal o grupo (tienda por grupo) */
  contextType?: 'branch' | 'group';
  /** ID de la sucursal (branch) o del grupo empresarial (group). Si no se pasa, se usa businessId. */
  id?: string;
  /** Nombre del contexto para mostrar. Si no se pasa, se usa businessName. */
  contextName?: string;
  onUpdated?: () => void;
  /** ID del negocio (sucursal). Compatibilidad: usar id + contextName + contextType cuando sea grupo. */
  businessId?: string;
  /** Nombre del negocio. Compatibilidad: usar id + contextName + contextType cuando sea grupo. */
  businessName?: string;
}

type ExpandedIntegration = 'karbot' | 'karlopay' | null;

export default function IntegracionesPanel({
  contextType = 'branch',
  id: idProp,
  contextName: contextNameProp,
  onUpdated,
  businessId: businessIdLegacy,
  businessName: businessNameLegacy,
}: IntegracionesPanelProps) {
  const id = idProp ?? businessIdLegacy ?? '';
  const contextName = contextNameProp ?? businessNameLegacy ?? '';
  const [expanded, setExpanded] = useState<ExpandedIntegration>('karlopay'); // Karlopay expandido por defecto para configurar
  const [karbotLoading, setKarbotLoading] = useState(true);
  const [karlopayLoading, setKarlopayLoading] = useState(true);
  const [karbotSummary, setKarbotSummary] = useState<{ enabled: boolean; environment: string } | null>(null);
  const [karlopaySummary, setKarlopaySummary] = useState<{ enabled: boolean; environment: string } | null>(null);

  const loadKarbotSummary = async () => {
    if (!id) return;
    setKarbotLoading(true);
    try {
      const data = contextType === 'group'
        ? await businessService.getGroupKarbotSettings(id)
        : await businessService.getBranchKarbotSettings(id);
      setKarbotSummary({
        enabled: !!data?.enabled,
        environment: data?.environment === 'prod' ? 'Producción' : 'Desarrollo',
      });
    } catch {
      setKarbotSummary({ enabled: false, environment: 'Desarrollo' });
    } finally {
      setKarbotLoading(false);
    }
  };

  const loadKarlopaySummary = async () => {
    if (!id) return;
    setKarlopayLoading(true);
    try {
      const data = contextType === 'group'
        ? await businessService.getGroupKarlopaySettings(id)
        : await businessService.getBranchKarlopaySettings(id);
      setKarlopaySummary({
        enabled: !!data?.enabled,
        environment: data?.environment === 'prod' ? 'Producción' : 'Desarrollo',
      });
    } catch {
      setKarlopaySummary({ enabled: false, environment: 'Desarrollo' });
    } finally {
      setKarlopayLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadKarbotSummary();
    loadKarlopaySummary();
  }, [id, contextType]);

  useEffect(() => {
    if (expanded === null && id) {
      loadKarbotSummary();
      loadKarlopaySummary();
    }
  }, [expanded]);

  const branch = { id, name: contextName };

  if (expanded === 'karbot') {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
        <KarbotSettingsForm
          branch={branch}
          onBack={() => setExpanded(null)}
          onUpdated={() => { onUpdated?.(); loadKarbotSummary(); }}
          backLabel="Cerrar"
          apiMode={contextType}
        />
      </div>
    );
  }

  if (expanded === 'karlopay') {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
        <KarlopaySettingsForm
          branch={branch}
          onBack={() => setExpanded(null)}
          onUpdated={() => { onUpdated?.(); loadKarlopaySummary(); }}
          backLabel="Cerrar"
          apiMode={contextType}
        />
      </div>
    );
  }

  const contextLabel = contextType === 'group' ? 'del grupo' : 'de la sucursal';
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-neutral-400">
        Integraciones {contextLabel} <strong>{contextName}</strong>. Abre &quot;Configurar&quot; para editar credenciales y opciones.
      </p>
      <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400">
          <span className="w-32">Integración</span>
          <span className="flex-1">Descripción</span>
          <span className="w-36">Estado</span>
          <span className="w-24 text-right">Acción</span>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-neutral-700">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-neutral-800/30">
            <div className="w-32 shrink-0">
              <span className="font-medium text-gray-900 dark:text-gray-100">Karbot</span>
            </div>
            <div className="flex-1 text-sm text-gray-600 dark:text-neutral-400">
              WhatsApp y chatbot
            </div>
            <div className="w-36 shrink-0 text-sm">
              {karbotLoading ? (
                <span className="text-gray-500 dark:text-neutral-400">Cargando...</span>
              ) : karbotSummary ? (
                <>
                  {karbotSummary.enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Habilitado</span>
                  ) : (
                    <span className="text-gray-500 dark:text-neutral-400">Deshabilitado</span>
                  )}
                  <span className="text-gray-400 dark:text-neutral-500"> · </span>
                  <span className="text-gray-600 dark:text-neutral-300">{karbotSummary.environment}</span>
                </>
              ) : null}
            </div>
            <div className="w-24 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setExpanded('karbot')}
                className="px-3 py-1.5 text-sm font-normal text-white bg-black rounded-md hover:bg-gray-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200 transition-colors"
              >
                Configurar
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-neutral-800/30">
            <div className="w-32 shrink-0">
              <span className="font-medium text-gray-900 dark:text-gray-100">Karlopay</span>
            </div>
            <div className="flex-1 text-sm text-gray-600 dark:text-neutral-400">
              Pagos
            </div>
            <div className="w-36 shrink-0 text-sm">
              {karlopayLoading ? (
                <span className="text-gray-500 dark:text-neutral-400">Cargando...</span>
              ) : karlopaySummary ? (
                <>
                  {karlopaySummary.enabled ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Habilitado</span>
                  ) : (
                    <span className="text-gray-500 dark:text-neutral-400">Deshabilitado</span>
                  )}
                  <span className="text-gray-400 dark:text-neutral-500"> · </span>
                  <span className="text-gray-600 dark:text-neutral-300">{karlopaySummary.environment}</span>
                </>
              ) : null}
            </div>
            <div className="w-24 shrink-0 text-right">
              <button
                type="button"
                onClick={() => setExpanded('karlopay')}
                className="px-3 py-1.5 text-sm font-normal text-white bg-black rounded-md hover:bg-gray-800 dark:bg-neutral-100 dark:text-black dark:hover:bg-neutral-200 transition-colors"
              >
                Configurar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
