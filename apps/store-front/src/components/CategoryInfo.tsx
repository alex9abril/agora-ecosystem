/**
 * Panel de filtros del catálogo: categorías y parámetros que el API ya soporta.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { categoriesService, ProductCategory } from '@/lib/categories';
import { catalogFiltersActive, parseCatalogFilters } from '@/lib/catalog-filters';
import { getSelectedVehicle } from '@/lib/vehicle-storage';
import { useAppSelector } from '@/store/hooks';
import { selectRootCategories, selectCategoriesLoading } from '@/store/slices/categoriesSlice';

interface CategoryInfoProps {
  categoryId?: string;
  onCategoryLoaded?: (name: string, description?: string) => void;
}

const PRODUCT_TYPES = [
  { id: '', label: 'Todos' },
  { id: 'refaccion', label: 'Refacciones' },
  { id: 'accesorio', label: 'Accesorios' },
] as const;

const SORT_OPTIONS = [
  { value: '', label: 'Relevancia' },
  { value: 'price:asc', label: 'Precio: menor a mayor' },
  { value: 'price:desc', label: 'Precio: mayor a menor' },
  { value: 'name:asc', label: 'Nombre A-Z' },
  { value: 'created_at:desc', label: 'Más recientes' },
] as const;

function vehicleParts(vehicle: any | null): { name: string; year: string } | null {
  if (!vehicle) return null;
  const name = [vehicle.brand_name || vehicle.make, vehicle.model_name || vehicle.model]
    .filter(Boolean)
    .join(' ');
  const start = vehicle.year || vehicle.year_start;
  const end = vehicle.year_end;
  const year =
    start && end && String(end) !== String(start) ? `${start}–${end}` : start ? String(start) : '';
  if (!name && !year) return null;
  return { name: name || 'Vehículo', year };
}

function countActiveFilters(filters: ReturnType<typeof parseCatalogFilters>): number {
  return [
    filters.categoryId,
    filters.uncategorized,
    filters.collectionId,
    filters.search,
    filters.productType,
    filters.priceMin != null,
    filters.priceMax != null,
    filters.isFeatured,
    filters.compatible,
    filters.sortBy,
  ].filter(Boolean).length;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 border-t border-neutral-200 pt-5">
      <h3 className="mb-2.5 text-[11px] font-medium text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

function NavRow({
  active,
  label,
  count,
  onClick,
}: {
  active?: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-baseline justify-between gap-3 py-[6px] text-left text-[13px] leading-5 transition-colors ${
        active ? 'font-medium text-neutral-900' : 'font-normal text-neutral-600 hover:text-neutral-900'
      }`}
    >
      <span className="min-w-0 truncate">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className={`shrink-0 tabular-nums text-[11px] ${active ? 'text-neutral-500' : 'text-neutral-400'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function SwitchRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-0.5"
    >
      <span className="text-[13px] text-neutral-700">{label}</span>
      <span
        aria-hidden
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-neutral-900' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[14px]' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}

const fieldClass =
  'h-9 w-full border border-neutral-200 bg-white px-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900';

export default function CategoryInfo({ categoryId, onCategoryLoaded }: CategoryInfoProps) {
  const router = useRouter();
  const rootCategories = useAppSelector(selectRootCategories);
  const rootLoading = useAppSelector(selectCategoriesLoading);
  const filters = parseCatalogFilters(router.query);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(Boolean(categoryId));
  const [error, setError] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState(filters.priceMin != null ? String(filters.priceMin) : '');
  const [priceMax, setPriceMax] = useState(filters.priceMax != null ? String(filters.priceMax) : '');
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  useEffect(() => {
    setPriceMin(filters.priceMin != null ? String(filters.priceMin) : '');
    setPriceMax(filters.priceMax != null ? String(filters.priceMax) : '');
  }, [filters.priceMin, filters.priceMax]);

  useEffect(() => {
    const syncVehicle = () => setSelectedVehicle(getSelectedVehicle());
    syncVehicle();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === 'user_vehicle_selected' || event.key === 'user_vehicle') {
        syncVehicle();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('vehicle-selected', syncVehicle);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('vehicle-selected', syncVehicle);
    };
  }, []);

  useEffect(() => {
    if (categoryId) {
      loadCategoryInfo();
      return;
    }
    setCategory(null);
    setSubcategories([]);
    setLoading(false);
    setError(null);
  }, [categoryId]);

  const loadCategoryInfo = async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      setError(null);
      const categoryData = await categoriesService.getCategoryById(categoryId);
      setCategory(categoryData);
      if (onCategoryLoaded && categoryData.name) {
        onCategoryLoaded(categoryData.name, categoryData.description || undefined);
      }
      const subcategoriesResponse = await categoriesService.getSubcategories(categoryId, {
        isActive: true,
        limit: 50,
      });
      setSubcategories(subcategoriesResponse.data);
    } catch (err: any) {
      console.error('Error cargando información de categoría:', err);
      setError(`Error al cargar la información de la categoría: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateQuery = (patch: Record<string, string | null | undefined>) => {
    const query = { ...router.query };
    delete query.page;
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === '') {
        delete query[key];
      } else {
        query[key] = value;
      }
    });
    router.push({ pathname: router.pathname, query }, undefined, { shallow: false });
  };

  const clearFilters = () => {
    updateQuery({
      categoryId: null,
      uncategorized: null,
      collectionId: null,
      search: null,
      q: null,
      productType: null,
      priceMin: null,
      priceMax: null,
      featured: null,
      isFeatured: null,
      compatible: null,
      sortBy: null,
      sortOrder: null,
    });
  };

  const applyPrice = () => {
    const min = priceMin.trim() === '' ? null : priceMin.trim();
    const max = priceMax.trim() === '' ? null : priceMax.trim();
    const currentMin = filters.priceMin != null ? String(filters.priceMin) : null;
    const currentMax = filters.priceMax != null ? String(filters.priceMax) : null;
    if (min === currentMin && max === currentMax) return;
    updateQuery({ priceMin: min, priceMax: max });
  };

  const sortValue =
    filters.sortBy && filters.sortOrder
      ? `${filters.sortBy}:${filters.sortOrder}`
      : filters.sortBy === 'price'
        ? 'price:asc'
        : '';

  const items = categoryId ? subcategories : rootCategories;
  const vehicle = vehicleParts(selectedVehicle);
  const hasExtraFilters = catalogFiltersActive(filters);
  const activeCount = countActiveFilters(filters);

  const panel = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium text-neutral-900">Filtros</p>
        {hasExtraFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[12px] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Limpiar
          </button>
        )}
      </div>

      {vehicle && (
        <div className="mt-5 border-t border-neutral-200 pt-5">
          <p className="text-[11px] font-medium text-neutral-500">Vehículo</p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-neutral-900">{vehicle.name}</p>
          {vehicle.year && <p className="mt-0.5 text-[12px] text-neutral-500">{vehicle.year}</p>}
          <div className="mt-3">
            <SwitchRow
              checked={filters.compatible === true}
              label="Solo compatibles"
              onChange={(next) => updateQuery({ compatible: next ? 'true' : 'false' })}
            />
          </div>
        </div>
      )}

      <Section title="Categorías">
        <NavRow
          active={!categoryId}
          label="Todos los productos"
          onClick={() => updateQuery({ categoryId: null, uncategorized: null })}
        />

        {categoryId && category && (
          <p className="pt-1 pb-0.5 text-[13px] font-medium text-neutral-900">{category.name}</p>
        )}

        {items.map((item) => (
          <NavRow
            key={item.id}
            active={item.id === categoryId}
            label={item.name}
            count={item.total_products}
            onClick={() => updateQuery({ categoryId: item.id, uncategorized: null })}
          />
        ))}
      </Section>

      <Section title="Tipo">
        {PRODUCT_TYPES.map((type) => (
          <NavRow
            key={type.id || 'all'}
            active={(filters.productType || '') === type.id}
            label={type.label}
            onClick={() => updateQuery({ productType: type.id || null })}
          />
        ))}
      </Section>

      <Section title="Precio">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">
              $
            </span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="Mín."
              aria-label="Precio mínimo"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
              className={`${fieldClass} pl-6`}
            />
          </label>
          <span className="shrink-0 text-neutral-300">–</span>
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-neutral-400">
              $
            </span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="Máx."
              aria-label="Precio máximo"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onBlur={applyPrice}
              onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
              className={`${fieldClass} pl-6`}
            />
          </label>
        </div>
      </Section>

      <Section title="Ordenar">
        <select
          value={sortValue}
          aria-label="Ordenar productos"
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value ? e.target.value.split(':') : [null, null];
            updateQuery({ sortBy, sortOrder });
          }}
          className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8"><path fill="%23737373" d="M1 1.5l5 5 5-5"/></svg>')] bg-[length:10px] bg-[right_10px_center] bg-no-repeat pr-8`}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value || 'default'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Más opciones">
        <SwitchRow
          checked={Boolean(filters.isFeatured)}
          label="Solo destacados"
          onChange={(next) => updateQuery({ featured: next ? 'true' : null })}
        />
      </Section>
    </div>
  );

  if (loading || (rootLoading && !categoryId && rootCategories.length === 0)) {
    return (
      <div className="animate-pulse space-y-4 py-1">
        <div className="h-4 w-16 bg-neutral-200" />
        <div className="h-px bg-neutral-200" />
        <div className="h-4 w-28 bg-neutral-200" />
        <div className="h-4 w-40 bg-neutral-200" />
        <div className="h-4 w-32 bg-neutral-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-neutral-200 px-4 py-3 text-[13px] text-neutral-700">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 md:hidden">
        <details className="group border-y border-neutral-200">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[13px] font-medium text-neutral-900 [&::-webkit-details-marker]:hidden">
            <span>Filtros</span>
            <span className="text-[12px] font-normal text-neutral-400">
              {activeCount > 0 ? `${activeCount} activos` : 'Ver'}
            </span>
          </summary>
          <div className="pb-5">{panel}</div>
        </details>
      </div>
      <div className="hidden md:block">{panel}</div>
    </>
  );
}
