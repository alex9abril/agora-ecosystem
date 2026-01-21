/**
 * Grid de productos con filtros por contexto
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  const [finalPrices, setFinalPrices] = useState<Record<string, number>>({});

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
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextType, groupId, branchId, brandId, filtersKey]);

  // Cargar configuracion de impuestos de la sucursal (solo contexto sucursal)
  useEffect(() => {
    const loadBranchTaxes = async () => {
      if (contextType === 'sucursal' && branchId) {
        try {
          const settings = await branchesService.getBranchTaxSettings(branchId);
          setBranchTaxSettings(settings);
        } catch (err) {
          console.warn('[ProductGrid] No se pudo obtener configuracion de impuestos de la sucursal:', err);
          setBranchTaxSettings(null);
        }
      } else {
        setBranchTaxSettings(null);
      }
    };
    loadBranchTaxes();
  }, [contextType, branchId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      setFinalPrices({});

      const params: any = {
        isAvailable: true,
        ...filters,
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
      setProducts(response.data || []);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
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

      // Si no estamos en contexto sucursal, usamos precio base sin calcular impuestos
      if (contextType !== 'sucursal' || !branchId) {
        const baseMap: Record<string, number> = {};
        products.forEach((product) => {
          baseMap[product.id] =
            product.price ?? 0;
        });
        setFinalPrices(baseMap);
        return;
      }

      const settings = branchTaxSettings;
      const priceEntries = await Promise.all(
        products.map(async (product) => {
          const basePrice = product.branch_price !== undefined ? product.branch_price : product.price || 0;

          if (!settings || settings.included_in_price) {
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
  }, [products, branchTaxSettings, contextType, branchId]);

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
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              overridePrice={finalPrices[product.id]}
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
              onAddToCart={onProductClick ? undefined : handleAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

