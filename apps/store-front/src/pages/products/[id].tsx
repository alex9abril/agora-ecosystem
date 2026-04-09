/**
 * Página de detalle de producto - Contexto Global
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import VariantSelector from '@/components/VariantSelector';
import StockIndicator from '@/components/StockIndicator';
import BranchPriceDisplay from '@/components/BranchPriceDisplay';
import BranchAvailabilityGrid from '@/components/BranchAvailabilityGrid';
import { productsService, Product, ProductBranchAvailability, ProductImage } from '@/lib/products';
import ProductImageGallery from '@/components/ProductImageGallery';
import { branchesService, BranchTaxSettings } from '@/lib/branches';
import { categoriesService, ProductCategory } from '@/lib/categories';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useStoreRouting } from '@/hooks/useStoreRouting';
import ContextualLink from '@/components/ContextualLink';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatPrice } from '@/lib/format';
import { taxesService } from '@/lib/taxes';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { Snackbar, Alert } from '@mui/material';
import { getSelectedVehicle } from '@/lib/vehicle-storage';
import { checkProductCompatibility, getProductCompatibilities, ProductCompatibilityItem } from '@/lib/product-compatibility';
import SimilarProductsCarousel from '@/components/SimilarProductsCarousel';

const DEFAULT_BRANCH_TAX_SETTINGS: BranchTaxSettings = {
  included_in_price: false,
  display_tax_breakdown: true,
  show_tax_included_label: true,
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { contextType, branchId, groupId, brandId, branchData, isLoading: contextLoading } = useStoreContext();
  const { push } = useStoreRouting();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [branchAvailabilities, setBranchAvailabilities] = useState<ProductBranchAvailability[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string | string[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [storedBranch, setStoredBranch] = useState<{ id: string; name: string } | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [currentVehicle, setCurrentVehicle] = useState<any | null>(null);
  const [isCompatible, setIsCompatible] = useState<boolean | null>(null);
  const [checkingCompatibility, setCheckingCompatibility] = useState(false);
  const [productCompatibilities, setProductCompatibilities] = useState<ProductCompatibilityItem[]>([]);
  const [loadingCompatibilities, setLoadingCompatibilities] = useState(false);
  const [categoryTrail, setCategoryTrail] = useState<ProductCategory[]>([]);
  const [branchTaxSettings, setBranchTaxSettings] = useState<BranchTaxSettings | null>(null);
  const [taxedUnitPrice, setTaxedUnitPrice] = useState<number | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const shouldCheckCompatibility =
    !!product && product.product_type !== 'food' && product.product_type !== 'medicine';
  const RECENTLY_VIEWED_KEY = 'recently_viewed_products';

  // Cargar sucursal guardada en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('selected_branch');
        if (stored) {
          const branch = JSON.parse(stored);
          setStoredBranch({ id: branch.id, name: branch.name });
        }
      } catch (error) {
        console.error('Error leyendo sucursal guardada:', error);
      }
    }
  }, []);

  // Cargar vehículo actual y verificar compatibilidad
  useEffect(() => {
    const loadVehicleAndCheckCompatibility = async () => {
      if (typeof window === 'undefined' || !product) {
        setCurrentVehicle(null);
        setIsCompatible(null);
        return;
      }

      // Solo verificar compatibilidad para productos no alimenticios/medicina (refacciones/accesorios)
      if (!shouldCheckCompatibility) {
        setCurrentVehicle(null);
        setIsCompatible(null);
        return;
      }

      // Obtener vehículo seleccionado
      const vehicle = getSelectedVehicle();
      setCurrentVehicle(vehicle);

      if (!vehicle || !vehicle.vehicle_brand_id) {
        // No hay vehículo seleccionado
        setIsCompatible(null);
        return;
      }

      // Verificar compatibilidad
      if (product && product.id) {
        try {
          setCheckingCompatibility(true);
          const compatible = await checkProductCompatibility(product.id, {
            brandId: vehicle.vehicle_brand_id,
            modelId: vehicle.vehicle_model_id || undefined,
            yearId: vehicle.vehicle_year_id || undefined,
            specId: vehicle.vehicle_spec_id || undefined,
          });
          setIsCompatible(compatible);
        } catch (error) {
          console.error('Error verificando compatibilidad:', error);
          setIsCompatible(null);
        } finally {
          setCheckingCompatibility(false);
        }
      }
    };

    loadVehicleAndCheckCompatibility();
  }, [product]);

  useEffect(() => {
    const loadCategoryTrail = async () => {
      if (!product?.category_id) {
        setCategoryTrail([]);
        return;
      }

      try {
        const trail: ProductCategory[] = [];
        let currentId: string | null | undefined = product.category_id;
        let guard = 0;

        while (currentId && guard < 10) {
          const category = await categoriesService.getCategoryById(currentId);
          trail.unshift(category);
          currentId = category.parent_category_id || null;
          guard += 1;
        }

        setCategoryTrail(trail);
      } catch (error) {
        console.error('Error cargando ruta de categorías:', error);
        setCategoryTrail([]);
      }
    };

    loadCategoryTrail();
  }, [product?.category_id]);

  useEffect(() => {
    if (!product || typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const nextItem = {
        id: product.id,
        name: product.name,
        sku: product.sku || null,
        price: product.price ?? null,
        branch_price: product.branch_price ?? null,
        image_url: product.image_url || null,
        primary_image_url: product.primary_image_url || null,
      };
      const deduped = list.filter((item: any) => item?.id !== product.id);
      const nextList = [nextItem, ...deduped].slice(0, 8);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(nextList));
    } catch (error) {
      console.error('Error guardando producto visto recientemente:', error);
    }
  }, [product]);

  // Escuchar cambios en el vehículo seleccionado
  useEffect(() => {
    // Solo reaccionar a cambios de vehículo cuando el producto es no alimenticio (refacción/accesorio)
    if (!shouldCheckCompatibility) {
      return;
    }

    const checkCompatibility = async (vehicle: any) => {
      setCurrentVehicle(vehicle);
      
      if (!vehicle || !product?.id) {
        setIsCompatible(null);
        return;
      }
      if (vehicle.vehicle_variant_id) {
        try {
          setCheckingCompatibility(true);
          const compatible = await checkProductCompatibility(product.id, {
            vehicleVariantId: vehicle.vehicle_variant_id,
          });
          setIsCompatible(compatible);
        } catch (error) {
          console.error('Error verificando compatibilidad:', error);
          setIsCompatible(null);
        } finally {
          setCheckingCompatibility(false);
        }
        return;
      }
      if (vehicle.vehicle_brand_id) {
        try {
          setCheckingCompatibility(true);
          const compatible = await checkProductCompatibility(product.id, {
            brandId: vehicle.vehicle_brand_id,
            modelId: vehicle.vehicle_model_id || undefined,
            yearId: vehicle.vehicle_year_id || undefined,
            specId: vehicle.vehicle_spec_id || undefined,
          });
          setIsCompatible(compatible);
        } catch (error) {
          console.error('Error verificando compatibilidad:', error);
          setIsCompatible(null);
        } finally {
          setCheckingCompatibility(false);
        }
        return;
      }
      setIsCompatible(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_vehicle_selected') {
        const vehicle = getSelectedVehicle();
        checkCompatibility(vehicle);
      }
    };

    // Escuchar eventos de storage (cambios en otras pestañas)
    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar eventos personalizados (cambios en la misma ventana)
    const handleVehicleChanged = () => {
      const vehicle = getSelectedVehicle();
      checkCompatibility(vehicle);
    };
    
    window.addEventListener('vehicle-selected', handleVehicleChanged);
    
    // Verificar cuando se carga la página
    const vehicle = getSelectedVehicle();
    checkCompatibility(vehicle);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('vehicle-selected', handleVehicleChanged);
    };
  }, [product]);

  // Cargar lista de compatibilidades (vehicle_variants) para mostrar tabla discreta
  useEffect(() => {
    if (!product?.id || !shouldCheckCompatibility) {
      setProductCompatibilities([]);
      return;
    }
    let cancelled = false;
    setLoadingCompatibilities(true);
    getProductCompatibilities(product.id)
      .then((list) => {
        if (!cancelled) setProductCompatibilities(list);
      })
      .catch(() => {
        if (!cancelled) setProductCompatibilities([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCompatibilities(false);
      });
    return () => { cancelled = true; };
  }, [product?.id, shouldCheckCompatibility]);

  // Cuando se carga la sucursal guardada, si hay disponibilidades ya cargadas, seleccionarla automáticamente
  useEffect(() => {
    if (contextType !== 'sucursal' && storedBranch && branchAvailabilities.length > 0 && !selectedBranchId) {
      // Si hay una sucursal guardada y está disponible, seleccionarla automáticamente
      const storedBranchAvailable = branchAvailabilities.find(
        (avail) => avail.branch_id === storedBranch.id && avail.is_active && avail.is_enabled
      );
      if (storedBranchAvailable) {
        setSelectedBranchId(storedBranch.id);
      }
    }
  }, [storedBranch, branchAvailabilities, contextType, selectedBranchId]);

  // Si no hay selección previa, elegir automáticamente la sucursal con mejor precio (alineado con la grilla)
  useEffect(() => {
    if (contextType === 'sucursal') return;
    if (selectedBranchId) return;
    if (!branchAvailabilities || branchAvailabilities.length === 0) return;

    const best = getSelectedAvailability();
    if (best?.branch_id) {
      setSelectedBranchId(best.branch_id);
    }
  }, [contextType, selectedBranchId, branchAvailabilities]);

  // Cargar configuracion de impuestos para la sucursal seleccionada/contexto
  useEffect(() => {
    const loadTaxSettings = async () => {
      const branchToUse = contextType === 'sucursal'
        ? branchData?.id
        : selectedBranchId;

      if (!branchToUse) {
        setBranchTaxSettings(null);
        return;
      }

      try {
        const settings = await branchesService.getBranchTaxSettings(branchToUse);
        setBranchTaxSettings(settings || DEFAULT_BRANCH_TAX_SETTINGS);
      } catch (err) {
        console.warn('[ProductDetail] No se pudo obtener configuracion de impuestos de la sucursal:', err);
        setBranchTaxSettings(null);
      }
    };

    loadTaxSettings();
  }, [contextType, branchData?.id, selectedBranchId]);

  // Obtener disponibilidad activa seleccionada o la de mejor precio (mismo criterio que la grilla)
  const getSelectedAvailability = (): ProductBranchAvailability | null => {
    // Contexto sucursal: construir una disponibilidad sintÃ©tica con los datos del producto
    if (contextType === 'sucursal' && branchData && product) {
      return {
        branch_id: branchData.id,
        branch_name: branchData.name,
        is_enabled: product.branch_is_enabled ?? true,
        price: product.branch_price ?? product.price ?? 0,
        taxed_price: (product as any).taxed_price,
        stock: product.branch_stock ?? null,
        allow_backorder: product.branch_allow_backorder ?? false,
        backorder_lead_time_days: product.branch_backorder_lead_time_days ?? null,
        backorder_notes: product.branch_backorder_notes ?? null,
        is_active: true,
      } as ProductBranchAvailability;
    }

    // Seleccionada explÃ­citamente
    if (selectedBranchId) {
      const selected = branchAvailabilities.find(
        (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
      );
      if (selected) return selected;
    }

    // Fallback: mejor precio disponible
    const best = branchAvailabilities
      .filter((avail) => avail.is_active && avail.is_enabled)
      .map((avail) => {
        const taxedRaw = (avail as any).taxed_price;
        const taxed = taxedRaw !== null && taxedRaw !== undefined ? Number(taxedRaw) : undefined;
        const price = avail.price !== null && avail.price !== undefined ? Number(avail.price) : undefined;
        const displayPrice =
          taxed !== undefined && !Number.isNaN(taxed) && taxed > 0
            ? taxed
            : price !== undefined && !Number.isNaN(price)
            ? price
            : product?.price || 0;
        return { ...avail, displayPrice };
      })
      .sort((a, b) => a.displayPrice - b.displayPrice)[0];

    return best || null;
  };

  // Obtener precio base (sin impuestos) de la sucursal seleccionada o fallback
  const getSelectedBranchPrice = () => {
    const availability = getSelectedAvailability();

    if (availability) {
      if (availability.price !== null && availability.price !== undefined) {
        return Number(availability.price);
      }
      return product?.price;
    }

    return product?.price;
  };

  // Calcular precio unitario base (con variantes) sin impuestos
  const getUnitBasePrice = () => {
    const basePrice = getSelectedBranchPrice() ?? 0;
    let price = basePrice;

    if (product?.variant_groups) {
      product.variant_groups.forEach((group) => {
        const selected = selectedVariants[group.variant_group_id];
        if (selected) {
          const variantIds = Array.isArray(selected) ? selected : [selected];
          group.variants.forEach((variant) => {
            if (variantIds.includes(variant.variant_id)) {
              if (variant.absolute_price !== null && variant.absolute_price !== undefined) {
                price = variant.absolute_price;
              } else {
                price += variant.price_adjustment || 0;
              }
            }
          });
        }
      });
    }

    return price;
  };

  // Calcular precio unitario con impuestos (para mostrar)
  useEffect(() => {
    const computeTaxedPrice = async () => {
      if (!product) return;
      const availability = getSelectedAvailability();
      const basePrice = getUnitBasePrice();

      // Solo omitir el cÃ¡lculo cuando la sucursal indica que el precio YA incluye impuestos
      if (branchTaxSettings?.included_in_price) {
        setTaxedUnitPrice(basePrice);
        return;
      }

      // Si la disponibilidad ya trae precio con impuestos, usarlo para alinear con la lista
      const taxedPriceFromAvailability = availability && (availability as any).taxed_price;
      if (taxedPriceFromAvailability !== null && taxedPriceFromAvailability !== undefined) {
        const asNumber = Number(taxedPriceFromAvailability);
        if (!Number.isNaN(asNumber) && asNumber > 0) {
          setTaxedUnitPrice(asNumber);
          return;
        }
      }

      try {
        const taxBreakdown = await taxesService.calculateProductTaxes(product.id, basePrice);
        setTaxedUnitPrice(basePrice + (taxBreakdown?.total_tax || 0));
      } catch (err) {
        console.warn('[ProductDetail] No se pudo calcular impuestos para el producto:', err);
        setTaxedUnitPrice(basePrice);
      }
    };

    computeTaxedPrice();
  }, [product, branchTaxSettings, selectedVariants, selectedBranchId, branchAvailabilities]);

  useEffect(() => {
    console.log('🔍 [ProductDetail] useEffect triggered:', {
      id,
      contextType,
      branchId,
      groupId,
      brandId,
      contextLoading,
      routerReady: router.isReady,
    });

    // Esperar a que el contexto esté completamente cargado antes de cargar disponibilidades
    if (contextLoading) {
      console.log('⏳ [ProductDetail] Context still loading, waiting...');
      return;
    }

    if (id) {
      loadProduct();
      loadProductImages();
      // Cargar disponibilidad según el contexto
      // Reglas:
      // - Global: mostrar todas las sucursales
      // - Grupo: mostrar solo sucursales del grupo (esperar a que groupId esté disponible)
      // - Sucursal: mostrar solo la sucursal actual (NO cargar todas)
      // - Brand: mostrar todas las sucursales que venden productos de esa marca (esperar a que brandId esté disponible)
      if (contextType === 'sucursal' && branchId) {
        console.log('✅ [ProductDetail] In branch context, NOT loading availabilities. Only showing current branch:', branchId);
        // En contexto de sucursal, NO cargar disponibilidades, solo usar la sucursal del contexto
        setSelectedBranchId(branchId);
        setBranchAvailabilities([]); // Limpiar disponibilidades
      } else if (contextType === 'grupo') {
        // En contexto de grupo, esperar a que groupId esté disponible
        if (groupId) {
          console.log('✅ [ProductDetail] Loading branch availabilities for group. Context:', contextType, { groupId });
          loadBranchAvailabilities();
        } else {
          console.log('⏳ [ProductDetail] Waiting for groupId to be loaded...', { contextType, groupId });
        }
      } else if (contextType === 'brand') {
        // En contexto de marca, esperar a que brandId esté disponible
        if (brandId) {
          console.log('✅ [ProductDetail] Loading branch availabilities for brand. Context:', contextType, { brandId });
          loadBranchAvailabilities();
        } else {
          console.log('⏳ [ProductDetail] Waiting for brandId to be loaded...', { contextType, brandId });
        }
      } else if (contextType === 'global') {
        // En contexto global, cargar inmediatamente (no necesita IDs)
        console.log('✅ [ProductDetail] Loading branch availabilities for global context');
        loadBranchAvailabilities();
      } else {
        console.log('❌ [ProductDetail] Branch context but no branchId:', { contextType, branchId });
      }
    } else {
      console.log('⏸️ [ProductDetail] No product ID yet, waiting...');
    }
  }, [id, branchId, contextType, groupId, brandId, contextLoading]);

  // Productos de la misma categoría (top 15, 4 por vista en el carrusel)
  useEffect(() => {
    if (!product?.category_id || !product?.id) {
      setSimilarProducts([]);
      return;
    }
    let cancelled = false;
    const fetchSimilar = async () => {
      try {
        const params: any = {
          categoryId: product.category_id,
          limit: 16,
          isAvailable: true,
        };
        if (contextType === 'sucursal' && branchId) params.branchId = branchId;
        if (contextType === 'grupo' && groupId) params.groupId = groupId;
        if (contextType === 'brand' && brandId) params.vehicleBrandId = brandId;
        const res = await productsService.getProducts(params);
        const list = res?.data || [];
        const others = list.filter((p: Product) => p.id !== product.id).slice(0, 15);
        if (!cancelled) setSimilarProducts(others);
      } catch (err) {
        if (!cancelled) setSimilarProducts([]);
      }
    };
    fetchSimilar();
    return () => { cancelled = true; };
  }, [product?.id, product?.category_id, contextType, branchId, groupId, brandId]);

  const loadProduct = async () => {
    if (!id || typeof id !== 'string') {
      console.log('⏸️ [loadProduct] Invalid ID:', id);
      return;
    }

    try {
      console.log('📦 [loadProduct] Loading product:', { id, branchId, contextType });
      setLoading(true);
      const productData = await productsService.getProduct(id, branchId || undefined);
      console.log('✅ [loadProduct] Product loaded:', {
        id: productData.id,
        name: productData.name,
        branch_price: productData.branch_price,
        branch_stock: productData.branch_stock,
        branch_is_enabled: productData.branch_is_enabled,
      });
      setProduct(productData);
    } catch (error) {
      console.error('❌ [loadProduct] Error cargando producto:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductImages = async () => {
    if (!id || typeof id !== 'string') {
      return;
    }

    try {
      setLoadingImages(true);
      const images = await productsService.getProductImages(id, false);
      console.log('✅ [loadProductImages] Images loaded:', images.length);
      setProductImages(images);
    } catch (error) {
      console.error('Error cargando imágenes del producto:', error);
      // Si falla, no es crítico, simplemente no mostramos las imágenes adicionales
      setProductImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadBranchAvailabilities = async () => {
    if (!id || typeof id !== 'string') {
      console.log('⏸️ [loadBranchAvailabilities] Invalid ID:', id);
      return;
    }

    try {
      console.log('🏪 [loadBranchAvailabilities] Loading branch availabilities:', {
        productId: id,
        contextType,
        groupId,
        brandId,
      });
      setLoadingAvailabilities(true);
      
      // Validar que los IDs necesarios estén disponibles según el contexto
      if (contextType === 'grupo' && !groupId) {
        console.error('❌ [loadBranchAvailabilities] Context is grupo but groupId is not available!', {
          contextType,
          groupId,
        });
        setLoadingAvailabilities(false);
        return;
      }
      
      if (contextType === 'brand' && !brandId) {
        console.error('❌ [loadBranchAvailabilities] Context is brand but brandId is not available!', {
          contextType,
          brandId,
        });
        setLoadingAvailabilities(false);
        return;
      }
      
      // Pasar parámetros de filtrado según el contexto
      // - Global: sin filtros (groupId y brandId undefined)
      // - Grupo: filtrar por groupId (ya validado que existe)
      // - Brand: filtrar por brandId (ya validado que existe)
      const filterGroupId = contextType === 'grupo' ? (groupId || undefined) : undefined;
      const filterBrandId = contextType === 'brand' ? (brandId || undefined) : undefined;
      
      console.log('🔍 [loadBranchAvailabilities] Filters applied:', { 
        contextType, 
        filterGroupId, 
        filterBrandId,
        originalGroupId: groupId,
        originalBrandId: brandId,
      });
      
      const response = await productsService.getProductBranchAvailability(
        id,
        filterGroupId,
        filterBrandId
      );
      // Enriquecer con impuestos por sucursal para mostrar precio final
      const availabilities = await Promise.all(
        (response.availabilities || []).map(async (availability) => {
          const normalized = {
            ...availability,
            allow_backorder: availability.allow_backorder ?? false,
            backorder_lead_time_days:
              availability.backorder_lead_time_days !== undefined
                ? availability.backorder_lead_time_days
                : null,
            backorder_notes:
              availability.backorder_notes !== undefined
                ? availability.backorder_notes
                : null,
          };

          const basePrice =
            normalized.price !== null && normalized.price !== undefined
              ? normalized.price
              : product?.price || 0;

          try {
            const settings = await branchesService.getBranchTaxSettings(normalized.branch_id);
            if (settings?.included_in_price) {
              return { ...normalized, taxed_price: basePrice };
            }

            const taxBreakdown = await taxesService.calculateProductTaxes(id, basePrice);
            const finalPrice = basePrice + (taxBreakdown?.total_tax || 0);
            return { ...normalized, taxed_price: finalPrice };
          } catch (err) {
            console.warn('[ProductDetail] No se pudo calcular impuestos para la sucursal', normalized.branch_id, err);
            return { ...normalized, taxed_price: basePrice };
          }
        })
      );
      console.log('✅ [loadBranchAvailabilities] Availabilities loaded:', {
        count: availabilities.length,
        branches: availabilities.map(a => ({
          id: a.branch_id,
          name: a.branch_name,
          price: a.price,
          taxed_price: (a as any).taxed_price,
          stock: a.stock,
          is_enabled: a.is_enabled,
          is_active: a.is_active,
        })),
      });
      setBranchAvailabilities(availabilities);
      
      // Obtener sucursal guardada (puede no estar en el estado aún)
      let currentStoredBranch = storedBranch;
      if (!currentStoredBranch && typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('selected_branch');
          if (stored) {
            const branch = JSON.parse(stored);
            currentStoredBranch = { id: branch.id, name: branch.name };
          }
        } catch (error) {
          // Ignorar error
        }
      }
      
      // Si ya hay una sucursal seleccionada manualmente, no cambiar la selección
      if (selectedBranchId) {
        console.log('⏸️ [loadBranchAvailabilities] Branch already selected, skipping auto-select:', selectedBranchId);
        return;
      }
      
      // Si hay una sucursal guardada y está disponible, seleccionarla automáticamente (prioridad)
      if (currentStoredBranch) {
        console.log('🔍 [loadBranchAvailabilities] Checking stored branch:', currentStoredBranch);
        const storedBranchAvailable = availabilities.find(
          (avail) => avail.branch_id === currentStoredBranch!.id && avail.is_active && avail.is_enabled
        );
        if (storedBranchAvailable) {
          console.log('✅ [loadBranchAvailabilities] Stored branch available, auto-selecting:', currentStoredBranch.id);
          setSelectedBranchId(currentStoredBranch.id);
          return;
        } else {
          console.log('⚠️ [loadBranchAvailabilities] Stored branch not available in list');
        }
      }
      
      // Si no hay sucursal guardada o no está disponible, seleccionar la más barata
      const availableBranches = availabilities
        .filter((avail) => avail.is_active && avail.is_enabled)
        .map((avail) => ({
          ...avail,
          displayPrice: avail.price !== null && avail.price !== undefined
            ? avail.price
            : product?.price || 0,
        }))
        .sort((a, b) => a.displayPrice - b.displayPrice);
      
      console.log('💰 [loadBranchAvailabilities] Available branches sorted by price:', availableBranches.length);
      if (availableBranches.length > 0) {
        console.log('✅ [loadBranchAvailabilities] Auto-selecting cheapest branch:', availableBranches[0].branch_id);
        setSelectedBranchId(availableBranches[0].branch_id);
      } else {
        console.log('⚠️ [loadBranchAvailabilities] No available branches found');
      }
    } catch (error) {
      console.error('❌ [loadBranchAvailabilities] Error cargando disponibilidad por sucursal:', error);
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  const handleAddToCart = async () => {
    console.log('🛒 [handleAddToCart] Iniciando agregar al carrito', {
      product: product?.id,
      contextType,
      branchId,
      selectedBranchId,
      quantity,
      selectedVariants,
    });

    if (!product) {
      console.error('❌ [handleAddToCart] No hay producto');
      alert('Error: No se pudo cargar la información del producto');
      return;
    }

    // Validar variantes requeridas
    const hasRequiredVariants = !product.variant_groups?.some(
      g => g.is_required && !selectedVariants[g.variant_group_id]
    );

    if (!hasRequiredVariants) {
      console.warn('⚠️ [handleAddToCart] Faltan variantes requeridas');
      alert('Por favor, selecciona todas las variantes requeridas');
      return;
    }

    // Determinar branchId a usar
    let branchIdToUse: string | undefined;
    if (contextType === 'sucursal') {
      branchIdToUse = branchId || undefined;
      console.log('✅ [handleAddToCart] Contexto sucursal, usando branchId:', branchIdToUse);
    } else if (selectedBranchId) {
      branchIdToUse = selectedBranchId;
      console.log('✅ [handleAddToCart] Usando sucursal seleccionada:', branchIdToUse);
    } else {
      console.warn('⚠️ [handleAddToCart] No hay sucursal seleccionada en contexto:', contextType);
    }

    // Validar stock según la sucursal
    if (contextType !== 'sucursal' && selectedBranchId) {
      const selectedBranch = branchAvailabilities.find(
        (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
      );
      if (selectedBranch && selectedBranch.stock !== null && selectedBranch.stock !== undefined) {
        if (selectedBranch.stock < quantity) {
          const canBackorder =
            selectedBranch.allow_backorder &&
            selectedBranch.stock <= 0;
          if (canBackorder) {
            console.log('✅ [handleAddToCart] Stock en 0, backorder permitido');
          } else {
          console.warn('⚠️ [handleAddToCart] Stock insuficiente:', selectedBranch.stock, 'solicitado:', quantity);
          alert(`Solo hay ${selectedBranch.stock} unidades disponibles en ${selectedBranch.branch_name}`);
          return;
          }
        }
      }
    } else if (contextType === 'sucursal' && product.branch_stock !== null && product.branch_stock !== undefined) {
      if (product.branch_stock < quantity) {
        const canBackorder =
          product.branch_allow_backorder &&
          product.branch_stock <= 0;
        if (canBackorder) {
          console.log('✅ [handleAddToCart] Stock en 0, backorder permitido');
        } else {
        console.warn('⚠️ [handleAddToCart] Stock insuficiente en sucursal:', product.branch_stock, 'solicitado:', quantity);
        alert(`Solo hay ${product.branch_stock} unidades disponibles`);
        return;
        }
      }
    }

    // Validar que se haya seleccionado una sucursal (excepto en contexto de sucursal)
    if (contextType !== 'sucursal' && !selectedBranchId) {
      console.warn('⚠️ [handleAddToCart] No hay sucursal seleccionada');
      alert('Por favor, selecciona una sucursal de la lista');
      return;
    }

    try {
      setAddingToCart(true);
      // Determinar businessId: si hay branchId, ese ES el business_id; si no, usar el business_id del producto
      const businessIdToUse = branchIdToUse || product.business_id;
      
      // Validar que product.id sea un UUID válido
      if (!product.id || typeof product.id !== 'string') {
        console.error('❌ [handleAddToCart] product.id inválido:', {
          id: product.id,
          type: typeof product.id,
          product: product,
        });
        alert('Error: ID del producto inválido');
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(product.id.trim())) {
        console.error('❌ [handleAddToCart] product.id no es un UUID válido:', {
          id: product.id,
          trimmed: product.id.trim(),
          length: product.id.length,
          product: product,
        });
        alert('Error: ID del producto no es válido');
        return;
      }

      console.log('📦 [handleAddToCart] Llamando addItem con:', {
        productId: product.id,
        productIdType: typeof product.id,
        productIdLength: product.id.length,
        quantity,
        branchIdToUse,
        businessIdToUse,
      });
      
      await addItem(
        product.id.trim(),
        quantity,
        selectedVariants,
        specialInstructions || undefined,
        branchIdToUse,
        businessIdToUse
      );
      
      console.log('✅ [handleAddToCart] Producto agregado exitosamente');
      setSnackbarMessage('Producto agregado al carrito');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Opcional: redirigir al carrito
      // push('/cart');
    } catch (error: any) {
      console.error('❌ [handleAddToCart] Error agregando al carrito:', error);
      setSnackbarMessage(error.message || 'Error al agregar producto al carrito');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando producto...</p>
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Producto no encontrado</p>
          <ContextualLink href="/products" className="text-black hover:text-gray-700 mt-4 inline-block">
            Volver a productos
          </ContextualLink>
        </div>
      </StoreLayout>
    );
  }

  // Precio final a mostrar (prioriza precio con impuestos enviado por disponibilidad)
  const getSelectedDisplayPrice = () => {
    const availability = getSelectedAvailability();
    if (availability) {
      const taxedRaw = (availability as any).taxed_price;
      const taxed = taxedRaw !== null && taxedRaw !== undefined ? Number(taxedRaw) : undefined;
      const price =
        availability.price !== null && availability.price !== undefined
          ? Number(availability.price)
          : undefined;

      if (taxed !== undefined && !Number.isNaN(taxed) && taxed > 0) {
        return taxed;
      }
      if (price !== undefined && !Number.isNaN(price)) {
        return price;
      }
      return product?.price ?? 0;
    }

    // Sin disponibilidad (aún cargando): mostrar precio base calculado
    return taxedUnitPrice ?? getUnitBasePrice();
  };

  // Calcular precio total con variantes
  const calculateTotalPrice = () => {
    const unitPrice = getSelectedDisplayPrice();
    return unitPrice * quantity;
  };

  const displayPrice = getSelectedDisplayPrice();
  
  // Obtener la sucursal seleccionada para mostrar información
  const selectedBranch: ProductBranchAvailability | null = getSelectedAvailability();

  const isAvailable = contextType === 'sucursal' 
    ? (product.branch_is_enabled !== false && product.is_available)
    : product.is_available;

  // Función para obtener la descripción completa del vehículo
  const getVehicleDescription = (vehicle: any): string => {
    if (!vehicle) return 'tu vehículo';
    
    const parts: string[] = [];
    if (vehicle.brand_name) parts.push(vehicle.brand_name);
    if (vehicle.model_name) parts.push(vehicle.model_name);
    if (vehicle.year_start) {
      if (vehicle.year_end && vehicle.year_end !== vehicle.year_start) {
        parts.push(`${vehicle.year_start}-${vehicle.year_end}`);
      } else {
        parts.push(`${vehicle.year_start}`);
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : 'tu vehículo';
  };

  return (
    <>
      <Head>
        <title>{product.name} - Agora</title>
        <meta name="description" content={product.description || product.name} />
      </Head>
      <StoreLayout>
        <div className="max-w-6xl mx-auto">
          <div className="mt-6 mb-6 text-sm text-gray-500 flex flex-wrap items-center gap-2">
            <ContextualLink href="/" className="hover:text-gray-800 transition-colors">
              Inicio
            </ContextualLink>
            <span className="text-gray-400">›</span>
            {categoryTrail.length > 0 ? (
              categoryTrail.map((category, index) => (
                <React.Fragment key={category.id}>
                  <ContextualLink
                    href={`/products?categoryId=${category.id}`}
                    className="hover:text-gray-800 transition-colors"
                  >
                    {category.name}
                  </ContextualLink>
                  {index < categoryTrail.length - 1 && <span className="text-gray-400">›</span>}
                </React.Fragment>
              ))
            ) : product.category_name ? (
              <span>{product.category_name}</span>
            ) : (
              <span>Sin categoría asignada</span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Galería de imágenes: sticky en desktop para seguir viendo la foto al hacer scroll */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <ProductImageGallery
                images={productImages}
                productName={product.name}
                fallbackImageUrl={product.image_url}
              />
            </div>

            {/* Información */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <button
                type="button"
                className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  isFavorite(product.id)
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  const nowFavorite = toggleFavorite(product);
                  setSnackbarSeverity('success');
                  setSnackbarMessage(
                    nowFavorite ? 'Producto agregado a favoritos' : 'Producto eliminado de favoritos'
                  );
                  setSnackbarOpen(true);
                }}
                aria-label={isFavorite(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                <svg
                  className="w-5 h-5"
                  fill={isFavorite(product.id) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 8.25c0-2.485-2.099-4.5-4.687-4.5-1.935 0-3.597 1.126-4.313 2.733-.716-1.607-2.378-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 6.75 9 11.25 9 11.25s9-4.5 9-11.25z"
                  />
                </svg>
                {isFavorite(product.id) ? 'En favoritos' : 'Agregar a favoritos'}
              </button>
              {product.sku && (
                <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>
              )}

              
              {/* Precio */}
              <div className="mb-4">
                {contextType !== 'sucursal' ? (
                  <div>
                    {selectedBranch ? (
                      <>
                        <span className="text-sm text-gray-600 mb-1 block">Precio:</span>
                        <span className="text-3xl font-bold text-black">
                          {formatPrice(displayPrice)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedBranch.branch_name}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-black">
                          {formatPrice(displayPrice)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Selecciona una sucursal para ver precio y stock específicos
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <BranchPriceDisplay 
                    product={product} 
                    branchPrice={product.branch_price}
                    overridePrice={displayPrice}
                  />
                )}
              </div>

              {/* Stock */}
              {contextType !== 'sucursal' && selectedBranch && (
                <div className="mb-4">
                  <StockIndicator
                    stock={selectedBranch.stock}
                    allowBackorder={selectedBranch.allow_backorder}
                    backorderLeadTimeDays={selectedBranch.backorder_lead_time_days}
                    isEnabled={selectedBranch.is_enabled}
                  />
                </div>
              )}
              {contextType === 'sucursal' && branchData && (
                <div className="mb-4">
                  <StockIndicator 
                    stock={product.branch_stock} 
                    allowBackorder={product.branch_allow_backorder}
                    backorderLeadTimeDays={product.branch_backorder_lead_time_days}
                    isEnabled={product.branch_is_enabled}
                  />
                </div>
              )}

              {/* Descripción */}
              {product.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">Descripción</h2>
                  <p className="text-gray-600">{product.description}</p>
                </div>
              )}

              {/* Categoría */}
              {product.category_name && (
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {product.category_name}
                  </span>
                </div>
              )}

              {/* Lista de sucursales disponibles (mostrar solo si NO estamos en contexto de sucursal) */}
              {contextType !== 'sucursal' && (
                <div className="mb-8">
                  {loadingAvailabilities ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">Cargando sucursales disponibles...</p>
                    </div>
                  ) : (
                    <>
                      {/* Alerta si el producto no está disponible en la sucursal seleccionada */}
                      {storedBranch && !branchAvailabilities.some(
                        (avail) => avail.branch_id === storedBranch.id && avail.is_active && avail.is_enabled
                      ) && (
                        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                          <div className="flex items-start gap-3">
                            <WarningIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                                Producto no disponible en tu sucursal seleccionada
                              </h4>
                              <p className="text-sm text-yellow-700 mb-2">
                                Este producto no se encuentra disponible en <strong>{storedBranch.name}</strong>, pero puedes agregarlo al carrito desde otra sucursal.
                              </p>
                              <p className="text-xs text-yellow-600">
                                <strong>Nota:</strong> Si agregas este producto desde una sucursal diferente a la seleccionada, es probable que se genere una división de pedidos y costos adicionales de envío.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Alerta si se selecciona una sucursal diferente a la guardada */}
                      {/* Solo mostrar si el producto SÍ está disponible en la sucursal guardada (para no duplicar con la alerta anterior) */}
                      {storedBranch && selectedBranchId && selectedBranchId !== storedBranch.id && 
                       branchAvailabilities.some(
                         (avail) => avail.branch_id === storedBranch.id && avail.is_active && avail.is_enabled
                       ) && (
                        (() => {
                          const selectedBranch = branchAvailabilities.find(
                            (avail) => avail.branch_id === selectedBranchId && avail.is_active && avail.is_enabled
                          );
                          return selectedBranch ? (
                            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                              <div className="flex items-start gap-3">
                                <WarningIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                                    Sucursal diferente seleccionada
                                  </h4>
                                  <p className="text-sm text-yellow-700 mb-2">
                                    Has seleccionado <strong>{selectedBranch.branch_name}</strong> en lugar de tu sucursal guardada <strong>{storedBranch.name}</strong>.
                                  </p>
                                  <p className="text-xs text-yellow-600">
                                    <strong>Importante:</strong> Si agregas este producto al carrito, es probable que se genere una división de pedidos y costos adicionales de envío, ya que proviene de una sucursal diferente a la que tienes seleccionada.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()
                      )}
                      <BranchAvailabilityGrid
                        availabilities={branchAvailabilities}
                        // Usar el precio base del producto como fallback estÃ¡tico para evitar que otras tarjetas cambien cuando se selecciona una sucursal
                        globalPrice={product?.price ?? 0}
                        selectedBranchId={selectedBranchId}
                        onBranchSelect={setSelectedBranchId}
                        storedBranchId={storedBranch?.id}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Variantes */}
              {product.variant_groups && product.variant_groups.length > 0 && (
                <div className="mb-6">
                  <VariantSelector
                    product={product}
                    selectedVariants={selectedVariants}
                    onVariantChange={setSelectedVariants}
                  />
                </div>
              )}

              {/* Cantidad */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    <span className="text-xl">−</span>
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                  >
                    <span className="text-xl">+</span>
                  </button>
                </div>
              </div>

              {/* Precio total */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-2xl font-bold text-black">
                    {formatPrice(calculateTotalPrice())}
                  </span>
                </div>
              </div>

              {/* Botón agregar al carrito */}
              {(() => {
                console.log('🔘 [Render] Estado del botón:', {
                  contextType,
                  selectedBranchId,
                  isAvailable,
                  branchAvailabilitiesLength: branchAvailabilities.length,
                  selectedBranch: selectedBranch?.branch_name,
                });
                
                // En contexto de sucursal
                if (contextType === 'sucursal') {
                  if (!isAvailable) {
                    return (
<div className="mb-4 p-4 rounded-xl bg-red-100 flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">!</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Producto no disponible</p>
                            <p className="text-sm text-gray-800">Este producto no está disponible en esta sucursal.</p>
                          </div>
                        </div>
                    );
                  }
                  return (
                    <button 
                      onClick={handleAddToCart}
                      className="w-full py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        product.variant_groups?.some(g => g.is_required && !selectedVariants[g.variant_group_id]) ||
                        addingToCart
                      }
                    >
                      {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
                    </button>
                  );
                }
                
                // En contexto global/grupo/brand
                if (!selectedBranchId) {
                  // Si hay disponibilidades pero no hay selección, mostrar mensaje
                  if (branchAvailabilities.length > 0) {
                    return (
                      <div className="mb-4 p-4 rounded-xl bg-blue-100 flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <InfoIcon className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Selecciona una sucursal</p>
                          <p className="text-sm text-gray-800">Elige una sucursal de la lista arriba para ver precio y stock y agregar al carrito.</p>
                        </div>
                      </div>
                    );
                  }
                  // Si no hay disponibilidades, no mostrar nada
                  return null;
                }
                
                // Hay sucursal seleccionada
                const hasInsufficientStock = !!(
                  selectedBranch &&
                  selectedBranch.stock !== null &&
                  selectedBranch.stock !== undefined &&
                  selectedBranch.stock < quantity &&
                  !(selectedBranch.allow_backorder && selectedBranch.stock <= 0)
                );

                return (
                  <>
                    {hasInsufficientStock && selectedBranch && (
                      <div className="mb-4 p-4 rounded-xl bg-amber-100 flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">!</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Stock limitado</p>
                          <p className="text-sm text-gray-800">Solo hay {selectedBranch.stock} unidades disponibles en {selectedBranch.branch_name}.</p>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={handleAddToCart}
                      className="w-full py-3 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        product.variant_groups?.some(g => g.is_required && !selectedVariants[g.variant_group_id]) ||
                        addingToCart ||
                        hasInsufficientStock
                      }
                    >
                      {addingToCart ? 'Agregando...' : 'Agregar al Carrito'}
                    </button>
                  </>
                );
              })()}

              {/* Compatibilidad con vehículo - justo debajo del botón Agregar al Carrito */}
              {shouldCheckCompatibility && (
                <div className="mt-4">
                  {!currentVehicle ? (
                    <div className="p-4 rounded-xl bg-blue-100 flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <InfoIcon className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="text-sm text-gray-800">
                          Para verificar si este producto es compatible con tu vehículo,{' '}
                          <button
                            onClick={() => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('open-vehicle-panel'))}
                            className="text-gray-900 underline font-medium hover:no-underline"
                          >
                            selecciona un vehículo
                          </button>
                          .
                        </p>
                      </div>
                    </div>
                  ) : checkingCompatibility ? (
                    <div className="p-4 rounded-xl bg-gray-100 flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-500 border-t-transparent" />
                      <p className="text-sm text-gray-900">
                        Verificando compatibilidad con {getVehicleDescription(currentVehicle)}...
                      </p>
                    </div>
                  ) : isCompatible === true ? (
                    <div className="p-4 rounded-xl bg-green-100 flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <CheckCircleIcon className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="text-sm text-gray-800">
                          Este producto es compatible con <strong>{getVehicleDescription(currentVehicle)}</strong>.
                        </p>
                      </div>
                    </div>
                  ) : isCompatible === false ? (
                    <div className="p-4 rounded-xl bg-amber-100 flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
                        <WarningIcon className="w-5 h-5" />
                      </span>
                      <div>
                        <p className="text-sm text-gray-800">
                          No compatible con <strong>{getVehicleDescription(currentVehicle)}</strong>. Verifica especificaciones.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Compatibilidades (vehicle_variants): presentación con versión/motor en chips */}
                  {!loadingCompatibilities && productCompatibilities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200/80">
                      <p className="text-sm text-gray-600 font-semibold mb-2">Compatibilidades registradas</p>
                      <div className="rounded-lg border border-gray-200/80 bg-gray-50/60 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-100/90">
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Marca</th>
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Modelo</th>
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Año</th>
                                <th className="text-left py-2.5 px-3 font-semibold text-gray-600">Versiones y motores</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productCompatibilities.map((c) =>
                                c.is_universal ? (
                                  <tr key={c.id} className="border-t border-gray-200/60 bg-white">
                                    <td colSpan={4} className="py-2.5 px-3 text-gray-500 italic">
                                      Compatible con cualquier vehículo (universal)
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={c.id} className="border-t border-gray-200/60 bg-white hover:bg-gray-50/80 transition-colors">
                                    <td className="py-2.5 px-3 font-medium text-gray-800 align-top">{c.make ?? '—'}</td>
                                    <td className="py-2.5 px-3 font-medium text-gray-800 align-top">{c.model ?? '—'}</td>
                                    <td className="py-2.5 px-3 text-gray-700 align-top whitespace-nowrap">{c.year ?? '—'}</td>
                                    <td className="py-2.5 px-3 align-top">
                                      {(() => {
                                        const trims = (c.body_trim ?? '')
                                          .split(',')
                                          .map((s) => s.trim())
                                          .filter(Boolean);
                                        const motors = (c.engine_transmission ?? '')
                                          .split(',')
                                          .map((s) => s.trim())
                                          .filter(Boolean);
                                        const hasAny = trims.length > 0 || motors.length > 0;
                                        if (!hasAny) return <span className="text-gray-400">—</span>;
                                        return (
                                          <div className="space-y-1.5">
                                            {trims.length > 0 && (
                                              <div>
                                                <span className="text-gray-500 font-medium block mb-1">Versiones</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {trims.map((t, i) => (
                                                    <span
                                                      key={i}
                                                      className="inline-flex items-center rounded-md bg-gray-200/90 px-2 py-1 text-gray-700"
                                                    >
                                                      {t}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            {motors.length > 0 && (
                                              <div>
                                                <span className="text-gray-500 font-medium block mb-1">Motores</span>
                                                <div className="flex flex-wrap gap-1">
                                                  {motors.map((m, i) => (
                                                    <span
                                                      key={i}
                                                      className="inline-flex items-center rounded-md bg-slate-200/80 px-2 py-1 text-slate-700"
                                                    >
                                                      {m}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Especificaciones del producto (metadata) - debajo del botón Agregar al Carrito */}
              {(() => {
                const rawMeta = product.metadata;
                const meta =
                  rawMeta == null
                    ? null
                    : typeof rawMeta === 'string'
                      ? (() => { try { return JSON.parse(rawMeta); } catch { return null; } })()
                      : typeof rawMeta === 'object' && !Array.isArray(rawMeta)
                        ? rawMeta
                        : null;
                const entries = meta && Object.keys(meta).length > 0
                  ? Object.entries(meta).filter(([, v]) => v != null && String(v).trim() !== '')
                  : [];
                if (entries.length === 0) return null;
                return (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Especificaciones del producto</h3>
                    <dl className="space-y-2">
                      {entries.map(([key, value]) => (
                        <div key={key} className="flex items-baseline gap-2 text-sm">
                          <dt className="font-bold text-gray-700 shrink-0">{key}</dt>
                          <dd className="text-gray-600">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Carrusel: productos de la misma categoría (4 por vista, hasta 15) */}
        <SimilarProductsCarousel
          products={similarProducts}
          title="Productos de la misma categoría"
          subtitle="Otros productos que podrían interesarte."
        />
        </StoreLayout>
        
        {/* Snackbar para notificaciones */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert 
            onClose={() => setSnackbarOpen(false)} 
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

      </>
    );
  }

