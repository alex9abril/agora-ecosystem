import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import { getUserVehicle } from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';

export default function ProductsPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [nutritionalInfo, setNutritionalInfo] = useState<Record<string, any>>({});

  // Cargar datos iniciales
  useEffect(() => {
    if (selectedBusiness?.business_id) {
      loadData();
    }
  }, [selectedBusiness?.business_id]);

  const loadData = async () => {
    if (!selectedBusiness?.business_id) return;

    try {
      setLoading(true);
      setError(null);

      // Obtener vehículo del usuario si está guardado
      const userVehicle = getUserVehicle();
      
      // Cargar productos y categorías en paralelo
      const [productsResponse, categoriesData] = await Promise.all([
        productsService.getProducts(selectedBusiness.business_id, userVehicle || undefined),
        productsService.getCategories(),
      ]);

      setProducts(productsResponse.data);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!selectedBusiness?.business_id) {
      setError('No hay negocio seleccionado');
      return;
    }

    resetForm();
    setFormData({
      ...formData,
      business_id: selectedBusiness.business_id,
    });
    setShowCreateModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      business_id: product.business_id,
      name: product.name,
      sku: product.sku || '',
      description: product.description || '',
      image_url: product.image_url || '',
      price: product.price,
      product_type: product.product_type,
      category_id: product.category_id || '',
      is_available: product.is_available,
      is_featured: product.is_featured,
      display_order: product.display_order,
      requires_prescription: product.requires_prescription,
      age_restriction: product.age_restriction,
      max_quantity_per_order: product.max_quantity_per_order,
      requires_pharmacist_validation: product.requires_pharmacist_validation,
    });
    setImagePreview(product.image_url || null);
    setVariantGroups(product.variant_groups || []);
    setAllergens(product.allergens || []);
    setNutritionalInfo(product.nutritional_info || {});
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      business_id: selectedBusiness?.business_id || '',
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
    setImageFile(null);
    setImagePreview(null);
    setVariantGroups([]);
    setAllergens([]);
    setNutritionalInfo({});
    setEditingProduct(null);
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
        sku: formData.sku && formData.sku.trim() !== '' ? formData.sku.trim() : undefined,
        image_url: imageUrl,
        variant_groups: variantGroups.length > 0 ? variantGroups : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
      };

      if (editingProduct) {
        await productsService.updateProduct({ ...productData, id: editingProduct.id });
      } else {
        await productsService.createProduct(productData);
      }

      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este producto?')) {
      return;
    }

    try {
      await productsService.deleteProduct(productId);
      await loadData();
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      setError('Error al eliminar el producto');
    }
  };

  // Obtener categorías filtradas por tipo de producto
  const getFilteredCategories = () => {
    if (!formData.product_type) return categories;
    // Filtrar categorías que tengan el atributo product_type o que sean generales
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
          <div className="text-gray-500">Cargando productos...</div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Productos - AGORA Local</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Nuevo Producto
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Lista de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    product.is_available
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.is_available ? 'Disponible' : 'No disponible'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay productos registrados</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Crear primer producto
            </button>
          </div>
        )}

        {/* Modal de creación/edición */}
        {showCreateModal && (
          <ProductFormModal
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
            onSubmit={handleSubmit}
            onClose={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          />
        )}
      </div>
    </LocalLayout>
  );
}

