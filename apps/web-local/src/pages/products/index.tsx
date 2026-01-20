import Head from "next/head";
import { useRouter } from "next/router";
import LocalLayout from "@/components/layout/LocalLayout";
import { useState, useEffect } from "react";
import { useSelectedBusiness } from "@/contexts/SelectedBusinessContext";
import {
  productsService,
  Product,
  ProductCategory,
  ProductType,
  CreateProductData,
  ProductVariantGroup,
} from "@/lib/products";
import { taxesService, TaxType, ProductTax } from "@/lib/taxes";
import { getUserVehicle } from "@/lib/storage";
import {
  vehiclesService,
  ProductCompatibility,
  VehicleBrand,
  VehicleModel,
  VehicleYear,
  VehicleSpec,
} from "@/lib/vehicles";
import ImageUpload from "@/components/ImageUpload";
import MultipleImageUpload, {
  ProductImage,
} from "@/components/MultipleImageUpload";
import CategorySelector from "@/components/CategorySelector";
import {
  productClassificationsService,
  ProductClassification,
} from "@/lib/product-classifications";

const PAGE_SIZE_STORAGE_KEY = "products_page_size";
const CURRENT_PAGE_STORAGE_KEY = "products_current_page";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const PRODUCTS_ROUTE_PREFIX = "/products";

