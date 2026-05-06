/**
 * Grid de productos con filtros por contexto
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { productsService, Product } from '@/lib/products';
import { taxesService } from '@/lib/taxes';
import { branchesService, BranchTaxSettings } from '@/lib/branches';
import { useStoreContext } from '@/contexts/StoreContext';
import ProductCard from './ProductCard';
import ProductListItem from './ProductListItem';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';

const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

type ViewMode = 'grid' | 'list';

interface ProductGridProps {
  filters?: {
    categoryId?: string;
    collectionId?: string;
    search?: string;
    isFeatured?: boolean;
  };
  onProductClick?: (product: Product) => void;
  className?: string;
  defaultView?: ViewMode;
}

function PaginationBar({
  currentPage,
  pageSize,
  totalPages,
  totalProducts,
  pageItemCount,
  setCurrentPage,
  setPageSize,
}: {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalProducts: number;
  pageItemCount: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}) {
  const showBar = totalPages > 1 || currentPage > 1 || pageItemCount >= pageSize;
  if (!showBar) return null;

  const canGoNext = totalPages > 1 ? currentPage < totalPages : pageItemCount >= pageSize;
  const totalPagesLabel = totalPages > 1 ? String(totalPages) : '?';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-600">
        Mostrando{' '}
        <span className="font-medium text-gray-800">
          {(currentPage - 1) * pageSize + (pageItemCount > 0 ? 1 : 0)}
          {'-'}{(currentPage - 1) * pageSize + pageItemCount}
        </span>{' '}
        {totalProducts > 0 && (
          <>
            de <span className="font-medium text-gray-800">{totalProducts}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-end">
        <label className="text-sm text-gray-600 flex items-center gap-2">
          Por página
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
            value={pageSize}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              if (!Number.isFinite(next)) return;
              setPageSize(next);
              setCurrentPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Â«
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <div className="px-2 text-sm text-gray-700">
            {currentPage} / {totalPagesLabel}
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => (totalPages > 1 ? Math.min(totalPages, p + 1) : p + 1))}
            disabled={!canGoNext}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={totalPages <= 1 || currentPage >= totalPages}
            className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Â»
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ filters, onProductClick, className = '', defaultView = 'list' }: ProductGridProps) {
  const router = useRouter();
  const { contextType, groupId, branchId, brandId } = useStoreContext();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [branchTaxSettings, setBranchTaxSettings] = useState<BranchTaxSettings | null>(null);
  const [taxSettingsByBusiness, setTaxSettingsByBusiness] = useState<Record<string, BranchTaxSettings>>({});
  const [taxSettingsLoaded, setTaxSettingsLoaded] = useState(false);
  const [finalPrices, setFinalPrices] = useState<Record<string, number>>({});

  // PaginaciÃ³n (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const loadSeqRef = useRef(0);

  // Guardar preferencia de vista en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('productViewMode') as ViewMode;
      if (savedView === 'grid' || savedView === 'list') {
        setViewMode(savedView);
      }
    }
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('productViewMode', mode);
    }
  };

  // Memoizar los parámetros para evitar llamadas innecesarias
  // Usar JSON.stringify para comparar filters de forma estable
  const filtersKey = useMemo(() => {
    return JSON.stringify(filters || {});
  }, [filters]);

  useEffect(() => {
    // Al cambiar contexto/filtros, volver a la primera pÃ¡gina
    setCurrentPage(1);
  }, [contextType, groupId, branchId, brandId, filtersKey]);

  useEffect(() => {
    void loadProducts(currentPage, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType, groupId, branchId, brandId, filtersKey, currentPage, pageSize]);

  // Cargar configuracion de impuestos de la sucursal (solo contexto sucursal)
  useEffect(() => {
    const loadBranchTaxes = async () => {
      setTaxSettingsLoaded(false);
      if (contextType === 'sucursal' && branchId) {
        try {
          const settings = await branchesService.getBranchTaxSettings(branchId);
          setBranchTaxSettings(settings);
          setTaxSettingsLoaded(true);
        } catch (err) {
          console.warn('[ProductGrid] No se pudo obtener configuracion de impuestos de la sucursal:', err);
          setBranchTaxSettings(null);
          setTaxSettingsLoaded(true);
        }
      } else {
        setBranchTaxSettings(null);
        setTaxSettingsLoaded(true);
      }
    };
    loadBranchTaxes();
  }, [contextType, branchId]);

  // Cargar configuracion de impuestos por negocio para contextos no sucursal (usado para mostrar precios con impuestos)
  useEffect(() => {
    const loadBusinessTaxSettings = async () => {
      if (!products || products.length === 0 || (contextType === 'sucursal' && branchId)) {
        setTaxSettingsByBusiness({});
        setTaxSettingsLoaded(true);
        return;
      }

      setTaxSettingsLoaded(false);
      const uniqueBusinessIds = Array.from(new Set(products.map(p => p.business_id).filter(Boolean)));
      if (uniqueBusinessIds.length === 0) {
        setTaxSettingsByBusiness({});
        setTaxSettingsLoaded(true);
        return;
      }

      try {
        const entries = await Promise.all(
          uniqueBusinessIds.map(async (businessId) => {
            try {
              const settings = await branchesService.getBranchTaxSettings(businessId);
              return [businessId, settings || DEFAULT_BRANCH_TAX_SETTINGS] as const;
            } catch (err) {
              console.warn(`[ProductGrid] No se pudo obtener configuracion de impuestos del negocio ${businessId}:`, err);
              return [businessId, DEFAULT_BRANCH_TAX_SETTINGS] as const;
            }
          })
        );

        const map: Record<string, BranchTaxSettings> = {};
        entries.forEach(([businessId, settings]) => {
          map[businessId] = settings || DEFAULT_BRANCH_TAX_SETTINGS;
        });
        setTaxSettingsByBusiness(map);
        setTaxSettingsLoaded(true);
      } catch (err) {
        console.warn('[ProductGrid] Error cargando configuracion de impuestos por negocio:', err);
        setTaxSettingsByBusiness({});
        setTaxSettingsLoaded(true);
      }
    };

    loadBusinessTaxSettings();
  }, [products, contextType, branchId]);

  const loadProducts = async (page: number = currentPage, limit: number = pageSize) => {
    const seq = ++loadSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      setFinalPrices({});

      const params: any = {
        isAvailable: true,
        ...filters,
        page,
        limit,
      };

      // Filtrar según contexto
      if (contextType === 'grupo' && groupId) {
        params.groupId = groupId;
      } else if (contextType === 'sucursal' && branchId) {
        params.branchId = branchId;
      } else if (contextType === 'brand' && brandId) {
        params.vehicleBrandId = brandId;
      }

      console.log('🔍 [ProductGrid] Loading products with params:', {
        contextType,
        groupId,
        branchId,
        brandId,
        filters,
        finalParams: params,
      });

      const response = await productsService.getProducts(params);
      console.log('✅ [ProductGrid] Products loaded:', {
        count: response.data?.length || 0,
        products: response.data?.map(p => ({ 
          id: p.id, 
          name: p.name?.substring(0, 30),
          hasPrimaryImageUrl: !!p.primary_image_url,
          primary_image_url: p.primary_image_url?.substring(0, 80) + '...',
          hasImageUrl: !!p.image_url,
        })) || [],
      });
      if (seq !== loadSeqRef.current) return;
      setProducts(response.data || []);
      const pagination = response.pagination || {
        page,
        limit,
        total: response.data?.length || 0,
        totalPages: 0,
      };
      const computedTotalPages =
        pagination.totalPages ||
        Math.ceil((pagination.total || 0) / (pagination.limit || limit)) ||
        1;

      setTotalProducts(pagination.total || 0);
      setTotalPages(Math.max(1, computedTotalPages));
      setCurrentPage(pagination.page || page || 1);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'Error al cargar productos');
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      // Obtener branchId del contexto
      // En contexto de sucursal, branchId ES el business_id
      const branchIdToUse = contextType === 'sucursal' && branchId ? branchId : undefined;
      
      // Para invitados, necesitamos el businessId
      // Si hay branchId, ese es el business_id; si no, usar el business_id del producto
      const businessIdToUse = branchIdToUse || product.business_id;
      
      await addItem(product.id, 1, undefined, undefined, branchIdToUse);
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    }
  };

  // Calcular precios finales (incluyendo impuestos si aplica) por producto
  useEffect(() => {
    const computePrices = async () => {
      if (!products || products.length === 0) {
        setFinalPrices({});
        return;
      }

      // Esperar configuraciones de impuestos para evitar saltos de precio
      if (!taxSettingsLoaded) {
        setFinalPrices({});
        return;
      }

      const priceEntries = await Promise.all(
        products.map(async (product) => {
          const basePrice =
            contextType === 'sucursal' && product.branch_price !== undefined
              ? product.branch_price
              : product.price || 0;

          // Priorizar configuracion de la sucursal en contexto sucursal; de lo contrario usar la del negocio
          const settings =
            (contextType === 'sucursal' && branchId ? branchTaxSettings : null) ||
            taxSettingsByBusiness[product.business_id] ||
            DEFAULT_BRANCH_TAX_SETTINGS;

          if (settings?.included_in_price) {
            return [product.id, basePrice] as const;
          }

          try {
            const taxBreakdown = await taxesService.calculateProductTaxes(product.id, basePrice);
            const finalPrice = basePrice + (taxBreakdown?.total_tax || 0);
            return [product.id, finalPrice] as const;
          } catch (err) {
            console.warn(`[ProductGrid] No se pudo calcular impuestos para producto ${product.id}:`, err);
            return [product.id, basePrice] as const;
          }
        })
      );

      const map: Record<string, number> = {};
      priceEntries.forEach(([pid, price]) => {
        map[pid] = price;
      });
      setFinalPrices(map);
    };

    computePrices();
  }, [products, branchTaxSettings, taxSettingsByBusiness, taxSettingsLoaded, contextType, branchId]);

  if (loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="max-w-md mx-auto">
          {/* Icono grande y llamativo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Círculo de fondo con gradiente */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full blur-xl opacity-50"></div>
              {/* Icono principal */}
              <div className="relative bg-gray-50 rounded-full p-8 border-4 border-gray-200">
                <svg 
                  className="w-24 h-24 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
                  />
                </svg>
              </div>
              {/* Icono de búsqueda superpuesto */}
              <div className="absolute -bottom-2 -right-2 bg-toyota-red rounded-full p-3 shadow-lg">
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Mensaje principal */}
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          
          {/* Mensaje secundario */}
          <p className="text-gray-600 mb-6">
            No hay productos disponibles en este momento. 
            <br />
            Intenta con otros filtros o vuelve más tarde.
          </p>
          
          {/* Línea decorativa */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px bg-gray-200 flex-1 max-w-20"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <div className="h-px bg-gray-200 flex-1 max-w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Controles de vista */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-toyota-red text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Vista de cuadrícula"
            title="Vista de cuadrícula"
          >
            <ViewModuleIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-toyota-red text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Vista de lista"
            title="Vista de lista"
          >
            <ViewListIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Contenido según el modo de vista */}
      <div className="mb-6">
        <PaginationBar
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalProducts={totalProducts}
          pageItemCount={products.length}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              overridePrice={finalPrices[product.id]}
              pricePending={finalPrices[product.id] === undefined}
              onAddToCart={onProductClick ? undefined : handleAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              product={product}
              overridePrice={finalPrices[product.id]}
              pricePending={finalPrices[product.id] === undefined}
              onAddToCart={onProductClick ? undefined : handleAddToCart}
            />
          ))}
        </div>
      )}

      {/* PaginaciÃ³n */}
      {false && totalPages > 1 && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Mostrando{' '}
            <span className="font-medium text-gray-800">
              {(currentPage - 1) * pageSize + (products.length > 0 ? 1 : 0)}
              {'-'}{(currentPage - 1) * pageSize + products.length}
            </span>{' '}
            de <span className="font-medium text-gray-800">{totalProducts}</span>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Por pÃ¡gina
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white"
                value={pageSize}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  if (!Number.isFinite(next)) return;
                  setPageSize(next);
                  setCurrentPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Â«
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <div className="px-2 text-sm text-gray-700">
                {currentPage} / {Math.max(1, totalPages)}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Â»
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <PaginationBar
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalProducts={totalProducts}
          pageItemCount={products.length}
          setCurrentPage={setCurrentPage}
          setPageSize={setPageSize}
        />
      </div>
    </div>
  );
}

