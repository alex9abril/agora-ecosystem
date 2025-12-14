import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { settingsService, type SiteSetting, type TaxSettings } from '@/lib/settings';
import { useAuth } from '@/contexts/AuthContext';
import IntegrationsSection from '@/components/settings/IntegrationsSection';
// Iconos SVG inline (sin dependencia externa)
const InformationCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type SettingsCategory = 'taxes' | 'storefront' | 'delivery' | 'notifications' | 'general' | 'integrations';

interface CategoryInfo {
  id: SettingsCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const categories: CategoryInfo[] = [
  {
    id: 'taxes',
    name: 'Impuestos',
    description: 'Configuración de cómo se aplican y muestran los impuestos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'storefront',
    name: 'Storefront',
    description: 'Configuración de la tienda en línea',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  },
  {
    id: 'delivery',
    name: 'Entrega',
    description: 'Configuración de entregas y envíos',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    name: 'Notificaciones',
    description: 'Configuración de notificaciones y alertas',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'general',
    name: 'General',
    description: 'Configuraciones generales del sistema',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'integrations',
    name: 'Integraciones',
    description: 'Configuración de métodos de pago y proveedores de logística',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const { token } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>('taxes');
  const [settings, setSettings] = useState<Record<string, SiteSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cargar configuraciones
  useEffect(() => {
    if (!token) return;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await settingsService.getAll();
        setSettings(data);
        // Debug: Verificar que los settings de integrations se están cargando
        if (data.integrations) {
          const redirectUrlSettings = data.integrations.filter(s => s.key.includes('redirect_url'));
          console.log('[SettingsPage] Settings de integrations cargados:', data.integrations.length);
          console.log('[SettingsPage] Settings redirect_url encontrados:', redirectUrlSettings.length, redirectUrlSettings);
        }
      } catch (error: any) {
        console.error('Error cargando configuraciones:', error);
        alert('Error al cargar las configuraciones');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // Guardar configuración (con debounce para inputs de texto)
  const handleSaveSetting = async (key: string, value: any, immediate: boolean = false) => {
    if (!token) return;

    // Obtener valor original antes de actualizar
    let originalValue: any = null;
    Object.keys(settings).forEach((category) => {
      const setting = settings[category as SettingsCategory]?.find((s) => s.key === key);
      if (setting) {
        originalValue = setting.value;
      }
    });

    // Actualizar estado local inmediatamente
    setSettings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((category) => {
        updated[category] = updated[category].map((setting) =>
          setting.key === key ? { ...setting, value } : setting
        );
      });
      return updated;
    });

    // Para checkboxes y selects, guardar inmediatamente
    if (immediate) {
      setSaving(true);
      setSaveSuccess(false);
      setErrors({});

      try {
        await settingsService.updateByKey(key, { value });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (error: any) {
        console.error('Error guardando configuración:', error);
        setErrors({ [key]: error.message || 'Error al guardar la configuración' });
        setTimeout(() => setErrors({}), 5000);
        
        // Revertir cambio en caso de error
        if (originalValue !== null) {
          setSettings((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((category) => {
              updated[category] = updated[category].map((setting) =>
                setting.key === key ? { ...setting, value: originalValue } : setting
              );
            });
            return updated;
          });
        }
      } finally {
        setSaving(false);
      }
    } else {
      // Para inputs de texto, usar debounce
      setPendingChanges((prev) => ({ ...prev, [key]: value }));
      
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      const timeout = setTimeout(async () => {
        setSaving(true);
        setSaveSuccess(false);
        setErrors({});

        try {
          await settingsService.updateByKey(key, { value });
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
          setPendingChanges((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        } catch (error: any) {
          console.error('Error guardando configuración:', error);
          setErrors({ [key]: error.message || 'Error al guardar la configuración' });
          setTimeout(() => setErrors({}), 5000);
          
          // Revertir cambio en caso de error
          if (originalValue !== null) {
            setSettings((prev) => {
              const updated = { ...prev };
              Object.keys(updated).forEach((category) => {
                updated[category] = updated[category].map((setting) =>
                  setting.key === key ? { ...setting, value: originalValue } : setting
                );
              });
              return updated;
            });
          }
        } finally {
          setSaving(false);
        }
      }, 1000); // Esperar 1 segundo después del último cambio

      setSaveTimeout(timeout);
    }
  };

  // Renderizar campo según tipo
  const renderSettingField = (setting: SiteSetting) => {
    const error = errors[setting.key];
    const hasError = !!error;

    switch (setting.value_type) {
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={setting.value === true}
                onChange={(e) => handleSaveSetting(setting.key, e.target.checked, true)}
                disabled={saving}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {setting.label}
                {setting.description && (
                  <span className="text-gray-500 ml-2">({setting.description})</span>
                )}
              </span>
            </label>
            {setting.help_text && (
              <p className="text-xs text-gray-500 ml-7">{setting.help_text}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-600 ml-7 flex items-center">
                <XCircleIcon className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}
          </div>
        );

      case 'string':
        const validation = setting.validation as any;
        const isSelect = validation?.options && Array.isArray(validation.options);

        if (isSelect) {
          return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {setting.label}
              </label>
              {setting.description && (
                <p className="text-xs text-gray-500 mb-1">{setting.description}</p>
              )}
              <select
                value={setting.value || ''}
                onChange={(e) => handleSaveSetting(setting.key, e.target.value, true)}
                disabled={saving}
                className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 ${
                  hasError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
              >
                {validation.options.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {setting.help_text && (
                <p className="text-xs text-gray-500">{setting.help_text}</p>
              )}
              {hasError && (
                <p className="text-xs text-red-600 flex items-center">
                  <XCircleIcon className="w-4 h-4 mr-1" />
                  {error}
                </p>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            {setting.description && (
              <p className="text-xs text-gray-500 mb-1">{setting.description}</p>
            )}
            <input
              type="text"
              value={setting.value || ''}
              onChange={(e) => handleSaveSetting(setting.key, e.target.value, false)}
              disabled={saving}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {setting.help_text && (
              <p className="text-xs text-gray-500">{setting.help_text}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-600 flex items-center">
                <XCircleIcon className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            {setting.description && (
              <p className="text-xs text-gray-500 mb-1">{setting.description}</p>
            )}
            <input
              type="number"
              value={setting.value || 0}
              onChange={(e) => handleSaveSetting(setting.key, parseFloat(e.target.value) || 0, false)}
              disabled={saving}
              min={(setting.validation as any)?.min}
              max={(setting.validation as any)?.max}
              step="0.01"
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {setting.help_text && (
              <p className="text-xs text-gray-500">{setting.help_text}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-600 flex items-center">
                <XCircleIcon className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {setting.label}
            </label>
            {setting.description && (
              <p className="text-xs text-gray-500 mb-1">{setting.description}</p>
            )}
            <textarea
              value={JSON.stringify(setting.value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleSaveSetting(setting.key, parsed, false);
                } catch {
                  // Ignorar errores de parsing mientras el usuario escribe
                }
              }}
              disabled={saving}
              rows={4}
              className={`w-full px-3 py-2 border rounded text-sm font-mono focus:outline-none focus:ring-1 ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
              }`}
            />
            {setting.help_text && (
              <p className="text-xs text-gray-500">{setting.help_text}</p>
            )}
            {hasError && (
              <p className="text-xs text-red-600 flex items-center">
                <XCircleIcon className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  const categorySettings = settings[selectedCategory] || [];

  return (
    <>
      <Head>
        <title>Configuración - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-normal text-gray-900 mb-2">Configuración</h1>
            <p className="text-sm text-gray-600">
              Gestiona las configuraciones generales del sistema
            </p>
          </div>

          {saveSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
              Configuración guardada exitosamente
            </div>
          )}

          {saving && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 flex items-center">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Guardando cambios...
            </div>
          )}

          {Object.keys(pendingChanges).length > 0 && !saving && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2 text-yellow-500" />
              Cambios pendientes de guardar...
            </div>
          )}

          <div className="flex gap-6">
            {/* Sidebar: Categorías */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-sm font-medium text-gray-900 mb-4">Categorías</h2>
                <nav className="space-y-1">
                  {categories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    const hasSettings = settings[category.id] && settings[category.id].length > 0;

                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm flex items-center space-x-2 transition-colors ${
                          isSelected
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={isSelected ? 'text-gray-900' : 'text-gray-400'}>
                          {category.icon}
                        </span>
                        <span className="flex-1">{category.name}</span>
                        {hasSettings && (
                          <span className="text-xs text-gray-400">
                            {settings[category.id].length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Contenido: Configuraciones de la categoría seleccionada */}
            <div className="flex-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="text-sm text-gray-500 mt-4">Cargando configuraciones...</p>
                  </div>
                ) : selectedCategory === 'integrations' ? (
                  <IntegrationsSection
                    settings={categorySettings}
                    onUpdate={handleSaveSetting}
                    saving={saving}
                  />
                ) : categorySettings.length === 0 ? (
                  <div className="text-center py-12">
                    <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">
                      No hay configuraciones disponibles para esta categoría
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-1">
                        {categories.find((c) => c.id === selectedCategory)?.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {categories.find((c) => c.id === selectedCategory)?.description}
                      </p>
                    </div>

                    <div className="space-y-8 border-t border-gray-200 pt-6">
                      {categorySettings.map((setting) => (
                        <div key={setting.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="space-y-3">
                            {renderSettingField(setting)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

