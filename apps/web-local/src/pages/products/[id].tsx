import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect, useCallback } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import { taxesService, TaxType, ProductTax } from '@/lib/taxes';
import ImageUpload from '@/components/ImageUpload';
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
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [nutritionalInfo, setNutritionalInfo] = useState<Record<string, any>>({});
  
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

  // Cargar producto cuando cambie el ID de la URL
  useEffect(() => {
    if (router.isReady && id && typeof id === 'string' && selectedBusiness?.business_id) {
      loadProduct(id);
      loadCategories();
      loadTaxTypes();
    }
  }, [router.isReady, id, selectedBusiness?.business_id]);

  // Cargar impuestos cuando el producto esté cargado
  useEffect(() => {
    if (product?.id) {
      loadProductTaxes(product.id);
    }
  }, [product?.id, loadProductTaxes]);

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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </LocalLayout>
  );
}


