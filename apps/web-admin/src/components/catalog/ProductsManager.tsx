import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { saveProductMetadataSelection } from '@/lib/product-metadata-selection';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type SortOrder = 'asc' | 'desc';

interface ProductListFilters {
  page: number;
  limit: number;
  businessId: string;
  categoryId: string;
  isAvailable: boolean | undefined;
  isFeatured: boolean | undefined;
  compatibilityUniversal: boolean | undefined;
  search: string;
  productType: string;
  priceMin: string;
  priceMax: string;
  sortBy: string;
  sortOrder: SortOrder;
}

const INITIAL_FILTERS: ProductListFilters = {
  page: 1,
  limit: 20,
  businessId: '',
  categoryId: '',
  isAvailable: undefined,
  isFeatured: undefined,
  compatibilityUniversal: undefined,
  search: '',
  productType: '',
  priceMin: '',
  priceMax: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

const TABLE_STATE_STORAGE_KEY = 'web-admin.products-manager.table';
const ALLOWED_SORT_BY = [
  'display_order',
  'name',
  'sku',
  'price',
  'created_at',
  'updated_at',
  'product_type',
  'is_available',
  'category',
  'business',
  'description',
];

interface StoredTableState {
  filters: ProductListFilters;
  selectedProductIds: string[];
  selectedSnapshots: Record<string, Product>;
  showSelectedOnly?: boolean;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function sanitizeFilters(value: unknown): ProductListFilters {
  const raw = value && typeof value === 'object' ? (value as Partial<ProductListFilters>) : {};
  const limit = PAGE_SIZE_OPTIONS.includes(Number(raw.limit)) ? Number(raw.limit) : INITIAL_FILTERS.limit;
  const page = Number.isInteger(Number(raw.page)) && Number(raw.page) > 0 ? Number(raw.page) : 1;
  const sortBy = ALLOWED_SORT_BY.includes(String(raw.sortBy || '')) ? String(raw.sortBy) : INITIAL_FILTERS.sortBy;
  const sortOrder: SortOrder = raw.sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    page,
    limit,
    businessId: typeof raw.businessId === 'string' ? raw.businessId : '',
    categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : '',
    isAvailable: asOptionalBoolean(raw.isAvailable),
    isFeatured: asOptionalBoolean(raw.isFeatured),
    compatibilityUniversal: asOptionalBoolean(raw.compatibilityUniversal),
    search: typeof raw.search === 'string' ? raw.search : '',
    productType: typeof raw.productType === 'string' ? raw.productType : '',
    priceMin: typeof raw.priceMin === 'string' ? raw.priceMin : raw.priceMin != null ? String(raw.priceMin) : '',
    priceMax: typeof raw.priceMax === 'string' ? raw.priceMax : raw.priceMax != null ? String(raw.priceMax) : '',
    sortBy,
    sortOrder,
  };
}

function sanitizeSnapshots(value: unknown): Record<string, Product> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, Product> = {};
  Object.entries(value as Record<string, Product>).forEach(([id, product]) => {
    if (product && typeof product === 'object' && typeof product.id === 'string') {
      next[id] = product;
    }
  });
  return next;
}

function readStoredTableState(): StoredTableState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TABLE_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const selectedProductIds = Array.isArray(parsed?.selectedProductIds)
      ? parsed.selectedProductIds.filter((id: unknown) => typeof id === 'string')
      : [];
    return {
      filters: sanitizeFilters(parsed?.filters),
      selectedProductIds,
      selectedSnapshots: sanitizeSnapshots(parsed?.selectedSnapshots),
      showSelectedOnly: Boolean(parsed?.showSelectedOnly),
    };
  } catch {
    return null;
  }
}

function writeStoredTableState(state: StoredTableState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TABLE_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('No se pudo guardar el estado de la tabla de productos:', error);
  }
}

