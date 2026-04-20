import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService, BusinessGroup, Business } from '@/lib/business';
import { apiRequest } from '@/lib/api';
import TiendasSidebar, { TiendasSection } from '@/components/tiendas/TiendasSidebar';
import EmailTemplatesPanel from '@/components/email-templates/EmailTemplatesPanel';
import BrandingManager from '@/components/branding/BrandingManager';
import LandingSlidersPanel from '@/components/landing-sliders/LandingSlidersPanel';
import TaxSettingsPanel from '@/components/tax-settings/TaxSettingsPanel';
import NotificationSettingsPanel from '@/components/notification-settings/NotificationSettingsPanel';
import NotificationRecipientsManager from '@/components/notification-settings/NotificationRecipientsManager';
import IntegracionesPanel from '@/components/integrations/IntegracionesPanel';
import CollectionsPanel from '@/components/collections/CollectionsPanel';
import { isOperatorRole, normalizeOperatorPermissions } from '@/lib/operator-permissions';
import { canAccessTiendasTab } from '@/lib/permissions';

const iconClass = 'w-4 h-4 shrink-0';

const TabIcons: Record<string, React.ReactNode> = {
  resumen: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  configuracion: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  correos: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  personalizar: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  sliders: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  integraciones: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  colecciones: (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
};

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
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const section = (router.query.section as TiendasSection) || 'home';
  const selectedStoreId = router.query.id as string | undefined;

  const userRole = selectedBusiness?.role ?? 'operations_staff';
  const isOperator = isOperatorRole(userRole);
  const operatorPerms = selectedBusiness?.permissions
    ? normalizeOperatorPermissions(selectedBusiness.permissions as Record<string, unknown>)
    : null;

  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const [homePanel, setHomePanel] = useState<HomePanel>(null);
  const [groupStore, setGroupStore] = useState<Store | null>(null);
  const [branchStoresHome, setBranchStoresHome] = useState<Store[]>([]);
  const [groupBrandStoresHome, setGroupBrandStoresHome] = useState<Store[]>([]);
  const [groupBranchesHome, setGroupBranchesHome] = useState<Business[]>([]);
  const [loadingBranchPicker, setLoadingBranchPicker] = useState(false);
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
  const [storeTab, setStoreTab] = useState<'resumen' | 'configuracion' | 'correos' | 'personalizar' | 'sliders' | 'integraciones' | 'colecciones'>('resumen');
  const [storeStatusOverrides, setStoreStatusOverrides] = useState<Record<string, boolean>>({});
  const [archiveConfirmName, setArchiveConfirmName] = useState('');
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [storesRefreshTrigger, setStoresRefreshTrigger] = useState(0);
  const [supervisorEmailEnabled, setSupervisorEmailEnabled] = useState(false);

  const hasTiendasAccess = isSuperadmin || (isOperator && operatorPerms?.modules?.tiendas === true);

  const selectedStore = (section === 'group' || section === 'branch' || section === 'group_brand') && selectedStoreId
    ? stores.find((s) => s.id === selectedStoreId) ?? null
    : null;

  useEffect(() => {
    setStoreTab('resumen');
  }, [selectedStoreId]);

  useEffect(() => {
    if (isOperator && selectedBusiness && section === 'home') {
      router.replace(
        { pathname: '/tiendas', query: { section: 'branch', id: selectedBusiness.business_id } },
        undefined,
        { shallow: true },
      );
    }
  }, [isOperator, selectedBusiness?.business_id, section, router]);

  // Si la tienda está inactiva y la pestaña actual no está disponible, volver a Resumen
  useEffect(() => {
    if (selectedStore && !selectedStore.is_active && storeTab !== 'resumen' && storeTab !== 'configuracion') {
      setStoreTab('resumen');
    }
  }, [selectedStore?.id, selectedStore?.is_active, storeTab]);

  useEffect(() => {
    const checkAccess = () => {
      const hasSuperadminRole = availableBusinesses.some((b) => b.role === 'superadmin');
      if (hasSuperadminRole) {
        setIsSuperadmin(true);
        return;
      }
      if (isOperator && operatorPerms?.modules?.tiendas === true) {
        return;
      }
      router.push('/dashboard');
    };
    if (availableBusinesses.length > 0) {
      checkAccess();
    }
  }, [availableBusinesses, router, isOperator, operatorPerms?.modules?.tiendas]);

  useEffect(() => {
    if (isOperator && selectedBusiness) {
      const operatorStore: Store = {
        id: selectedBusiness.business_id,
        type: 'branch',
        business_group_id: null,
        business_id: selectedBusiness.business_id,
        vehicle_brand_id: null,
        slug: null,
        name: selectedBusiness.business_name,
        is_active: selectedBusiness.is_active,
        settings: {},
        created_at: selectedBusiness.assigned_at,
        updated_at: selectedBusiness.assigned_at,
      };
      setStores([operatorStore]);
      setLoading(false);
      return;
    }
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
  }, [isSuperadmin, isOperator, selectedBusiness?.business_id]);

  useEffect(() => {
    if (isOperator) return;
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
  }, [businessGroup?.id, section, storesRefreshTrigger, isOperator]);

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
    if (!isSuperadmin || !businessGroup?.id) {
      setBranchStoresHome([]);
      setGroupBrandStoresHome([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [branchRes, groupBrandRes] = await Promise.all([
          apiRequest<StoresResponse>(`/stores?type=branch&businessGroupId=${businessGroup.id}&limit=100`),
          apiRequest<StoresResponse>(`/stores?type=group_brand&businessGroupId=${businessGroup.id}&limit=100`),
        ]);
        if (!cancelled) {
          setBranchStoresHome(branchRes.data ?? []);
          setGroupBrandStoresHome(groupBrandRes.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setBranchStoresHome([]);
          setGroupBrandStoresHome([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperadmin, businessGroup?.id, storesRefreshTrigger]);

  useEffect(() => {
    if (homePanel !== 'branch' || !businessGroup?.id) return;
    setLoadingBranchPicker(true);
    businessService
      .getBranches({ groupId: businessGroup.id, limit: 500 })
      .then((res) => setGroupBranchesHome(res.data ?? []))
      .catch(() => setGroupBranchesHome([]))
      .finally(() => setLoadingBranchPicker(false));
  }, [homePanel, businessGroup?.id]);

  useEffect(() => {
    if (router.query.branchPanel !== '1' || section !== 'home' || !isSuperadmin) return;
    setHomePanel('branch');
    router.replace({ pathname: '/tiendas', query: { section: 'home' } }, undefined, { shallow: true });
  }, [router.query.branchPanel, section, isSuperadmin, router]);

  useEffect(() => {
    if (router.query.brandPanel !== '1' || section !== 'home' || !isSuperadmin) return;
    setHomePanel('brand');
    router.replace({ pathname: '/tiendas', query: { section: 'home' } }, undefined, { shallow: true });
  }, [router.query.brandPanel, section, isSuperadmin, router]);

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

  const handleCreateGroupStore = async () => {
    if (!businessGroup?.id) return;
    setCreatingStore(true);
    setErrorCreate(null);
    try {
      const created = await apiRequest<Store>('/stores', {
        method: 'POST',
        body: JSON.stringify({
          type: 'group',
          businessGroupId: businessGroup.id,
        }),
      });
      setGroupStore(created);
      setStoresRefreshTrigger((t) => t + 1);
      await router.push({ pathname: '/tiendas', query: { section: 'group', id: created.id } });
    } catch (err: unknown) {
      setErrorCreate(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Error al crear la tienda por grupo',
      );
    } finally {
      setCreatingStore(false);
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
      setGroupBrandStoresHome((prev) => [...prev, created]);
      setStores((prev) => [...prev, created]);
      setHomePanel(null);
      setStoresRefreshTrigger((t) => t + 1);
      await router.push({ pathname: '/tiendas', query: { section: 'group_brand', id: created.id } });
    } catch (err: unknown) {
      setErrorCreate(err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Error al crear la tienda por marca');
    } finally {
      setCreatingStore(false);
    }
  };

  const handleCreateBranchStore = async (businessId: string) => {
    if (!businessGroup?.id) return;
    setCreatingStore(true);
    setErrorCreate(null);
    try {
      const created = await apiRequest<Store>('/stores', {
        method: 'POST',
        body: JSON.stringify({
          type: 'branch',
          businessId,
        }),
      });
      setBranchStoresHome((prev) => [...prev, created]);
      setHomePanel(null);
      setStoresRefreshTrigger((t) => t + 1);
      await router.push({ pathname: '/tiendas', query: { section: 'branch', id: created.id } });
    } catch (err: unknown) {
      setErrorCreate(
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Error al crear la tienda por distribuidor',
      );
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
          <TiendasSidebar currentSection={section} currentStoreId={router.query.id as string} storeStatusOverrides={storeStatusOverrides} refreshTrigger={storesRefreshTrigger} />

          <div className="flex-1 min-w-0">
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
                        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tienda por grupo</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Solo existe <strong>una</strong> tienda de grupo (la de tu grupo). Puedes activarla o configurarla desde la sección Por grupo.
                          </p>
                          {!groupStore ? (
                            <>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                                Aún no existe la tienda de grupo. Créala para tener el canal corporativo del grupo.
                              </p>
                              <button
                                type="button"
                                disabled={creatingStore}
                                onClick={() => handleCreateGroupStore()}
                                className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                              >
                                Crear tienda por grupo
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => router.push({ pathname: '/tiendas', query: { section: 'group', id: groupStore.id } })}
                              className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                            >
                              Ir a tienda por grupo
                            </button>
                          )}
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tiendas por distribuidor</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Solo puede haber <strong>una</strong> tienda por cada sucursal (distribuidor). Ver y gestionar desde la sección Distribuidor.
                          </p>
                          {branchStoresHome.length === 0 ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                              Aún no hay ninguna tienda por sucursal. Crea una eligiendo la sucursal (distribuidor) correspondiente.
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2">
                            {branchStoresHome.length > 0 && (
                              <button
                                type="button"
                                onClick={() => router.push({ pathname: '/tiendas', query: { section: 'branch' } })}
                                className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                              >
                                Ir a tiendas por distribuidor
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setHomePanel(homePanel === 'branch' ? null : 'branch')}
                              className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                            >
                              {homePanel === 'branch'
                                ? 'Ocultar creación'
                                : branchStoresHome.length === 0
                                  ? 'Crear tienda por distribuidor'
                                  : 'Crear tienda para otra sucursal'}
                            </button>
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Tiendas por marca (grupo + marca)</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Crea <strong>N tiendas</strong> por marca y asigna qué distribuidores (sucursales) cuelgan sus productos en cada una.
                          </p>
                          {groupBrandStoresHome.length === 0 ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                              Aún no hay tiendas grupo+marca. Crea la primera eligiendo una marca del catálogo.
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2">
                            {groupBrandStoresHome.length > 0 && (
                              <button
                                type="button"
                                onClick={() => router.push({ pathname: '/tiendas', query: { section: 'group_brand' } })}
                                className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                              >
                                Ir a tiendas por grupo+marca
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setHomePanel(homePanel === 'brand' ? null : 'brand')}
                              className="w-full px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 transition-colors"
                            >
                              {homePanel === 'brand'
                                ? 'Ocultar creación'
                                : groupBrandStoresHome.length === 0
                                  ? 'Crear tienda por marca'
                                  : 'Crear tienda para otra marca'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {errorCreate && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <p className="text-sm text-red-800 dark:text-red-200">{errorCreate}</p>
                        </div>
                      )}

                      {homePanel === 'brand' && (
                        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 mb-6">
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
                              {brands
                                .filter((brand) => !groupBrandStoresHome.some((s) => s.vehicle_brand_id === brand.id))
                                .map((brand) => (
                                  <button
                                    key={brand.id}
                                    type="button"
                                    disabled={creatingStore}
                                    onClick={() => handleCreateBrandStore(brand.id)}
                                    className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50"
                                  >
                                    {brand.name}
                                  </button>
                                ))}
                              {brands.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No hay marcas disponibles. Configura el catálogo de marcas en el backend.</p>
                              )}
                              {brands.length > 0 &&
                                brands.every((b) => groupBrandStoresHome.some((s) => s.vehicle_brand_id === b.id)) && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Todas las marcas del catálogo ya tienen su tienda grupo+marca.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      )}

                      {homePanel === 'branch' && businessGroup && (
                        <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 mb-6">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Crear tienda por distribuidor</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Elige la sucursal. Solo puede existir una tienda por sucursal. La tienda se crea desactivada hasta que la publiques desde la sección Distribuidor.
                          </p>
                          {loadingBranchPicker ? (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100" />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {groupBranchesHome
                                .filter((b) => !branchStoresHome.some((s) => s.business_id === b.id))
                                .map((b) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    disabled={creatingStore}
                                    onClick={() => handleCreateBranchStore(b.id)}
                                    className="px-3 py-2 text-sm rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-neutral-600 disabled:opacity-50"
                                  >
                                    {b.name}
                                  </button>
                                ))}
                              {groupBranchesHome.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  No hay sucursales en este grupo empresarial. Crea sucursales en Configuración antes de abrir un canal por distribuidor.
                                </p>
                              )}
                              {groupBranchesHome.length > 0 &&
                                groupBranchesHome.every((b) => branchStoresHome.some((s) => s.business_id === b.id)) && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Todas las sucursales del grupo ya tienen su tienda por distribuidor.
                                  </p>
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

              {!hasTiendasAccess && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No tienes permisos para gestionar tiendas.
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

              {(section === 'group' || section === 'branch' || section === 'group_brand') && (businessGroup || isOperator) && (
                <>
                  {businessGroup && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Grupo: <strong>{businessGroup.name}</strong>
                    </p>
                  )}
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
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-3 py-3 border-b border-gray-200 dark:border-neutral-700">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedStore.name}</p>
                            {selectedStore.slug && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{selectedStore.slug}</p>
                            )}
                          </div>
                          {selectedStore.is_active ? (
                            <button
                              type="button"
                              title="Deshabilitar"
                              disabled={togglingId === selectedStore.id}
                              onClick={() => handleOpenDisableDialog(selectedStore)}
                              onMouseEnter={() => setHoveredPublicadaId(selectedStore.id)}
                              onMouseLeave={() => setHoveredPublicadaId(null)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors cursor-pointer disabled:opacity-50 ${
                                hoveredPublicadaId === selectedStore.id
                                  ? 'bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              {togglingId === selectedStore.id ? '...' : hoveredPublicadaId === selectedStore.id ? 'Deshabilitar' : 'Publicada'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Publicar"
                              disabled={togglingId === selectedStore.id}
                              onClick={() => handleEnable(selectedStore)}
                              onMouseEnter={() => setHoveredInactivaId(selectedStore.id)}
                              onMouseLeave={() => setHoveredInactivaId(null)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors cursor-pointer disabled:opacity-50 ${
                                hoveredInactivaId === selectedStore.id
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300'
                              }`}
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {togglingId === selectedStore.id ? '...' : hoveredInactivaId === selectedStore.id ? 'Publicar' : 'Inactiva'}
                            </button>
                          )}
                        </div>
                        <nav className="flex border-b border-gray-200 dark:border-neutral-700 px-3 gap-1" aria-label="Pestañas">
                          {(
                            selectedStore.is_active
                              ? [
                                  { id: 'resumen' as const, label: 'Resumen' },
                                  { id: 'configuracion' as const, label: 'Configuración' },
                                  ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                                    ? [{ id: 'correos' as const, label: 'Correos' }]
                                    : []),
                                  ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                                    ? [{ id: 'personalizar' as const, label: 'Personalizar' }]
                                    : []),
                                  ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                                    ? [{ id: 'sliders' as const, label: 'Sliders' }]
                                    : []),
                                  ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                                    ? [{ id: 'integraciones' as const, label: 'Integraciones' }]
                                    : []),
                                  ...(selectedStore.type === 'group' || selectedStore.type === 'branch'
                                    ? [{ id: 'colecciones' as const, label: 'Colecciones' }]
                                    : []),
                                ]
                              : [
                                  { id: 'resumen' as const, label: 'Resumen' },
                                  { id: 'configuracion' as const, label: 'Configuración' },
                                ]
                          ).filter((tab) => canAccessTiendasTab(userRole, tab.id, operatorPerms)).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setStoreTab(tab.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-normal border-b -mb-px transition-colors ${
                                storeTab === tab.id
                                  ? 'border-black dark:border-neutral-200 text-gray-900 dark:text-neutral-100'
                                  : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-300'
                              }`}
                            >
                              {TabIcons[tab.id]}
                              {tab.label}
                            </button>
                          ))}
                        </nav>
                        {storeTab === 'resumen' && selectedStore && (
                          <div className="pt-4 space-y-6">
                            <p className="text-sm text-gray-600 dark:text-neutral-400">
                              Vista general de la tienda y accesos rápidos a cada sección.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-3">Datos de la tienda</h3>
                                <dl className="space-y-2 text-sm">
                                  <div>
                                    <dt className="text-gray-500 dark:text-neutral-400">Tipo</dt>
                                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                                      {selectedStore.type === 'group' && 'Tienda por grupo'}
                                      {selectedStore.type === 'branch' && 'Tienda por sucursal'}
                                      {selectedStore.type === 'group_brand' && 'Tienda grupo + marca'}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-gray-500 dark:text-neutral-400">Estado</dt>
                                    <dd>
                                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                                        selectedStore.is_active
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                          : 'bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300'
                                      }`}>
                                        {selectedStore.is_active ? 'Publicada' : 'Inactiva'}
                                      </span>
                                    </dd>
                                  </div>
                                  {selectedStore.slug && (
                                    <div>
                                      <dt className="text-gray-500 dark:text-neutral-400">Slug</dt>
                                      <dd className="font-mono text-xs text-gray-700 dark:text-neutral-300 break-all">{selectedStore.slug}</dd>
                                    </div>
                                  )}
                                  <div>
                                    <dt className="text-gray-500 dark:text-neutral-400">Última actualización</dt>
                                    <dd className="text-gray-700 dark:text-neutral-300">
                                      {selectedStore.updated_at
                                        ? new Date(selectedStore.updated_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                                        : '—'}
                                    </dd>
                                  </div>
                                </dl>
                              </div>
                              <div className="rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4">
                                <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-3">Accesos rápidos</h3>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setStoreTab('configuracion')}
                                    className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                  >
                                    Configuración
                                  </button>
                                  {selectedStore.is_active && (selectedStore.type === 'group' || selectedStore.type === 'branch') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setStoreTab('correos')}
                                        className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        Correos
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setStoreTab('personalizar')}
                                        className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        Personalizar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setStoreTab('sliders')}
                                        className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        Sliders
                                      </button>
                                      {(selectedStore.type === 'branch' || selectedStore.type === 'group') && (
                                        <button
                                          type="button"
                                          onClick={() => setStoreTab('integraciones')}
                                          className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                        >
                                          Integraciones
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setStoreTab('colecciones')}
                                        className="inline-flex items-center px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                      >
                                        Colecciones
                                      </button>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-neutral-400 mt-3">
                                  Haz clic para ir a esa pestaña.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {storeTab === 'configuracion' && (
                          <div className="pt-4 space-y-8">
                            <p className="text-sm text-gray-600 dark:text-neutral-400">
                              {selectedStore.is_active
                                ? 'Opciones de configuración de la tienda.'
                                : 'Tienda inactiva. Solo puedes archivar la tienda aquí.'}
                            </p>
                            {selectedStore.is_active && selectedStore.type === 'branch' && selectedStore.business_id && (
                              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
                                <TaxSettingsPanel
                                  businessId={selectedStore.business_id}
                                  businessName={selectedStore.name}
                                />
                              </div>
                            )}
                            {selectedStore.is_active &&
                              ((selectedStore.type === 'group' && selectedStore.business_group_id) ||
                                (selectedStore.type === 'branch' && selectedStore.business_id)) && (
                              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6 space-y-6">
                                <NotificationSettingsPanel
                                  mode={selectedStore.type === 'group' ? 'group' : 'branch'}
                                  id={
                                    selectedStore.type === 'group'
                                      ? selectedStore.business_group_id!
                                      : selectedStore.business_id!
                                  }
                                  contextName={selectedStore.name}
                                  onSupervisorEmailChange={setSupervisorEmailEnabled}
                                />
                                {supervisorEmailEnabled && (
                                  <>
                                    <hr className="border-gray-200 dark:border-neutral-700" />
                                    <NotificationRecipientsManager
                                      mode={selectedStore.type === 'group' ? 'group' : 'branch'}
                                      id={
                                        selectedStore.type === 'group'
                                          ? selectedStore.business_group_id!
                                          : selectedStore.business_id!
                                      }
                                      contextName={selectedStore.name}
                                    />
                                  </>
                                )}
                              </div>
                            )}
                            {isSuperadmin && (
                              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-red-200 dark:border-red-900/50 p-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Zona de riesgo</h3>
                                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
                                  Archivar la tienda es irreversible. Dejará de mostrarse en el menú de tiendas, listados y checkout.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setArchiveConfirmName('');
                                    setArchiveError(null);
                                    setArchiveModalOpen(true);
                                  }}
                                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                                >
                                  Archivar tienda
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {storeTab === 'correos' && (selectedStore.type === 'group' || selectedStore.type === 'branch') && (
                          <div className="pt-4">
                            <EmailTemplatesPanel
                              level={selectedStore.type === 'group' ? 'group' : 'business'}
                              businessGroupId={selectedStore.type === 'group' ? selectedStore.business_group_id ?? undefined : undefined}
                              businessId={selectedStore.type === 'branch' ? selectedStore.business_id ?? undefined : undefined}
                              contextName={selectedStore.name}
                            />
                          </div>
                        )}
                        {storeTab === 'personalizar' && selectedStore.type === 'group' && selectedStore.business_group_id && (
                          <div className="pt-4">
                            <BrandingManager
                              type="group"
                              id={selectedStore.business_group_id}
                              name={selectedStore.name}
                            />
                          </div>
                        )}
                        {storeTab === 'personalizar' && selectedStore.type === 'branch' && selectedStore.business_id && (
                          <div className="pt-4">
                            <BrandingManager
                              type="business"
                              id={selectedStore.business_id}
                              name={selectedStore.name}
                            />
                          </div>
                        )}
                        {storeTab === 'sliders' && (selectedStore.type === 'group' || selectedStore.type === 'branch') && (
                          <LandingSlidersPanel
                            contextType={selectedStore.type === 'group' ? 'group' : 'branch'}
                            businessGroupId={selectedStore.type === 'group' ? selectedStore.business_group_id ?? undefined : undefined}
                            businessId={selectedStore.type === 'branch' ? selectedStore.business_id ?? undefined : undefined}
                            contextName={selectedStore.name}
                            embedCreate
                          />
                        )}
                        {storeTab === 'integraciones' && selectedStore.type === 'branch' && selectedStore.business_id && (
                          <div className="pt-4">
                            <IntegracionesPanel
                              contextType="branch"
                              id={selectedStore.business_id}
                              contextName={selectedStore.name}
                            />
                          </div>
                        )}
                        {storeTab === 'integraciones' && selectedStore.type === 'group' && selectedStore.business_group_id && (
                          <div className="pt-4">
                            <IntegracionesPanel
                              contextType="group"
                              id={selectedStore.business_group_id}
                              contextName={selectedStore.name}
                            />
                          </div>
                        )}
                        {storeTab === 'colecciones' && selectedStore.type === 'branch' && selectedStore.business_id && (
                          <div className="pt-4">
                            <CollectionsPanel
                              businessId={selectedStore.business_id}
                              contextName={selectedStore.name}
                              returnPath={`/tiendas?section=branch&id=${selectedStore.id}`}
                            />
                          </div>
                        )}
                        {storeTab === 'colecciones' && selectedStore.type === 'group' && (
                          <div className="pt-4 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Las colecciones se gestionan <strong>por sucursal</strong>. Selecciona una tienda por distribuidor en el menú de la izquierda para ver y gestionar las colecciones de esa sucursal.
                            </p>
                            {isSuperadmin && branchStoresHome.length === 0 ? (
                              <div className="mt-4 space-y-3">
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                  Aún no existe ninguna tienda por distribuidor. Créala desde el inicio de Tiendas antes de gestionar colecciones por sucursal.
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push({ pathname: '/tiendas', query: { section: 'home', branchPanel: '1' } })
                                  }
                                  className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                >
                                  Crear tienda por distribuidor
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => router.push({ pathname: '/tiendas', query: { section: 'branch' } })}
                                className="mt-4 inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                              >
                                Ir a tiendas por distribuidor
                              </button>
                            )}
                          </div>
                        )}
                      </>
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
              className="mx-4 w-full max-w-md rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="disable-dialog-title" className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Deshabilitar tienda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                ¿Por qué deshabilitas esta tienda? <strong className="text-gray-900 dark:text-gray-100">{disableDialogStore.name}</strong>
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
                  className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 dark:focus:border-neutral-500"
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
                    No se pudieron cargar los motivos. Ejecuta la migración <code className="text-[10px] bg-gray-100 dark:bg-neutral-700 px-1 rounded text-gray-800 dark:text-gray-300">migration_store_disable_reasons_and_log.sql</code> en la base de datos.
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
                  className="w-full rounded border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 dark:focus:border-neutral-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseDisableDialog}
                  className="px-3 py-2 text-sm font-medium rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!disableReasonId || togglingId === disableDialogStore.id}
                  onClick={handleConfirmDisable}
                  className="px-3 py-2 text-sm font-medium rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  {togglingId === disableDialogStore.id ? '...' : 'Deshabilitar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {archiveModalOpen && selectedStore && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-dialog-title"
            onClick={() => {
              if (!archiving) {
                setArchiveModalOpen(false);
                setArchiveConfirmName('');
                setArchiveError(null);
              }
            }}
          >
            <div
              className="mx-4 w-full max-w-md rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-800 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="archive-dialog-title" className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
                Archivar tienda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Archivar la tienda es irreversible. Dejará de mostrarse en el menú de tiendas, listados y checkout.
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Para confirmar, escriba el nombre exacto de la tienda: <strong className="text-gray-900 dark:text-gray-100">«{selectedStore.name}»</strong>
              </p>
              <input
                type="text"
                value={archiveConfirmName}
                onChange={(e) => {
                  setArchiveConfirmName(e.target.value);
                  setArchiveError(null);
                }}
                placeholder="Nombre de la tienda"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                aria-label="Confirmar nombre de la tienda"
              />
              {archiveError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {archiveError}
                </p>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={archiving}
                  onClick={() => {
                    setArchiveModalOpen(false);
                    setArchiveConfirmName('');
                    setArchiveError(null);
                  }}
                  className="px-3 py-2 text-sm font-medium rounded border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={
                    archiving ||
                    selectedStore.name.trim().toLowerCase() !== archiveConfirmName.trim().toLowerCase()
                  }
                  onClick={async () => {
                    if (!selectedStore?.id) return;
                    setArchiveError(null);
                    setArchiving(true);
                    try {
                      await apiRequest(`/stores/${selectedStore.id}/archive`, {
                        method: 'PATCH',
                        body: JSON.stringify({ confirmName: archiveConfirmName.trim() }),
                      });
                      setArchiveModalOpen(false);
                      setArchiveConfirmName('');
                      setStoresRefreshTrigger((t) => t + 1);
                      router.push({ pathname: '/tiendas', query: { section } });
                    } catch (err: unknown) {
                      const status = err && typeof err === 'object' && 'statusCode' in err ? (err as { statusCode: number }).statusCode : 0;
                      const data = err && typeof err === 'object' && 'data' in err ? (err as { data?: { message?: string } }).data : undefined;
                      const msg = Array.isArray(data?.message) ? data?.message?.[0] : data?.message;
                      if (status === 400) {
                        setArchiveError(typeof msg === 'string' ? msg : 'El nombre no coincide con el de la tienda');
                      } else if (status === 404) {
                        setArchiveError('Tienda no encontrada o ya está archivada');
                      } else {
                        setArchiveError('Error al archivar la tienda. Intente de nuevo.');
                      }
                    } finally {
                      setArchiving(false);
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  {archiving ? 'Archivando…' : 'Archivar tienda'}
                </button>
              </div>
            </div>
          </div>
        )}
      </LocalLayout>
    </>
  );
}
