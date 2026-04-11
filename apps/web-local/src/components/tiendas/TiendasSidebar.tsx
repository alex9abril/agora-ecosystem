import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { businessService, BusinessGroup } from '@/lib/business';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { isOperatorRole } from '@/lib/operator-permissions';

export type TiendasSection = 'home' | 'group' | 'branch' | 'group_brand';

interface Store {
  id: string;
  type: string;
  business_group_id: string | null;
  business_id: string | null;
  vehicle_brand_id: string | null;
  slug: string | null;
  name: string;
  is_active: boolean;
}

interface StoresResponse {
  data: Store[];
  pagination: { total: number };
}

interface TiendasSidebarProps {
  currentSection?: TiendasSection;
  currentStoreId?: string | null;
  /** Overrides is_active por store id para reflejar cambios sin recargar */
  storeStatusOverrides?: Record<string, boolean>;
  /** Incrementar para forzar recarga de la lista (ej. tras archivar una tienda) */
  refreshTrigger?: number;
}

export default function TiendasSidebar({ currentSection = 'home', currentStoreId, storeStatusOverrides, refreshTrigger }: TiendasSidebarProps) {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [storesByGroup, setStoresByGroup] = useState<Store[]>([]);
  const [storesByBranch, setStoresByBranch] = useState<Store[]>([]);
  const [storesByGroupBrand, setStoresByGroupBrand] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const role = selectedBusiness?.role ?? 'operations_staff';
  const isOperator = isOperatorRole(role);

  useEffect(() => {
    if (isOperator) {
      setLoading(false);
      return;
    }
    const loadGroup = async () => {
      try {
        const group = await businessService.getMyBusinessGroup();
        setBusinessGroup(group ?? null);
      } catch {
        setBusinessGroup(null);
      }
    };
    loadGroup();
  }, [isOperator]);

  useEffect(() => {
    if (isOperator) return;
    const loadStores = async () => {
      if (!businessGroup?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [groupRes, branchRes, groupBrandRes] = await Promise.all([
          apiRequest<StoresResponse>(`/stores?type=group&businessGroupId=${businessGroup.id}&limit=100`),
          apiRequest<StoresResponse>(`/stores?type=branch&businessGroupId=${businessGroup.id}&limit=100`),
          apiRequest<StoresResponse>(`/stores?type=group_brand&businessGroupId=${businessGroup.id}&limit=100`),
        ]);
        setStoresByGroup(groupRes.data ?? []);
        setStoresByBranch(branchRes.data ?? []);
        setStoresByGroupBrand(groupBrandRes.data ?? []);
      } catch {
        setStoresByGroup([]);
        setStoresByBranch([]);
        setStoresByGroupBrand([]);
      } finally {
        setLoading(false);
      }
    };
    loadStores();
  }, [businessGroup?.id, refreshTrigger, isOperator]);

  const setSection = (section: TiendasSection, storeId?: string) => {
    const query: Record<string, string> = { section };
    if (storeId) query.id = storeId;
    router.push({ pathname: '/tiendas', query }, undefined, { shallow: true });
  };

  const itemClasses = (section: TiendasSection, storeId: string) => {
    const isActive = currentSection === section && currentStoreId === storeId;
    return `w-full text-left pl-3 pr-2 py-1.5 rounded text-xs flex items-center justify-between gap-1.5 transition-colors truncate ${
      isActive
        ? 'bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 font-medium'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-gray-100'
    }`;
  };

  const homeClasses = `w-full text-left px-2 py-1.5 rounded text-xs flex items-center space-x-1.5 transition-colors ${
    currentSection === 'home'
      ? 'bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 font-medium ring-1 ring-gray-300/60 dark:ring-transparent'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-gray-100'
  }`;

  const renderStoreList = (stores: Store[], section: TiendasSection) => {
    if (loading) {
      return (
        <div className="pl-2 text-[11px] text-gray-400 dark:text-gray-500 py-0.5">Cargando…</div>
      );
    }
    if (stores.length === 0) {
      return (
        <div className="pl-2 text-[11px] text-gray-400 dark:text-gray-500 py-0.5">Sin tiendas</div>
      );
    }
    return (
      <div className="space-y-0">
        {stores.map((store) => {
          const isPublished = storeStatusOverrides?.[store.id] ?? store.is_active;
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => setSection(section, store.id)}
              className={itemClasses(section, store.id)}
              title={store.name}
            >
              <span className="truncate">{store.name}</span>
              {isPublished ? (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400" title="Publicada" />
              ) : (
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" title="Inactiva" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

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
    };

    return (
      <div className="w-48 flex-shrink-0 bg-gray-50 dark:bg-neutral-800">
        <div className="sticky top-0 p-2.5">
          <nav className="space-y-5">
            <div>
              <h3 className="text-[10px] font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-2">
                Tu tienda
              </h3>
              {renderStoreList([operatorStore], 'branch')}
            </div>
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="w-48 flex-shrink-0 bg-gray-50 dark:bg-neutral-800">
      <div className="sticky top-0 p-2.5">
        <nav className="space-y-5">
          {/* Inicio */}
          <div>
            <h3 className="text-[10px] font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-2">
              Inicio
            </h3>
            <div className="space-y-0">
              <button
                type="button"
                onClick={() => setSection('home')}
                className={homeClasses}
              >
                <span className={currentSection === 'home' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                <span className="flex-1">Home</span>
              </button>
            </div>
          </div>

          {/* Por grupo */}
          <div>
            <h3 className="text-[10px] font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-2">
              Por grupo
            </h3>
            {renderStoreList(storesByGroup, 'group')}
          </div>

          {/* Distribuidor */}
          <div>
            <h3 className="text-[10px] font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-2">
              Distribuidor
            </h3>
            {renderStoreList(storesByBranch, 'branch')}
          </div>

          {/* Marca */}
          <div>
            <h3 className="text-[10px] font-normal text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 px-2">
              Marca
            </h3>
            {renderStoreList(storesByGroupBrand, 'group_brand')}
          </div>
        </nav>
      </div>
    </div>
  );
}