// Componente del formulario modal
interface ProductFormModalProps {
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
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

function ProductFormModal({
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
  onSubmit,
  onClose,
}: ProductFormModalProps) {
  const [productTypes, setProductTypes] = useState<Array<{ value: ProductType; label: string }>>([]);
  const commonAllergens = ['gluten', 'lactosa', 'huevo', 'soja', 'nueces', 'pescado', 'mariscos', 'sésamo'];

  // Cargar tipos de producto al montar el componente
  useEffect(() => {
    const loadProductTypes = async () => {
      try {
        const types = await productsService.getProductTypes();
        setProductTypes(types);
      } catch (err: any) {
        console.error('Error cargando tipos de producto:', err);
        // Usar valores por defecto en caso de error
        setProductTypes([
          { value: 'food', label: 'Alimento' },
          { value: 'beverage', label: 'Bebida' },
          { value: 'medicine', label: 'Medicamento' },
          { value: 'grocery', label: 'Abarrotes' },
          { value: 'non_food', label: 'No Alimenticio' },
        ]);
      }
    };

    loadProductTypes();
  }, []);

  const addVariantGroup = () => {
    setVariantGroups([
      ...variantGroups,
      {
        name: '',
        description: '',
        is_required: false,
        selection_type: 'single',
        display_order: variantGroups.length + 1,
        variants: [],
      },
    ]);
  };

  const removeVariantGroup = (index: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== index));
  };

  const updateVariantGroup = (index: number, updates: Partial<ProductVariantGroup>) => {
    const updated = [...variantGroups];
    updated[index] = { ...updated[index], ...updates };
    setVariantGroups(updated);
  };

  const addVariant = (groupIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants.push({
      name: '',
      description: '',
      price_adjustment: 0,
      is_available: true,
      display_order: updated[groupIndex].variants.length + 1,
    });
    setVariantGroups(updated);
  };

  const removeVariant = (groupIndex: number, variantIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants = updated[groupIndex].variants.filter((_, i) => i !== variantIndex);
    setVariantGroups(updated);
  };

  const updateVariant = (groupIndex: number, variantIndex: number, updates: any) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants[variantIndex] = {
      ...updated[groupIndex].variants[variantIndex],
      ...updates,
    };
    setVariantGroups(updated);
  };

  const toggleAllergen = (allergen: string) => {
    if (allergens.includes(allergen)) {
      setAllergens(allergens.filter(a => a !== allergen));
    } else {
      setAllergens([...allergens, allergen]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Básica</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Hamburguesa Clásica"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU (Código de Producto)
              </label>
              <input
                type="text"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ej: HAMB-CLAS-001"
              />
              <p className="mt-1 text-xs text-gray-500">
                Código único de identificación del producto (opcional)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el producto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Producto <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  value={formData.product_type}
                  onChange={(e) => setFormData({ ...formData, product_type: e.target.value as ProductType })}
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Gestionado por administradores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Gestionado por administradores</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
                <span className="ml-2 text-sm text-gray-700">Disponible</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <span className="ml-2 text-sm text-gray-700">Destacado</span>
              </label>
            </div>
          </div>

          {/* Imagen */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Imagen del Producto</h3>
            <ImageUpload
              currentImageUrl={imagePreview || undefined}
              onImageChange={onImageChange}
              label="Imagen del producto"
            />
          </div>

          {/* Variantes */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex-1">Variantes del Producto</h3>
              <button
                type="button"
                onClick={addVariantGroup}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                + Agregar Grupo de Variantes
              </button>
            </div>

            {variantGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-900">Grupo {groupIndex + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeVariantGroup(groupIndex)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Grupo</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={group.name}
                      onChange={(e) => updateVariantGroup(groupIndex, { name: e.target.value })}
                      placeholder="Ej: Tamaño, Extras, Sabor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Selección</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={group.selection_type}
                      onChange={(e) => updateVariantGroup(groupIndex, { selection_type: e.target.value as 'single' | 'multiple' })}
                    >
                      <option value="single">Única</option>
                      <option value="multiple">Múltiple</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={group.is_required}
                    onChange={(e) => updateVariantGroup(groupIndex, { is_required: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Obligatorio seleccionar</span>
                </label>

                <div className="space-y-2">
                  {group.variants.map((variant, variantIndex) => (
                    <div key={variantIndex} className="flex gap-2 items-start p-2 bg-gray-50 rounded">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={variant.name}
                          onChange={(e) => updateVariant(groupIndex, variantIndex, { name: e.target.value })}
                          placeholder="Nombre (ej: Chica)"
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={variant.price_adjustment}
                          onChange={(e) => updateVariant(groupIndex, variantIndex, { price_adjustment: parseFloat(e.target.value) || 0 })}
                          placeholder="Ajuste precio"
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={variant.absolute_price || ''}
                          onChange={(e) => updateVariant(groupIndex, variantIndex, { absolute_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="Precio absoluto (opcional)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(groupIndex, variantIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addVariant(groupIndex)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Agregar Variante
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Alérgenos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Alérgenos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {commonAllergens.map((allergen) => (
                <label key={allergen} className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={allergens.includes(allergen)}
                    onChange={() => toggleAllergen(allergen)}
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{allergen}</span>
                </label>
              ))}
            </div>
          </div>


          {/* Campos de Farmacia (solo si es medicamento) */}
          {isMedicine && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 mb-4">Información de Farmacia</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={formData.requires_prescription || false}
                    onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Requiere receta médica</span>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Restricción de Edad</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.age_restriction || ''}
                      onChange={(e) => setFormData({ ...formData, age_restriction: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Edad mínima (años)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Máxima por Pedido</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={formData.max_quantity_per_order || ''}
                      onChange={(e) => setFormData({ ...formData, max_quantity_per_order: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Cantidad máxima"
                    />
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={formData.requires_pharmacist_validation || false}
                    onChange={(e) => setFormData({ ...formData, requires_pharmacist_validation: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-700">Requiere validación de farmacéutico</span>
                </label>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