function buildProductQueryParams(filters: ProductListFilters) {
  const params = new URLSearchParams();
  params.append('page', filters.page.toString());
  params.append('limit', filters.limit.toString());
  params.append('includeZeroPrice', 'true');
  if (filters.businessId) params.append('businessId', filters.businessId);
  if (filters.categoryId === 'uncategorized') {
    params.append('uncategorized', 'true');
  } else if (filters.categoryId) {
    params.append('categoryId', filters.categoryId);
  }
  if (filters.isAvailable !== undefined) {
    params.append('isAvailable', filters.isAvailable.toString());
  }
  if (filters.isFeatured !== undefined) {
    params.append('isFeatured', filters.isFeatured.toString());
  }
  if (filters.compatibilityUniversal !== undefined) {
    params.append('compatibilityUniversal', filters.compatibilityUniversal.toString());
  }
  if (filters.search) params.append('search', filters.search);
  if (filters.productType) params.append('productType', filters.productType);
  if (filters.priceMin !== '') params.append('priceMin', filters.priceMin);
  if (filters.priceMax !== '') params.append('priceMax', filters.priceMax);
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  return params;
}

function getVisiblePages(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 0) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push('ellipsis');
  if (total > 1) pages.push(total);
  return pages;
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  column: string;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (column: string) => void;
}) {
  const active = sortBy === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`group inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${
        active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {label}
      <span
        className={`inline-flex flex-col ${active ? 'text-gray-900' : 'text-gray-300 group-hover:text-gray-400'}`}
        aria-hidden
      >
        <svg
          className={`h-2 w-2 ${active && sortOrder === 'asc' ? 'text-black' : ''}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 0L10 6H0L5 0Z" />
        </svg>
        <svg
          className={`h-2 w-2 -mt-px ${active && sortOrder === 'desc' ? 'text-black' : ''}`}
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 6L0 0H10L5 6Z" />
        </svg>
      </span>
    </button>
  );
}

