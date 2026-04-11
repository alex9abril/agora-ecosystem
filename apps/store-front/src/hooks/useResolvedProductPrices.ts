import { useEffect, useMemo, useState } from 'react';
import type { StoreContextType } from '@/contexts/StoreContext';
import type { BranchTaxSettings } from '@/lib/branches';
import { getBranchTaxSettingsCached, resolveDisplayPrice } from '@/lib/price-display';

interface UseResolvedProductPricesOptions<T extends { id: string }> {
  items: T[];
  contextType: StoreContextType;
  branchId?: string | null;
  getBasePrice: (item: T, contextType: StoreContextType) => number | null | undefined;
  getBusinessId?: (item: T) => string | null | undefined;
}

function arePriceMapsEqual(
  current: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return currentKeys.every((key) => current[key] === next[key]);
}

function areTaxSettingsMapsEqual(
  current: Record<string, BranchTaxSettings>,
  next: Record<string, BranchTaxSettings>,
): boolean {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return currentKeys.every((key) => {
    const currentValue = current[key];
    const nextValue = next[key];

    return (
      currentValue?.included_in_price === nextValue?.included_in_price &&
      currentValue?.display_tax_breakdown === nextValue?.display_tax_breakdown &&
      currentValue?.show_tax_included_label === nextValue?.show_tax_included_label
    );
  });
}

export function useResolvedProductPrices<T extends { id: string }>(
  options: UseResolvedProductPricesOptions<T>,
) {
  const { items, contextType, branchId, getBasePrice, getBusinessId } = options;
  const [branchTaxSettings, setBranchTaxSettings] = useState<BranchTaxSettings | null>(null);
  const [taxSettingsByBusiness, setTaxSettingsByBusiness] = useState<Record<string, BranchTaxSettings>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [resolvedPrices, setResolvedPrices] = useState<Record<string, number>>({});

  const businessIds = useMemo(() => {
    if (!getBusinessId || contextType === 'sucursal') {
      return [];
    }

    return Array.from(
      new Set(
        items
          .map((item) => getBusinessId(item))
          .filter((businessId): businessId is string => Boolean(businessId)),
      ),
    );
  }, [contextType, getBusinessId, items]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      setSettingsLoaded(false);

      if (contextType === 'sucursal') {
        if (!branchId) {
          if (!cancelled) {
            setBranchTaxSettings(null);
            setTaxSettingsByBusiness((current) => (Object.keys(current).length === 0 ? current : {}));
            setSettingsLoaded(true);
          }
          return;
        }

        const settings = await getBranchTaxSettingsCached(branchId);
        if (!cancelled) {
          setBranchTaxSettings((current) =>
            current &&
            current.included_in_price === settings.included_in_price &&
            current.display_tax_breakdown === settings.display_tax_breakdown &&
            current.show_tax_included_label === settings.show_tax_included_label
              ? current
              : settings,
          );
          setTaxSettingsByBusiness((current) => (Object.keys(current).length === 0 ? current : {}));
          setSettingsLoaded(true);
        }
        return;
      }

      if (businessIds.length === 0) {
        if (!cancelled) {
          setBranchTaxSettings(null);
          setTaxSettingsByBusiness((current) => (Object.keys(current).length === 0 ? current : {}));
          setSettingsLoaded(true);
        }
        return;
      }

      const entries = await Promise.all(
        businessIds.map(async (businessId) => [businessId, await getBranchTaxSettingsCached(businessId)] as const),
      );

      if (!cancelled) {
        setBranchTaxSettings(null);
        const nextSettings = Object.fromEntries(entries);
        setTaxSettingsByBusiness((current) =>
          areTaxSettingsMapsEqual(current, nextSettings) ? current : nextSettings,
        );
        setSettingsLoaded(true);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [branchId, businessIds, contextType]);

  useEffect(() => {
    let cancelled = false;

    const computePrices = async () => {
      if (items.length === 0) {
        setResolvedPrices((current) => (Object.keys(current).length === 0 ? current : {}));
        return;
      }

      if (!settingsLoaded) {
        setResolvedPrices((current) => (Object.keys(current).length === 0 ? current : {}));
        return;
      }

      const entries = await Promise.all(
        items.map(async (item) => {
          const basePrice = getBasePrice(item, contextType);

          if (basePrice === null || basePrice === undefined || !Number.isFinite(basePrice)) {
            return [item.id, 0] as const;
          }

          const taxSettings =
            contextType === 'sucursal'
              ? branchTaxSettings
              : getBusinessId
              ? taxSettingsByBusiness[getBusinessId(item) || '']
              : null;

          if (!taxSettings) {
            return [item.id, basePrice] as const;
          }

          return [
            item.id,
            await resolveDisplayPrice({
              productId: item.id,
              basePrice,
              taxSettings,
            }),
          ] as const;
        }),
      );

      if (!cancelled) {
        const nextPrices = Object.fromEntries(entries);
        setResolvedPrices((current) => (arePriceMapsEqual(current, nextPrices) ? current : nextPrices));
      }
    };

    computePrices();

    return () => {
      cancelled = true;
    };
  }, [
    branchTaxSettings,
    contextType,
    getBasePrice,
    getBusinessId,
    items,
    settingsLoaded,
    taxSettingsByBusiness,
  ]);

  const pendingIds = useMemo(() => {
    if (!settingsLoaded) {
      return new Set(items.map((item) => item.id));
    }

    return new Set(items.filter((item) => resolvedPrices[item.id] === undefined).map((item) => item.id));
  }, [items, resolvedPrices, settingsLoaded]);

  return {
    resolvedPrices,
    pricesReady: settingsLoaded,
    isPricePending: (itemId: string) => pendingIds.has(itemId),
  };
}
