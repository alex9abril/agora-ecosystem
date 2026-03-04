import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService, BusinessGroup } from '@/lib/business';
import { apiRequest } from '@/lib/api';
import TiendasSidebar, { TiendasSection } from '@/components/tiendas/TiendasSidebar';

type HomePanel = 'group' | 'branch' | 'brand' | null;

interface Store {
  id: string;
  type: string;
  business_group_id: string | null;
  business_id: string | null;
  vehicle_brand_id: string | null;
  slug: string | null;
  name: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface StoresResponse {
  data: Store[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface StoreDisableReason {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
}

export default function TiendasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBusinesses } = useSelectedBusiness();
  const section = (router.query.section as TiendasSection) || 'home';
  const selectedStoreId = router.query.id as string | undefined;

  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const [homePanel, setHomePanel] = useState<HomePanel>(null);
  const [groupStore, setGroupStore] = useState<Store | null>(null);
  const [brands, setBrands] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [loadingHomePanel, setLoadingHomePanel] = useState(false);
  const [creatingStore, setCreatingStore] = useState(false);
  const [errorCreate, setErrorCreate] = useState<string | null>(null);

  const [disableDialogStore, setDisableDialogStore] = useState<Store | null>(null);
  const [disableReasonId, setDisableReasonId] = useState('');
  const [disableNotes, setDisableNotes] = useState('');
  const [disableReasons, setDisableReasons] = useState<StoreDisableReason[]>([]);
  const [loadingDisableReasons, setLoadingDisableReasons] = useState(false);
  const [hoveredPublicadaId, setHoveredPublicadaId] = useState<string | null>(null);
  const [hoveredInactivaId, setHoveredInactivaId] = useState<string | null>(null);
  const [storeTab, setStoreTab] = useState<'resumen' | 'configuracion' | 'correos'>('resumen');
  const [storeStatusOverrides, setStoreStatusOverrides] = useState<Record<string, boolean>>({});

  const selectedStore = (section === 'group' || section === 'branch' || section === 'group_brand') && selectedStoreId
    ? stores.find((s) => s.id === selectedStoreId) ?? null
    : null;

  useEffect(() => {
    setStoreTab('resumen');
  }, [selectedStoreId]);

  useEffect(() => {
    const checkSuperadmin = () => {
      const hasSuperadminRole = availableBusinesses.some((b) => b.role === 'superadmin');
      if (hasSuperadminRole) {
        setIsSuperadmin(true);
      } else {
        router.push('/dashboard');
      }
    };
    if (availableBusinesses.length > 0) {
      checkSuperadmin();
    }
  }, [availableBusinesses, router]);

  useEffect(() => {
    const loadGroup = async () => {
      if (!isSuperadmin) return;
      try {
        setLoading(true);
        setError(null);
        const group = await businessService.getMyBusinessGroup();
        setBusinessGroup(group ?? null);
      } catch (err) {
        console.error('Error cargando grupo:', err);
        setError('Error al cargar el grupo empresarial');
      } finally {
        setLoading(false);
      }
    };
    loadGroup();
  }, [isSuperadmin]);

  useEffect(() => {
    const loadStores = async () => {
      if (!businessGroup?.id) return;
      const type = section === 'group_brand' ? 'group_brand' : section === 'group' ? 'group' : section === 'branch' ? 'branch' : null;
      if (!type) {
        setStores([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await apiRequest<StoresResponse>(
          `/stores?type=${type}&businessGroupId=${businessGroup.id}&limit=100`
        );
        setStores(response.data ?? []);
      } catch (err) {
        console.error('Error cargando tiendas:', err);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, [businessGroup?.id, section]);

  useEffect(() => {
    const loadGroupStore = async () => {
      if (section !== 'home' || !businessGroup?.id) return;
      try {
        const response = await apiRequest<StoresResponse>(
          `/stores?type=group&businessGroupId=${businessGroup.id}&limit=1`
        );
        const list = response.data ?? [];
        setGroupStore(list.length > 0 ? list[0] : null);
      } catch {
        setGroupStore(null);
      }
    };
    loadGroupStore();
  }, [section, businessGroup?.id]);

  useEffect(() => {
    if (homePanel !== 'brand') return;
    setLoadingHomePanel(true);
    businessService
      .getAvailableVehicleBrands()
      .then(setBrands)
      .catch(() => setBrands([]))
      .finally(() => setLoadingHomePanel(false));
  }, [homePanel]);

  const loadDisableReasons = async () => {
    setLoadingDisableReasons(true);
    try {
      const raw = await apiRequest<StoreDisableReason[] | { data?: StoreDisableReason[] }>('/stores/disable-reasons');
      const list = Array.isArray(raw) ? raw : (raw && Array.isArray((raw as { data?: StoreDisableReason[] }).data) ? (raw as { data: StoreDisableReason[] }).data : []);
      setDisableReasons(list);
    } catch (err) {
      console.error('Error cargando motivos de deshabilitación:', err);
      setDisableReasons([]);
    } finally {
      setLoadingDisableReasons(false);
    }
  };

  useEffect(() => {
    loadDisableReasons();
  }, []);

  useEffect(() => {
    if (disableDialogStore && disableReasons.length === 0 && !loadingDisableReasons) {
      loadDisableReasons();
    }
  }, [disableDialogStore]);

  const handleOpenDisableDialog = (store: Store) => {
    setDisableDialogStore(store);
    setDisableReasonId('');
    setDisableNotes('');
    setError(null);
  };

  const handleCloseDisableDialog = () => {
    setDisableDialogStore(null);
    setDisableReasonId('');
    setDisableNotes('');
  };

  const handleConfirmDisable = async () => {
    if (!disableDialogStore || !disableReasonId) return;
    setTogglingId(disableDialogStore.id);
    setError(null);
    try {
      const body: { isActive: boolean; disableReasonId: string; disableNotes?: string } = {
        isActive: false,
        disableReasonId,
      };
      if (disableNotes.trim()) body.disableNotes = disableNotes.trim();
      const updated = await apiRequest<Store>(`/stores/${disableDialogStore.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setStores((prev) =>
        prev.map((s) => (s.id === disableDialogStore.id ? { ...s, is_active: updated.is_active } : s))
      );
      setStoreStatusOverrides((prev) => ({ ...prev, [disableDialogStore.id]: false }));
      handleCloseDisableDialog();
    } catch (err) {
      console.error('Error deshabilitando tienda:', err);
      setError('Error al deshabilitar la tienda. Comprueba que el backend tenga la migración de motivos aplicada.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateBrandStore = async (vehicleBrandId: string) => {
    if (!businessGroup?.id) return;
    setCreatingStore(true);
    setErrorCreate(null);
    try {
      const created = await apiRequest<Store>('/stores', {
        method: 'POST',
        body: JSON.stringify({
          type: 'group_brand',
          businessGroupId: businessGroup.id,
          vehicleBrandId,
        }),
      });
      setStores((prev) => [...prev, created]);
      setHomePanel(null);
    } catch (err: unknown) {
      setErrorCreate(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error al crear la tienda por marca');
    } finally {
      setCreatingStore(false);
    }
  };

  const handleEnable = async (store: Store) => {
    setTogglingId(store.id);
    try {
      const updated = await apiRequest<Store>(`/stores/${store.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
      });
      setStores((prev) =>
        prev.map((s) => (s.id === store.id ? { ...s, is_active: updated.is_active } : s))
      );
      setStoreStatusOverrides((prev) => ({ ...prev, [store.id]: true }));
    } catch (err) {
      console.error('Error actualizando tienda:', err);
      setError('Error al actualizar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Tiendas - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50 dark:bg-neutral-900">
          <TiendasSidebar currentSection={section} currentStoreId={router.query.id as string} storeStatusOverrides={storeStatusOverrides} />

          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="w-full min-w-0 px-6 py-8">
              {section === 'home' && (
                <>
                  <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">
                    Tiendas
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Este módulo permite la <strong>personalización de las tiendas</strong> (canales de venta) de tu grupo. Cada tienda es un canal por el que tus clientes pueden comprar; el fulfillment siempre lo realiza la sucursal. Usa el menú de la izquierda para ver tiendas por grupo, por distribuidor o por grupo+marca.
                  </p>
                  {businessGroup && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                      Grupo actual: <strong>{businessGroup.name}</strong>
                    </p>
                  )}

                  {isSuperadmin && businessGroup && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3 mb-8">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tienda por grupo</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Solo existe <strong>una</strong> tienda de grupo (la de tu grupo). Puedes activarla o configurarla desde la sección Por grupo.
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push({ pathname: '/tiendas', query: { section: 'group', ...(groupStore ? { id: groupStore.id } : {}) } })}
                            className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                          >
                            Ir a tienda por grupo
                          </button>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tiendas por distribuidor</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Solo puede haber <strong>una</strong> tienda por cada sucursal (distribuidor). Ver y gestionar desde la sección Distribuidor.
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push({ pathname: '/tiendas', query: { section: 'branch' } })}
                            className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                          >
                            Ir a tiendas por distribuidor
                          </button>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tiendas por marca</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Crea <strong>N tiendas</strong> por marca y asigna qué distribuidores (sucursales) cuelgan sus productos en cada una.
                          </p>
                          <button
                            type="button"
                            onClick={() => setHomePanel(homePanel === 'brand' ? null : 'brand')}
                            className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                          >
                            Crear tienda por marca
                          </button>
                        </div>
                      </div>

                      {errorCreate && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <p className="text-sm text-red-800 dark:text-red-200">{errorCreate}</p>
                        </div>
                      )}

                      {homePanel === 'brand' && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 mb-6">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Crear tienda por marca</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Elige una marca. La tienda grupo+marca mostrará los productos de las sucursales que tengan esa marca asignada (Configuración → Sucursales → marcas).
                          </p>
                          {loadingHomePanel ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {brands.map((brand) => (
                                <button
                                  key={brand.id}
                                  type="button"
                                  disabled={creatingStore}
                                  onClick={() => handleCreateBrandStore(brand.id)}
                                  className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                                >
                                  {brand.name}
                                </button>
                              ))}
                              {brands.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No hay marcas disponibles. Configura el catálogo de marcas en el backend.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {(section === 'group' || section === 'branch' || section === 'group_brand') && (
                <>
                  <h1 className="text-xl font-normal text-gray-900 dark:text-gray-100 mb-2">
                    {selectedStore
                      ? selectedStore.name
                      : section === 'group'
                        ? 'Tiendas por grupo'
                        : section === 'branch'
                          ? 'Tiendas por distribuidor'
                          : 'Tiendas por grupo+marca'}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    {section === 'group' && 'Canales de venta a nivel de grupo (corporativo).'}
                    {section === 'branch' && 'Canales de venta por sucursal (distribuidor).'}
                    {section === 'group_brand' && 'Activa o desactiva los canales que combinan tu grupo con cada marca.'}
                  </p>
                </>
              )}

              {!isSuperadmin && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Solo usuarios con rol de superadmin pueden gestionar tiendas.
                </p>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {section === 'home' && !businessGroup && isSuperadmin && !loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tienes un grupo empresarial configurado. Configura la tienda (grupo) en Configuración → Tienda.
                </p>
              )}

              {(section === 'group' || section === 'branch' || section === 'group_brand') && businessGroup && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Grupo: <strong>{businessGroup.name}</strong>
                  </p>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
                    </div>
                  ) : stores.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {section === 'group_brand'
                        ? 'No hay tiendas tipo grupo+marca para este grupo. Asegúrate de que tus sucursales tengan marcas asignadas (Configuración → Vehículos).'
                        : 'No hay tiendas de este tipo para tu grupo.'}
                    </p>
                  ) : selectedStore ? (
                    selectedStore.is_active ? (
                      <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
                        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedStore.name}</p>
                            {selectedStore.slug && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{selectedStore.slug}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            title="Deshabilitar"
                            disabled={togglingId === selectedStore.id}
                            onClick={() => handleOpenDisableDialog(selectedStore)}
                            onMouseEnter={() => setHoveredPublicadaId(selectedStore.id)}
                            onMouseLeave={() => setHoveredPublicadaId(null)}
                            className={`inline-flex px-3 py-1.5 text-sm rounded transition-colors cursor-pointer disabled:opacity-50 ${
                              hoveredPublicadaId === selectedStore.id
                                ? 'bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}
                          >
                            {togglingId === selectedStore.id ? '...' : hoveredPublicadaId === selectedStore.id ? 'Deshabilitar' : 'Publicada'}
                          </button>
                        </div>
                        <nav className="flex border-b border-gray-200 dark:border-neutral-700 px-3 gap-1" aria-label="Pestañas">
                          {[
                            { id: 'resumen' as const, label: 'Resumen' },
                            { id: 'configuracion' as const, label: 'Configuración' },
                            ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                              ? [{ id: 'correos' as const, label: 'Correos' }]
                              : []),
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setStoreTab(tab.id)}
                              className={`px-2.5 py-2 text-xs font-normal border-b -mb-px transition-colors ${
                                storeTab === tab.id
                                  ? 'border-black dark:border-neutral-200 text-gray-900 dark:text-neutral-100'
                                  : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </nav>
                        <div className="p-4 min-h-[200px]">
                          {storeTab === 'resumen' && (
                            <div className="text-sm text-gray-600 dark:text-neutral-400">
                              <p>Vista general de la tienda. Aquí podrás ver resumen de actividad y accesos rápidos.</p>
                            </div>
                          )}
                          {storeTab === 'configuracion' && (
                            <div className="text-sm text-gray-600 dark:text-neutral-400">
                              <p>Opciones de configuración de la tienda. Más acciones disponibles próximamente.</p>
                            </div>
                          )}
                          {storeTab === 'correos' && (selectedStore.type === 'group' || selectedStore.type === 'branch') && (
                            <div className="min-h-[400px] flex flex-col">
                              <iframe
                                title="Templates de correo"
                                src={
                                  selectedStore.type === 'group'
                                    ? `/settings/emails?embedded=1&level=group&businessGroupId=${encodeURIComponent(selectedStore.business_group_id || '')}`
                                    : `/settings/emails?embedded=1&level=branch&businessId=${encodeURIComponent(selectedStore.business_id || '')}`
                                }
                                className="w-full flex-1 min-h-[500px] rounded border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedStore.name}</p>
                            {selectedStore.slug && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{selectedStore.slug}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            title="Publicar"
                            disabled={togglingId === selectedStore.id}
                            onClick={() => handleEnable(selectedStore)}
                            onMouseEnter={() => setHoveredInactivaId(selectedStore.id)}
                            onMouseLeave={() => setHoveredInactivaId(null)}
                            className={`inline-flex px-3 py-1.5 text-sm rounded transition-colors cursor-pointer disabled:opacity-50 ${
                              hoveredInactivaId === selectedStore.id
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {togglingId === selectedStore.id ? '...' : hoveredInactivaId === selectedStore.id ? 'Publicar' : 'Inactiva'}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-neutral-400 mt-3">
                          Publica la tienda para acceder a más opciones y pestañas de configuración.
                        </p>
                      </div>
                    )
                  ) : (
                    <>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Selecciona una tienda del menú de la izquierda para ver y gestionar sus opciones.
                      </p>
                      <ul className="space-y-1">
                        {stores.map((store) => (
                          <li key={store.id}>
                            <button
                              type="button"
                              onClick={() => router.push({ pathname: '/tiendas', query: { section, id: store.id } })}
                              className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
                            >
                              {store.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {disableDialogStore && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disable-dialog-title"
            onClick={handleCloseDisableDialog}
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="disable-dialog-title" className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Deshabilitar tienda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                ¿Por qué deshabilitas esta tienda? <strong>{disableDialogStore.name}</strong>
              </p>
              <div className="space-y-3 mb-4">
                <label htmlFor="disable-reason" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Motivo
                </label>
                <select
                  id="disable-reason"
                  value={disableReasonId}
                  onChange={(e) => setDisableReasonId(e.target.value)}
                  disabled={loadingDisableReasons}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm disabled:opacity-70"
                >
                  <option value="">
                    {loadingDisableReasons ? 'Cargando motivos…' : 'Selecciona un motivo'}
                  </option>
                  {disableReasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {!loadingDisableReasons && disableReasons.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No se pudieron cargar los motivos. Ejecuta la migración <code className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded">migration_store_disable_reasons_and_log.sql</code> en la base de datos.
                  </p>
                )}
                <label htmlFor="disable-notes" className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notas (opcional)
                </label>
                <textarea
                  id="disable-notes"
                  value={disableNotes}
                  onChange={(e) => setDisableNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles adicionales..."
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder-gray-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseDisableDialog}
                  className="px-3 py-2 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!disableReasonId || togglingId === disableDialogStore.id}
                  onClick={handleConfirmDisable}
                  className="px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {togglingId === disableDialogStore.id ? '...' : 'Deshabilitar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </LocalLayout>
    </>
  );
}