interface Product {
  id: string;
  business_id: string;
  business_name?: string;
  name: string;
  sku?: string | null;
  description?: string;
  image_url?: string;
  primary_image_url?: string;
  price: number;
  product_type?: string;
  category_id?: string;
  category_name?: string;
  is_available: boolean;
  is_featured: boolean;
  variants?: any;
  nutritional_info?: any;
  allergens?: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Business {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  business_id?: string;
  business_name?: string;
}

export default function ProductsManager() {
  const router = useRouter();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<ProductListFilters>(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [priceMinInput, setPriceMinInput] = useState('');
  const [priceMaxInput, setPriceMaxInput] = useState('');
  const [pageInput, setPageInput] = useState('1');
  const [tableReady, setTableReady] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    business_id: '',
    name: '',
    sku: '',
    description: '',
    image_url: '',
    price: 0,
    category_id: '',
    is_available: true,
    is_featured: false,
    variants: '',
    nutritional_info: '',
    allergens: '',
    display_order: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectedSnapshots, setSelectedSnapshots] = useState<Record<string, Product>>({});
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const selectedProductIdsRef = useRef<Set<string>>(selectedProductIds);
  selectedProductIdsRef.current = selectedProductIds;

  useEffect(() => {
    const stored = readStoredTableState();
    if (stored) {
      const onlySelected = Boolean(stored.showSelectedOnly) && stored.selectedProductIds.length > 0;
      const nextFilters = onlySelected
        ? { ...INITIAL_FILTERS, limit: stored.filters.limit }
        : stored.filters;
      setFilters(nextFilters);
      setSearchInput(nextFilters.search);
      setPriceMinInput(nextFilters.priceMin);
      setPriceMaxInput(nextFilters.priceMax);
      setPageInput(String(nextFilters.page));
      setSelectedProductIds(new Set(stored.selectedProductIds));
      setSelectedSnapshots(stored.selectedSnapshots);
      setShowSelectedOnly(onlySelected);
    }
    setTableReady(true);
  }, []);

  useEffect(() => {
    setSelectedSnapshots((prev) => {
      const next = { ...prev };
      products.forEach((product) => {
        if (selectedProductIds.has(product.id)) {
          next[product.id] = product;
        }
      });
      Object.keys(next).forEach((id) => {
        if (!selectedProductIds.has(id)) {
          delete next[id];
        }
      });
      return next;
    });
  }, [products, selectedProductIds]);

  useEffect(() => {
    if (!tableReady) return;
    writeStoredTableState({
      filters,
      selectedProductIds: Array.from(selectedProductIds),
      selectedSnapshots,
      showSelectedOnly,
    });
  }, [tableReady, filters, selectedProductIds, selectedSnapshots, showSelectedOnly]);

  // Cargar negocios
  useEffect(() => {
    const loadBusinesses = async () => {
      if (!token) return;
      try {
        const response = await apiRequest<{ data: Business[] }>('/businesses?limit=100', {
          method: 'GET',
        });
        setBusinesses(response.data || []);
      } catch (error) {
        console.error('Error cargando negocios:', error);
      }
    };
    loadBusinesses();
  }, [token]);

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      if (!token) return;
      try {
        const response = await apiRequest<{ data: Category[] }>('/catalog/categories?limit=100&isActive=true', {
          method: 'GET',
        });
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error cargando categorías:', error);
      }
    };
    loadCategories();
  }, [token]);

  // Cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      if (!token || !tableReady) return;
      if (showSelectedOnly) return;

      setLoading(true);
      try {
        const response = await apiRequest<ProductsResponse>(
          `/catalog/products?${buildProductQueryParams(filters).toString()}`,
          { method: 'GET' }
        );

        setProducts(response.data);
        setPagination(response.pagination);
        if (
          response.pagination.totalPages > 0 &&
          filters.page > response.pagination.totalPages
        ) {
          setFilters((prev) => ({ ...prev, page: response.pagination.totalPages }));
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [token, filters, tableReady, showSelectedOnly]);

  useEffect(() => {
    if (!tableReady) return;
    const timeout = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        setShowSelectedOnly(false);
        return { ...prev, search: searchInput, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput, tableReady]);

  useEffect(() => {
    if (!tableReady) return;
    const timeout = setTimeout(() => {
      setFilters((prev) => {
        if (prev.priceMin === priceMinInput && prev.priceMax === priceMaxInput) return prev;
        setShowSelectedOnly(false);
        return { ...prev, priceMin: priceMinInput, priceMax: priceMaxInput, page: 1 };
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [priceMinInput, priceMaxInput, tableReady]);

  useEffect(() => {
    setPageInput(String(pagination.page || filters.page));
  }, [pagination.page, filters.page]);

  const handleFilterChange = (key: keyof ProductListFilters, value: any) => {
    setShowSelectedOnly(false);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handleSort = (column: string) => {
    setShowSelectedOnly(false);
    setFilters((prev) => {
      if (prev.sortBy === column) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...prev, sortBy: column, sortOrder: 'asc', page: 1 };
    });
  };

  const handlePageChange = (page: number) => {
    if (showSelectedOnly) return;
    const nextPage = Math.min(Math.max(page, 1), Math.max(pagination.totalPages, 1));
    setFilters((prev) => ({ ...prev, page: nextPage }));
  };

  const handleGoToPage = () => {
    const parsed = parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(pagination.page));
      return;
    }
    handlePageChange(parsed);
  };

  const clearFilters = () => {
    setShowSelectedOnly(false);
    setSearchInput('');
    setPriceMinInput('');
    setPriceMaxInput('');
    setFilters((prev) => ({
      ...INITIAL_FILTERS,
      limit: prev.limit,
    }));
  };

  const handleShowSelected = () => {
    setSearchInput('');
    setPriceMinInput('');
    setPriceMaxInput('');
    setFilters((prev) => ({
      ...INITIAL_FILTERS,
      limit: prev.limit,
    }));
    setShowSelectedOnly(true);
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
    setSelectedSnapshots({});
    setShowSelectedOnly(false);
  };

  useEffect(() => {
    if (!showSelectedOnly || !token || !tableReady) return;
    const ids = Array.from(selectedProductIdsRef.current);
    if (ids.length === 0) {
      setShowSelectedOnly(false);
      return;
    }

    let cancelled = false;
    const loadSelected = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('ids', ids.join(','));
        params.set('includeZeroPrice', 'true');
        params.set('page', '1');
        params.set('limit', String(Math.min(Math.max(ids.length, 1), 100)));
        const response = await apiRequest<ProductsResponse>(`/catalog/products?${params.toString()}`, {
          method: 'GET',
        });
        if (cancelled) return;
        const rows = response.data || [];
        const foundIds = new Set(rows.map((product) => product.id));
        if (rows.length === 0) {
          setSelectedProductIds(new Set());
          setSelectedSnapshots({});
          setShowSelectedOnly(false);
          setProducts([]);
          return;
        }
        setProducts(rows);
        setPagination({
          page: 1,
          limit: Math.max(rows.length, 1),
          total: rows.length,
          totalPages: 1,
        });
        setSelectedProductIds(new Set(ids.filter((id) => foundIds.has(id))));
        setSelectedSnapshots((prev) => {
          const next: Record<string, Product> = {};
          rows.forEach((product) => {
            next[product.id] = product;
          });
          Object.entries(prev).forEach(([id, product]) => {
            if (foundIds.has(id)) next[id] = next[id] || product;
          });
          return next;
        });
      } catch (error) {
        console.error('Error cargando productos seleccionados:', error);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSelected();
    return () => {
      cancelled = true;
    };
  }, [showSelectedOnly, token, tableReady]);

  const activeFilterCount = [
    Boolean(filters.search),
    Boolean(filters.businessId),
    Boolean(filters.categoryId),
    filters.isAvailable !== undefined,
    filters.isFeatured !== undefined,
    filters.compatibilityUniversal !== undefined,
    Boolean(filters.productType),
    filters.priceMin !== '',
    filters.priceMax !== '',
  ].filter(Boolean).length;

  // Filtrar categorías por negocio seleccionado
  const filteredCategories = filters.businessId
    ? categories.filter((cat) => !cat.business_id || cat.business_id === filters.businessId)
    : categories;

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      business_id: product.business_id,
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      image_url: product.image_url || '',
      price: product.price,
      category_id: product.category_id || '',
      is_available: product.is_available,
      is_featured: product.is_featured,
      variants: product.variants ? JSON.stringify(product.variants, null, 2) : '',
      nutritional_info: product.nutritional_info ? JSON.stringify(product.nutritional_info, null, 2) : '',
      allergens: product.allergens ? product.allergens.join(', ') : '',
      display_order: product.display_order,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setFormData({
      business_id: filters.businessId || '',
      name: '',
      sku: '',
      description: '',
      image_url: '',
      price: 0,
      category_id: '',
      is_available: true,
      is_featured: false,
      variants: '',
      nutritional_info: '',
      allergens: '',
      display_order: 0,
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.business_id || !formData.name || formData.price <= 0) {
      alert('Completa los campos requeridos: Negocio, Nombre y Precio');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        business_id: formData.business_id,
        name: formData.name,
        sku: formData.sku.trim(),
        description: formData.description || undefined,
        image_url: formData.image_url || undefined,
        price: parseFloat(formData.price.toString()),
        is_available: formData.is_available,
        is_featured: formData.is_featured,
        display_order: formData.display_order,
      };

      if (formData.category_id) {
        payload.category_id = formData.category_id;
      }

      if (formData.variants) {
        try {
          payload.variants = JSON.parse(formData.variants);
        } catch (e) {
          alert('El formato de variantes (JSON) es inválido');
          setSaving(false);
          return;
        }
      }

      if (formData.nutritional_info) {
        try {
          payload.nutritional_info = JSON.parse(formData.nutritional_info);
        } catch (e) {
          alert('El formato de información nutricional (JSON) es inválido');
          setSaving(false);
          return;
        }
      }

      if (formData.allergens) {
        payload.allergens = formData.allergens.split(',').map((a) => a.trim()).filter((a) => a);
      }

      if (isEditing && selectedProduct) {
        await apiRequest(`/catalog/products/${selectedProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/catalog/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowForm(false);
      setSelectedProduct(null);
      const response = await apiRequest<ProductsResponse>(
        `/catalog/products?${buildProductQueryParams(filters).toString()}`,
        { method: 'GET' }
      );
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('¿Estás seguro de que deseas desactivar este producto?')) return;

    try {
      await apiRequest(`/catalog/products/${id}`, {
        method: 'DELETE',
      });
      const response = await apiRequest<ProductsResponse>(
        `/catalog/products?${buildProductQueryParams(filters).toString()}`,
        { method: 'GET' }
      );
      setProducts(response.data);
      setPagination(response.pagination);
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
        setShowForm(false);
      }
    } catch (error: any) {
      console.error('Error eliminando producto:', error);
      alert(error.response?.data?.message || 'Error al desactivar el producto');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const productTypeLabels: Record<string, { label: string; color: string }> = {
    food: { label: 'Alimento', color: 'bg-blue-100 text-blue-800' },
    beverage: { label: 'Bebida', color: 'bg-cyan-100 text-cyan-800' },
    medicine: { label: 'Medicamento', color: 'bg-red-100 text-red-800' },
    grocery: { label: 'Abarrotes', color: 'bg-yellow-100 text-yellow-800' },
    non_food: { label: 'No alimenticio', color: 'bg-gray-100 text-gray-800' },
    refaccion: { label: 'Refacción', color: 'bg-slate-100 text-slate-800' },
    accesorio: { label: 'Accesorio', color: 'bg-violet-100 text-violet-800' },
    servicio_instalacion: { label: 'Instalación', color: 'bg-orange-100 text-orange-800' },
    servicio_mantenimiento: { label: 'Mantenimiento', color: 'bg-amber-100 text-amber-800' },
    fluido: { label: 'Fluido', color: 'bg-sky-100 text-sky-800' },
  };

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 flex-1 flex-wrap items-center">
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o descripción..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 flex-1 max-w-sm"
          />
          <select
            value={filters.isFeatured === undefined ? '' : filters.isFeatured.toString()}
            onChange={(e) =>
              handleFilterChange('isFeatured', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Destacados: todos</option>
            <option value="true">Solo destacados</option>
            <option value="false">No destacados</option>
          </select>
          <select
            value={filters.compatibilityUniversal === undefined ? '' : filters.compatibilityUniversal.toString()}
            onChange={(e) =>
              handleFilterChange(
                'compatibilityUniversal',
                e.target.value === '' ? undefined : e.target.value === 'true',
              )
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Compatibilidad: todas</option>
            <option value="true">Solo universales</option>
            <option value="false">Sin universal</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpiar filtros ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedProductIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleShowSelected}
                className={`px-4 py-2 text-xs rounded border transition-colors ${
                  showSelectedOnly
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mostrar seleccionados ({selectedProductIds.size})
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Quitar selección
              </button>
            </>
          )}
          {selectedProductIds.size > 0 && (
            <button
              type="button"
              onClick={() => {
                saveProductMetadataSelection(
                  Object.values(selectedSnapshots).map((product) => ({
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    description: product.description,
                    image_url: product.image_url,
                    primary_image_url: product.primary_image_url,
                    price: product.price,
                    product_type: product.product_type,
                    category_id: product.category_id,
                    category_name: product.category_name,
                    business_name: product.business_name,
                  })),
                );
                router.push('/products/completar-metadatos');
              }}
              className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900 transition-colors"
            >
              Completar metadatos ({selectedProductIds.size})
            </button>
          )}
          <select
            value={filters.businessId}
            onChange={(e) => handleFilterChange('businessId', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">Todos los negocios</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleNewProduct}
            disabled={!filters.businessId}
            className="px-4 py-2 text-xs bg-black text-white rounded hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!filters.businessId ? 'Selecciona un negocio primero' : ''}
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-260px)]">
          <div className="overflow-auto relative flex-1">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-20 flex items-start justify-center pt-16">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              </div>
            )}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && products.every((p) => selectedProductIds.has(p.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds((prev) => {
                          const next = new Set(prev);
                          products.forEach((p) => next.add(p.id));
                          return next;
                        });
                      } else {
                        setSelectedProductIds((prev) => {
                          const next = new Set(prev);
                          products.forEach((p) => next.delete(p.id));
                          return next;
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th scope="col" className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Imagen
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Producto" column="name" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Categoría" column="category" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Descripción" column="description" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Precio" column="price" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Tipo" column="product_type" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Disponibilidad" column="is_available" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 text-left bg-gray-50">
                  <SortableHeader label="Negocio" column="business" sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={handleSort} />
                </th>
                <th scope="col" className="px-3 py-2 w-20 bg-gray-50" />
              </tr>
              <tr className="border-t border-gray-200">
                <th className="px-3 py-1.5 bg-white" />
                <th className="px-3 py-1.5 bg-white" />
                <th className="px-2 py-1.5 bg-white">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full min-w-[8rem] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </th>
                <th className="px-2 py-1.5 bg-white">
                  <select
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    className="w-full min-w-[8rem] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">Todas</option>
                    <option value="uncategorized">Sin categoría</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} {category.business_name ? `(${category.business_name})` : ''}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-1.5 bg-white" />
                <th className="px-2 py-1.5 bg-white">
                  <div className="flex items-center gap-1 min-w-[8rem]">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceMinInput}
                      onChange={(e) => setPriceMinInput(e.target.value)}
                      placeholder="Mín"
                      className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    <span className="text-gray-300 text-[10px]">–</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceMaxInput}
                      onChange={(e) => setPriceMaxInput(e.target.value)}
                      placeholder="Máx"
                      className="w-16 px-1.5 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                  </div>
                </th>
                <th className="px-2 py-1.5 bg-white">
                  <select
                    value={filters.productType}
                    onChange={(e) => handleFilterChange('productType', e.target.value)}
                    className="w-full min-w-[7rem] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">Todos</option>
                    {Object.entries(productTypeLabels).map(([value, info]) => (
                      <option key={value} value={value}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-1.5 bg-white">
                  <select
                    value={filters.isAvailable === undefined ? '' : filters.isAvailable.toString()}
                    onChange={(e) =>
                      handleFilterChange('isAvailable', e.target.value === '' ? undefined : e.target.value === 'true')
                    }
                    className="w-full min-w-[7rem] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">Todas</option>
                    <option value="true">Disponible</option>
                    <option value="false">No disponible</option>
                  </select>
                </th>
                <th className="px-2 py-1.5 bg-white">
                  <select
                    value={filters.businessId}
                    onChange={(e) => handleFilterChange('businessId', e.target.value)}
                    className="w-full min-w-[8rem] px-2 py-1 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="">Todos</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-1.5 bg-white" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const imageUrl = product.image_url || product.primary_image_url;
                const typeInfo = productTypeLabels[product.product_type || ''] || {
                  label: product.product_type || '—',
                  color: 'bg-gray-100 text-gray-800',
                };

                const isChecked = selectedProductIds.has(product.id);

                return (
                  <tr
                    key={product.id}
                    className={`cursor-pointer transition-colors ${
                      isChecked || selectedProduct?.id === product.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('input[type="checkbox"]') || target.closest('button')) return;
                      handleSelectProduct(product);
                    }}
                  >
                    <td
                      className="px-3 py-2 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedProductIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.id)) next.delete(product.id);
                            else next.add(product.id);
                            return next;
                          });
                        }}
                        className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        aria-label={`Seleccionar ${product.name}`}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="h-8 w-8 rounded object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-medium text-gray-900 max-w-md">{product.name}</div>
                      {product.sku && (
                        <div className="text-[10px] font-light text-gray-500 mt-0.5">SKU: {product.sku}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {product.category_name ? (
                        <span className="text-xs text-gray-700">{product.category_name}</span>
                      ) : (
                        <span className="text-[11px] text-gray-400">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs font-light text-gray-500 max-w-xs truncate">
                        {product.description || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{formatCurrency(product.price || 0)}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          product.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.is_available ? 'Disponible' : 'No disponible'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-600">{product.business_name || '—'}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xs text-gray-500">No se encontraron productos con estos filtros</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <p>
                {pagination.total === 0
                  ? '0 productos'
                  : `Mostrando ${((pagination.page - 1) * pagination.limit) + 1} a ${Math.min(pagination.page * pagination.limit, pagination.total)} de ${pagination.total}`}
              </p>
              <label className="flex items-center gap-1.5">
                <span className="text-gray-500">Filas</span>
                <select
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value, 10))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={pagination.page <= 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Primera página"
              >
                «
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              {getVisiblePages(pagination.page, pagination.totalPages).map((item, index) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[1.75rem] px-2 py-1 text-xs border rounded ${
                      item === pagination.page
                        ? 'bg-black text-white border-black'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Última página"
              >
                »
              </button>
              <label className="flex items-center gap-1.5 ml-2">
                <span className="text-xs text-gray-500">Ir a</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(pagination.totalPages, 1)}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGoToPage();
                  }}
                  className="w-14 px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <button
                  type="button"
                  onClick={handleGoToPage}
                  className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                >
                  Ir
                </button>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de edición/creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-medium text-gray-900">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COLUMNA IZQUIERDA - Información del Producto */}
              <div className="lg:col-span-2 space-y-6">
                {/* Información General */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Información General
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Sin SKU"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Media
                  </h3>
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      URL de la Imagen
                    </label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* Variantes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Variantes
                  </h3>
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Variantes (JSON)
                    </label>
                    <textarea
                      value={formData.variants}
                      onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                      rows={4}
                      placeholder='{"size": ["pequeño", "mediano", "grande"], "toppings": [...]}'
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Formato JSON opcional para variantes del producto</p>
                  </div>
                </div>

                {/* Información Nutricional */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Información Nutricional
                  </h3>
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Información Nutricional (JSON)
                    </label>
                    <textarea
                      value={formData.nutritional_info}
                      onChange={(e) => setFormData({ ...formData, nutritional_info: e.target.value })}
                      rows={4}
                      placeholder='{"calories": 500, "protein": 25, "carbs": 50}'
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Formato JSON opcional para información nutricional</p>
                  </div>
                </div>

                {/* Alérgenos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Alérgenos
                  </h3>
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Alérgenos
                    </label>
                    <input
                      type="text"
                      value={formData.allergens}
                      onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                      placeholder="gluten, lactosa, soja (separados por comas)"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Separados por comas</p>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA - Organización y Configuración */}
              <div className="lg:col-span-1 space-y-6">
                {/* Organizar Producto */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Organizar Producto
                  </h3>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Negocio <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.business_id}
                      onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      required
                      disabled={isEditing}
                    >
                      <option value="">Selecciona un negocio</option>
                      {businesses.map((business) => (
                        <option key={business.id} value={business.id}>
                          {business.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Categoría
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    >
                      <option value="">Sin categoría</option>
                      {categories
                        .filter((cat) => !cat.business_id || cat.business_id === formData.business_id)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} {category.business_name ? `(${category.business_name})` : '(Global)'}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Disponibilidad */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Disponibilidad
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Estado</label>
                      <select
                        value={formData.is_available.toString()}
                        onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'true' })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      >
                        <option value="true">Disponible</option>
                        <option value="false">No Disponible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Destacado</label>
                      <select
                        value={formData.is_featured.toString()}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.value === 'true' })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      >
                        <option value="false">No</option>
                        <option value="true">Sí</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Precio y Visualización */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                    Precio y Visualización
                  </h3>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Precio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.business_id || !formData.name || formData.price <= 0}
                className="px-4 py-2 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

