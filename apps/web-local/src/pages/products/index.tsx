import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import { taxesService, TaxType, ProductTax } from '@/lib/taxes';
import ImageUpload from '@/components/ImageUpload';
import CategorySelector from '@/components/CategorySelector';

export default function ProductsPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showProductTypeSelection, setShowProductTypeSelection] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder?: number }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updated_at' | 'created_at'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Estados para impuestos
  const [availableTaxTypes, setAvailableTaxTypes] = useState<TaxType[]>([]);
  const [productTaxes, setProductTaxes] = useState<ProductTax[]>([]);
  const [loadingTaxes, setLoadingTaxes] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (selectedBusiness?.business_id) {
      loadData();
      loadTaxTypes();
    }
  }, [selectedBusiness?.business_id]);

  const loadData = async () => {
    if (!selectedBusiness?.business_id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar productos y categorías en paralelo
      const [productsData, categoriesData] = await Promise.all([
        productsService.getProducts(selectedBusiness.business_id),
        productsService.getCategories(),
      ]);

      // Asegurar que productsData sea un array
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const loadTaxTypes = async () => {
    try {
      setLoadingTaxes(true);
      const taxTypes = await taxesService.getTaxTypes(false);
      // Asegurar que siempre sea un array
      setAvailableTaxTypes(Array.isArray(taxTypes) ? taxTypes : []);
    } catch (err: any) {
      console.error('Error cargando tipos de impuestos:', err);
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
      console.error('Error cargando impuestos del producto:', err);
      setProductTaxes([]);
    } finally {
      setLoadingTaxes(false);
    }
  };

  const handleCreate = () => {
    if (!selectedBusiness?.business_id) {
      setError('No hay negocio seleccionado');
      return;
    }

    resetForm();
    setShowProductTypeSelection(true);
  };

  const handleProductTypeSelect = async (productType: ProductType) => {
    try {
      // Obtener configuración de campos para este tipo
      const config = await productsService.getFieldConfigByProductType(productType);
      setFieldConfig(config);
      setSelectedProductType(productType);
      
      // Asegurar que los tipos de impuestos estén cargados
      if (!availableTaxTypes || availableTaxTypes.length === 0) {
        await loadTaxTypes();
      }
      
      // Inicializar formulario con el tipo seleccionado
      setFormData({
        ...formData,
        business_id: selectedBusiness?.business_id || '',
        product_type: productType,
      });
      
      setShowProductTypeSelection(false);
      setShowForm(true);
    } catch (err: any) {
      console.error('Error obteniendo configuración de campos:', err);
      setError('Error al cargar configuración del formulario');
    }
  };

  const handleEdit = async (product: Product) => {
    // Navegar a la página de detalle del producto con el ID en la URL
    router.push(`/products/${product.id}`);
  };

  const resetForm = () => {
    setFormData({
      business_id: selectedBusiness?.business_id || '',
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
        image_url: imageUrl,
        variant_groups: variantGroups, // Enviar siempre, incluso si está vacío para poder eliminar grupos
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
      };

      let savedProduct: Product;
      if (editingProduct) {
        savedProduct = await productsService.updateProduct({ ...productData, id: editingProduct.id });
      } else {
        savedProduct = await productsService.createProduct(productData);
      }

      // Guardar/actualizar impuestos del producto
      if (savedProduct?.id) {
        try {
          // Obtener impuestos actuales del producto
          const currentTaxes = await taxesService.getProductTaxes(savedProduct.id);
          const currentTaxTypeIds = currentTaxes.map(t => t.tax_type_id);
          
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
              const existingTax = currentTaxes.find(t => t.tax_type_id === productTax.tax_type_id);
              if (existingTax && (
                existingTax.override_rate !== productTax.override_rate ||
                existingTax.override_fixed_amount !== productTax.override_fixed_amount
              )) {
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
            if (!productTaxes.find(pt => pt.tax_type_id === currentTax.tax_type_id)) {
              await taxesService.removeTaxFromProduct(savedProduct.id, currentTax.tax_type_id);
            }
          }
        } catch (taxErr: any) {
          console.error('Error guardando impuestos:', taxErr);
          // No fallar el guardado del producto si hay error en impuestos
        }
      }

      await loadData();
      // Si es un producto nuevo, mantener el formulario abierto para gestionar variantes
      if (!editingProduct) {
        // Recargar el producto recién creado para obtener su ID
        const updatedProducts = await productsService.getProducts(selectedBusiness?.business_id || '');
        const newProduct = updatedProducts.find(p => p.name === formData.name);
        if (newProduct) {
          setEditingProduct(newProduct);
          setFormData({ ...formData, business_id: newProduct.business_id });
          // Cargar impuestos del producto recién creado
          await loadProductTaxes(newProduct.id);
        }
      } else {
        // Si es edición, cerrar el formulario
        setShowForm(false);
        resetForm();
      }
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    const action = product.is_available ? 'desactivar' : 'activar';
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
    return categories.filter(cat => {
      const attrs = cat.attributes || {};
      return !attrs.product_type || attrs.product_type === formData.product_type;
    });
  };

  // Verificar si el producto es de farmacia
  const isMedicine = formData.product_type === 'medicine';

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = products
    .filter((product) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(search) ||
        (product.description && product.description.toLowerCase().includes(search)) ||
        product.product_type.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aValue = sortBy === 'updated_at' ? a.updated_at : a.created_at;
      const bValue = sortBy === 'updated_at' ? b.updated_at : b.created_at;
      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
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
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            >
              + Nuevo Producto
            </button>
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
            {/* Barra de búsqueda y filtros */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar Productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-sm"
                />
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="bg-white rounded border border-gray-200 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="rounded border-gray-300 text-gray-600 focus:ring-gray-400" />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Disponibilidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortBy === 'updated_at') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('updated_at');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Last updated
                          {sortBy === 'updated_at' && (
                            <svg className={`h-4 w-4 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                          if (sortBy === 'created_at') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('created_at');
                            setSortOrder('desc');
                          }
                        }}
                      >
                        Created at
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedProducts.map((product) => {
                      const productTypeLabels: Record<ProductType, { label: string; color: string }> = {
                        food: { label: 'Alimento', color: 'bg-blue-100 text-blue-800' },
                        beverage: { label: 'Bebida', color: 'bg-cyan-100 text-cyan-800' },
                        medicine: { label: 'Medicamento', color: 'bg-red-100 text-red-800' },
                        grocery: { label: 'Abarrotes', color: 'bg-yellow-100 text-yellow-800' },
                        non_food: { label: 'No Alimenticio', color: 'bg-gray-100 text-gray-800' },
                      };
                      const typeInfo = productTypeLabels[product.product_type] || { label: product.product_type, color: 'bg-gray-100 text-gray-800' };
                      
                      const formatDate = (dateString: string) => {
                        const date = new Date(dateString);
                        return date.toLocaleDateString('es-MX', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      };

                      return (
                        <tr 
                          key={product.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={(e) => {
                            // Evitar que el click en checkbox o botones active la navegación
                            const target = e.target as HTMLElement;
                            if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('svg')) {
                              return;
                            }
                            handleEdit(product);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-gray-300 text-gray-600 focus:ring-gray-400" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full mr-2 ${product.is_available ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className="text-sm text-gray-600">{product.is_available ? 'Disponible' : 'No disponible'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {product.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${product.price.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(product.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(product.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(product)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Editar"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleToggleAvailability(product)}
                                className={product.is_available ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}
                                title={product.is_available ? 'Desactivar' : 'Activar'}
                              >
                                {product.is_available ? (
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                    {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos registrados'}
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
                  <div className="text-sm text-gray-500">
                    No. of rows {filteredAndSortedProducts.length}
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

function ProductTypeSelection({ onSelect, onCancel }: ProductTypeSelectionProps) {
  const productTypes = productsService.getProductTypes();

  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">Seleccionar Tipo de Producto</h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-600 mb-6">
          Selecciona el tipo de producto que deseas crear. Esto determinará qué campos estarán disponibles en el formulario.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onSelect(type.value)}
              className="p-4 border border-gray-200 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors text-left"
            >
              <h3 className="text-sm font-medium text-gray-900 mb-1">{type.label}</h3>
              <p className="text-xs text-gray-500">
                {type.value === 'food' && 'Alimentos y comidas preparadas'}
                {type.value === 'beverage' && 'Bebidas y refrescos'}
                {type.value === 'medicine' && 'Medicamentos y productos farmacéuticos'}
                {type.value === 'grocery' && 'Abarrotes y productos de despensa'}
                {type.value === 'non_food' && 'Productos no alimenticios'}
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
  fieldConfig: Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder?: number }>;
  availableTaxTypes: TaxType[];
  productTaxes: ProductTax[];
  setProductTaxes: React.Dispatch<React.SetStateAction<ProductTax[]>>;
  loadingTaxes: boolean;
  onLoadProductTaxes?: () => void;
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
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const productTypes = productsService.getProductTypes();
  const commonAllergens = ['gluten', 'lactosa', 'huevo', 'soja', 'nueces', 'pescado', 'mariscos', 'sésamo'];

  // Cargar impuestos del producto cuando se edita
  useEffect(() => {
    if (editingProduct?.id && onLoadProductTaxes) {
      onLoadProductTaxes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct?.id]); // Solo ejecutar cuando cambie el ID del producto, no cuando cambie la función

  // Helper para verificar si un campo es visible
  const isFieldVisible = (fieldName: string): boolean => {
    // Si no hay configuración cargada, retornar false por defecto
    if (!fieldConfig || fieldConfig.length === 0) {
      return false;
    }
    const field = fieldConfig.find(f => f.fieldName === fieldName);
    // Si el campo está en la configuración, usar su valor de is_visible
    // Si no está, asumir que NO es visible (más conservador)
    return field ? field.isVisible : false;
  };

  // Helper para verificar si un campo es requerido
  const isFieldRequired = (fieldName: string): boolean => {
    const field = fieldConfig.find(f => f.fieldName === fieldName);
    return field ? field.isRequired : false; // Por defecto no requerido si no hay configuración
  };

  // Obtener campos ordenados según display_order
  const getOrderedFields = () => {
    return [...fieldConfig].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  };

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
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">
          {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
              {isFieldVisible('name') && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Nombre {isFieldRequired('name') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={isFieldRequired('name')}
                    maxLength={255}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Hamburguesa Clásica"
                  />
                </div>
              )}

              {/* Descripción */}
              {isFieldVisible('description') && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Descripción {isFieldRequired('description') && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    rows={4}
                    required={isFieldRequired('description')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el producto..."
                  />
                </div>
              )}
            </div>

            {/* Media */}
            {isFieldVisible('image_url') && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Media
                </h3>
                <ImageUpload
                  currentImageUrl={imagePreview || undefined}
                  onImageChange={onImageChange}
                  label="Imagen del Producto"
                />
              </div>
            )}

            {/* Variantes - Solo si el producto ya está creado y el campo es visible */}
            {editingProduct && isFieldVisible('variant_groups') && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Variantes</h3>
                  <button
                    type="button"
                    onClick={addVariantGroup}
                    className="px-3 py-1.5 text-xs font-normal text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    + Agregar Grupo de Variantes
                  </button>
                </div>

                {variantGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="mb-4 p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-normal text-gray-700">Grupo {groupIndex + 1}</h4>
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
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Nombre del Grupo</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        value={group.name}
                        onChange={(e) => updateVariantGroup(groupIndex, { name: e.target.value })}
                        placeholder="Ej: Tamaño, Extras, Sabor"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Tipo de Selección</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
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
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={group.is_required}
                      onChange={(e) => updateVariantGroup(groupIndex, { is_required: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Obligatorio seleccionar</span>
                  </label>

                  <div className="space-y-2">
                    {(group.variants || []).map((variant, variantIndex) => {
                      // Calcular precio final para mostrar
                      const basePrice = formData.price || 0;
                      const finalPrice = variant.absolute_price !== undefined && variant.absolute_price !== null
                        ? variant.absolute_price
                        : basePrice + (variant.price_adjustment || 0);
                      
                      return (
                        <div key={variantIndex} className="flex gap-2 items-start p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-normal text-gray-600 mb-1">Nombre</label>
                                <input
                                  type="text"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                  value={variant.name}
                                  onChange={(e) => updateVariant(groupIndex, variantIndex, { name: e.target.value })}
                                  placeholder="Ej: Chica, Mediana, Grande"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-normal text-gray-600 mb-1">
                                  Ajuste de Precio
                                  <span className="text-gray-400 ml-1">(relativo)</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                    value={variant.price_adjustment}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      updateVariant(groupIndex, variantIndex, { 
                                        price_adjustment: value,
                                        absolute_price: undefined // Limpiar precio absoluto si se usa ajuste
                                      });
                                    }}
                                    placeholder="+0.00"
                                    disabled={variant.absolute_price !== undefined && variant.absolute_price !== null}
                                  />
                                  {variant.price_adjustment !== 0 && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                      {variant.price_adjustment > 0 ? '+' : ''}{variant.price_adjustment.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {basePrice} + {variant.price_adjustment || 0} = ${finalPrice.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-normal text-gray-600 mb-1">
                                  Precio Absoluto
                                  <span className="text-gray-400 ml-1">(fijo)</span>
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                    value={variant.absolute_price || ''}
                                    onChange={(e) => {
                                      const value = e.target.value ? parseFloat(e.target.value) : undefined;
                                      updateVariant(groupIndex, variantIndex, { 
                                        absolute_price: value,
                                        price_adjustment: value !== undefined ? 0 : variant.price_adjustment
                                      });
                                    }}
                                    placeholder="Opcional"
                                  />
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {variant.absolute_price ? `Precio fijo: $${variant.absolute_price.toFixed(2)}` : 'Usa ajuste relativo'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                              <span>Precio final: <strong className="text-gray-700">${finalPrice.toFixed(2)}</strong></span>
                              {variant.absolute_price !== undefined && variant.absolute_price !== null && (
                                <span className="text-blue-600">(Precio fijo)</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(groupIndex, variantIndex)}
                            className="text-gray-400 hover:text-gray-600 mt-6"
                            title="Eliminar variante"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                  
                  {/* Ayuda sobre precios y configuración */}
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-gray-600">
                      <p className="font-medium text-gray-700 mb-1">💡 Cómo funcionan los precios:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                        <li><strong>Ajuste de Precio:</strong> Se suma al precio base ({formData.price ? `$${formData.price.toFixed(2)}` : '$0.00'}). Ej: +$5.00 = ${formData.price ? (formData.price + 5).toFixed(2) : '5.00'}</li>
                        <li><strong>Precio Absoluto:</strong> Reemplaza el precio base. Si lo usas, ignora el ajuste.</li>
                        <li><strong>Ejemplo:</strong> Producto $120 → Chica: +$0 = $120, Grande: +$20 = $140, o Grande: $150 (absoluto)</li>
                      </ul>
                    </div>
                    
                    {/* Ayuda sobre tipos de selección */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-gray-600">
                      <p className="font-medium text-gray-700 mb-1">📋 Tipos de Selección:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                        <li><strong>Única:</strong> El cliente elige solo UNA opción (ej: Tamaño - Chica, Mediana o Grande)</li>
                        <li><strong>Múltiple:</strong> El cliente puede elegir VARIAS opciones (ej: Salsas - puede elegir Magui, Valentina, Inglesa, etc.)</li>
                        <li><strong>💡 Para salsas/condimentos:</strong> Usa "Múltiple" para que puedan elegir varias salsas</li>
                        <li><strong>💡 Para tamaños:</strong> Usa "Única" porque solo pueden elegir un tamaño</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!editingProduct && isFieldVisible('variant_groups') && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-500">
                Las variantes se pueden gestionar después de crear el producto.
              </p>
            </div>
          )}

            {/* Alérgenos */}
            {isFieldVisible('allergens') && (
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
                    <span className="ml-2 text-sm text-gray-600 capitalize">{allergen}</span>
                  </label>
                ))}
              </div>
              </div>
            )}

            {/* Información Nutricional */}
            {isFieldVisible('nutritional_info') && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Información Nutricional (Opcional)
                </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Calorías</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.calories || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, calories: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="kcal"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Proteína (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.protein || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, protein: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Carbohidratos (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.carbohydrates || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, carbohydrates: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Grasas (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.fats || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, fats: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
            </div>
              </div>
            )}

            {/* Campos de Farmacia */}
            {isFieldVisible('requires_prescription') && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                  Información de Farmacia
                </h3>
              <div className="space-y-4">
                {isFieldVisible('requires_prescription') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={formData.requires_prescription || false}
                      onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Requiere receta médica {isFieldRequired('requires_prescription') && <span className="text-red-500">*</span>}</span>
                  </label>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {isFieldVisible('age_restriction') && (
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">
                        Restricción de Edad {isFieldRequired('age_restriction') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        required={isFieldRequired('age_restriction')}
                        min="0"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        value={formData.age_restriction || ''}
                        onChange={(e) => setFormData({ ...formData, age_restriction: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Edad mínima (años)"
                      />
                    </div>
                  )}

                  {isFieldVisible('max_quantity_per_order') && (
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">
                        Cantidad Máxima por Pedido {isFieldRequired('max_quantity_per_order') && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="number"
                        required={isFieldRequired('max_quantity_per_order')}
                        min="1"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        value={formData.max_quantity_per_order || ''}
                        onChange={(e) => setFormData({ ...formData, max_quantity_per_order: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Cantidad máxima"
                      />
                    </div>
                  )}
                </div>

                {isFieldVisible('requires_pharmacist_validation') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={formData.requires_pharmacist_validation || false}
                      onChange={(e) => setFormData({ ...formData, requires_pharmacist_validation: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Requiere validación de farmacéutico {isFieldRequired('requires_pharmacist_validation') && <span className="text-red-500">*</span>}</span>
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
              {isFieldVisible('product_type') && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Tipo de Producto {isFieldRequired('product_type') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    disabled
                    required={isFieldRequired('product_type')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
                    value={productTypes.find(t => t.value === formData.product_type)?.label || formData.product_type}
                  />
                  <p className="text-xs text-gray-400 mt-1">Gestionado por administradores</p>
                </div>
              )}

              {/* Categoría */}
              {isFieldVisible('category_id') && (
                <div>
                  <CategorySelector
                    categories={categories}
                    value={formData.category_id}
                    onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
                    required={isFieldRequired('category_id')}
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
                {isFieldVisible('is_available') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Disponible</span>
                  </label>
                )}

                {isFieldVisible('is_featured') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Destacado</span>
                  </label>
                )}
              </div>
            </div>

            {/* Precio y Orden */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Precio y Visualización
              </h3>

              {isFieldVisible('price') && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Precio {isFieldRequired('price') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    required={isFieldRequired('price')}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              )}

              {isFieldVisible('display_order') && (
                <div>
                  <label className="block text-xs font-normal text-gray-600 mb-1.5">
                    Orden de Visualización {isFieldRequired('display_order') && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    required={isFieldRequired('display_order')}
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Impuestos */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Impuestos</h3>
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
                          ? 'Cargando tipos de impuestos...' 
                          : 'No hay tipos de impuestos disponibles. Contacta al administrador.'}
                      </p>
                    ) : (
                      availableTaxTypes.map((taxType) => {
                        const isSelected = productTaxes.some(pt => pt.tax_type_id === taxType.id);
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
                                      id: '',
                                      product_id: editingProduct?.id || '',
                                      tax_type_id: taxType.id,
                                      display_order: productTaxes?.length || 0,
                                      created_at: '',
                                      tax_name: taxType.name,
                                      default_rate: taxType.rate,
                                      rate_type: taxType.rate_type,
                                      default_fixed_amount: taxType.fixed_amount,
                                    },
                                  ]);
                                } else {
                                  // Remover impuesto
                                  setProductTaxes(productTaxes.filter(pt => pt.tax_type_id !== taxType.id));
                                }
                              }}
                            />
                            <div className="ml-2 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{taxType.name}</span>
                                {taxType.is_default && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Por defecto</span>
                                )}
                              </div>
                              {taxType.description && (
                                <p className="text-xs text-gray-500 mt-0.5">{taxType.description}</p>
                              )}
                              <p className="text-xs text-gray-600 mt-1">
                                {taxType.rate_type === 'percentage' 
                                  ? `${(taxType.rate * 100).toFixed(2)}%`
                                  : `$${taxType.fixed_amount?.toFixed(2) || '0.00'}`}
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
                      {productTaxes && productTaxes.map((productTax, index) => {
                        const taxType = availableTaxTypes?.find(t => t.id === productTax.tax_type_id);
                        if (!taxType) return null;

                        const effectiveRate = productTax.override_rate ?? productTax.default_rate ?? taxType.rate;
                        const effectiveFixed = productTax.override_fixed_amount ?? productTax.default_fixed_amount ?? taxType.fixed_amount;

                        return (
                          <div key={productTax.tax_type_id} className="p-3 border border-gray-200 rounded bg-gray-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{productTax.tax_name || taxType.name}</span>
                                  {productTax.override_rate !== undefined && (
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Override</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {taxType.rate_type === 'percentage' 
                                    ? `Tasa: ${(effectiveRate * 100).toFixed(2)}%`
                                    : `Monto fijo: $${effectiveFixed?.toFixed(2) || '0.00'}`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setProductTaxes(productTaxes.filter((_, i) => i !== index))}
                                className="text-gray-400 hover:text-gray-600"
                                title="Eliminar impuesto"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {/* Opción de override para impuestos de tipo percentage */}
                            {taxType.rate_type === 'percentage' && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                    checked={productTax.override_rate !== undefined}
                                    onChange={(e) => {
                                      const updated = [...productTaxes];
                                      if (e.target.checked) {
                                        updated[index].override_rate = taxType.rate;
                                      } else {
                                        updated[index].override_rate = undefined;
                                      }
                                      setProductTaxes(updated);
                                    }}
                                  />
                                  <span className="ml-2 text-xs text-gray-600">Personalizar porcentaje</span>
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
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value) && value >= 0 && value <= 1) {
                                          const updated = [...productTaxes];
                                          updated[index].override_rate = value;
                                          setProductTaxes(updated);
                                        }
                                      }}
                                      placeholder={`${(taxType.rate * 100).toFixed(2)}%`}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                      {(productTax.override_rate * 100).toFixed(2)}% 
                                      {productTax.override_rate !== taxType.rate && (
                                        <span className="ml-1">
                                          (por defecto: {(taxType.rate * 100).toFixed(2)}%)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Opción de override para impuestos de tipo fixed */}
                            {taxType.rate_type === 'fixed' && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                                    checked={productTax.override_fixed_amount !== undefined}
                                    onChange={(e) => {
                                      const updated = [...productTaxes];
                                      if (e.target.checked) {
                                        updated[index].override_fixed_amount = taxType.fixed_amount || 0;
                                      } else {
                                        updated[index].override_fixed_amount = undefined;
                                      }
                                      setProductTaxes(updated);
                                    }}
                                  />
                                  <span className="ml-2 text-xs text-gray-600">Personalizar monto fijo</span>
                                </label>
                                {productTax.override_fixed_amount !== undefined && (
                                  <div className="mt-2">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                                      value={productTax.override_fixed_amount}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value) && value >= 0) {
                                          const updated = [...productTaxes];
                                          updated[index].override_fixed_amount = value;
                                          setProductTaxes(updated);
                                        }
                                      }}
                                      placeholder={`$${taxType.fixed_amount?.toFixed(2) || '0.00'}`}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                      ${productTax.override_fixed_amount.toFixed(2)}
                                      {productTax.override_fixed_amount !== taxType.fixed_amount && (
                                        <span className="ml-1">
                                          (por defecto: ${taxType.fixed_amount?.toFixed(2) || '0.00'})
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
                    No hay impuestos asignados. Los impuestos se aplicarán según la configuración del administrador.
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
              {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
    </div>
  );
}

