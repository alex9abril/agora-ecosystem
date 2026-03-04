'use client';

import { useState, useEffect } from 'react';
import { businessService } from '@/lib/business';
import type { BranchNotificationSetting, BranchNotificationType } from '@/lib/business';

const DEFAULT_NOTIFICATION_SETTINGS: BranchNotificationSetting[] = [
  { notification_type: 'user_registration', email_enabled: false, whatsapp_enabled: false },
  { notification_type: 'order_confirmation', email_enabled: false, whatsapp_enabled: false },
  { notification_type: 'order_status_change', email_enabled: false, whatsapp_enabled: false },
];

const NOTIFICATION_OPTIONS: Array<{
  type: BranchNotificationType;
  title: string;
  description: string;
}> = [
  { type: 'user_registration', title: 'Bienvenida', description: 'Se envía cuando un usuario se registra.' },
  { type: 'order_confirmation', title: 'Confirmación de pedido', description: 'Se envía cuando el pedido queda confirmado.' },
  { type: 'order_status_change', title: 'Cambio de estatus del pedido', description: 'Se envía cada vez que cambia el estatus del pedido.' },
];

export interface NotificationSettingsPanelProps {
  /** 'branch' = sucursal (business_id), 'group' = grupo (business_group_id) */
  mode: 'branch' | 'group';
  /** ID de la sucursal o del grupo según mode */
  id: string;
  /** Nombre del contexto para mostrar en la UI */
  contextName: string;
  onUpdated?: () => void;
}

export default function NotificationSettingsPanel({ mode, id, contextName, onUpdated }: NotificationSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BranchNotificationSetting[]>(DEFAULT_NOTIFICATION_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response =
        mode === 'branch'
          ? await businessService.getBranchNotificationSettings(id)
          : await businessService.getGroupNotificationSettings(id);
      const byType = new Map<string, BranchNotificationSetting>();
      (response || []).forEach((item: BranchNotificationSetting) => {
        byType.set(item.notification_type, item);
      });
      const merged = DEFAULT_NOTIFICATION_SETTINGS.map((item) => ({
        ...item,
        ...(byType.get(item.notification_type) || {}),
      }));
      setSettings(merged);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo cargar la configuración de notificaciones.';
      setError(message);
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [mode, id]);

  const saveSettings = async (nextSettings: BranchNotificationSetting[]) => {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'branch') {
        await businessService.updateBranchNotificationSettings(id, nextSettings);
      } else {
        await businessService.updateGroupNotificationSettings(id, nextSettings);
      }
      onUpdated?.();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'No se pudo guardar la configuración de notificaciones.';
      setError(message);
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (
    type: BranchNotificationType,
    channel: 'email_enabled' | 'whatsapp_enabled',
    value: boolean,
  ) => {
    const nextSettings = settings.map((item) =>
      item.notification_type === type ? { ...item, [channel]: value } : item,
    );
    setSettings(nextSettings);
    saveSettings(nextSettings);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-neutral-400">
        Cargando configuración de notificaciones...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">Notificaciones</h3>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-0.5">
          Define los canales por los que se enviarán las notificaciones para <strong>{contextName}</strong>.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
        Los templates de correo ya existen para estas notificaciones. Aquí solo defines los canales por los que se enviarán.
      </div>

      <div className="space-y-3">
        {NOTIFICATION_OPTIONS.map((option) => {
          const config = settings.find((item) => item.notification_type === option.type);
          const emailEnabled = config?.email_enabled ?? false;
          const whatsappEnabled = config?.whatsapp_enabled ?? false;

          return (
            <div
              key={option.type}
              className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.title}</p>
                <p className="text-xs text-gray-600 dark:text-neutral-400 mt-0.5">{option.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    disabled={saving}
                    onChange={(e) => updateChannel(option.type, 'email_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-black focus:ring-black dark:focus:ring-neutral-300 disabled:opacity-50"
                  />
                  Correo
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    disabled={saving}
                    onChange={(e) => updateChannel(option.type, 'whatsapp_enabled', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 dark:border-neutral-600 text-black focus:ring-black dark:focus:ring-neutral-300 disabled:opacity-50"
                  />
                  WhatsApp
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {saving && (
        <p className="text-xs text-gray-500 dark:text-neutral-400">Guardando...</p>
      )}
    </div>
  );
}
