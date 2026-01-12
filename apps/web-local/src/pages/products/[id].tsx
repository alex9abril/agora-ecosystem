import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useCallback } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import { taxesService, TaxType, ProductTax } from '@/lib/taxes';
import { vehiclesService, ProductCompatibility } from '@/lib/vehicles';
import ImageUpload from '@/components/ImageUpload';
import MultipleImageUpload, { ProductImage } from '@/components/MultipleImageUpload';
import CategorySelector from '@/components/CategorySelector';
import { ProductForm } from './index';

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder?: number }>>([]);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState<CreateProductData>({
    business_id: '',
    name: '',
    sku: '',
    description: '',
    image_url: '',
    price: 0,
    product_type: 'food',
    category_id: '',
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
  const [nutritionalInfo, setNutritionalInfo] = useState<Record<string, any>>({});
  
  // Estados para compatibilidad de vehículos
  const [productCompatibilities, setProductCompatibilities] = useState<ProductCompatibility[]>([]);
  const [loadingCompatibilities, setLoadingCompatibilities] = useState(false);
  
  // Estados para disponibilidad por sucursal
  const [branchAvailabilities, setBranchAvailabilities] = useState<Array<{
    branch_id: string;
    branch_name: string;
    is_enabled: boolean;
    price: number | null;
    stock: number | null;
  }>>([]);
  const [loadingBranchAvailabilities, setLoadingBranchAvailabilities] = useState(false);
  
  // Estados para impuestos
  const [availableTaxTypes, setAvailableTaxTypes] = useState<TaxType[]>([]);
  const [productTaxes, setProductTaxes] = useState<ProductTax[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Función memoizada para cargar impuestos del producto
  const loadProductTaxes = useCallback(async (productId: string) => {
    try {
      setLoadingTaxes(true);
      const taxes = await taxesService.getProductTaxes(productId);
      setProductTaxes(taxes);
    } catch (err: any) {
      console.error('Error cargando impuestos del producto:', err);
      setProductTaxes([]);
    } finally {
      setLoadingTaxes(false);
    }
  }, []);

  // Función para cargar compatibilidades del producto
  const loadProductCompatibilities = useCallback(async (productId: string) => {
    try {
      setLoadingCompatibilities(true);
      const compatibilities = await vehiclesService.getProductCompatibilities(productId);
      setProductCompatibilities(compatibilities || []);
    } catch (err: any) {
      console.error('Error cargando compatibilidades del producto:', err);
      setProductCompatibilities([]);
    } finally {
      setLoadingCompatibilities(false);
    }
  }, []);

  // Función para cargar disponibilidad por sucursal
  const loadBranchAvailabilities = useCallback(async (productId: string) => {
    try {
      setLoadingBranchAvailabilities(true);
      const response = await productsService.getProductBranchAvailability(productId);
      setBranchAvailabilities(response.availabilities || []);
    } catch (err: any) {
      console.error('Error cargando disponibilidad por sucursal:', err);
      setBranchAvailabilities([]);
    } finally {
      setLoadingBranchAvailabilities(false);
    }
  }, []);

  // Función para cargar imágenes del producto
  const loadProductImages = useCallback(async (productId: string, fallbackImageUrl?: string) => {
    try {
      setLoadingImages(true);
      const images = await productsService.getProductImages(productId);
      const mappedImages = images.map((img: any) => ({
        id: img.id,
        public_url: img.public_url || img.url || img.image_url,
        alt_text: img.alt_text || null,
        is_primary: img.is_primary || false,
        display_order: img.display_order || 0,
      }));

      const validImages = mappedImages.filter(img => !!img.public_url);

      if (validImages.length > 0) {
        setProductImages(validImages);
      } else if (fallbackImageUrl) {
        setProductImages([{
          id: 'primary-image',
          public_url: fallbackImageUrl,
          is_primary: true,
          display_order: 0,
        }]);
      } else {
        setProductImages([]);
      }
    } catch (err: any) {
      if (fallbackImageUrl) {
        setProductImages([{
          id: 'primary-image',
          public_url: fallbackImageUrl,
          is_primary: true,
          display_order: 0,
        }]);
      } else {
        setProductImages([]);
      }
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // Cargar producto cuando cambie el ID de la URL
  // Los productos son globales, no requieren tienda seleccionada
  useEffect(() => {
    if (router.isReady && id && typeof id === 'string') {
      loadProduct(id);
      loadCategories();
      loadTaxTypes();
    }
  }, [router.isReady, id]);

  // Cargar impuestos, compatibilidades, disponibilidad por sucursal e imágenes cuando el producto esté cargado
  useEffect(() => {
    if (product?.id) {
      loadProductTaxes(product.id);
      loadBranchAvailabilities(product.id);
      loadProductImages(product.id, product.image_url || undefined);
      // Solo cargar compatibilidades si es refaccion o accesorio
      if (product.product_type === 'refaccion' || product.product_type === 'accesorio') {
        loadProductCompatibilities(product.id);
      }
    }
  }, [product?.id, product?.product_type, product?.image_url, loadProductTaxes, loadProductCompatibilities, loadBranchAvailabilities, loadProductImages]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const productData = await productsService.getProduct(productId);
      setProduct(productData);

      // Cargar configuración de campos para el tipo de producto
      try {
        const config = await productsService.getFieldConfigByProductType(productData.product_type || 'food');
        setFieldConfig(config);
        setSelectedProductType(productData.product_type || 'food');
      } catch (err: any) {
        console.error('Error obteniendo configuración de campos:', err);
      }

      // Llenar formulario con datos del producto
      setFormData({
        business_id: productData.business_id,
        name: productData.name,
        sku: productData.sku || '',
        description: productData.description || '',
        image_url: productData.image_url || '',
        price: productData.price,
        product_type: productData.product_type || 'food',
        category_id: productData.category_id || '',
        is_available: productData.is_available,
        is_featured: productData.is_featured,
        display_order: productData.display_order || 0,
        requires_prescription: productData.requires_prescription,
        age_restriction: productData.age_restriction,
        max_quantity_per_order: productData.max_quantity_per_order,
        requires_pharmacist_validation: productData.requires_pharmacist_validation,
      });
      setImagePreview(productData.image_url || null);
      
      // Asegurarse de que variant_groups sea un array y que cada grupo tenga su array de variants
      // Mapear los nombres de campos del backend (variant_group_name, variant_name) a los que espera el frontend (name)
      let loadedVariantGroups = productData.variant_groups || [];
      if (Array.isArray(loadedVariantGroups)) {
        // Mapear los grupos y sus variantes
        loadedVariantGroups = loadedVariantGroups.map((group: any) => ({
          id: group.variant_group_id || group.id,
          name: group.variant_group_name || group.name || `Grupo ${group.display_order + 1}`,
          description: group.description || '',
          is_required: group.is_required || false,
          selection_type: group.selection_type || 'single',
          display_order: group.display_order || 0,
          variants: Array.isArray(group.variants) 
            ? group.variants.map((variant: any) => ({
                id: variant.variant_id || variant.id,
                name: variant.variant_name || variant.name || `Variante ${variant.display_order || 0}`,
                description: variant.description || '',
                price_adjustment: variant.price_adjustment || 0,
                absolute_price: variant.absolute_price !== undefined && variant.absolute_price !== null ? variant.absolute_price : undefined,
                is_available: variant.is_available !== undefined ? variant.is_available : true,
                display_order: variant.display_order || 0,
              }))
            : [],
        }));
      } else {
        loadedVariantGroups = [];
      }
      
      console.log('🔍 [FRONTEND] Cargando variant_groups mapeados:', JSON.stringify(loadedVariantGroups, null, 2));
      setVariantGroups(loadedVariantGroups);
      setAllergens(productData.allergens || []);
      setNutritionalInfo(productData.nutritional_info || {});
    } catch (err: any) {
      console.error('Error cargando producto:', err);
      setError('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await productsService.getCategories();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
    }
  };

  const loadTaxTypes = async () => {
    try {
      const taxTypes = await taxesService.getTaxTypes(false);
      setAvailableTaxTypes(taxTypes);
    } catch (err: any) {
      console.error('Error cargando tipos de impuestos:', err);
    }
  };

  // Función memoizada para cargar impuestos del producto actual (para pasar al formulario)
  const handleLoadProductTaxes = useCallback(() => {
    if (product?.id) {
      loadProductTaxes(product.id);
    }
  }, [product?.id, loadProductTaxes]);

  // Función memoizada para cargar compatibilidades del producto actual (para pasar al formulario)
  const handleLoadProductCompatibilities = useCallback(() => {
    if (product?.id && (product.product_type === 'refaccion' || product.product_type === 'accesorio')) {
      loadProductCompatibilities(product.id);
    }
  }, [product?.id, product?.product_type, loadProductCompatibilities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError(null);
    setSaving(true);

    try {
      let imageUrl = formData.image_url;

      // TODO: Subir imagen si hay un archivo nuevo
      if (imageFile) {
        imageUrl = imagePreview || formData.image_url;
      }

      // Preparar datos para actualización (sin business_id, ya que no debe cambiar)
      const { business_id, ...updateData } = formData;
      
      // Construir objeto sin business_id explícitamente
      // Asegurarse de que variant_groups tenga la estructura correcta con variantes
      console.log('🔍 [FRONTEND] variantGroups antes de enviar:', JSON.stringify(variantGroups, null, 2));
      
      const productData: any = {
        name: updateData.name,
        description: updateData.description,
        image_url: imageUrl,
        price: updateData.price,
        product_type: updateData.product_type,
        category_id: updateData.category_id,
        is_available: updateData.is_available,
        is_featured: updateData.is_featured,
        display_order: updateData.display_order,
        variant_groups: variantGroups, // Enviar siempre, incluso si está vacío para poder eliminar grupos
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
        requires_prescription: updateData.requires_prescription,
        age_restriction: updateData.age_restriction,
        max_quantity_per_order: updateData.max_quantity_per_order,
        requires_pharmacist_validation: updateData.requires_pharmacist_validation,
      };
      
      console.log('🔍 [FRONTEND] productData.variant_groups:', JSON.stringify(productData.variant_groups, null, 2));

      // Eliminar campos undefined para no enviarlos
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });

      await productsService.updateProduct({ ...productData, id: product.id });
      
      // Guardar compatibilidades si es refaccion o accesorio
      if (product?.id && (product.product_type === 'refaccion' || product.product_type === 'accesorio')) {
        try {
          // Obtener compatibilidades actuales del producto
          const currentCompatibilities = await vehiclesService.getProductCompatibilities(product.id);
          const currentIds = currentCompatibilities.map(c => c.id);

          // Eliminar compatibilidades que ya no están en la lista
          for (const current of currentCompatibilities) {
            if (!productCompatibilities.find(pc => pc.id === current.id)) {
              await vehiclesService.removeProductCompatibility(current.id);
            }
          }

          // Agregar nuevas compatibilidades
          for (const compatibility of productCompatibilities) {
            if (!compatibility.id || !currentIds.includes(compatibility.id)) {
              // Es una nueva compatibilidad
              await vehiclesService.addProductCompatibility(product.id, {
                vehicle_brand_id: compatibility.vehicle_brand_id || undefined,
                vehicle_model_id: compatibility.vehicle_model_id || undefined,
                vehicle_year_id: compatibility.vehicle_year_id || undefined,
                vehicle_spec_id: compatibility.vehicle_spec_id || undefined,
                is_universal: compatibility.is_universal || false,
                notes: compatibility.notes || undefined,
              });
            }
          }
        } catch (compatErr: any) {
          console.error('Error guardando compatibilidades:', compatErr);
          // No fallar el guardado del producto si hay error en compatibilidades
        }
      }

      // Guardar disponibilidad por sucursal - enviar TODAS las sucursales (habilitadas y deshabilitadas)
      if (product?.id) {
        try {
          // Filtrar solo las sucursales que tienen datos válidos
          const availabilitiesToSave = branchAvailabilities
            .filter(avail => avail.branch_id) // Solo las que tienen branch_id
            .map(avail => ({
              branch_id: avail.branch_id,
              is_enabled: avail.is_enabled || false,
              price: avail.price !== null && avail.price !== undefined ? avail.price : null,
              stock: avail.stock !== null && avail.stock !== undefined ? avail.stock : null,
            }));
          
          if (availabilitiesToSave.length > 0) {
            console.log('💾 Guardando disponibilidad por sucursal:', availabilitiesToSave);
            await productsService.updateProductBranchAvailability(product.id, availabilitiesToSave);
            console.log('✅ Disponibilidad por sucursal guardada exitosamente');
          }
        } catch (err: any) {
          console.error('❌ Error guardando disponibilidad por sucursal:', err);
          // No fallar el guardado del producto si hay error en disponibilidad
        }
      }
      
      // Guardar/actualizar impuestos del producto
      if (product?.id) {
        try {
          // Obtener impuestos actuales del producto
          const currentTaxes = await taxesService.getProductTaxes(product.id);
          const currentTaxTypeIds = currentTaxes.map(t => t.tax_type_id);
          
          // Asignar nuevos impuestos
          for (const productTax of productTaxes) {
            if (!currentTaxTypeIds.includes(productTax.tax_type_id)) {
              await taxesService.assignTaxToProduct(product.id, {
                tax_type_id: productTax.tax_type_id,
                override_rate: productTax.override_rate,
                override_fixed_amount: productTax.override_fixed_amount,
                display_order: productTax.display_order,
              });
            } else {
              // Actualizar si hay cambios en override
              const existingTax = currentTaxes.find(t => t.tax_type_id === productTax.tax_type_id);
              if (existingTax && (
                existingTax.override_rate !== productTax.override_rate ||
                existingTax.override_fixed_amount !== productTax.override_fixed_amount
              )) {
                await taxesService.assignTaxToProduct(product.id, {
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
            if (!productTaxes.find(pt => pt.tax_type_id === currentTax.tax_type_id)) {
              await taxesService.removeTaxFromProduct(product.id, currentTax.tax_type_id);
            }
          }
        } catch (taxErr: any) {
          console.error('Error guardando impuestos:', taxErr);
          // No fallar el guardado del producto si hay error en impuestos
        }
      }
      
      // Recargar producto actualizado
      await loadProduct(product.id);
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  // Obtener categorías filtradas por tipo de producto
  const getFilteredCategories = () => {
    if (!formData.product_type) return categories;
    return categories.filter(cat => {
      const attrs = cat.attributes || {};
      return !attrs.product_type || attrs.product_type === formData.product_type;
    });
  };

  // Verificar si el producto es de farmacia
  const isMedicine = formData.product_type === 'medicine';

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando producto...</div>
        </div>
      </LocalLayout>
    );
  }

  if (!product) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Producto no encontrado</p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Editar Producto - LOCALIA Local</title>
      </Head>

      <div className="w-full h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-medium text-gray-900">Editar Producto</h1>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
          >
            ← Volver a la lista
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

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
          editingProduct={product}
          saving={saving}
          fieldConfig={fieldConfig}
          availableTaxTypes={availableTaxTypes}
          productTaxes={productTaxes}
          setProductTaxes={setProductTaxes}
          loadingTaxes={loadingTaxes}
          onLoadProductTaxes={handleLoadProductTaxes}
          productCompatibilities={productCompatibilities}
          setProductCompatibilities={setProductCompatibilities}
          loadingCompatibilities={loadingCompatibilities}
          onLoadProductCompatibilities={handleLoadProductCompatibilities}
          branchAvailabilities={branchAvailabilities}
          setBranchAvailabilities={setBranchAvailabilities}
          loadingBranchAvailabilities={loadingBranchAvailabilities}
          onLoadBranchAvailabilities={loadBranchAvailabilities}
          productImages={productImages}
          setProductImages={setProductImages}
          loadingImages={loadingImages}
          onLoadProductImages={product?.id ? () => loadProductImages(product.id, product.image_url || undefined) : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </LocalLayout>
  );
}