export default function ProductsPage() {
  const router = useRouter();
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showProductTypeSelection, setShowProductTypeSelection] =
    useState(false);
  const [selectedProductType, setSelectedProductType] =
    useState<ProductType | null>(null);
  const [fieldConfig, setFieldConfig] = useState<
    Array<{
      fieldName: string;
      isVisible: boolean;
      isRequired: boolean;
      displayOrder?: number;
    }>
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState<CreateProductData>({
    business_id: "",
    name: "",
    sku: "",
    description: "",
    image_url: "",
    price: 0,
    product_type: "food",
    category_id: "",
    is_available: true,
    is_featured: false,
    display_order: 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [nutritionalInfo, setNutritionalInfo] = useState<Record<string, any>>(
    {},
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const storedPage = localStorage.getItem(CURRENT_PAGE_STORAGE_KEY);
      const parsedPage = storedPage ? parseInt(storedPage, 10) : NaN;
      if (parsedPage > 0) {
        return parsedPage;
      }
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const storedPageSize = localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
      const parsedPageSize = storedPageSize
        ? parseInt(storedPageSize, 10)
        : NaN;
      if (PAGE_SIZE_OPTIONS.includes(parsedPageSize)) {
        return parsedPageSize;
      }
    }
    return DEFAULT_PAGE_SIZE;
  });
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Estados para filtros de sucursales
  const [showBranchFilters, setShowBranchFilters] = useState(false);
  const [selectedBranchFilters, setSelectedBranchFilters] = useState<
    Set<string>
  >(new Set());
  const [showUnassignedProducts, setShowUnassignedProducts] = useState(false);
  const [productBranchMap, setProductBranchMap] = useState<
    Map<string, Set<string>>
  >(new Map()); // productId -> Set of branchIds
  const [loadingBranchMap, setLoadingBranchMap] = useState(false);

  // Estados para compatibilidad de vehículos
  const [productCompatibilities, setProductCompatibilities] = useState<
    ProductCompatibility[]
  >([]);
  const [loadingCompatibilities, setLoadingCompatibilities] = useState(false);

  // Estados para disponibilidad por sucursal
  const [branchAvailabilities, setBranchAvailabilities] = useState<
    Array<{
      branch_id: string;
      branch_name: string;
      is_enabled: boolean;
      price: number | null;
      stock: number | null;
      is_active?: boolean; // Estado activo/inactivo de la sucursal
      classification_ids?: string[];
      classifications?: Array<{ id: string; name: string; slug: string }>;
    }>
  >([]);
  const [loadingBranchAvailabilities, setLoadingBranchAvailabilities] =
    useState(false);

  // Estados para impuestos
  const [availableTaxTypes, setAvailableTaxTypes] = useState<TaxType[]>([]);
  const [productTaxes, setProductTaxes] = useState<ProductTax[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Persist page preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, currentPage.toString());
    }
  }, [currentPage]);

  // Persist page size preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, pageSize.toString());
    }
  }, [pageSize]);

  // Limpiar preferencias si se navega fuera de productos
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window === "undefined") return;
      if (!url.startsWith(PRODUCTS_ROUTE_PREFIX)) {
        localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
        localStorage.removeItem(CURRENT_PAGE_STORAGE_KEY);
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events]);

  const loadData = async (
    page: number = currentPage,
    limit: number = pageSize,
    searchValue: string = searchTerm,
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Obtener vehículo del usuario si está guardado
      const userVehicle = getUserVehicle();

      // Cargar productos y categorías en paralelo
      // Los productos son GLOBALES - no se filtra por businessId
      // Si se proporciona businessId, solo se usa para crear productos nuevos, pero el listado es global
      const [productsResponse, categoriesData] = await Promise.all([
        productsService.getProducts(undefined, userVehicle || undefined, {
          page,
          limit,
          search: searchValue,
        }), // undefined = todos los productos globales
        productsService.getCategories(),
      ]);

      // Actualizar productos y paginación
      const loadedProducts = Array.isArray(productsResponse.data)
        ? productsResponse.data
        : [];
      setProducts(loadedProducts);
      setTotalProducts(productsResponse.pagination.total || 0);
      setTotalPages(productsResponse.pagination.totalPages || 0);
      setCurrentPage(productsResponse.pagination.page || 1);

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      // Cargar disponibilidad de sucursales para todos los productos solo si hay filtros activos o hay productos
      // Esto se puede optimizar cargando solo cuando se necesite filtrar
      if (loadedProducts.length > 0 && availableBusinesses.length > 0) {
        // Cargar en segundo plano sin bloquear la UI
        loadProductBranchMap(loadedProducts).catch((err) => {
          console.error("Error cargando mapa de sucursales:", err);
        });
      }
    } catch (err: any) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  // Cargar el mapa de productos -> sucursales asignadas
  const loadProductBranchMap = async (productsToLoad: Product[]) => {
    try {
      setLoadingBranchMap(true);
      const newMap = new Map<string, Set<string>>();

      // Cargar disponibilidad para cada producto
      await Promise.all(
        productsToLoad.map(async (product) => {
          try {
            const availability =
              await productsService.getProductBranchAvailability(product.id);
            const assignedBranches = new Set<string>();

            availability.availabilities.forEach((avail) => {
              if (avail.is_enabled) {
                assignedBranches.add(avail.branch_id);
              }
            });

            newMap.set(product.id, assignedBranches);
          } catch (err) {
            // Si falla, asumir que no tiene asignaciones
            newMap.set(product.id, new Set());
          }
        }),
      );

      setProductBranchMap(newMap);
    } catch (err: any) {
      console.error("Error cargando mapa de sucursales:", err);
    } finally {
      setLoadingBranchMap(false);
    }
  };

  // Cargar datos iniciales - productos son globales, no requieren tienda
  useEffect(() => {
    loadTaxTypes();
  }, []); // Cargar una sola vez al montar

  // Recargar cuando cambie la página, el tamaño de página o el término de búsqueda
  useEffect(() => {
    if (currentPage > 0) {
      loadData(currentPage, pageSize, searchTerm);
    }
  }, [currentPage, pageSize, searchTerm]); // Recargar cuando cambie la página, el tamaño de página o la búsqueda

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setCurrentPage(1);
    setSearchTerm(searchInput.trim());
  };

  const loadTaxTypes = async () => {
    try {
      setLoadingTaxes(true);
      console.log("[ProductsPage] Cargando tipos de impuestos...");
      const taxTypes = await taxesService.getTaxTypes(false);
      console.log(
        "[ProductsPage] Tipos de impuestos recibidos:",
        taxTypes?.length || 0,
        taxTypes,
      );
      // Asegurar que siempre sea un array
      const taxTypesArray = Array.isArray(taxTypes) ? taxTypes : [];
      setAvailableTaxTypes(taxTypesArray);

      if (taxTypesArray.length === 0) {
        console.warn(
          "[ProductsPage] No se encontraron tipos de impuestos. Intentando cargar incluyendo inactivos...",
        );
        // Intentar cargar también los inactivos para diagnóstico
        const allTaxTypes = await taxesService.getTaxTypes(true);
        console.log(
          "[ProductsPage] Tipos de impuestos (incluyendo inactivos):",
          allTaxTypes?.length || 0,
        );
      }
    } catch (err: any) {
      console.error("[ProductsPage] Error cargando tipos de impuestos:", err);
      // Asegurar que siempre sea un array, incluso si hay error
      setAvailableTaxTypes([]);
    } finally {
      setLoadingTaxes(false);
    }
  };

  const loadProductTaxes = async (productId: string) => {
    try {
      setLoadingTaxes(true);
      const taxes = await taxesService.getProductTaxes(productId);
      setProductTaxes(taxes);
    } catch (err: any) {
      console.error("Error cargando impuestos del producto:", err);
      setProductTaxes([]);
    } finally {
      setLoadingTaxes(false);
    }
  };

  const loadProductCompatibilities = async (productId: string) => {
    try {
      setLoadingCompatibilities(true);
      const compatibilities =
        await vehiclesService.getProductCompatibilities(productId);
      setProductCompatibilities(compatibilities || []);
    } catch (err: any) {
      console.error("Error cargando compatibilidades del producto:", err);
      setProductCompatibilities([]);
    } finally {
      setLoadingCompatibilities(false);
    }
  };

  const saveProductCompatibilities = async (productId: string) => {
    try {
      // Obtener compatibilidades actuales del producto
      const currentCompatibilities =
        await vehiclesService.getProductCompatibilities(productId);
      const currentIds = currentCompatibilities.map((c) => c.id);

      // Eliminar compatibilidades que ya no están en la lista
      for (const current of currentCompatibilities) {
        if (!productCompatibilities.find((pc) => pc.id === current.id)) {
          await vehiclesService.removeProductCompatibility(current.id);
        }
      }

      // Agregar nuevas compatibilidades
      for (const compatibility of productCompatibilities) {
        if (!compatibility.id || !currentIds.includes(compatibility.id)) {
          // Es una nueva compatibilidad
          await vehiclesService.addProductCompatibility(productId, {
            vehicle_brand_id: compatibility.vehicle_brand_id || undefined,
            vehicle_model_id: compatibility.vehicle_model_id || undefined,
            vehicle_year_id: compatibility.vehicle_year_id || undefined,
            vehicle_spec_id: compatibility.vehicle_spec_id || undefined,
            is_universal: compatibility.is_universal || false,
            notes: compatibility.notes || undefined,
          });
        }
      }
    } catch (err: any) {
      console.error("Error guardando compatibilidades:", err);
      // No fallar el guardado del producto si hay error en compatibilidades
    }
  };

  const loadProductImages = async (productId: string) => {
    try {
      setLoadingImages(true);
      const images = await productsService.getProductImages(productId);
      setProductImages(
        images.map((img: any) => ({
          id: img.id,
          public_url: img.public_url || img.url,
          alt_text: img.alt_text,
          is_primary: img.is_primary,
          display_order: img.display_order,
        })),
      );
    } catch (err: any) {
      console.error("Error cargando imágenes del producto:", err);
      setProductImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadBranchAvailabilities = async (productId: string) => {
    try {
      setLoadingBranchAvailabilities(true);
      const response =
        await productsService.getProductBranchAvailability(productId);

      // Enriquecer con información de is_active de availableBusinesses si no viene del backend
      const enrichedAvailabilities = (response.availabilities || []).map(
        (avail) => {
          const business = availableBusinesses.find(
            (b) => b.business_id === avail.branch_id,
          );
          return {
            ...avail,
            is_active:
              avail.is_active !== undefined
                ? avail.is_active
                : (business?.is_active ?? true),
            classification_ids: Array.isArray(avail.classification_ids)
              ? avail.classification_ids
              : [],
            classifications: Array.isArray(avail.classifications)
              ? avail.classifications
              : [],
          };
        },
      );

      setBranchAvailabilities(enrichedAvailabilities);
    } catch (err: any) {
      console.error("Error cargando disponibilidad por sucursal:", err);
      setBranchAvailabilities([]);
    } finally {
      setLoadingBranchAvailabilities(false);
    }
  };

  const saveBranchAvailabilities = async (productId: string) => {
    try {
      // Filtrar y mapear solo las sucursales que tienen datos válidos
      const availabilitiesToSave = branchAvailabilities
        .filter((avail) => avail.branch_id) // Solo las que tienen branch_id
        .map((avail) => ({
          branch_id: avail.branch_id,
          is_enabled: avail.is_enabled || false,
          price:
            avail.price !== null && avail.price !== undefined
              ? avail.price
              : null,
          stock:
            avail.stock !== null && avail.stock !== undefined
              ? avail.stock
              : null,
          classification_ids:
            avail.is_enabled && Array.isArray(avail.classification_ids)
              ? avail.classification_ids
              : [],
        }));

      if (availabilitiesToSave.length > 0) {
        console.log(
          "💾 Guardando disponibilidad por sucursal:",
          availabilitiesToSave,
        );
        await productsService.updateProductBranchAvailability(
          productId,
          availabilitiesToSave,
        );
        console.log("✅ Disponibilidad por sucursal guardada exitosamente");
      }
    } catch (err: any) {
      console.error("❌ Error guardando disponibilidad por sucursal:", err);
      // No fallar el guardado del producto si hay error en disponibilidad
    }
  };

  const handleCreate = () => {
    // Para crear productos, necesitamos una tienda
    // Si no hay tienda seleccionada, usar la primera disponible
    const businessToUse =
      selectedBusiness ||
      (availableBusinesses.length > 0 ? availableBusinesses[0] : null);

    if (!businessToUse?.business_id) {
      setError(
        "No hay tienda disponible para crear productos. Por favor, selecciona una tienda o crea una nueva.",
      );
      return;
    }

    resetForm();
    setShowProductTypeSelection(true);
  };

  const handleProductTypeSelect = async (productType: ProductType) => {
    try {
      // Obtener configuración de campos para este tipo
      const config =
        await productsService.getFieldConfigByProductType(productType);
      setFieldConfig(config);
      setSelectedProductType(productType);

      // Asegurar que los tipos de impuestos estén cargados
      if (!availableTaxTypes || availableTaxTypes.length === 0) {
        await loadTaxTypes();
      }

      // Para crear productos, usar la tienda seleccionada o la primera disponible
      const businessToUse =
        selectedBusiness ||
        (availableBusinesses.length > 0 ? availableBusinesses[0] : null);

      // Inicializar formulario con el tipo seleccionado
      setFormData({
        ...formData,
        business_id: businessToUse?.business_id || "",
        sku: formData.sku || "",
        product_type: productType,
      });

      setShowProductTypeSelection(false);
      setShowForm(true);
    } catch (err: any) {
      console.error("Error obteniendo configuración de campos:", err);
      setError("Error al cargar configuración del formulario");
    }
  };

  const handleEdit = async (product: Product) => {
    // Navegar a la página de detalle del producto con el ID en la URL
    router.push(`/products/${product.id}`);
  };

  const resetForm = () => {
    // Para crear productos, usar la tienda seleccionada o la primera disponible
    const businessToUse =
      selectedBusiness ||
      (availableBusinesses.length > 0 ? availableBusinesses[0] : null);

    setFormData({
      business_id: businessToUse?.business_id || "",
      name: "",
      sku: "",
      description: "",
      image_url: "",
      price: 0,
      product_type: "food",
      category_id: "",
      is_available: true,
      is_featured: false,
      display_order: 0,
    });
    setImageFile(null);
    setImagePreview(null);
    setVariantGroups([]);
    setAllergens([]);
    setNutritionalInfo({});
    setEditingProduct(null);
    setProductTaxes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let imageUrl = formData.image_url;

      // TODO: Subir imagen si hay un archivo nuevo
      // Por ahora, si hay un archivo, mostrar un mensaje de que necesita una URL
      if (imageFile) {
        // Por ahora, usamos el preview como URL temporal
        // En producción, esto debería subir la imagen al servidor
        imageUrl = imagePreview || formData.image_url;
        // TODO: Descomentar cuando esté implementado:
        // imageUrl = await productsService.uploadProductImage(imageFile, editingProduct?.id);
      }

      const productData: CreateProductData = {
        ...formData,
        sku:
          formData.sku && formData.sku.trim() !== ""
            ? formData.sku.trim()
            : undefined,
        image_url: imageUrl,
        variant_groups: variantGroups, // Enviar siempre, incluso si está vacío para poder eliminar grupos
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info:
          Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
      };

      // En contexto de sucursal, evitar modificar disponibilidad global
      if (selectedBusiness?.business_id) {
        delete (productData as any).is_available;
      }

      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await productsService.updateProduct({
          ...productData,
          id: editingProduct.id,
        });
      } else {
        savedProduct = await productsService.createProduct(productData);
      }

      // Guardar/actualizar impuestos del producto
      if (savedProduct?.id) {
        try {
          // Obtener impuestos actuales del producto
          const currentTaxes = await taxesService.getProductTaxes(
            savedProduct.id,
          );
          const currentTaxTypeIds = currentTaxes.map((t) => t.tax_type_id);

          // Asignar nuevos impuestos
          for (const productTax of productTaxes) {
            if (!currentTaxTypeIds.includes(productTax.tax_type_id)) {
              await taxesService.assignTaxToProduct(savedProduct.id, {
                tax_type_id: productTax.tax_type_id,
                override_rate: productTax.override_rate,
                override_fixed_amount: productTax.override_fixed_amount,
                display_order: productTax.display_order,
              });
            } else {
              // Actualizar si hay cambios en override
              const existingTax = currentTaxes.find(
                (t) => t.tax_type_id === productTax.tax_type_id,
              );
              if (
                existingTax &&
                (existingTax.override_rate !== productTax.override_rate ||
                  existingTax.override_fixed_amount !==
                    productTax.override_fixed_amount)
              ) {
                await taxesService.assignTaxToProduct(savedProduct.id, {
                  tax_type_id: productTax.tax_type_id,
                  override_rate: productTax.override_rate,
                  override_fixed_amount: productTax.override_fixed_amount,
                  display_order: productTax.display_order,
                });
              }
            }
          }

          // Desasignar impuestos que ya no están en la lista
          for (const currentTax of currentTaxes) {
            if (
              !productTaxes.find(
                (pt) => pt.tax_type_id === currentTax.tax_type_id,
              )
            ) {
              await taxesService.removeTaxFromProduct(
                savedProduct.id,
                currentTax.tax_type_id,
              );
            }
          }
        } catch (taxErr: any) {
          console.error("Error guardando impuestos:", taxErr);
          // No fallar el guardado del producto si hay error en impuestos
        }
      }

      await loadData();
      if (!editingProduct) {
        if (savedProduct?.id) {
          router.push(`/products/${savedProduct.id}`);
        } else {
          setError("No se pudo redirigir al producto recien creado");
        }
        return;
      } else {
        // Guardar compatibilidades si es refaccion o accesorio
        if (
          savedProduct.product_type === "refaccion" ||
          savedProduct.product_type === "accesorio"
        ) {
          await saveProductCompatibilities(savedProduct.id);
        }
        // Guardar disponibilidad por sucursal - enviar TODAS las sucursales
        if (branchAvailabilities.length > 0) {
          try {
            const availabilitiesToSave = branchAvailabilities
              .filter((avail) => avail.branch_id) // Solo las que tienen branch_id
              .map((avail) => ({
                branch_id: avail.branch_id,
                is_enabled: avail.is_enabled || false,
                price:
                  avail.price !== null && avail.price !== undefined
                    ? avail.price
                    : null,
                stock:
                  avail.stock !== null && avail.stock !== undefined
                    ? avail.stock
                    : null,
                classification_ids:
                  avail.is_enabled && Array.isArray(avail.classification_ids)
                    ? avail.classification_ids
                    : [],
              }));

            if (availabilitiesToSave.length > 0) {
              console.log(
                "💾 Guardando disponibilidad por sucursal:",
                availabilitiesToSave,
              );
              await productsService.updateProductBranchAvailability(
                savedProduct.id,
                availabilitiesToSave,
              );
              console.log(
                "✅ Disponibilidad por sucursal guardada exitosamente",
              );
            }
          } catch (err: any) {
            console.error(
              "❌ Error guardando disponibilidad por sucursal:",
              err,
            );
            // No fallar el guardado del producto si hay error en disponibilidad
          }
        }
        // Si es edición, cerrar el formulario
        setShowForm(false);
        resetForm();
      }
    } catch (err: any) {
      console.error("Error guardando producto:", err);
      setError(err.message || "Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    const action = product.is_available ? "desactivar" : "activar";
    if (!confirm(`¿Estás seguro de que deseas ${action} este producto?`)) {
      return;
    }

    try {
      await productsService.updateProduct({
        id: product.id,
        is_available: !product.is_available,
      });
      await loadData();
    } catch (err: any) {
      console.error(`Error ${action} producto:`, err);
      setError(`Error al ${action} el producto`);
    }
  };

  // Obtener categorías filtradas por tipo de producto
  const getFilteredCategories = () => {
    if (!formData.product_type) return categories;
    // Filtrar categorías que tengan el atributo product_type o que sean generales
    return categories.filter((cat) => {
      const attrs = cat.attributes || {};
      return (
        !attrs.product_type || attrs.product_type === formData.product_type
      );
    });
  };

  // Verificar si el producto es de farmacia
  const isMedicine = formData.product_type === "medicine";

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = products
    .filter((product) => {
      // Filtro por sucursales
      const productBranches =
        productBranchMap.get(product.id) || new Set<string>();
      const hasAssignments = productBranches.size > 0;

      // Si se selecciona "mostrar productos no asignados"
      if (showUnassignedProducts && hasAssignments) {
        return false;
      }

      // Si hay filtros de sucursales seleccionados
      if (selectedBranchFilters.size > 0) {
        // Verificar si el producto está asignado a alguna de las sucursales seleccionadas
        const hasSelectedBranch = Array.from(selectedBranchFilters).some(
          (branchId) => productBranches.has(branchId),
        );
        return hasSelectedBranch;
      }

      // Si no hay filtros activos, mostrar todos
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        const aValue = a.name.toLowerCase();
        const bValue = b.name.toLowerCase();
        if (sortOrder === "asc") {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else if (sortBy === "price") {
        if (sortOrder === "asc") {
          return a.price - b.price;
        } else {
          return b.price - a.price;
        }
      }
      return 0;
    });

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando productos...</div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Productos - LOCALIA Local</title>
      </Head>

      <div className="w-full h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-medium text-gray-900">Productos</h1>
          {!showForm && (
            <div className="flex items-center gap-3">
              {/* Botón de Filtros */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBranchFilters(!showBranchFilters)}
                  className={`px-4 py-1.5 text-sm font-normal rounded border transition-colors ${
                    showBranchFilters ||
                    selectedBranchFilters.size > 0 ||
                    showUnassignedProducts
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Filtros
                    {(selectedBranchFilters.size > 0 ||
                      showUnassignedProducts) && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-gray-900 rounded-full">
                        {selectedBranchFilters.size +
                          (showUnassignedProducts ? 1 : 0)}
                      </span>
                    )}
                  </div>
                </button>

                {/* Dropdown de Filtros */}
                {showBranchFilters && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowBranchFilters(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Filtrar por Sucursales
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowBranchFilters(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Opción: Productos no asignados */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showUnassignedProducts}
                              onChange={(e) => {
                                setShowUnassignedProducts(e.target.checked);
                                if (e.target.checked) {
                                  setSelectedBranchFilters(new Set());
                                }
                              }}
                              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Productos no asignados a ninguna sucursal
                            </span>
                          </label>
                        </div>

                        {/* Lista de Sucursales */}
                        <div className="max-h-64 overflow-y-auto">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              Sucursales
                            </span>
                            {availableBusinesses.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    selectedBranchFilters.size ===
                                    availableBusinesses.length
                                  ) {
                                    setSelectedBranchFilters(new Set());
                                  } else {
                                    setSelectedBranchFilters(
                                      new Set(
                                        availableBusinesses.map(
                                          (b) => b.business_id,
                                        ),
                                      ),
                                    );
                                  }
                                  setShowUnassignedProducts(false);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-900"
                              >
                                {selectedBranchFilters.size ===
                                availableBusinesses.length
                                  ? "Deseleccionar todas"
                                  : "Seleccionar todas"}
                              </button>
                            )}
                          </div>

                          {availableBusinesses.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">
                              No hay sucursales disponibles
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {availableBusinesses.map((business) => (
                                <label
                                  key={business.business_id}
                                  className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBranchFilters.has(
                                      business.business_id,
                                    )}
                                    onChange={(e) => {
                                      const newFilters = new Set(
                                        selectedBranchFilters,
                                      );
                                      if (e.target.checked) {
                                        newFilters.add(business.business_id);
                                      } else {
                                        newFilters.delete(business.business_id);
                                      }
                                      setSelectedBranchFilters(newFilters);
                                      setShowUnassignedProducts(false);
                                    }}
                                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 flex-1">
                                    {business.business_name}
                                  </span>
                                  {!business.is_active && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                      Inactiva
                                    </span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Botón Limpiar Filtros */}
                        {(selectedBranchFilters.size > 0 ||
                          showUnassignedProducts) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBranchFilters(new Set());
                                setShowUnassignedProducts(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              Limpiar Filtros
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
              >
                + Nuevo Producto
              </button>
            </div>
          )}
          {showForm && (
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-3 py-1.5 text-sm font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
            >
              ← Volver a la lista
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {showProductTypeSelection ? (
          /* Selección de tipo de producto */
          <ProductTypeSelection
            onSelect={handleProductTypeSelect}
            onCancel={() => {
              setShowProductTypeSelection(false);
              resetForm();
            }}
          />
        ) : showForm ? (
          /* Formulario integrado */
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            categories={getFilteredCategories()}
            imageFile={imageFile}
            imagePreview={imagePreview}
            onImageChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
            }}
            variantGroups={variantGroups}
            setVariantGroups={setVariantGroups}
            allergens={allergens}
            setAllergens={setAllergens}
            nutritionalInfo={nutritionalInfo}
            setNutritionalInfo={setNutritionalInfo}
            isMedicine={isMedicine}
            editingProduct={editingProduct}
            saving={saving}
            fieldConfig={fieldConfig}
            availableTaxTypes={availableTaxTypes}
            productTaxes={productTaxes}
            setProductTaxes={setProductTaxes}
            loadingTaxes={loadingTaxes}
            onLoadProductTaxes={
              editingProduct
                ? () => loadProductTaxes(editingProduct.id)
                : undefined
            }
            productCompatibilities={productCompatibilities}
            setProductCompatibilities={setProductCompatibilities}
            loadingCompatibilities={loadingCompatibilities}
            onLoadProductCompatibilities={
              editingProduct
                ? () => loadProductCompatibilities(editingProduct.id)
                : undefined
            }
            branchAvailabilities={branchAvailabilities}
            setBranchAvailabilities={setBranchAvailabilities}
            loadingBranchAvailabilities={loadingBranchAvailabilities}
            onLoadBranchAvailabilities={loadBranchAvailabilities}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setShowProductTypeSelection(false);
              setSelectedProductType(null);
              resetForm();
            }}
          />
        ) : (
          /* Lista de productos en tabla */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barra de búsqueda */}
            <form className="mb-4" onSubmit={handleSearchSubmit}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
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
                  <input
                    type="text"
                    placeholder="Buscar Productos..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearchSubmit(e);
                      }
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-normal bg-gray-900 text-white rounded border border-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Buscar
                </button>
              </div>
            </form>

            {/* Tabla de productos */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortBy === "name") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("name");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Producto
                          {sortBy === "name" && (
                            <svg
                              className={`h-4 w-4 ${sortOrder === "asc" ? "transform rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Disponibilidad
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Descripción
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortBy === "price") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("price");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Precio
                          {sortBy === "price" && (
                            <svg
                              className={`h-4 w-4 ${sortOrder === "asc" ? "transform rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tipo
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedProducts.map((product) => {
                      const productTypeLabels: Record<
                        ProductType,
                        { label: string; color: string }
                      > = {
                        food: {
                          label: "Alimento",
                          color: "bg-blue-100 text-blue-800",
                        },
                        beverage: {
                          label: "Bebida",
                          color: "bg-cyan-100 text-cyan-800",
                        },
                        medicine: {
                          label: "Medicamento",
                          color: "bg-red-100 text-red-800",
                        },
                        grocery: {
                          label: "Abarrotes",
                          color: "bg-yellow-100 text-yellow-800",
                        },
                        non_food: {
                          label: "No Alimenticio",
                          color: "bg-gray-100 text-gray-800",
                        },
                      };
                      const typeInfo = productTypeLabels[
                        product.product_type
                      ] || {
                        label: product.product_type,
                        color: "bg-gray-100 text-gray-800",
                      };

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => {
                            // Evitar que el click en checkbox o botones active la navegación
                            const target = e.target as HTMLElement;
                            if (
                              target.closest('input[type="checkbox"]') ||
                              target.closest("button") ||
                              target.closest("svg")
                            ) {
                              return;
                            }
                            handleEdit(product);
                          }}
                        >
                          <td
                            className="px-6 py-4 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 max-w-md">
                              {product.name}
                            </div>
                            {product.sku && (
                              <div className="text-xs text-gray-500 mt-1">
                                SKU: {product.sku}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className={`h-2 w-2 rounded-full mr-2 ${product.is_available ? "bg-green-500" : "bg-gray-400"}`}
                              ></div>
                              <span className="text-sm text-gray-600">
                                {product.is_available
                                  ? "Disponible"
                                  : "No disponible"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {product.description || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${product.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}
                            >
                              {typeInfo.label}
                            </span>
                          </td>
                          <td
                            className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Editar"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleAvailability(product)
                                }
                                className={
                                  product.is_available
                                    ? "text-gray-600 hover:text-gray-900"
                                    : "text-green-600 hover:text-green-900"
                                }
                                title={
                                  product.is_available
                                    ? "Desactivar"
                                    : "Activar"
                                }
                              >
                                {product.is_available ? (
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAndSortedProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">
                    {searchTerm
                      ? "No se encontraron productos que coincidan con la búsqueda"
                      : "No hay productos registrados"}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreate}
                      className="mt-4 px-3 py-1.5 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                    >
                      Crear primer producto
                    </button>
                  )}
                </div>
              )}

              {filteredAndSortedProducts.length > 0 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Mostrando {(currentPage - 1) * pageSize + 1} -{" "}
                      {Math.min(currentPage * pageSize, totalProducts)} de{" "}
                      {totalProducts} productos
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Selector de tamaño de página */}
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500">
                          Mostrar:
                        </label>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1); // Resetear a la primera página
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                        >
                          {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Controles de paginación */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Primera página"
                        >
                          ««
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Página anterior"
                        >
                          «
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Página {currentPage} de {totalPages || 1}
                        </span>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Página siguiente"
                        >
                          »
                        </button>
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Última página"
                        >
                          »»
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </LocalLayout>
  );
}

// Componente de selección de tipo de producto
interface ProductTypeSelectionProps {
  onSelect: (productType: ProductType) => void;
  onCancel: () => void;
}

function ProductTypeSelection({
  onSelect,
  onCancel,
}: ProductTypeSelectionProps) {
  const [productTypes, setProductTypes] = useState<
    Array<{ value: ProductType; label: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProductTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const types = await productsService.getProductTypes();
        setProductTypes(types);
      } catch (err: any) {
        console.error("Error cargando tipos de producto:", err);
        setError("No se pudieron cargar los tipos de producto");
        // Usar valores por defecto en caso de error
        setProductTypes([
          { value: "food", label: "Alimento" },
          { value: "beverage", label: "Bebida" },
          { value: "medicine", label: "Medicamento" },
          { value: "grocery", label: "Abarrotes" },
          { value: "non_food", label: "No Alimenticio" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadProductTypes();
  }, []);

  // Mapeo de descripciones para cada tipo (puede ser extendido según necesidad)
  const getTypeDescription = (value: string): string => {
    const descriptions: Record<string, string> = {
      food: "Alimentos y comidas preparadas",
      beverage: "Bebidas y refrescos",
      medicine: "Medicamentos y productos farmacéuticos",
      grocery: "Abarrotes y productos de despensa",
      non_food: "Productos no alimenticios",
      refaccion: "Refacciones y repuestos",
      accesorio: "Accesorios para vehículos",
      servicio_instalacion: "Servicios de instalación",
      servicio_mantenimiento: "Servicios de mantenimiento",
      fluido: "Fluidos y lubricantes",
    };
    return descriptions[value] || "Tipo de producto";
  };

  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">
          Seleccionar Tipo de Producto
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-600 mb-6">
          Selecciona el tipo de producto que deseas crear. Esto determinará qué
          campos estarán disponibles en el formulario.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-sm text-gray-600">
              Cargando tipos de producto...
            </span>
          </div>
        ) : error ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        ) : null}

        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => onSelect(type.value)}
                  className="p-4 border border-gray-200 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors text-left"
                >
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {type.label}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {getTypeDescription(type.value)}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Componente del formulario integrado
export interface ProductFormProps {
  formData: CreateProductData;
  setFormData: React.Dispatch<React.SetStateAction<CreateProductData>>;
  categories: ProductCategory[];
  imageFile: File | null;
  imagePreview: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
  variantGroups: ProductVariantGroup[];
  setVariantGroups: React.Dispatch<React.SetStateAction<ProductVariantGroup[]>>;
  allergens: string[];
  setAllergens: React.Dispatch<React.SetStateAction<string[]>>;
  nutritionalInfo: Record<string, any>;
  setNutritionalInfo: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isMedicine: boolean;
  editingProduct: Product | null;
  saving: boolean;
  fieldConfig: Array<{
    fieldName: string;
    isVisible: boolean;
    isRequired: boolean;
    displayOrder?: number;
  }>;
  availableTaxTypes: TaxType[];
  productTaxes: ProductTax[];
  setProductTaxes: React.Dispatch<React.SetStateAction<ProductTax[]>>;
  loadingTaxes: boolean;
  onLoadProductTaxes?: () => void;
  productCompatibilities: ProductCompatibility[];
  setProductCompatibilities: React.Dispatch<
    React.SetStateAction<ProductCompatibility[]>
  >;
  loadingCompatibilities: boolean;
  onLoadProductCompatibilities?: () => void;
  branchAvailabilities: Array<{
    branch_id: string;
    branch_name: string;
    is_enabled: boolean;
    price: number | null;
    stock: number | null;
    classification_ids?: string[];
    classifications?: Array<{ id: string; name: string; slug: string }>;
  }>;
  setBranchAvailabilities: React.Dispatch<
    React.SetStateAction<
      Array<{
        branch_id: string;
        branch_name: string;
        is_enabled: boolean;
        price: number | null;
        stock: number | null;
        classification_ids?: string[];
        classifications?: Array<{ id: string; name: string; slug: string }>;
      }>
    >
  >;
  loadingBranchAvailabilities: boolean;
  onLoadBranchAvailabilities?: (productId: string) => void;
  productImages?: ProductImage[];
  setProductImages?: React.Dispatch<React.SetStateAction<ProductImage[]>>;
  loadingImages?: boolean;
  onLoadProductImages?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ProductForm({
  formData,
  setFormData,
  categories,
  imageFile,
  imagePreview,
  onImageChange,
  variantGroups,
  setVariantGroups,
  allergens,
  setAllergens,
  nutritionalInfo,
  setNutritionalInfo,
  isMedicine,
  editingProduct,
  saving,
  fieldConfig,
  availableTaxTypes,
  productTaxes,
  setProductTaxes,
  loadingTaxes,
  onLoadProductTaxes,
  productCompatibilities,
  setProductCompatibilities,
  loadingCompatibilities,
  onLoadProductCompatibilities,
  branchAvailabilities,
  setBranchAvailabilities,
  loadingBranchAvailabilities,
  onLoadBranchAvailabilities,
  productImages = [],
  setProductImages,
  loadingImages = false,
  onLoadProductImages,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { selectedBusiness, availableBusinesses } = useSelectedBusiness();
  const [classificationsByBranch, setClassificationsByBranch] = useState<
    Record<string, ProductClassification[]>
  >({});
  const [loadingClassifications, setLoadingClassifications] =
    useState<boolean>(false);
  const currentBranchId = selectedBusiness?.business_id || null;
  const [productTypes, setProductTypes] = useState<
    Array<{ value: ProductType; label: string }>
  >([]);
  const [showPriceHelp, setShowPriceHelp] = useState(false);
  const [showSelectionTypeHelp, setShowSelectionTypeHelp] = useState(false);
  const branchAvailability = currentBranchId
    ? branchAvailabilities.find((a) => a.branch_id === currentBranchId)
    : undefined;
  const branchIsActive = branchAvailability?.is_active ?? true;
  const branchIsAvailable = currentBranchId
    ? (branchAvailability?.is_enabled ?? false)
    : formData.is_available;
  const commonAllergens = [
    "gluten",
    "lactosa",
    "huevo",
    "soja",
    "nueces",
    "pescado",
    "mariscos",
    "sésamo",
  ];

  // Cargar tipos de producto al montar el componente
  useEffect(() => {
    const loadProductTypes = async () => {
      try {
        const types = await productsService.getProductTypes();
        setProductTypes(types);
      } catch (err: any) {
        console.error("Error cargando tipos de producto:", err);
        // Usar valores por defecto en caso de error
        setProductTypes([
          { value: "food", label: "Alimento" },
          { value: "beverage", label: "Bebida" },
          { value: "medicine", label: "Medicamento" },
          { value: "grocery", label: "Abarrotes" },
          { value: "non_food", label: "No Alimenticio" },
        ]);
      }
    };

    loadProductTypes();
  }, []);

  // Cargar clasificaciones por sucursal
  useEffect(() => {
    const businessIds = availableBusinesses
      .map((b) => b.business_id)
      .filter((id) => !!id);

    if (businessIds.length === 0) {
      setClassificationsByBranch({});
      return;
    }

    let isMounted = true;

    const loadClassifications = async () => {
      try {
        setLoadingClassifications(true);
        const entries = await Promise.all(
          businessIds.map(async (businessId) => {
            try {
              const response =
                await productClassificationsService.list(businessId);
              return [businessId, response.data || []] as const;
            } catch (err) {
              console.error("Error cargando clasificaciones:", err);
              return [businessId, []] as const;
            }
          }),
        );

        if (!isMounted) return;

        const map: Record<string, ProductClassification[]> = {};
        entries.forEach(([businessId, list]) => {
          map[businessId] = list;
        });
        setClassificationsByBranch(map);
      } finally {
        if (isMounted) {
          setLoadingClassifications(false);
        }
      }
    };

    loadClassifications();

    return () => {
      isMounted = false;
    };
  }, [availableBusinesses.map((b) => b.business_id).join(",")]);

  // Cargar impuestos del producto cuando se edita
  useEffect(() => {
    if (editingProduct?.id && onLoadProductTaxes) {
      onLoadProductTaxes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct?.id]); // Solo ejecutar cuando cambie el ID del producto, no cuando cambie la función

  // Detectar si el sistema de precios por sucursal está activo
  // Si hay sucursales disponibles, el sistema está activo y las variantes solo pueden usar ajustes relativos
  const hasBranchPrices =
    availableBusinesses.length > 0 || branchAvailabilities.length > 0;

  useEffect(() => {
    // Si hay precios por sucursal, convertir todos los precios absolutos a ajustes relativos
    if (hasBranchPrices) {
      const basePrice = formData.price || 0;
      let hasChanges = false;
      const updatedGroups = variantGroups.map((group) => ({
        ...group,
        variants: group.variants.map((variant) => {
          if (
            variant.absolute_price !== undefined &&
            variant.absolute_price !== null
          ) {
            hasChanges = true;
            // Convertir precio absoluto a ajuste relativo
            const adjustment = variant.absolute_price - basePrice;
            return {
              ...variant,
              absolute_price: undefined,
              price_adjustment: adjustment,
            };
          }
          return variant;
        }),
      }));

      if (hasChanges) {
        setVariantGroups(updatedGroups);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBranchPrices, formData.price]); // Solo ejecutar cuando cambie hasBranchPrices o el precio base

  // Helper para verificar si un campo es visible
  const isFieldVisible = (fieldName: string): boolean => {
    // Si no hay configuración cargada, retornar false por defecto
    if (!fieldConfig || fieldConfig.length === 0) {
      return false;
    }
    const field = fieldConfig.find((f) => f.fieldName === fieldName);
    // Si el campo está en la configuración, usar su valor de is_visible
    // Si no está, asumir que NO es visible (más conservador)
    return field ? field.isVisible : false;
  };

  // Helper para verificar si un campo es requerido
  const isFieldRequired = (fieldName: string): boolean => {
    const field = fieldConfig.find((f) => f.fieldName === fieldName);
    return field ? field.isRequired : false; // Por defecto no requerido si no hay configuración
  };

  const handleClassificationToggle = (
    branchId: string,
    branchName: string,
    classificationId: string,
    checked: boolean,
  ) => {
    setBranchAvailabilities((prev) => {
      const existing = prev.find((a) => a.branch_id === branchId);
      const currentIds = new Set(
        (existing?.classification_ids || []).filter(Boolean),
      );
      if (checked) {
        currentIds.add(classificationId);
      } else {
        currentIds.delete(classificationId);
      }

      const updatedEntry =
        existing ?? {
          branch_id: branchId,
          branch_name: branchName,
          is_enabled: false,
          price: null,
          stock: null,
          is_active: true,
        };

      const nextEntry = {
        ...updatedEntry,
        classification_ids: Array.from(currentIds),
      };

      if (existing) {
        return prev.map((a) => (a.branch_id === branchId ? nextEntry : a));
      }

      return [...prev, nextEntry];
    });
  };

  // Obtener campos ordenados según display_order
  const getOrderedFields = () => {
    return [...fieldConfig].sort(
      (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0),
    );
  };

  const addVariantGroup = () => {
    setVariantGroups([
      ...variantGroups,
      {
        name: "",
        description: "",
        is_required: false,
        selection_type: "single",
        display_order: variantGroups.length + 1,
        variants: [],
      },
    ]);
  };

  const removeVariantGroup = (index: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== index));
  };

  const updateVariantGroup = (
    index: number,
    updates: Partial<ProductVariantGroup>,
  ) => {
    const updated = [...variantGroups];
    updated[index] = { ...updated[index], ...updates };
    setVariantGroups(updated);
  };

  const addVariant = (groupIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants.push({
      name: "",
      description: "",
      price_adjustment: 0,
      is_available: true,
      display_order: updated[groupIndex].variants.length + 1,
    });
    setVariantGroups(updated);
  };

  const removeVariant = (groupIndex: number, variantIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants = updated[groupIndex].variants.filter(
      (_, i) => i !== variantIndex,
    );
    setVariantGroups(updated);
  };

  const updateVariant = (
    groupIndex: number,
    variantIndex: number,
    updates: any,
  ) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants[variantIndex] = {
      ...updated[groupIndex].variants[variantIndex],
      ...updates,
    };
    setVariantGroups(updated);
  };

  const toggleAllergen = (allergen: string) => {
    if (allergens.includes(allergen)) {
      setAllergens(allergens.filter((a) => a !== allergen));
    } else {
      setAllergens([...allergens, allergen]);
    }
  };

  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">
          {editingProduct ? "Editar Producto" : "Nuevo Producto"}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA - Información del Producto */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información General */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Información General
              </h3>

              {/* Nombre */}
              {isFieldVisible("name") && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Nombre{" "}
                    {isFieldRequired("name") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required={isFieldRequired("name")}
                    maxLength={255}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Hamburguesa Clásica"
                  />
                </div>
              )}

              {/* Campo SKU - siempre visible */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  SKU (Código de Producto)
                </label>
                <input
                  type="text"
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.sku || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Ej: HAMB-CLAS-001"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Código único de identificación del producto (opcional)
                </p>
              </div>

              {/* Campo SKU */}
              {fieldConfig.find((f) => f.fieldName === "sku")?.isVisible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU (Código de Producto)
                    {fieldConfig.find((f) => f.fieldName === "sku")
                      ?.isRequired && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required={
                      fieldConfig.find((f) => f.fieldName === "sku")
                        ?.isRequired || false
                    }
                    maxLength={100}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.sku || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Ej: HAMB-CLAS-001"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Código único de identificación del producto (opcional)
                  </p>
                </div>
              )}

              {/* Descripción */}
              {isFieldVisible("description") && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Descripción{" "}
                    {isFieldRequired("description") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <textarea
                    rows={4}
                    required={isFieldRequired("description")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe el producto..."
                  />
                </div>
              )}
            </div>

            {/* Media */}
            {isFieldVisible("image_url") && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Media
                </h3>
                {editingProduct && setProductImages ? (
                  <MultipleImageUpload
                    productId={editingProduct.id}
                    images={productImages || []}
                    onImagesChange={setProductImages}
                    label="Imágenes del Producto"
                    maxImages={10}
                    onUploadImage={async (file, productId) => {
                      console.log(
                        "📤 Subiendo imagen para producto:",
                        productId,
                      );
                      const uploaded = await productsService.uploadProductImage(
                        productId,
                        file,
                      );
                      console.log("📥 Imagen subida, respuesta:", uploaded);
                      return {
                        id: uploaded.id,
                        public_url: uploaded.public_url,
                        alt_text: uploaded.alt_text || null,
                        is_primary: uploaded.is_primary || false,
                        display_order: uploaded.display_order || 0,
                      };
                    }}
                    onDeleteImage={async (imageId) => {
                      if (editingProduct?.id) {
                        await productsService.deleteProductImage(
                          editingProduct.id,
                          imageId,
                        );
                      }
                    }}
                    onSetPrimary={async (imageId) => {
                      if (editingProduct?.id) {
                        await productsService.setPrimaryImage(
                          editingProduct.id,
                          imageId,
                        );
                      }
                    }}
                  />
                ) : (
                  <ImageUpload
                    currentImageUrl={imagePreview || undefined}
                    onImageChange={onImageChange}
                    label="Imagen del Producto"
                  />
                )}
              </div>
            )}

            {/* Variantes - Solo si el producto ya está creado y el campo es visible */}
            {editingProduct && isFieldVisible("variant_groups") && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                      Variantes
                    </h3>
                    {hasBranchPrices && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        ⚠️ Solo ajustes relativos (hay precios por sucursal)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={addVariantGroup}
                    className="px-3 py-1.5 text-xs font-normal text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    + Agregar Grupo de Variantes
                  </button>
                </div>

                {variantGroups.map((group, groupIndex) => (
                  <div
                    key={groupIndex}
                    className="mb-4 p-4 border border-gray-200 rounded"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-sm font-normal text-gray-700">
                        Grupo {groupIndex + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeVariantGroup(groupIndex)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-xs font-normal text-gray-600 mb-1.5">
                          Nombre del Grupo
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          value={group.name}
                          onChange={(e) =>
                            updateVariantGroup(groupIndex, {
                              name: e.target.value,
                            })
                          }
                          placeholder="Ej: Tamaño, Extras, Sabor"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-normal text-gray-600 mb-1.5">
                          Tipo de Selección
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          value={group.selection_type}
                          onChange={(e) =>
                            updateVariantGroup(groupIndex, {
                              selection_type: e.target.value as
                                | "single"
                                | "multiple",
                            })
                          }
                        >
                          <option value="single">Única</option>
                          <option value="multiple">Múltiple</option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        checked={group.is_required}
                        onChange={(e) =>
                          updateVariantGroup(groupIndex, {
                            is_required: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        Obligatorio seleccionar
                      </span>
                    </label>

                    <div className="space-y-2">
                      {(group.variants || []).map((variant, variantIndex) => {
                        // Detectar si el sistema de precios por sucursal está activo
                        // Si hay sucursales disponibles, el sistema está activo y las variantes solo pueden usar ajustes relativos
                        const hasBranchPrices =
                          availableBusinesses.length > 0 ||
                          branchAvailabilities.length > 0;

                        // Calcular precio final para mostrar
                        // Si hay precios por sucursal, mostrar ejemplos con diferentes precios de sucursal
                        const basePrice = formData.price || 0;
                        const hasAbsolutePrice =
                          !hasBranchPrices &&
                          variant.absolute_price !== undefined &&
                          variant.absolute_price !== null;
                        const finalPrice = hasAbsolutePrice
                          ? variant.absolute_price
                          : basePrice + (variant.price_adjustment || 0);

                        return (
                          <div
                            key={variantIndex}
                            className="flex gap-2 items-start p-3 bg-gray-50 rounded border border-gray-200"
                          >
                            <div className="flex-1 space-y-2">
                              <div
                                className={`grid gap-2 ${hasBranchPrices ? "grid-cols-2" : "grid-cols-3"}`}
                              >
                                <div>
                                  <label className="block text-xs font-normal text-gray-600 mb-1">
                                    Nombre
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                    value={variant.name}
                                    onChange={(e) =>
                                      updateVariant(groupIndex, variantIndex, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Ej: Chica, Mediana, Grande"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-normal text-gray-600 mb-1">
                                    Ajuste de Precio
                                    <span className="text-gray-400 ml-1">
                                      (relativo)
                                    </span>
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                      value={variant.price_adjustment}
                                      onChange={(e) => {
                                        const value =
                                          parseFloat(e.target.value) || 0;
                                        updateVariant(
                                          groupIndex,
                                          variantIndex,
                                          {
                                            price_adjustment: value,
                                            absolute_price: undefined, // Limpiar precio absoluto si se usa ajuste
                                          },
                                        );
                                      }}
                                      placeholder="+0.00"
                                      disabled={
                                        !hasBranchPrices &&
                                        variant.absolute_price !== undefined &&
                                        variant.absolute_price !== null
                                      }
                                    />
                                    {variant.price_adjustment !== 0 && (
                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                        {variant.price_adjustment > 0
                                          ? "+"
                                          : ""}
                                        {variant.price_adjustment.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {hasBranchPrices ? (
                                      <>
                                        Ajuste:{" "}
                                        {variant.price_adjustment >= 0
                                          ? "+"
                                          : ""}
                                        $
                                        {(
                                          variant.price_adjustment || 0
                                        ).toFixed(2)}
                                        <br />
                                        <span className="text-gray-500">
                                          Se aplica sobre el precio de cada
                                          sucursal
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        {basePrice.toFixed(2)} +{" "}
                                        {variant.price_adjustment >= 0
                                          ? "+"
                                          : ""}
                                        {(
                                          variant.price_adjustment || 0
                                        ).toFixed(2)}{" "}
                                        = ${(finalPrice || 0).toFixed(2)}
                                      </>
                                    )}
                                  </p>
                                </div>
                                {/* Precio Absoluto - Solo disponible si NO hay precios por sucursal */}
                                {!hasBranchPrices && (
                                  <div>
                                    <label className="block text-xs font-normal text-gray-600 mb-1">
                                      Precio Absoluto
                                      <span className="text-gray-400 ml-1">
                                        (fijo)
                                      </span>
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                        value={variant.absolute_price || ""}
                                        onChange={(e) => {
                                          const value = e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined;
                                          updateVariant(
                                            groupIndex,
                                            variantIndex,
                                            {
                                              absolute_price: value,
                                              price_adjustment:
                                                value !== undefined
                                                  ? 0
                                                  : variant.price_adjustment,
                                            },
                                          );
                                        }}
                                        placeholder="Opcional"
                                      />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {variant.absolute_price
                                        ? `Precio fijo: $${variant.absolute_price.toFixed(2)}`
                                        : "Usa ajuste relativo"}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                                {hasBranchPrices ? (
                                  <div className="flex-1">
                                    <span className="block">
                                      Ajuste:{" "}
                                      <strong className="text-gray-700">
                                        {variant.price_adjustment >= 0
                                          ? "+"
                                          : ""}
                                        $
                                        {(
                                          variant.price_adjustment || 0
                                        ).toFixed(2)}
                                      </strong>
                                    </span>
                                    <span className="text-gray-400 text-xs">
                                      Ejemplo: Sucursal $90 → $
                                      {(
                                        90 + (variant.price_adjustment || 0)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <span>
                                      Precio final:{" "}
                                      <strong className="text-gray-700">
                                        ${(finalPrice || 0).toFixed(2)}
                                      </strong>
                                    </span>
                                    {hasAbsolutePrice && (
                                      <span className="text-blue-600">
                                        (Precio fijo)
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                removeVariant(groupIndex, variantIndex)
                              }
                              className="text-gray-400 hover:text-gray-600 mt-6"
                              title="Eliminar variante"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addVariant(groupIndex)}
                        className="mt-2 px-3 py-1.5 text-xs font-normal text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                      >
                        + Agregar Variante
                      </button>
                    </div>

                    {/* Ayuda sobre precios y configuración - Desplegables */}
                    <div className="mt-3 space-y-2">
                      {/* Panel de ayuda sobre precios - Desplegable */}
                      <div className="border border-blue-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowPriceHelp(!showPriceHelp)}
                          className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between text-left"
                        >
                          <span className="text-xs font-medium text-gray-700">
                            💡 Cómo funcionan los precios
                          </span>
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${showPriceHelp ? "transform rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {showPriceHelp && (
                          <div className="p-3 bg-blue-50 border-t border-blue-200 text-xs text-gray-600">
                            {(() => {
                              const hasBranchPrices =
                                availableBusinesses.length > 0 ||
                                branchAvailabilities.length > 0;
                              if (hasBranchPrices) {
                                return (
                                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                                    <li>
                                      <strong>
                                        ⚠️ Precios por Sucursal Configurados:
                                      </strong>{" "}
                                      Las variantes solo pueden usar ajustes
                                      relativos (incrementos/decrementos).
                                    </li>
                                    <li>
                                      <strong>Ajuste de Precio:</strong> Se suma
                                      al precio base de cada sucursal. Ej: Si
                                      sucursal tiene $90 y ajuste es +$20,
                                      precio final = $110
                                    </li>
                                    <li>
                                      <strong>Ejemplo:</strong> Producto base
                                      $100, Sucursal A $90, Sucursal B $95 →
                                      Variante "Grande" +$20 → Sucursal A: $110,
                                      Sucursal B: $115
                                    </li>
                                    <li>
                                      <strong>💡 Ventaja:</strong> El mismo
                                      ajuste se aplica a todas las sucursales,
                                      manteniendo consistencia en los
                                      incrementos.
                                    </li>
                                  </ul>
                                );
                              } else {
                                return (
                                  <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                                    <li>
                                      <strong>Ajuste de Precio:</strong> Se suma
                                      al precio base (
                                      {formData.price
                                        ? `$${formData.price.toFixed(2)}`
                                        : "$0.00"}
                                      ). Ej: +$5.00 = $
                                      {formData.price
                                        ? (formData.price + 5).toFixed(2)
                                        : "5.00"}
                                    </li>
                                    <li>
                                      <strong>Precio Absoluto:</strong>{" "}
                                      Reemplaza el precio base. Si lo usas,
                                      ignora el ajuste.
                                    </li>
                                    <li>
                                      <strong>Ejemplo:</strong> Producto $120 →
                                      Chica: +$0 = $120, Grande: +$20 = $140, o
                                      Grande: $150 (absoluto)
                                    </li>
                                  </ul>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Panel de ayuda sobre tipos de selección - Desplegable */}
                      <div className="border border-green-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setShowSelectionTypeHelp(!showSelectionTypeHelp)
                          }
                          className="w-full px-3 py-2 bg-green-50 hover:bg-green-100 transition-colors flex items-center justify-between text-left"
                        >
                          <span className="text-xs font-medium text-gray-700">
                            📋 Tipos de Selección
                          </span>
                          <svg
                            className={`w-4 h-4 text-gray-600 transition-transform ${showSelectionTypeHelp ? "transform rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {showSelectionTypeHelp && (
                          <div className="p-3 bg-green-50 border-t border-green-200 text-xs text-gray-600">
                            <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                              <li>
                                <strong>Única:</strong> El cliente elige solo
                                UNA opción (ej: Tamaño - Chica, Mediana o
                                Grande)
                              </li>
                              <li>
                                <strong>Múltiple:</strong> El cliente puede
                                elegir VARIAS opciones (ej: Salsas - puede
                                elegir Magui, Valentina, Inglesa, etc.)
                              </li>
                              <li>
                                <strong>💡 Para salsas/condimentos:</strong> Usa
                                "Múltiple" para que puedan elegir varias salsas
                              </li>
                              <li>
                                <strong>💡 Para tamaños:</strong> Usa "Única"
                                porque solo pueden elegir un tamaño
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!editingProduct && isFieldVisible("variant_groups") && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm text-gray-500">
                  Las variantes se pueden gestionar después de crear el
                  producto.
                </p>
              </div>
            )}

            {/* Disponibilidad por Sucursal - Entre variantes y compatibilidad */}
            {editingProduct && (
              <BranchAvailabilitySection
                branchAvailabilities={branchAvailabilities}
                setBranchAvailabilities={setBranchAvailabilities}
                loadingBranchAvailabilities={loadingBranchAvailabilities}
                onLoadBranchAvailabilities={onLoadBranchAvailabilities}
                editingProduct={editingProduct}
                globalPrice={formData.price}
              />
            )}

            {/* Compatibilidad de Vehículos - Solo para refacciones y accesorios */}
            {/* Movida aquí para que esté justo después de variantes y sea más prominente */}
            {(formData.product_type === "refaccion" ||
              formData.product_type === "accesorio") && (
              <VehicleCompatibilitySection
                productCompatibilities={productCompatibilities}
                setProductCompatibilities={setProductCompatibilities}
                loadingCompatibilities={loadingCompatibilities}
                onLoadProductCompatibilities={onLoadProductCompatibilities}
                editingProduct={editingProduct}
              />
            )}

            {/* Alérgenos */}
            {isFieldVisible("allergens") && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Alérgenos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {commonAllergens.map((allergen) => (
                    <label key={allergen} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        checked={allergens.includes(allergen)}
                        onChange={() => toggleAllergen(allergen)}
                      />
                      <span className="ml-2 text-sm text-gray-600 capitalize">
                        {allergen}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Campos de Farmacia */}
            {isFieldVisible("requires_prescription") && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Información de Farmacia
                </h3>
                <div className="space-y-4">
                  {isFieldVisible("requires_prescription") && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        checked={formData.requires_prescription || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_prescription: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        Requiere receta médica{" "}
                        {isFieldRequired("requires_prescription") && (
                          <span className="text-red-500">*</span>
                        )}
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {isFieldVisible("age_restriction") && (
                      <div>
                        <label className="block text-xs font-normal text-gray-600 mb-1.5">
                          Restricción de Edad{" "}
                          {isFieldRequired("age_restriction") && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="number"
                          required={isFieldRequired("age_restriction")}
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          value={formData.age_restriction || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              age_restriction: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Edad mínima (años)"
                        />
                      </div>
                    )}

                    {isFieldVisible("max_quantity_per_order") && (
                      <div>
                        <label className="block text-xs font-normal text-gray-600 mb-1.5">
                          Cantidad Máxima por Pedido{" "}
                          {isFieldRequired("max_quantity_per_order") && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="number"
                          required={isFieldRequired("max_quantity_per_order")}
                          min="1"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                          value={formData.max_quantity_per_order || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              max_quantity_per_order: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            })
                          }
                          placeholder="Cantidad máxima"
                        />
                      </div>
                    )}
                  </div>

                  {isFieldVisible("requires_pharmacist_validation") && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                        checked={
                          formData.requires_pharmacist_validation || false
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            requires_pharmacist_validation: e.target.checked,
                          })
                        }
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        Requiere validación de farmacéutico{" "}
                        {isFieldRequired("requires_pharmacist_validation") && (
                          <span className="text-red-500">*</span>
                        )}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA - Organización y Configuración */}
          <div className="lg:col-span-1 space-y-6">
            {/* Organizar Producto */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Organizar Producto
              </h3>

              {/* Tipo de Producto */}
              {isFieldVisible("product_type") && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Tipo de Producto{" "}
                    {isFieldRequired("product_type") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled
                    required={isFieldRequired("product_type")}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
                    value={
                      productTypes.find(
                        (t) => t.value === formData.product_type,
                      )?.label || formData.product_type
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Gestionado por administradores
                  </p>
                </div>
              )}

              {/* Categoría */}
              {isFieldVisible("category_id") && (
                <div>
                  <CategorySelector
                    categories={categories}
                    value={formData.category_id || ""}
                    onChange={(categoryId) =>
                      setFormData({ ...formData, category_id: categoryId })
                    }
                    required={isFieldRequired("category_id")}
                    placeholder="Selecciona una categoría"
                  />
                </div>
              )}
            </div>

            {/* Disponibilidad */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Disponibilidad
              </h3>

              <div className="space-y-3">
                {isFieldVisible("is_available") && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={branchIsAvailable}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (currentBranchId) {
                          setBranchAvailabilities((prev) => {
                            const exists = prev.find(
                              (a) => a.branch_id === currentBranchId,
                            );
                            if (exists) {
                              return prev.map((a) =>
                                a.branch_id === currentBranchId
                                  ? { ...a, is_enabled: isChecked }
                                  : a,
                              );
                            }
                            const fallbackBranch = availableBusinesses.find(
                              (b) => b.business_id === currentBranchId,
                            );
                            return [
                              ...prev,
                              {
                                branch_id: currentBranchId,
                                branch_name:
                                  fallbackBranch?.business_name || "Sucursal",
                                is_enabled: isChecked,
                                price: null,
                                stock: null,
                                is_active: fallbackBranch?.is_active ?? true,
                              },
                            ];
                          });
                        } else {
                          setFormData({ ...formData, is_available: isChecked });
                        }
                      }}
                      disabled={currentBranchId ? !branchIsActive : false}
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {currentBranchId
                        ? "Disponible en esta sucursal"
                        : "Disponible"}
                    </span>
                  </label>
                )}

                {isFieldVisible("is_featured") && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={formData.is_featured}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_featured: e.target.checked,
                        })
                      }
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Destacado
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Precio y Orden */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Precio y Visualización
              </h3>

              {isFieldVisible("price") && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Precio{" "}
                    {isFieldRequired("price") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="number"
                    required={isFieldRequired("price")}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              )}

              {isFieldVisible("display_order") && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Orden de Visualización{" "}
                    {isFieldRequired("display_order") && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="number"
                    required={isFieldRequired("display_order")}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>
              )}

              {/* Clasificaciones por sucursal */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                    Clasificaciones por Sucursal
                  </h4>
                  {loadingClassifications && (
                    <span className="text-xs text-gray-500">Cargando...</span>
                  )}
                </div>
                {availableBusinesses.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No hay sucursales disponibles para asignar clasificaciones.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availableBusinesses.map((branch) => {
                      const availability = branchAvailabilities.find(
                        (a) => a.branch_id === branch.business_id,
                      );
                      const branchClassifications =
                        classificationsByBranch[branch.business_id] || [];
                      const selectedIds =
                        availability?.classification_ids || [];
                      const isEnabled = availability?.is_enabled ?? false;

                      return (
                        <div
                          key={branch.business_id}
                          className="p-3 border border-gray-200 rounded"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">
                                {branch.business_name}
                              </span>
                              {!isEnabled && (
                                <span className="text-xs text-gray-500">
                                  Disponibilidad desactivada
                                </span>
                              )}
                            </div>
                          </div>
                          {branchClassifications.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              Sin clasificaciones para esta sucursal.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-3">
                              {branchClassifications.map((classification) => (
                                <label
                                  key={classification.id}
                                  className="inline-flex items-center gap-2 text-sm text-gray-700"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                    checked={selectedIds.includes(
                                      classification.id,
                                    )}
                                    onChange={(e) =>
                                      handleClassificationToggle(
                                        branch.business_id,
                                        branch.business_name,
                                        classification.id,
                                        e.target.checked,
                                      )
                                    }
                                    disabled={!isEnabled}
                                  />
                                  <span>{classification.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Impuestos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                  Impuestos
                </h3>
                {loadingTaxes && (
                  <span className="text-xs text-gray-500">Cargando...</span>
                )}
              </div>

              <div className="space-y-4">
                {/* Selector de impuestos disponibles */}
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-2">
                    Seleccionar Impuestos
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3">
                    {!availableTaxTypes || availableTaxTypes.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        {loadingTaxes
                          ? "Cargando tipos de impuestos..."
                          : "No hay tipos de impuestos disponibles. Contacta al administrador."}
                      </p>
                    ) : (
                      availableTaxTypes.map((taxType) => {
                        const isSelected = productTaxes.some(
                          (pt) => pt.tax_type_id === taxType.id,
                        );
                        return (
                          <label
                            key={taxType.id}
                            className="flex items-start p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Agregar impuesto
                                  setProductTaxes([
                                    ...productTaxes,
                                    {
                                      id: "",
                                      product_id: editingProduct?.id || "",
                                      tax_type_id: taxType.id,
                                      display_order: productTaxes?.length || 0,
                                      created_at: "",
                                      tax_name: taxType.name,
                                      default_rate: taxType.rate,
                                      rate_type: taxType.rate_type,
                                      default_fixed_amount:
                                        taxType.fixed_amount,
                                    },
                                  ]);
                                } else {
                                  // Remover impuesto
                                  setProductTaxes(
                                    productTaxes.filter(
                                      (pt) => pt.tax_type_id !== taxType.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <div className="ml-2 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">
                                  {taxType.name}
                                </span>
                                {taxType.is_default && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    Por defecto
                                  </span>
                                )}
                              </div>
                              {taxType.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {taxType.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-600 mt-1">
                                {taxType.rate_type === "percentage"
                                  ? `${(taxType.rate * 100).toFixed(2)}%`
                                  : `$${taxType.fixed_amount?.toFixed(2) || "0.00"}`}
                              </p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Lista de impuestos asignados con opción de override */}
                {productTaxes && productTaxes.length > 0 && (
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-2">
                      Impuestos Asignados
                    </label>
                    <div className="space-y-3">
                      {productTaxes &&
                        productTaxes.map((productTax, index) => {
                          const taxType = availableTaxTypes?.find(
                            (t) => t.id === productTax.tax_type_id,
                          );
                          if (!taxType) return null;

                          const effectiveRate =
                            productTax.override_rate ??
                            productTax.default_rate ??
                            taxType.rate;
                          const effectiveFixed =
                            productTax.override_fixed_amount ??
                            productTax.default_fixed_amount ??
                            taxType.fixed_amount;

                          return (
                            <div
                              key={productTax.tax_type_id}
                              className="p-3 border border-gray-200 rounded bg-gray-50"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {productTax.tax_name || taxType.name}
                                    </span>
                                    {productTax.override_rate !== undefined && (
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                        Override
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {taxType.rate_type === "percentage"
                                      ? `Tasa: ${(effectiveRate * 100).toFixed(2)}%`
                                      : `Monto fijo: $${effectiveFixed?.toFixed(2) || "0.00"}`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductTaxes(
                                      productTaxes.filter(
                                        (_, i) => i !== index,
                                      ),
                                    )
                                  }
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Eliminar impuesto"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>

                              {/* Opción de override para impuestos de tipo percentage */}
                              {taxType.rate_type === "percentage" && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="h-3 w-3 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                      checked={
                                        productTax.override_rate !== undefined
                                      }
                                      onChange={(e) => {
                                        const updated = [...productTaxes];
                                        if (e.target.checked) {
                                          updated[index].override_rate =
                                            taxType.rate;
                                        } else {
                                          updated[index].override_rate =
                                            undefined;
                                        }
                                        setProductTaxes(updated);
                                      }}
                                    />
                                    <span className="ml-2 text-xs text-gray-600">
                                      Personalizar porcentaje
                                    </span>
                                  </label>
                                  {productTax.override_rate !== undefined && (
                                    <div className="mt-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.0001"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                        value={productTax.override_rate}
                                        onChange={(e) => {
                                          const value = parseFloat(
                                            e.target.value,
                                          );
                                          if (
                                            !isNaN(value) &&
                                            value >= 0 &&
                                            value <= 1
                                          ) {
                                            const updated = [...productTaxes];
                                            updated[index].override_rate =
                                              value;
                                            setProductTaxes(updated);
                                          }
                                        }}
                                        placeholder={`${(taxType.rate * 100).toFixed(2)}%`}
                                      />
                                      <p className="text-xs text-gray-400 mt-1">
                                        {(
                                          productTax.override_rate * 100
                                        ).toFixed(2)}
                                        %
                                        {productTax.override_rate !==
                                          taxType.rate && (
                                          <span className="ml-1">
                                            (por defecto:{" "}
                                            {(taxType.rate * 100).toFixed(2)}%)
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Opción de override para impuestos de tipo fixed */}
                              {taxType.rate_type === "fixed" && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="h-3 w-3 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                      checked={
                                        productTax.override_fixed_amount !==
                                        undefined
                                      }
                                      onChange={(e) => {
                                        const updated = [...productTaxes];
                                        if (e.target.checked) {
                                          updated[index].override_fixed_amount =
                                            taxType.fixed_amount || 0;
                                        } else {
                                          updated[index].override_fixed_amount =
                                            undefined;
                                        }
                                        setProductTaxes(updated);
                                      }}
                                    />
                                    <span className="ml-2 text-xs text-gray-600">
                                      Personalizar monto fijo
                                    </span>
                                  </label>
                                  {productTax.override_fixed_amount !==
                                    undefined && (
                                    <div className="mt-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                        value={productTax.override_fixed_amount}
                                        onChange={(e) => {
                                          const value = parseFloat(
                                            e.target.value,
                                          );
                                          if (!isNaN(value) && value >= 0) {
                                            const updated = [...productTaxes];
                                            updated[
                                              index
                                            ].override_fixed_amount = value;
                                            setProductTaxes(updated);
                                          }
                                        }}
                                        placeholder={`$${taxType.fixed_amount?.toFixed(2) || "0.00"}`}
                                      />
                                      <p className="text-xs text-gray-400 mt-1">
                                        $
                                        {productTax.override_fixed_amount.toFixed(
                                          2,
                                        )}
                                        {productTax.override_fixed_amount !==
                                          taxType.fixed_amount && (
                                          <span className="ml-1">
                                            (por defecto: $
                                            {taxType.fixed_amount?.toFixed(2) ||
                                              "0.00"}
                                            )
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {(!productTaxes || productTaxes.length === 0) && (
                  <p className="text-xs text-gray-500 italic">
                    No hay impuestos asignados. Los impuestos se aplicarán según
                    la configuración del administrador.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Guardando..." : editingProduct ? "Actualizar" : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente para la sección de compatibilidad de vehículos
interface VehicleCompatibilitySectionProps {
  productCompatibilities: ProductCompatibility[];
  setProductCompatibilities: React.Dispatch<
    React.SetStateAction<ProductCompatibility[]>
  >;
  loadingCompatibilities: boolean;
  onLoadProductCompatibilities?: () => void;
  editingProduct: Product | null;
}

function VehicleCompatibilitySection({
  productCompatibilities,
  setProductCompatibilities,
  loadingCompatibilities,
  onLoadProductCompatibilities,
  editingProduct,
}: VehicleCompatibilitySectionProps) {
  // Asegurar que productCompatibilities siempre sea un array
  const compatibilities = productCompatibilities || [];
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<VehicleYear[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);

  // Estados para el formulario de nueva compatibilidad
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSpec, setSelectedSpec] = useState<string>("");
  const [isUniversal, setIsUniversal] = useState(false);
  const [notes, setNotes] = useState("");

  // Cargar compatibilidades cuando se edita un producto
  // Solo ejecutar cuando cambie el ID del producto, no cuando cambie la función
  useEffect(() => {
    if (editingProduct?.id && onLoadProductCompatibilities) {
      onLoadProductCompatibilities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct?.id]); // Removido onLoadProductCompatibilities de las dependencias

  // Cargar marcas al montar
  useEffect(() => {
    const loadBrands = async () => {
      setLoadingBrands(true);
      try {
        const brandsData = await vehiclesService.getBrands();
        setBrands(brandsData);
      } catch (err) {
        console.error("Error cargando marcas:", err);
      } finally {
        setLoadingBrands(false);
      }
    };
    loadBrands();
  }, []);

  // Cargar modelos cuando se selecciona una marca
  useEffect(() => {
    const loadModels = async () => {
      if (selectedBrand && !isUniversal) {
        setLoadingModels(true);
        try {
          const modelsData =
            await vehiclesService.getModelsByBrand(selectedBrand);
          setModels(modelsData);
        } catch (err) {
          console.error("Error cargando modelos:", err);
        } finally {
          setLoadingModels(false);
        }
      } else {
        setModels([]);
        setSelectedModel("");
      }
    };
    loadModels();
  }, [selectedBrand, isUniversal]);

  // Cargar años cuando se selecciona un modelo
  useEffect(() => {
    const loadYears = async () => {
      if (selectedModel && !isUniversal) {
        setLoadingYears(true);
        try {
          const yearsData =
            await vehiclesService.getYearsByModel(selectedModel);
          setYears(yearsData);
        } catch (err) {
          console.error("Error cargando años:", err);
        } finally {
          setLoadingYears(false);
        }
      } else {
        setYears([]);
        setSelectedYear("");
      }
    };
    loadYears();
  }, [selectedModel, isUniversal]);

  // Cargar especificaciones cuando se selecciona un año
  useEffect(() => {
    const loadSpecs = async () => {
      if (selectedYear && !isUniversal) {
        setLoadingSpecs(true);
        try {
          const specsData = await vehiclesService.getSpecsByYear(selectedYear);
          setSpecs(specsData);
        } catch (err) {
          console.error("Error cargando especificaciones:", err);
        } finally {
          setLoadingSpecs(false);
        }
      } else {
        setSpecs([]);
        setSelectedSpec("");
      }
    };
    loadSpecs();
  }, [selectedYear, isUniversal]);

  const handleAddCompatibility = () => {
    if (isUniversal) {
      // Agregar compatibilidad universal
      const newCompatibility: ProductCompatibility = {
        id: "", // Se asignará cuando se guarde
        product_id: editingProduct?.id || "",
        vehicle_brand_id: null,
        vehicle_model_id: null,
        vehicle_year_id: null,
        vehicle_spec_id: null,
        is_universal: true,
        notes: notes || null,
        is_active: true,
      };
      setProductCompatibilities([...compatibilities, newCompatibility]);
    } else if (selectedBrand) {
      // Obtener nombres de los elementos seleccionados para mostrar descripción completa
      const selectedBrandData = brands.find((b) => b.id === selectedBrand);
      const selectedModelData = models.find((m) => m.id === selectedModel);
      const selectedYearData = years.find((y) => y.id === selectedYear);
      const selectedSpecData = specs.find((s) => s.id === selectedSpec);

      // Agregar compatibilidad específica con nombres incluidos
      const newCompatibility: ProductCompatibility = {
        id: "", // Se asignará cuando se guarde
        product_id: editingProduct?.id || "",
        vehicle_brand_id: selectedBrand,
        vehicle_model_id: selectedModel || null,
        vehicle_year_id: selectedYear || null,
        vehicle_spec_id: selectedSpec || null,
        is_universal: false,
        notes: notes || null,
        is_active: true,
        // Incluir nombres para mostrar descripción completa
        brand_name: selectedBrandData?.name || undefined,
        model_name: selectedModelData?.name || undefined,
        year_start: selectedYearData?.year_start || undefined,
        year_end: selectedYearData?.year_end || undefined,
        generation: selectedYearData?.generation || undefined,
        engine_code: selectedSpecData?.engine_code || undefined,
        transmission_type: selectedSpecData?.transmission_type || null,
      };
      setProductCompatibilities([...compatibilities, newCompatibility]);
    }

    // Limpiar formulario
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedYear("");
    setSelectedSpec("");
    setIsUniversal(false);
    setNotes("");
  };

  const handleRemoveCompatibility = async (index: number) => {
    const compatibility = compatibilities[index];

    // Si la compatibilidad tiene un ID válido (ya está guardada en BD), eliminarla inmediatamente
    if (compatibility.id && compatibility.id.trim() !== "") {
      try {
        // Eliminar del estado local primero (optimistic update)
        const updatedCompatibilities = compatibilities.filter(
          (_, i) => i !== index,
        );
        setProductCompatibilities(updatedCompatibilities);

        // Luego eliminar de la base de datos
        await vehiclesService.removeProductCompatibility(compatibility.id);

        // NO recargar las compatibilidades porque ya las actualizamos localmente
        // Si hay algún error, el backend ya lo maneja y podemos recargar solo en caso de error
      } catch (error: any) {
        console.error("Error eliminando compatibilidad:", error);
        // Si falla, restaurar la compatibilidad en el estado local
        setProductCompatibilities(compatibilities);
        // Mostrar mensaje de error al usuario
        alert(
          `Error al eliminar compatibilidad: ${error.message || "Error desconocido"}`,
        );
      }
    } else {
      // Si no tiene ID (es nueva, no guardada), solo eliminar del estado local
      setProductCompatibilities(compatibilities.filter((_, i) => i !== index));
    }
  };

  const getCompatibilityLabel = (
    compatibility: ProductCompatibility,
  ): string => {
    if (compatibility.is_universal) {
      return "🌐 Universal (Todos los vehículos)";
    }

    const parts: string[] = [];

    // Marca
    if (compatibility.brand_name) {
      parts.push(compatibility.brand_name);
    } else if (compatibility.vehicle_brand_id) {
      // Intentar obtener el nombre desde el estado local
      const brandData = brands.find(
        (b) => b.id === compatibility.vehicle_brand_id,
      );
      if (brandData) parts.push(brandData.name);
    }

    // Modelo
    if (compatibility.model_name) {
      parts.push(compatibility.model_name);
    } else if (compatibility.vehicle_model_id) {
      const modelData = models.find(
        (m) => m.id === compatibility.vehicle_model_id,
      );
      if (modelData) parts.push(modelData.name);
    }

    // Años
    if (compatibility.year_start) {
      const yearStr = compatibility.year_end
        ? `${compatibility.year_start}-${compatibility.year_end}`
        : `${compatibility.year_start}+`;
      parts.push(yearStr);
      if (compatibility.generation) {
        parts.push(`(${compatibility.generation})`);
      }
    } else if (compatibility.vehicle_year_id) {
      const yearData = years.find(
        (y) => y.id === compatibility.vehicle_year_id,
      );
      if (yearData) {
        const yearStr = yearData.year_end
          ? `${yearData.year_start}-${yearData.year_end}`
          : `${yearData.year_start}+`;
        parts.push(yearStr);
        if (yearData.generation) {
          parts.push(`(${yearData.generation})`);
        }
      }
    }

    // Especificaciones técnicas
    const specParts: string[] = [];
    if (compatibility.engine_code) {
      specParts.push(compatibility.engine_code);
    } else if (compatibility.vehicle_spec_id) {
      const specData = specs.find(
        (s) => s.id === compatibility.vehicle_spec_id,
      );
      if (specData?.engine_code) specParts.push(specData.engine_code);
    }

    if (compatibility.transmission_type) {
      specParts.push(compatibility.transmission_type);
    } else if (compatibility.vehicle_spec_id) {
      const specData = specs.find(
        (s) => s.id === compatibility.vehicle_spec_id,
      );
      if (specData?.transmission_type)
        specParts.push(specData.transmission_type);
    }

    if (specParts.length > 0) {
      parts.push(`[${specParts.join(", ")}]`);
    }

    // Si no hay información suficiente, mostrar al menos lo que tenemos
    if (parts.length === 0) {
      if (compatibility.vehicle_brand_id) {
        return "Compatibilidad específica (Marca seleccionada)";
      }
      return "Compatibilidad específica";
    }

    return parts.join(" ");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          Compatibilidad de Vehículos
        </h3>
        {loadingCompatibilities && (
          <span className="text-xs text-gray-500">Cargando...</span>
        )}
      </div>

      <div className="space-y-4">
        {/* Formulario para agregar compatibilidad */}
        <div className="p-4 border border-gray-200 rounded bg-gray-50">
          <h4 className="text-xs font-medium text-gray-700 mb-3">
            Agregar Compatibilidad
          </h4>

          <div className="space-y-3">
            {/* Opción Universal */}
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                checked={isUniversal}
                onChange={(e) => {
                  setIsUniversal(e.target.checked);
                  if (e.target.checked) {
                    setSelectedBrand("");
                    setSelectedModel("");
                    setSelectedYear("");
                    setSelectedSpec("");
                  }
                }}
              />
              <span className="ml-2 text-sm text-gray-700">
                Producto Universal (compatible con todos los vehículos)
              </span>
            </label>

            {!isUniversal && (
              <>
                {/* Marca */}
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Marca <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      setSelectedModel("");
                      setSelectedYear("");
                      setSelectedSpec("");
                    }}
                    disabled={loadingBrands}
                  >
                    <option value="">
                      {loadingBrands ? "Cargando..." : "Selecciona una marca"}
                    </option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modelo */}
                {selectedBrand && (
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Modelo (Opcional)
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedYear("");
                        setSelectedSpec("");
                      }}
                      disabled={loadingModels}
                    >
                      <option value="">
                        {loadingModels
                          ? "Cargando..."
                          : "Selecciona un modelo (opcional)"}
                      </option>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Año/Generación */}
                {selectedModel && (
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Año / Generación (Opcional)
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedSpec("");
                      }}
                      disabled={loadingYears}
                    >
                      <option value="">
                        {loadingYears
                          ? "Cargando..."
                          : "Selecciona un año (opcional)"}
                      </option>
                      {years.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.year_start}{" "}
                          {year.year_end ? `- ${year.year_end}` : "+"}{" "}
                          {year.generation ? `(${year.generation})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Especificación */}
                {selectedYear && (
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">
                      Especificación (Opcional)
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={selectedSpec}
                      onChange={(e) => setSelectedSpec(e.target.value)}
                      disabled={loadingSpecs}
                    >
                      <option value="">
                        {loadingSpecs
                          ? "Cargando..."
                          : "Selecciona una especificación (opcional)"}
                      </option>
                      {specs.map((spec) => (
                        <option key={spec.id} value={spec.id}>
                          {spec.engine_displacement} {spec.engine_code}{" "}
                          {spec.transmission_type} {spec.drivetrain}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Notas */}
            <div>
              <label className="block text-xs font-normal text-gray-600 mb-1.5">
                Notas (Opcional)
              </label>
              <textarea
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notas adicionales sobre la compatibilidad..."
              />
            </div>

            {/* Botón Agregar */}
            <button
              type="button"
              onClick={handleAddCompatibility}
              disabled={!isUniversal && !selectedBrand}
              className="w-full px-3 py-2 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Agregar Compatibilidad
            </button>
          </div>
        </div>

        {/* Lista de compatibilidades */}
        {compatibilities.length > 0 ? (
          <div>
            <label className="block text-xs font-normal text-gray-600 mb-2">
              Compatibilidades Asignadas
            </label>
            <div className="space-y-2">
              {compatibilities.map((compatibility, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0">
                        {compatibility.is_universal ? "🌐" : "🚗"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {getCompatibilityLabel(compatibility)}
                        </p>
                        {compatibility.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic break-words">
                            📝 {compatibility.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompatibility(index)}
                    className="ml-3 flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
                    title="Eliminar compatibilidad"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            No hay compatibilidades asignadas. Agrega compatibilidades para que
            los clientes puedan filtrar este producto por vehículo.
          </p>
        )}
      </div>
    </div>
  );
}

// Componente para la sección de disponibilidad por sucursal
interface BranchAvailabilitySectionProps {
  branchAvailabilities: Array<{
    branch_id: string;
    branch_name: string;
    is_enabled: boolean;
    price: number | null;
    stock: number | null;
    is_active?: boolean; // Estado activo/inactivo de la sucursal
  }>;
  setBranchAvailabilities: React.Dispatch<
    React.SetStateAction<
      Array<{
        branch_id: string;
        branch_name: string;
        is_enabled: boolean;
        price: number | null;
        stock: number | null;
        is_active?: boolean;
      }>
    >
  >;
  loadingBranchAvailabilities: boolean;
  onLoadBranchAvailabilities?: (productId: string) => void;
  editingProduct: Product | null;
  globalPrice: number;
}

function BranchAvailabilitySection({
  branchAvailabilities,
  setBranchAvailabilities,
  loadingBranchAvailabilities,
  onLoadBranchAvailabilities,
  editingProduct,
  globalPrice,
}: BranchAvailabilitySectionProps) {
  const { availableBusinesses } = useSelectedBusiness();

  // Cargar disponibilidades cuando se edita un producto
  useEffect(() => {
    if (editingProduct?.id && onLoadBranchAvailabilities) {
      onLoadBranchAvailabilities(editingProduct.id);
    } else if (
      availableBusinesses.length > 0 &&
      branchAvailabilities.length === 0
    ) {
      // Inicializar con todas las sucursales disponibles si no hay datos
      const initialAvailabilities = availableBusinesses.map((business) => ({
        branch_id: business.business_id,
        branch_name: business.business_name,
        is_enabled: false,
        price: null,
        stock: null,
        is_active: business.is_active ?? true, // Incluir estado activo de la sucursal
        classification_ids: [],
        classifications: [],
      }));
      setBranchAvailabilities(initialAvailabilities);
    }
  }, [editingProduct?.id, onLoadBranchAvailabilities, availableBusinesses]);

  const handleToggleEnabled = (branchId: string) => {
    setBranchAvailabilities((prev) =>
      prev.map((avail) =>
        avail.branch_id === branchId
          ? { ...avail, is_enabled: !avail.is_enabled }
          : avail,
      ),
    );
  };

  const handlePriceChange = (branchId: string, price: string) => {
    const numPrice = price === "" ? null : parseFloat(price);
    setBranchAvailabilities((prev) =>
      prev.map((avail) =>
        avail.branch_id === branchId ? { ...avail, price: numPrice } : avail,
      ),
    );
  };

  const handleStockChange = (branchId: string, stock: string) => {
    const numStock = stock === "" ? null : parseInt(stock, 10);
    setBranchAvailabilities((prev) =>
      prev.map((avail) =>
        avail.branch_id === branchId
          ? { ...avail, stock: isNaN(numStock!) ? null : numStock }
          : avail,
      ),
    );
  };

  // Asegurar que todas las sucursales estén en la lista
  // Sincronizar branchAvailabilities con availableBusinesses
  useEffect(() => {
    if (availableBusinesses.length > 0) {
      setBranchAvailabilities((prev) => {
        const allBranchIds = availableBusinesses.map((b) => b.business_id);
        const existingBranchIds = new Set(prev.map((a) => a.branch_id));

        // Agregar sucursales faltantes
        const missingBranches = availableBusinesses
          .filter((b) => !existingBranchIds.has(b.business_id))
          .map((business) => ({
            branch_id: business.business_id,
            branch_name: business.business_name,
            is_enabled: false,
            price: null,
            stock: null,
            is_active: business.is_active ?? true, // Incluir estado activo de la sucursal
          }));

        // Filtrar sucursales que ya no existen y agregar las faltantes
        const validBranchIds = new Set(allBranchIds);
        const filtered = prev.filter((a) => validBranchIds.has(a.branch_id));

        // Solo actualizar si hay cambios
        if (missingBranches.length > 0 || filtered.length !== prev.length) {
          return [...filtered, ...missingBranches];
        }

        return prev;
      });
    }
  }, [availableBusinesses.map((b) => b.business_id).join(",")]);

  // Asegurar que todas las sucursales estén en la lista para mostrar
  const allAvailabilities = availableBusinesses.map((business) => {
    const existing = branchAvailabilities.find(
      (a) => a.branch_id === business.business_id,
    );
    return (
      existing || {
        branch_id: business.business_id,
        branch_name: business.business_name,
        is_enabled: false,
        price: null,
        stock: null,
        is_active: business.is_active ?? true, // Incluir estado activo de la sucursal
      }
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
        <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          Disponibilidad por Sucursal
        </h3>
        {loadingBranchAvailabilities && (
          <span className="text-xs text-gray-500">Cargando...</span>
        )}
      </div>

      <div className="space-y-4">
        {allAvailabilities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Habilitar
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Sucursal
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Precio
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allAvailabilities.map((availability) => {
                  // Verificar is_active: debe ser explícitamente true para estar activa
                  // Si es undefined, null, o false, se considera inactiva
                  const isBranchActive = availability.is_active === true;
                  return (
                    <tr
                      key={availability.branch_id}
                      className={`hover:bg-gray-50 ${!isBranchActive ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={availability.is_enabled}
                          onChange={() =>
                            handleToggleEnabled(availability.branch_id)
                          }
                          disabled={!isBranchActive}
                          className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            !isBranchActive ? "La sucursal está inactiva" : ""
                          }
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${!isBranchActive ? "text-gray-500" : "text-gray-900"}`}
                          >
                            {availability.branch_name}
                          </span>
                          {!isBranchActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactiva
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={
                              availability.price !== null
                                ? availability.price
                                : ""
                            }
                            onChange={(e) =>
                              handlePriceChange(
                                availability.branch_id,
                                e.target.value,
                              )
                            }
                            placeholder={`${globalPrice.toFixed(2)} (global)`}
                            disabled={
                              !availability.is_enabled || !isBranchActive
                            }
                            className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                            title={
                              !isBranchActive ? "La sucursal está inactiva" : ""
                            }
                          />
                          {availability.price === null && (
                            <span className="text-xs text-gray-500">
                              (Global)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          value={
                            availability.stock !== null
                              ? availability.stock
                              : ""
                          }
                          onChange={(e) =>
                            handleStockChange(
                              availability.branch_id,
                              e.target.value,
                            )
                          }
                          placeholder="Sin límite"
                          disabled={!availability.is_enabled || !isBranchActive}
                          className="w-24 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                          title={
                            !isBranchActive ? "La sucursal está inactiva" : ""
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            No hay sucursales disponibles. Crea una sucursal en Configuración →
            Sucursales.
          </p>
        )}
      </div>
    </div>
  );
}
