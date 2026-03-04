import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  businessService,
  Business,
  CreateBusinessData,
  BusinessCategory,
  BranchTaxSettings,
} from '@/lib/business';
import type { BranchKarbotSettings, BranchKarlopaySettings, BranchNotificationSetting, BranchNotificationType } from '@/lib/business';
import LocationMapPicker from '@/components/LocationMapPicker';
import BrandingManager from '@/components/branding/BrandingManager';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

export default function BranchesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Business | null>(null);
  const [brandingBranch, setBrandingBranch] = useState<Business | null>(null);
  const [settingsPreviewBranch, setSettingsPreviewBranch] = useState<Business | null>(null);
  const [karbotBranch, setKarbotBranch] = useState<Business | null>(null);
  const [karlopayBranch, setKarlopayBranch] = useState<Business | null>(null);
  const [notificationBranch, setNotificationBranch] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadBranches();
    }
  }, [user]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      const allBranches = await businessService.getAllBranches(user.id);
      setBranches(allBranches);
    } catch (err: any) {
      console.error('Error cargando sucursales:', err);
      setError(err.message || 'Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (formData: CreateBusinessData, selectedBrandIds: string[] = []) => {
    try {
      setSaving(true);
      const newBusiness = await businessService.createBusiness(formData);
      
      // Agregar las marcas seleccionadas después de crear la sucursal
      if (selectedBrandIds.length > 0 && newBusiness?.id) {
        try {
          for (const brandId of selectedBrandIds) {
            await businessService.addVehicleBrandToBusiness(newBusiness.id, brandId);
          }
        } catch (brandError: any) {
          console.error('Error agregando marcas a la sucursal:', brandError);
          // No fallar la creación si hay error al agregar marcas, solo mostrar advertencia
          alert('Sucursal creada exitosamente, pero hubo un error al asignar algunas marcas. Puedes editarlas después.');
        }
      }
      
      await loadBranches();
      setShowAddForm(false);
      setSuccessMessage('Sucursal creada correctamente. Puedes configurar branding, impuestos y marcas desde la lista.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Error creando sucursal:', err);
      const message = err?.message || err?.response?.data?.message || 'Error al crear la sucursal';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranch = async (
    branchId: string,
    formData: CreateBusinessData,
    options?: { timezone?: string; time_format?: '12h' | '24h' }
  ) => {
    try {
      setSaving(true);
      const settings: { timezone?: string; time_format?: '12h' | '24h' } = {};
      if (options?.timezone !== undefined) settings.timezone = options.timezone;
      if (options?.time_format !== undefined) settings.time_format = options.time_format;
      const hasSettings = Object.keys(settings).length > 0;
      // Actualizar información básica (incluyendo settings: timezone y formato de hora)
      await businessService.updateBusiness(branchId, {
        name: formData.name,
        legal_name: formData.legal_name,
        description: formData.description,
        category: formData.category,
        phone: formData.phone,
        email: formData.email,
        website_url: formData.website_url,
        slug: formData.slug,
        accepts_pickup: formData.accepts_pickup,
        is_active: formData.is_active,
        ...(hasSettings && { settings }),
      });
      
      // Actualizar dirección si cambió
      if (formData.longitude && formData.latitude) {
        await businessService.updateAddress(branchId, {
          longitude: formData.longitude,
          latitude: formData.latitude,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        });
      }
      
      await loadBranches();
      setEditingBranch(null);
    } catch (err: any) {
      console.error('Error actualizando sucursal:', err);
      alert(err.message || 'Error al actualizar la sucursal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Sucursales - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50 dark:bg-neutral-900">
          {/* Sidebar: Categorías */}
          <SettingsSidebar />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">Sucursales</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gestiona las sucursales de tu tienda y agrega nuevas ubicaciones
                </p>
              </div>

              {!showAddForm &&
                !editingBranch &&
                !brandingBranch &&
                !settingsPreviewBranch &&
                !karbotBranch &&
                !karlopayBranch &&
                !notificationBranch && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Sucursal
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {successMessage && !showAddForm && (
                <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
                </div>
              )}

              {showAddForm ? (
                <AddBranchForm
                  onSave={handleAddBranch}
                  onCancel={() => setShowAddForm(false)}
                  saving={saving}
                />
              ) : editingBranch ? (
                <EditBranchForm
                  branch={editingBranch}
                  onSave={(formData) => handleUpdateBranch(editingBranch.id, formData)}
                  onCancel={() => setEditingBranch(null)}
                  saving={saving}
                />
              ) : brandingBranch ? (
                <div>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <button
                        onClick={() => setBrandingBranch(null)}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 mb-3 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a sucursales
                      </button>
                      <h2 className="text-xl font-normal text-gray-900 dark:text-gray-100">Personalizacion</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Ajusta logos, colores y mensajes para la sucursal: <strong className="text-gray-900 dark:text-gray-100">{brandingBranch.name}</strong>
                      </p>
                    </div>
                  </div>
                  <BrandingManager type="business" id={brandingBranch.id} name={brandingBranch.name} />
                </div>
              ) : settingsPreviewBranch ? (
                <BranchSettingsPreview
                  branch={settingsPreviewBranch}
                  onBack={() => setSettingsPreviewBranch(null)}
                  onUpdated={loadBranches}
                />
              ) : karbotBranch ? (
                <BranchKarbotSettings
                  branch={karbotBranch}
                  onBack={() => setKarbotBranch(null)}
                  onUpdated={loadBranches}
                />
              ) : karlopayBranch ? (
                <BranchKarlopaySettings
                  branch={karlopayBranch}
                  onBack={() => setKarlopayBranch(null)}
                  onUpdated={loadBranches}
                />
              ) : notificationBranch ? (
                <BranchNotificationSettings
                  branch={notificationBranch}
                  onBack={() => setNotificationBranch(null)}
                />
              ) : (
                <BranchesList 
                  branches={branches} 
                  onRefresh={loadBranches}
                  onEdit={(branch) => {
                    setBrandingBranch(null);
                    setSettingsPreviewBranch(null);
                    setKarbotBranch(null);
                    setKarlopayBranch(null);
                    setNotificationBranch(null);
                    setShowAddForm(false);
                    setEditingBranch(branch);
                  }}
                  onBranding={(branch) => {
                    setSettingsPreviewBranch(null);
                    setKarbotBranch(null);
                    setKarlopayBranch(null);
                    setNotificationBranch(null);
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(branch);
                  }}
                  onPreviewSettings={(branch) => {
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(null);
                    setKarbotBranch(null);
                    setKarlopayBranch(null);
                    setNotificationBranch(null);
                    setSettingsPreviewBranch(branch);
                  }}
                  onKarbotSettings={(branch) => {
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(null);
                    setSettingsPreviewBranch(null);
                    setKarlopayBranch(null);
                    setNotificationBranch(null);
                    setKarbotBranch(branch);
                  }}
                  onKarlopaySettings={(branch) => {
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(null);
                    setSettingsPreviewBranch(null);
                    setKarbotBranch(null);
                    setNotificationBranch(null);
                    setKarlopayBranch(branch);
                  }}
                  onNotificationSettings={(branch) => {
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(null);
                    setSettingsPreviewBranch(null);
                    setKarbotBranch(null);
                    setNotificationBranch(branch);
                  }}
                  onArchive={async (branch, confirmName) => {
                    await businessService.archiveBranch(branch.id, confirmName);
                    await loadBranches();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

interface BranchesListProps {
  branches: Business[];
  onRefresh: () => void;
  onEdit: (branch: Business) => void;
  onBranding?: (branch: Business) => void;
  onPreviewSettings?: (branch: Business) => void;
  onKarbotSettings?: (branch: Business) => void;
  onKarlopaySettings?: (branch: Business) => void;
  onNotificationSettings?: (branch: Business) => void;
  onArchive?: (branch: Business, confirmName: string) => Promise<void>;
}

function BranchesList({
  branches,
  onRefresh,
  onEdit,
  onBranding,
  onPreviewSettings,
  onKarbotSettings,
  onKarlopaySettings,
  onNotificationSettings,
  onArchive,
}: BranchesListProps) {
  const [archiveTarget, setArchiveTarget] = useState<Business | null>(null);
  const [archiveConfirmName, setArchiveConfirmName] = useState('');
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  if (branches.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-4 text-base font-normal text-gray-900 dark:text-gray-100">No hay sucursales</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Comienza agregando tu primera sucursal adicional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {branches.map((branch) => (
        <div
          key={branch.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-normal text-gray-900 dark:text-gray-100">{branch.name}</h3>
              {branch.legal_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{branch.legal_name}</p>
              )}
              {branch.business_address && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {branch.business_address}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal ${
                    branch.is_active
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {branch.is_active ? 'Activa' : 'Inactiva'}
                </span>
                {branch.accepts_orders && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                    Acepta pedidos
                  </span>
                )}
                {branch.accepts_pickup && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                    Acepta recolección
                  </span>
                )}
                {branch.slug && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                    Slug: {branch.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2">
              {onBranding && (
                <button
                  onClick={() => onBranding(branch)}
                  className="px-3 py-1.5 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 rounded hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors"
                >
                  Personalizar
                </button>
              )}
              {onPreviewSettings && (
                <button
                  onClick={() => onPreviewSettings(branch)}
                  className="px-3 py-1.5 text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
                >
                  Impuestos
                </button>
              )}
              {onKarbotSettings && (
                <button
                  onClick={() => onKarbotSettings(branch)}
                  className="px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors"
                >
                  Karbot
                </button>
              )}
              {onKarlopaySettings && (
                <button
                  onClick={() => onKarlopaySettings(branch)}
                  className="px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors"
                >
                  Karlopay
                </button>
              )}
              {onNotificationSettings && (
                <button
                  onClick={() => onNotificationSettings(branch)}
                  className="px-3 py-1.5 text-sm text-white dark:text-black bg-black dark:bg-white rounded hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors"
                >
                  Notificaciones
                </button>
              )}
              <button
                onClick={() => onEdit(branch)}
                className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Editar
              </button>
              {onArchive && (
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTarget(branch);
                    setArchiveConfirmName('');
                    setArchiveError(null);
                  }}
                  className="px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                >
                  Archivar
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
      {archiveTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-normal text-gray-900 dark:text-gray-100 mb-2">Archivar sucursal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Esta acción es irreversible. La sucursal dejará de mostrarse en listados. Escribe el nombre exacto para confirmar:
            </p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">&quot;{archiveTarget.name}&quot;</p>
            <input
              type="text"
              value={archiveConfirmName}
              onChange={(e) => { setArchiveConfirmName(e.target.value); setArchiveError(null); }}
              placeholder="Nombre de la sucursal"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {archiveError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{archiveError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setArchiveTarget(null); setArchiveError(null); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={archiveSubmitting || archiveConfirmName.trim().toLowerCase() !== archiveTarget.name.trim().toLowerCase()}
                onClick={async () => {
                  if (!onArchive || archiveConfirmName.trim().toLowerCase() !== archiveTarget.name.trim().toLowerCase()) return;
                  setArchiveSubmitting(true);
                  setArchiveError(null);
                  try {
                    await onArchive(archiveTarget, archiveConfirmName.trim());
                    setArchiveTarget(null);
                    setArchiveConfirmName('');
                  } catch (err: any) {
                    setArchiveError(err?.message || 'Error al archivar');
                  } finally {
                    setArchiveSubmitting(false);
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {archiveSubmitting ? 'Archivando...' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type TaxSettingField = {
  key: keyof BranchTaxSettings;
  label: string;
  description?: string;
  helpText?: string;
  requiresIncludedInPrice?: boolean;
  disabledMessage?: string;
};

const TAX_SETTING_FIELDS: TaxSettingField[] = [
  {
    key: 'included_in_price',
    label: 'Impuestos Incluidos en Precio',
    description:
      'Define si los impuestos ya estan incluidos en el precio base de los productos o si se deben agregar al precio mostrado.',
    helpText:
      'Si esta activado, el precio mostrado en el storefront ya incluye los impuestos. Si esta desactivado, los impuestos se calcularan y agregaran al precio base al momento de mostrar el producto.',
  },
];

const BRANCH_TAX_DEFAULTS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

interface BranchSettingsPreviewProps {
  branch: Business;
  onBack: () => void;
  onUpdated?: () => void;
}

function BranchSettingsPreview({ branch, onBack, onUpdated }: BranchSettingsPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof BranchTaxSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taxSettings, setTaxSettings] = useState<BranchTaxSettings>(BRANCH_TAX_DEFAULTS);

  const loadTaxSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessService.getBranchTaxSettings(branch.id);
      // Solo usamos included_in_price; las demas opciones estan ocultas/desactivadas
      setTaxSettings({
        ...BRANCH_TAX_DEFAULTS,
        included_in_price: response?.included_in_price ?? BRANCH_TAX_DEFAULTS.included_in_price,
      });
    } catch (err: any) {
      console.error('[BranchSettingsPreview] Error cargando configuracion de impuestos:', err);
      setError(err?.message || 'No se pudo cargar la configuracion de impuestos.');
      setTaxSettings(BRANCH_TAX_DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxSettings();
  }, [branch.id]);

  const handleToggle = async (key: keyof BranchTaxSettings, value: boolean) => {
    const previous = { ...taxSettings };
    const nextState: BranchTaxSettings = { ...taxSettings, [key]: value };
    let payload: Partial<BranchTaxSettings> = { [key]: value };

    setTaxSettings(nextState);
    setSavingKey(key);
    setError(null);

    try {
      const updated = await businessService.updateBranchTaxSettings(branch.id, payload);
      setTaxSettings(updated || BRANCH_TAX_DEFAULTS);
      onUpdated?.();
    } catch (err: any) {
      console.error('[BranchSettingsPreview] Error actualizando impuestos:', err);
      setTaxSettings(previous);
      setError(err?.message || 'No se pudo guardar la configuracion. Intenta de nuevo.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a sucursales
          </button>
          <h2 className="text-xl font-normal text-gray-900">Impuestos</h2>
          <p className="text-sm text-gray-700 mt-1">
            Configura como se aplican los impuestos para <strong>{branch.name}</strong>. Solo afecta a esta sucursal.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
          Configuracion por sucursal
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Impuestos</h3>
            <p className="text-sm text-gray-700">
              Configura solo esta sucursal. Los cambios no afectan a otras sucursales.
            </p>
          </div>
          {savingKey && (
            <span className="text-xs text-indigo-600 flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Guardando...
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4 border-t border-gray-200 pt-4">
              {TAX_SETTING_FIELDS.map((field) => {
                const isDisabled = savingKey === field.key;

                return (
                  <div
                    key={field.key}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <label className={`flex items-start gap-3 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:bg-gray-100"
                        checked={!!taxSettings[field.key]}
                        onChange={(e) => handleToggle(field.key, e.target.checked)}
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{field.label}</p>
                        {field.description && (
                          <p className="text-xs text-gray-700 mt-1">{field.description}</p>
                        )}
                        {field.helpText && (
                          <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface BranchNotificationSettingsProps {
  branch: Business;
  onBack: () => void;
}

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
  {
    type: 'user_registration',
    title: 'Bienvenida',
    description: 'Se envía cuando un usuario se registra.',
  },
  {
    type: 'order_confirmation',
    title: 'Confirmación de pedido',
    description: 'Se envía cuando el pedido queda confirmado.',
  },
  {
    type: 'order_status_change',
    title: 'Cambio de estatus del pedido',
    description: 'Se envía cada vez que cambia el estatus del pedido.',
  },
];

function BranchNotificationSettings({ branch, onBack }: BranchNotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BranchNotificationSetting[]>(DEFAULT_NOTIFICATION_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessService.getBranchNotificationSettings(branch.id);
      const byType = new Map<string, BranchNotificationSetting>();
      response.forEach((item) => {
        byType.set(item.notification_type, item);
      });
      const merged = DEFAULT_NOTIFICATION_SETTINGS.map((item) => ({
        ...item,
        ...(byType.get(item.notification_type) || {}),
      }));
      setSettings(merged);
    } catch (err: any) {
      console.error('[BranchNotificationSettings] Error cargando configuracion de notificaciones:', err);
      setError(err?.message || 'No se pudo cargar la configuracion de notificaciones.');
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [branch.id]);

  const updateChannel = (
    type: BranchNotificationType,
    channel: 'email_enabled' | 'whatsapp_enabled',
    value: boolean,
  ) => {
    setSettings((prev) =>
      prev.map((item) =>
        item.notification_type === type ? { ...item, [channel]: value } : item,
      ),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await businessService.updateBranchNotificationSettings(branch.id, settings);
    } catch (err: any) {
      console.error('[BranchNotificationSettings] Error guardando configuracion de notificaciones:', err);
      setError(err?.message || 'No se pudo guardar la configuracion de notificaciones.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Cargando configuracion de notificaciones...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a sucursales
          </button>
          <h2 className="text-xl font-normal text-gray-900 dark:text-gray-100">Notificaciones</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Define si cada notificación se envía por correo, WhatsApp o ambos para la sucursal:{' '}
            <strong>{branch.name}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-6">
        <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
          Los templates de correo ya existen para estas notificaciones. Aquí solo defines los
          canales por los que se enviarán.
        </div>

        <div className="space-y-4">
          {NOTIFICATION_OPTIONS.map((option) => {
            const config = settings.find((item) => item.notification_type === option.type);
            const emailEnabled = config?.email_enabled ?? false;
            const whatsappEnabled = config?.whatsapp_enabled ?? false;

            return (
              <div
                key={option.type}
                className="border border-gray-200 dark:border-neutral-600 rounded-lg p-4 bg-gray-50 dark:bg-neutral-700/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => updateChannel(option.type, 'email_enabled', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
                    />
                    Correo
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) =>
                        updateChannel(option.type, 'whatsapp_enabled', e.target.checked)
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
                    />
                    WhatsApp
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-normal text-white bg-black rounded-md hover:bg-gray-900 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface BranchKarbotSettingsProps {
  branch: Business | { id: string; name: string };
  onBack: () => void;
  onUpdated?: () => void;
  /** Texto del botón volver (ej. "Cerrar" en Tiendas) */
  backLabel?: string;
  /** Si "group", usa API de grupo (business-groups); si "branch" o no se pasa, usa API de sucursal */
  apiMode?: 'branch' | 'group';
}

const DEFAULT_KARBOT_SETTINGS: BranchKarbotSettings = {
  enabled: false,
  environment: 'dev',
  chatbot_enabled: false,
  whatsapp_enabled: false,
  dev: {
    username: '',
    password: '',
    endpoint: '',
    template_ids: {
      user_registration: '',
      order_confirmation: '',
      order_status_change: '',
    },
  },
  prod: {
    username: '',
    password: '',
    endpoint: '',
    template_ids: {
      user_registration: '',
      order_confirmation: '',
      order_status_change: '',
    },
  },
};

export function BranchKarbotSettings({ branch, onBack, onUpdated, backLabel = 'Volver a sucursales' }: BranchKarbotSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BranchKarbotSettings>(DEFAULT_KARBOT_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await businessService.getBranchKarbotSettings(branch.id);
      setSettings({ ...DEFAULT_KARBOT_SETTINGS, ...response });
    } catch (err: any) {
      console.error('[BranchKarbotSettings] Error cargando configuracion Karbot:', err);
      setError(err?.message || 'No se pudo cargar la configuracion de Karbot.');
      setSettings(DEFAULT_KARBOT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [branch.id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await businessService.updateBranchKarbotSettings(branch.id, settings);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error('[BranchKarbotSettings] Error guardando configuracion Karbot:', err);
      setError(err?.message || 'No se pudo guardar la configuracion de Karbot.');
    } finally {
      setSaving(false);
    }
  };

  const updateEnvField = (env: 'dev' | 'prod', key: 'username' | 'password' | 'endpoint', value: string) => {
    setSettings((prev) => ({
      ...prev,
      [env]: {
        ...prev[env],
        [key]: value,
      },
    }));
  };

  const updateTemplateField = (
    env: 'dev' | 'prod',
    key: 'user_registration' | 'order_confirmation' | 'order_status_change',
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [env]: {
        ...prev[env],
        template_ids: {
          ...(prev[env].template_ids || {}),
          [key]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Cargando configuracion de Karbot...
      </div>
    );
  }

  const isDevMode = settings.environment === 'dev';
  const isActiveMode = settings.enabled && isDevMode;
  const isProdMode = settings.enabled && !isDevMode;
  const activeEndpoint = isDevMode ? settings.dev.endpoint : settings.prod.endpoint;
  const isWhatsappReady = settings.enabled && !!activeEndpoint;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </button>
          <h2 className="text-xl font-normal text-gray-900 dark:text-white">Integracion Karbot</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configura usuario, contraseña y ambiente para la sucursal: <strong>{branch.name}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Karbot</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{settings.enabled ? 'Habilitado' : 'Deshabilitado'}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id="karbot-enabled"
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
            />
            Habilitar
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ambiente</label>
          <select
            value={settings.environment}
            onChange={(e) => setSettings((prev) => ({ ...prev, environment: e.target.value as 'dev' | 'prod' }))}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
          >
            <option value="dev">Desarrollo</option>
            <option value="prod">Producción</option>
          </select>
        </div>

        <div className={`p-3 rounded-lg ${isDevMode ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {isDevMode ? 'Modo Desarrollo' : 'Modo Producción'}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {isDevMode
              ? 'Se usarán las credenciales y endpoints de desarrollo.'
              : 'Se usarán las credenciales y endpoints de producción.'}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Credenciales Desarrollo</h3>
            {isDevMode && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded mb-3">
                ACTIVO
              </span>
            )}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Usuario</label>
                  {isActiveMode && settings.dev.username ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={settings.dev.username || ''}
                  onChange={(e) => updateEnvField('dev', 'username', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                  {isActiveMode && settings.dev.password ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="password"
                  value={settings.dev.password || ''}
                  onChange={(e) => updateEnvField('dev', 'password', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Endpoint</label>
                  {isActiveMode && settings.dev.endpoint ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.dev.endpoint || ''}
                  onChange={(e) => updateEnvField('dev', 'endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://api.karbot.mx"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Bienvenida (user_registration)</label>
                <input
                  type="text"
                  value={settings.dev.template_ids?.user_registration || ''}
                  onChange={(e) => updateTemplateField('dev', 'user_registration', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50"
                  placeholder="UUID del template"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Confirmación (order_confirmation)</label>
                <input
                  type="text"
                  value={settings.dev.template_ids?.order_confirmation || ''}
                  onChange={(e) => updateTemplateField('dev', 'order_confirmation', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50"
                  placeholder="UUID del template"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Cambio Estatus (order_status_change)</label>
                <input
                  type="text"
                  value={settings.dev.template_ids?.order_status_change || ''}
                  onChange={(e) => updateTemplateField('dev', 'order_status_change', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50"
                  placeholder="UUID del template"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Credenciales Produccion</h3>
            {!isDevMode && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded mb-3">
                ACTIVO
              </span>
            )}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Usuario</label>
                  {isProdMode && settings.prod.username ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="text"
                  value={settings.prod.username || ''}
                  onChange={(e) => updateEnvField('prod', 'username', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-200 dark:ring-green-700'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-neutral-600 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 dark:bg-neutral-700'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                  {isProdMode && settings.prod.password ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="password"
                  value={settings.prod.password || ''}
                  onChange={(e) => updateEnvField('prod', 'password', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Endpoint</label>
                  {isProdMode && settings.prod.endpoint ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.prod.endpoint || ''}
                  onChange={(e) => updateEnvField('prod', 'endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://api.karbot.mx"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Bienvenida (user_registration)</label>
                <input
                  type="text"
                  value={settings.prod.template_ids?.user_registration || ''}
                  onChange={(e) => updateTemplateField('prod', 'user_registration', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50"
                  placeholder="UUID del template"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Confirmación (order_confirmation)</label>
                <input
                  type="text"
                  value={settings.prod.template_ids?.order_confirmation || ''}
                  onChange={(e) => updateTemplateField('prod', 'order_confirmation', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50"
                  placeholder="UUID del template"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Template Cambio Estatus (order_status_change)</label>
                <input
                  type="text"
                  value={settings.prod.template_ids?.order_status_change || ''}
                  onChange={(e) => updateTemplateField('prod', 'order_status_change', e.target.value)}
                  className="w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50"
                  placeholder="UUID del template"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settings.chatbot_enabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, chatbot_enabled: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
            />
            <span>
              <span className="block font-medium text-gray-800 dark:text-gray-100">Habilitar chatbot en storefront</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Mostrar el widget del chatbot para los clientes.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settings.whatsapp_enabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, whatsapp_enabled: e.target.checked }))}
              disabled={!isWhatsappReady}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
            />
            <span>
              <span className="block font-medium text-gray-800 dark:text-gray-100">Habilitar notificaciones WhatsApp</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">Notificar cambios de estado de pedidos.</span>
              {!isWhatsappReady && (
                <span className="block text-xs text-red-600 dark:text-red-400 mt-1">
                  Requiere Karbot habilitado y endpoint configurado en el ambiente activo.
                </span>
              )}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-normal text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface BranchKarlopaySettingsProps {
  branch: Business | { id: string; name: string };
  onBack: () => void;
  onUpdated?: () => void;
  /** Texto del botón volver (ej. "Cerrar" en Tiendas) */
  backLabel?: string;
  /** Si "group", usa API de grupo (business-groups); si "branch" o no se pasa, usa API de sucursal */
  apiMode?: 'branch' | 'group';
}

const DEFAULT_KARLOPAY_SETTINGS: BranchKarlopaySettings = {
  enabled: false,
  environment: 'dev',
  dev: {
    domain: '',
    login_endpoint: '',
    orders_endpoint: '',
    auth_email: '',
    auth_password: '',
    redirect_url: '',
  },
  prod: {
    domain: '',
    login_endpoint: '',
    orders_endpoint: '',
    auth_email: '',
    auth_password: '',
    redirect_url: '',
  },
};

export function BranchKarlopaySettings({ branch, onBack, onUpdated, backLabel = 'Volver a sucursales', apiMode = 'branch' }: BranchKarlopaySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<BranchKarlopaySettings>(DEFAULT_KARLOPAY_SETTINGS);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = apiMode === 'group'
        ? await businessService.getGroupKarlopaySettings(branch.id)
        : await businessService.getBranchKarlopaySettings(branch.id);
      setSettings({ ...DEFAULT_KARLOPAY_SETTINGS, ...response });
    } catch (err: any) {
      console.error('[BranchKarlopaySettings] Error cargando configuracion Karlopay:', err);
      setError(err?.message || 'No se pudo cargar la configuracion de Karlopay.');
      setSettings(DEFAULT_KARLOPAY_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [branch.id, apiMode]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      if (apiMode === 'group') {
        await businessService.updateGroupKarlopaySettings(branch.id, settings);
      } else {
        await businessService.updateBranchKarlopaySettings(branch.id, settings);
      }
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error('[BranchKarlopaySettings] Error guardando configuracion Karlopay:', err);
      setError(err?.message || 'No se pudo guardar la configuracion de Karlopay.');
    } finally {
      setSaving(false);
    }
  };

  const updateEnvField = (
    env: 'dev' | 'prod',
    key: 'domain' | 'login_endpoint' | 'orders_endpoint' | 'auth_email' | 'auth_password' | 'redirect_url',
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [env]: {
        ...prev[env],
        [key]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Cargando configuracion de Karlopay...
      </div>
    );
  }

  const isDevMode = settings.environment === 'dev';
  const isActiveMode = settings.enabled && isDevMode;
  const isProdMode = settings.enabled && !isDevMode;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </button>
          <h2 className="text-xl font-normal text-gray-900 dark:text-white">Integracion Karlopay</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configura endpoints y credenciales para la sucursal: <strong>{branch.name}</strong>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-neutral-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">KP</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Karlopay</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{settings.enabled ? 'Habilitado' : 'Deshabilitado'}</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id="karlopay-enabled"
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-neutral-500 rounded"
            />
            Habilitar
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ambiente</label>
          <select
            value={settings.environment}
            onChange={(e) => setSettings((prev) => ({ ...prev, environment: e.target.value as 'dev' | 'prod' }))}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100"
          >
            <option value="dev">Desarrollo</option>
            <option value="prod">Producción</option>
          </select>
        </div>

        <div className={`p-3 rounded-lg ${isDevMode ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {isDevMode ? 'Modo Desarrollo' : 'Modo Producción'}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {isDevMode
              ? 'Se usarán las credenciales y endpoints de desarrollo.'
              : 'Se usarán las credenciales y endpoints de producción.'}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Credenciales Desarrollo</h3>
            {isDevMode && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded mb-3">
                ACTIVO
              </span>
            )}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Dominio</label>
                  {isActiveMode && settings.dev.domain ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.dev.domain || ''}
                  onChange={(e) => updateEnvField('dev', 'domain', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://dev.karlopay.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Login Endpoint</label>
                  {isActiveMode && settings.dev.login_endpoint ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.dev.login_endpoint || ''}
                  onChange={(e) => updateEnvField('dev', 'login_endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://dev.karlopay.com/api/auth/login"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Órdenes Endpoint</label>
                  {isActiveMode && settings.dev.orders_endpoint ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.dev.orders_endpoint || ''}
                  onChange={(e) => updateEnvField('dev', 'orders_endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://dev.karlopay.com/api/orders/create-or-update"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Auth Email</label>
                  {isActiveMode && settings.dev.auth_email ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="email"
                  value={settings.dev.auth_email || ''}
                  onChange={(e) => updateEnvField('dev', 'auth_email', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Auth Password</label>
                  {isActiveMode && settings.dev.auth_password ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : isActiveMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="password"
                  value={settings.dev.auth_password || ''}
                  onChange={(e) => updateEnvField('dev', 'auth_password', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Redirect URL</label>
                  {isActiveMode && settings.dev.redirect_url ? (
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">✓ En uso</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.dev.redirect_url || ''}
                  onChange={(e) => updateEnvField('dev', 'redirect_url', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isActiveMode
                      ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 ring-2 ring-yellow-200'
                      : isDevMode
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://example.com/payment/redirect"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Credenciales Produccion</h3>
            {!isDevMode && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded mb-3">
                ACTIVO
              </span>
            )}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Dominio</label>
                  {isProdMode && settings.prod.domain ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.prod.domain || ''}
                  onChange={(e) => updateEnvField('prod', 'domain', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://karlopay.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Login Endpoint</label>
                  {isProdMode && settings.prod.login_endpoint ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.prod.login_endpoint || ''}
                  onChange={(e) => updateEnvField('prod', 'login_endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://karlopay.com/api/auth/login"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Órdenes Endpoint</label>
                  {isProdMode && settings.prod.orders_endpoint ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.prod.orders_endpoint || ''}
                  onChange={(e) => updateEnvField('prod', 'orders_endpoint', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://karlopay.com/api/orders/create-or-update"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Auth Email</label>
                  {isProdMode && settings.prod.auth_email ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="email"
                  value={settings.prod.auth_email || ''}
                  onChange={(e) => updateEnvField('prod', 'auth_email', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Auth Password</label>
                  {isProdMode && settings.prod.auth_password ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : isProdMode ? (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠ Requerido</span>
                  ) : null}
                </div>
                <input
                  type="password"
                  value={settings.prod.auth_password || ''}
                  onChange={(e) => updateEnvField('prod', 'auth_password', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Redirect URL</label>
                  {isProdMode && settings.prod.redirect_url ? (
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium">✓ En uso</span>
                  ) : null}
                </div>
                <input
                  type="url"
                  value={settings.prod.redirect_url || ''}
                  onChange={(e) => updateEnvField('prod', 'redirect_url', e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded focus:outline-none focus:ring-1 font-mono ${
                    isProdMode
                      ? 'border-green-400 focus:border-green-500 focus:ring-green-500 bg-green-50 ring-2 ring-green-200'
                      : !isDevMode
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50'
                  }`}
                  placeholder="https://example.com/payment/redirect"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-normal text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddBranchFormProps {
  onSave: (data: CreateBusinessData, selectedBrandIds?: string[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

// Función helper para generar slug desde un texto (normaliza acentos/diacríticos)
const generateSlug = (text: string): string => {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

function AddBranchForm({ onSave, onCancel, saving }: AddBranchFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateBusinessData>({
    name: '',
    legal_name: '',
    description: '',
    category: '',
    phone: '',
    email: '',
    longitude: -99.1332, // CDMX por defecto
    latitude: 19.4326, // CDMX por defecto
    address_line1: '',
    address_line2: '',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '',
    country: 'México',
  });
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [locationValidation, setLocationValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: false });
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Estados para gestión de marcas
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [selectedBrands, setSelectedBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  
  // Estado para rastrear si el slug fue editado manualmente
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  // Estado para grupo empresarial
  const [businessGroup, setBusinessGroup] = useState<{ id: string; name: string } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);

  // Estado para validación manual de ubicación
  const [validatingLocation, setValidatingLocation] = useState(false);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await businessService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        // Si falla, usar categorías por defecto
        setCategories([
          { name: 'Restaurante' },
          { name: 'Cafetería' },
          { name: 'Pizzería' },
          { name: 'Taquería' },
          { name: 'Panadería' },
          { name: 'Heladería' },
          { name: 'Comida Rápida' },
          { name: 'Asiático' },
          { name: 'Saludable/Vegano' },
          { name: 'Pollería' },
          { name: 'Sandwich Shop' },
          { name: 'Repostería' },
          { name: 'Otro' },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Cargar marcas disponibles al montar el componente
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoadingBrands(true);
        console.log('[AddBranchForm] Cargando marcas disponibles...');
        const available = await businessService.getAvailableVehicleBrands().catch((err) => {
          console.error('[AddBranchForm] Error cargando marcas disponibles:', err);
          return [];
        });
        console.log('[AddBranchForm] Marcas disponibles cargadas:', available.length);
        setAvailableBrands(available);
      } catch (err) {
        console.error('[AddBranchForm] Error general cargando marcas:', err);
        setAvailableBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    loadBrands();
  }, []);

  const handleAddBrand = (brandId: string) => {
    const brand = availableBrands.find(b => b.id === brandId);
    if (brand && !selectedBrands.some(sb => sb.id === brandId)) {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleRemoveBrand = (brandId: string) => {
    setSelectedBrands(selectedBrands.filter(b => b.id !== brandId));
  };

  const handleValidateLocation = async () => {
    if (!formData.longitude || !formData.latitude) return;
    setValidatingLocation(true);
    try {
      const result = await businessService.validateLocation(formData.longitude, formData.latitude);
      const message = result.isValid && result.regionName
        ? `Ubicación válida - Zona: ${result.regionName}`
        : result.message || (result.isValid ? 'Ubicación válida' : 'La ubicación está fuera de la zona de cobertura activa.');
      setLocationValidation({ isValid: result.isValid, message });
    } catch (err: any) {
      setLocationValidation({ isValid: false, message: err?.message || 'Error al validar la ubicación' });
    } finally {
      setValidatingLocation(false);
    }
  };

  const handleLocationChange = (
    longitude: number,
    latitude: number,
    address?: string,
    addressComponents?: {
      street_number?: string;
      route?: string;
      sublocality?: string;
      locality?: string;
      administrative_area_level_1?: string;
      postal_code?: string;
      country?: string;
    }
  ) => {
    setFormData(prev => ({
      ...prev,
      longitude,
      latitude,
      // Actualizar campos de dirección con los componentes de Google Maps
      address_line1: addressComponents?.route 
        ? `${addressComponents.route}${addressComponents.street_number ? ' ' + addressComponents.street_number : ''}`.trim()
        : prev.address_line1 || address?.split(',')[0]?.trim() || '',
      address_line2: addressComponents?.sublocality || prev.address_line2 || '',
      city: addressComponents?.locality || prev.city || 'Ciudad de México',
      state: addressComponents?.administrative_area_level_1 || prev.state || 'CDMX',
      postal_code: addressComponents?.postal_code || prev.postal_code || '',
      country: addressComponents?.country || prev.country || 'México',
    }));
    if (address) {
      setSelectedAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.longitude || !formData.latitude) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    const selectedBrandIds = selectedBrands.map(b => b.id);
    await onSave(formData, selectedBrandIds);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-normal text-gray-900 mb-6">Agregar Nueva Sucursal</h2>
      {/* Mensaje informativo sobre asignación automática al grupo */}
      {!loadingGroup && (
        businessGroup ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-blue-800">
                  <strong>Asignación automática:</strong> Esta sucursal será asignada automáticamente al grupo <strong>{businessGroup.name}</strong> al crearla.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-gray-700">
                  Puedes crear un grupo empresarial después para organizar tus sucursales. Ve a <strong>Configuración → Tienda</strong> para crear un grupo.
                </p>
              </div>
            </div>
          </div>
        )
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA - Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Nombre de la Sucursal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Si el slug no fue editado manualmente, generarlo automáticamente desde el nombre
                    if (!slugManuallyEdited) {
                      const autoSlug = generateSlug(newName);
                      setFormData({ ...formData, name: newName, slug: autoSlug });
                    } else {
                      setFormData({ ...formData, name: newName });
                    }
                  }}
                  placeholder="Ej: Sucursal Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length > 0 && formData.category && (
                  <p className="mt-1 text-xs text-gray-500">
                    {categories.find(c => c.name === formData.category)?.description || ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Mapa de selección de ubicación */}
              <div className="md:col-span-2">
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  Selecciona la ubicación de la sucursal <span className="text-red-500">*</span>
                </label>
                <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
                  <LocationMapPicker
                    longitude={formData.longitude}
                    latitude={formData.latitude}
                    onLocationChange={handleLocationChange}
                    onValidationChange={(isValid, message) => {
                      setLocationValidation({ isValid, message: message || undefined });
                    }}
                  />
                </div>
                {selectedAddress && (
                  <p className="mt-2 text-sm text-gray-600">
                    <strong>Dirección detectada:</strong> {selectedAddress}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleValidateLocation}
                    disabled={validatingLocation}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {validatingLocation ? 'Validando...' : 'Validar ubicación'}
                  </button>
                  {locationValidation.message && (
                    <span className={`text-sm ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {locationValidation.message}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Calle y número"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              {/* Campos de coordenadas (solo lectura, se actualizan desde el mapa) */}
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Longitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.longitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Latitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.latitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>
            </div>

            {/* Sección de gestión de marcas de vehículos */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-base font-normal text-gray-900 mb-4">Marcas de Vehículos Comercializadas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona las marcas de vehículos que esta sucursal comercializará. Solo podrás crear productos para las marcas seleccionadas.
              </p>

              {loadingBrands ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando marcas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Marcas seleccionadas */}
                  {selectedBrands.length > 0 && (
                    <div>
                      <label className="block text-sm font-normal text-gray-700 mb-2">
                        Marcas Seleccionadas ({selectedBrands.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedBrands.map((brand) => (
                          <span
                            key={brand.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-md text-sm font-normal"
                          >
                            {brand.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveBrand(brand.id)}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Quitar marca"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcas disponibles para agregar */}
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">
                      Agregar Marca
                    </label>
                    <select
                      className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loadingBrands}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddBrand(e.target.value);
                          e.target.value = ''; // Resetear el select
                        }
                      }}
                      value=""
                    >
                      <option value="">Selecciona una marca para agregar...</option>
                      {availableBrands
                        .filter((brand) => !selectedBrands.some((sb) => sb.id === brand.id))
                        .sort((a, b) => {
                          if (a.display_order !== b.display_order) {
                            return a.display_order - b.display_order;
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                    </select>
                    {availableBrands.filter((brand) => !selectedBrands.some((sb) => sb.id === brand.id)).length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">Todas las marcas disponibles ya están seleccionadas</p>
                    )}
                  </div>

                  {selectedBrands.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No hay marcas seleccionadas. Selecciona una marca del menú desplegable para comenzar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA - Configuración Adicional */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuración Adicional */}
            <div className="space-y-4">
              <h3 className="text-sm font-normal text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Configuración
              </h3>

              {/* Slug */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Slug (URL amigable)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.slug || ''}
                  onChange={(e) => {
                    // Convertir a slug automáticamente (normaliza acentos, minúsculas, guiones)
                    const slugValue = generateSlug(e.target.value);
                    setFormData({ ...formData, slug: slugValue });
                    // Marcar que el slug fue editado manualmente
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {slugManuallyEdited 
                    ? 'El slug se mantendrá aunque cambies el nombre' 
                    : 'Identificador para el storefront (se genera desde el nombre)'}
                </p>
              </div>

              {/* Estado (is_active) */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Estado de la Sucursal
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active !== false}
                      onChange={() => setFormData({ ...formData, is_active: true })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Activa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === false}
                      onChange={() => setFormData({ ...formData, is_active: false })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Inactiva</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Las inactivas no aparecen en el storefront
                </p>
              </div>

              {/* Acepta recolección (pickup) */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.accepts_pickup || false}
                    onChange={(e) => setFormData({ ...formData, accepts_pickup: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-600">Acepta recolección</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Los clientes pueden recoger en la sucursal
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Crear Sucursal'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface EditBranchFormProps {
  branch: Business;
  onSave: (data: CreateBusinessData, options?: { timezone?: string; time_format?: '12h' | '24h' }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function EditBranchForm({ branch, onSave, onCancel, saving }: EditBranchFormProps) {
  // Debug: Verificar cómo vienen las coordenadas del backend
  console.log('[EditBranchForm] Datos de la sucursal recibidos:', {
    branch_id: branch.id,
    branch_name: branch.name,
    location_object: branch.location,
    location_longitude: branch.location?.longitude,
    location_latitude: branch.location?.latitude,
    // También verificar si vienen directamente en el objeto branch
    branch_longitude: (branch as any).longitude,
    branch_latitude: (branch as any).latitude,
  });

  // Extraer coordenadas: primero del objeto location, luego directamente del branch (por si acaso)
  const initialLongitude = branch.location?.longitude ?? (branch as any).longitude ?? -99.1332;
  const initialLatitude = branch.location?.latitude ?? (branch as any).latitude ?? 19.4326;

  console.log('[EditBranchForm] Coordenadas extraídas:', {
    initialLongitude,
    initialLatitude,
  });

  const [formData, setFormData] = useState<CreateBusinessData>({
    name: branch.name || '',
    legal_name: branch.legal_name || '',
    description: branch.description || '',
    category: branch.category || '',
    phone: branch.phone || '',
    email: branch.email || '',
    website_url: branch.website_url || '',
    longitude: initialLongitude,
    latitude: initialLatitude,
    address_line1: branch.street ? `${branch.street}${branch.street_number ? ' ' + branch.street_number : ''}`.trim() : '',
    address_line2: branch.neighborhood || '',
    city: branch.address_city || 'Ciudad de México',
    state: branch.address_state || 'CDMX',
    postal_code: branch.postal_code || '',
    country: branch.address_country || 'México',
    slug: branch.slug || '',
    accepts_pickup: branch.accepts_pickup !== undefined ? branch.accepts_pickup : false,
    is_active: branch.is_active !== undefined ? branch.is_active : true,
  });
  const [selectedAddress, setSelectedAddress] = useState<string>(branch.business_address || '');
  const [locationValidation, setLocationValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: false });
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Verificar si el slug fue editado manualmente comparándolo con el generado automáticamente
  const autoGeneratedSlug = generateSlug(branch.name || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    branch.slug ? branch.slug !== autoGeneratedSlug : false
  );

  // Zona horaria y formato de hora para la app (pedidos, etc.)
  const [timezone, setTimezone] = useState<string>(branch.settings?.timezone ?? 'America/Mexico_City');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(
    branch.settings?.time_format === '12h' ? '12h' : '24h'
  );

  // Estados para gestión de marcas
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [assignedBrands, setAssignedBrands] = useState<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [managingBrands, setManagingBrands] = useState(false);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await businessService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        // Si falla, usar categorías por defecto
        setCategories([
          { name: 'Restaurante' },
          { name: 'Cafetería' },
          { name: 'Pizzería' },
          { name: 'Taquería' },
          { name: 'Panadería' },
          { name: 'Heladería' },
          { name: 'Comida Rápida' },
          { name: 'Asiático' },
          { name: 'Saludable/Vegano' },
          { name: 'Pollería' },
          { name: 'Sandwich Shop' },
          { name: 'Repostería' },
          { name: 'Otro' },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Cargar marcas disponibles y asignadas al montar el componente
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoadingBrands(true);
        console.log('[EditBranchForm] Cargando marcas para sucursal:', branch.id);
        
        const [available, assigned] = await Promise.all([
          businessService.getAvailableVehicleBrands().catch((err) => {
            console.error('[EditBranchForm] Error cargando marcas disponibles:', err);
            return [];
          }),
          businessService.getBusinessVehicleBrands(branch.id).catch((err) => {
            console.error('[EditBranchForm] Error cargando marcas asignadas:', err);
            return [];
          }),
        ]);
        
        console.log('[EditBranchForm] Marcas cargadas:', { available: available.length, assigned: assigned.length });
        setAvailableBrands(available);
        setAssignedBrands(assigned);
      } catch (err) {
        console.error('[EditBranchForm] Error general cargando marcas:', err);
        setAvailableBrands([]);
        setAssignedBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    loadBrands();
  }, [branch.id]);

  const handleAddBrand = async (brandId: string) => {
    try {
      setManagingBrands(true);
      const updated = await businessService.addVehicleBrandToBusiness(branch.id, brandId);
      setAssignedBrands(updated);
    } catch (err: any) {
      console.error('Error agregando marca:', err);
      alert(err.message || 'Error al agregar la marca');
    } finally {
      setManagingBrands(false);
    }
  };

  const handleRemoveBrand = async (brandId: string) => {
    try {
      setManagingBrands(true);
      const updated = await businessService.removeVehicleBrandFromBusiness(branch.id, brandId);
      setAssignedBrands(updated);
    } catch (err: any) {
      console.error('Error quitando marca:', err);
      alert(err.message || 'Error al quitar la marca');
    } finally {
      setManagingBrands(false);
    }
  };

  const handleLocationChange = (
    longitude: number,
    latitude: number,
    address?: string,
    addressComponents?: {
      street_number?: string;
      route?: string;
      sublocality?: string;
      locality?: string;
      administrative_area_level_1?: string;
      postal_code?: string;
      country?: string;
    }
  ) => {
    setFormData(prev => ({
      ...prev,
      longitude,
      latitude,
      // Actualizar campos de dirección con los componentes de Google Maps
      address_line1: addressComponents?.route 
        ? `${addressComponents.route}${addressComponents.street_number ? ' ' + addressComponents.street_number : ''}`.trim()
        : prev.address_line1 || address?.split(',')[0]?.trim() || '',
      address_line2: addressComponents?.sublocality || prev.address_line2 || '',
      city: addressComponents?.locality || prev.city || 'Ciudad de México',
      state: addressComponents?.administrative_area_level_1 || prev.state || 'CDMX',
      postal_code: addressComponents?.postal_code || prev.postal_code || '',
      country: addressComponents?.country || prev.country || 'México',
    }));
    if (address) {
      setSelectedAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.longitude || !formData.latitude) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    await onSave(formData, { timezone, time_format: timeFormat });
  };

  const TIMEZONE_OPTIONS = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (Centro)' },
    { value: 'America/Tijuana', label: 'Tijuana (Pacífico)' },
    { value: 'America/Hermosillo', label: 'Hermosillo (Mountain)' },
    { value: 'America/Chihuahua', label: 'Chihuahua (Centro-Norte)' },
    { value: 'America/Monterrey', label: 'Monterrey (Centro)' },
    { value: 'America/Cancun', label: 'Cancún (Este)' },
    { value: 'America/Mazatlan', label: 'Mazatlán (Pacific)' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-normal text-gray-900 mb-6">Editar Sucursal</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA - Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Nombre de la Sucursal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Si el slug no fue editado manualmente, generarlo automáticamente desde el nombre
                    if (!slugManuallyEdited) {
                      const autoSlug = generateSlug(newName);
                      setFormData({ ...formData, name: newName, slug: autoSlug });
                    } else {
                      setFormData({ ...formData, name: newName });
                    }
                  }}
                  placeholder="Ej: Sucursal Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length > 0 && formData.category && (
                  <p className="mt-1 text-xs text-gray-500">
                    {categories.find(c => c.name === formData.category)?.description || ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
              Email
                </label>
                <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
              Sitio Web
                </label>
                <input
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.website_url || ''}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
          </div>

              {/* Mapa de selección de ubicación */}
              <div className="md:col-span-2">
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  Selecciona la ubicación de la sucursal <span className="text-red-500">*</span>
                </label>
                <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
                  <LocationMapPicker
                    longitude={formData.longitude}
                    latitude={formData.latitude}
                    onLocationChange={handleLocationChange}
                    onValidationChange={(isValid, message) => {
                      setLocationValidation({ isValid, message: message || undefined });
                    }}
                  />
                </div>
                {selectedAddress && (
                  <p className="mt-2 text-sm text-gray-600">
                    <strong>Dirección detectada:</strong> {selectedAddress}
                  </p>
                )}
                {locationValidation.message && (
                  <p className={`mt-2 text-sm ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {locationValidation.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Calle y número"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              {/* Campos de coordenadas (solo lectura, se actualizan desde el mapa) */}
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Longitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.longitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1">
                  Latitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.latitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>
            </div>

            {/* Sección de gestión de marcas de vehículos */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-base font-normal text-gray-900 mb-4">Marcas de Vehículos Comercializadas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona las marcas de vehículos que esta sucursal comercializará. Solo podrás crear productos para las marcas seleccionadas.
              </p>

              {loadingBrands ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando marcas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Marcas asignadas */}
                  {assignedBrands.length > 0 && (
                    <div>
                      <label className="block text-sm font-normal text-gray-700 mb-2">
                        Marcas Asignadas ({assignedBrands.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {assignedBrands.map((brand) => (
                          <span
                            key={brand.brand_id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-md text-sm font-normal"
                          >
                            {brand.brand_name}
                            <button
                              type="button"
                              onClick={() => handleRemoveBrand(brand.brand_id)}
                              disabled={managingBrands}
                              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Quitar marca"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcas disponibles para agregar */}
                  <div>
                    <label className="block text-sm font-normal text-gray-700 mb-2">
                      Agregar Marca
                    </label>
                    <select
                      className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={managingBrands || loadingBrands}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddBrand(e.target.value);
                          e.target.value = ''; // Resetear el select
                        }
                      }}
                      value=""
                    >
                      <option value="">Selecciona una marca para agregar...</option>
                      {availableBrands
                        .filter((brand) => !assignedBrands.some((ab) => ab.brand_id === brand.id))
                        .sort((a, b) => {
                          if (a.display_order !== b.display_order) {
                            return a.display_order - b.display_order;
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                    </select>
                    {availableBrands.filter((brand) => !assignedBrands.some((ab) => ab.brand_id === brand.id)).length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">Todas las marcas disponibles ya están asignadas</p>
                    )}
                  </div>

                  {assignedBrands.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No hay marcas asignadas. Selecciona una marca del menú desplegable para comenzar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA - Configuración Adicional */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuración Adicional */}
            <div className="space-y-4">
              <h3 className="text-sm font-normal text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Configuración
              </h3>

              {/* Zona horaria: usada para fechas/horas en pedidos (no la del navegador) */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Zona horaria
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Fechas y horas en pedidos se muestran en esta zona (no la del navegador)
                </p>
              </div>

              {/* Formato de hora: 12h (AM/PM) o 24h */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Formato de hora
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="time_format_edit"
                      checked={timeFormat === '24h'}
                      onChange={() => setTimeFormat('24h')}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">24 horas (ej. 14:30)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="time_format_edit"
                      checked={timeFormat === '12h'}
                      onChange={() => setTimeFormat('12h')}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">12 horas (ej. 2:30 p.m.)</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cómo se muestra la hora en pedidos cuando es hoy
                </p>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Slug (URL amigable)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.slug || ''}
                  onChange={(e) => {
                    // Convertir a slug automáticamente (normaliza acentos, minúsculas, guiones)
                    const slugValue = generateSlug(e.target.value);
                    setFormData({ ...formData, slug: slugValue });
                    // Marcar que el slug fue editado manualmente
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {slugManuallyEdited 
                    ? 'El slug se mantendrá aunque cambies el nombre' 
                    : 'Identificador para el storefront (se genera desde el nombre)'}
                </p>
              </div>

              {/* Estado (is_active) */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Estado de la Sucursal
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active_edit"
                      checked={formData.is_active !== false}
                      onChange={() => setFormData({ ...formData, is_active: true })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Activa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active_edit"
                      checked={formData.is_active === false}
                      onChange={() => setFormData({ ...formData, is_active: false })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Inactiva</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Las inactivas no aparecen en el storefront
                </p>
              </div>

              {/* Acepta recolección (pickup) */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.accepts_pickup || false}
                    onChange={(e) => setFormData({ ...formData, accepts_pickup: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-600">Acepta recolección</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Los clientes pueden recoger en la sucursal
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
