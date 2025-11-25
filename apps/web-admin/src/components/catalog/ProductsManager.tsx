import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  business_id: string;
  business_name?: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
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
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    businessId: '',
    categoryId: '',
    isAvailable: undefined as boolean | undefined,
    isFeatured: undefined as boolean | undefined,
    search: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [formData, setFormData] = useState({
    business_id: '',
    name: '',
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
      if (!token) return;

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filters.page.toString());
        params.append('limit', filters.limit.toString());
        if (filters.businessId) {
          params.append('businessId', filters.businessId);
        }
        if (filters.categoryId) {
          params.append('categoryId', filters.categoryId);
        }
        if (filters.isAvailable !== undefined) {
          params.append('isAvailable', filters.isAvailable.toString());
        }
        if (filters.isFeatured !== undefined) {
          params.append('isFeatured', filters.isFeatured.toString());
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        const response = await apiRequest<ProductsResponse>(
          `/catalog/products?${params.toString()}`,
          { method: 'GET' }
        );

        setProducts(response.data);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [token, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  // Filtrar categorías por negocio seleccionado
  const filteredCategories = filters.businessId
    ? categories.filter((cat) => !cat.business_id || cat.business_id === filters.businessId)
    : categories;

  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      business_id: product.business_id,
      name: product.name,
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
      // Recargar productos
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.businessId) params.append('businessId', filters.businessId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.isAvailable !== undefined) params.append('isAvailable', filters.isAvailable.toString());
      if (filters.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await apiRequest<ProductsResponse>(
        `/catalog/products?${params.toString()}`,
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
      // Recargar productos
      const params = new URLSearchParams();
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());
      if (filters.businessId) params.append('businessId', filters.businessId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.isAvailable !== undefined) params.append('isAvailable', filters.isAvailable.toString());
      if (filters.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
      if (filters.search) params.append('search', filters.search);

      const response = await apiRequest<ProductsResponse>(
        `/catalog/products?${params.toString()}`,
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

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-1 flex-wrap">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 max-w-xs"
          />
          <select
            value={filters.businessId}
            onChange={(e) => handleFilterChange('businessId', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos los negocios</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          <select
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todas las categorías</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} {category.business_name ? `(${category.business_name})` : '(Global)'}
              </option>
            ))}
          </select>
          <select
            value={filters.isAvailable === undefined ? '' : filters.isAvailable.toString()}
            onChange={(e) =>
              handleFilterChange('isAvailable', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="true">Disponibles</option>
            <option value="false">No Disponibles</option>
          </select>
          <select
            value={filters.isFeatured === undefined ? '' : filters.isFeatured.toString()}
            onChange={(e) =>
              handleFilterChange('isFeatured', e.target.value === '' ? undefined : e.target.value === 'true')
            }
            className="px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="true">Destacados</option>
            <option value="false">No Destacados</option>
          </select>
        </div>
        <button
          onClick={handleNewProduct}
          disabled={!filters.businessId}
          className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={!filters.businessId ? 'Selecciona un negocio primero' : ''}
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Lista de productos */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-500">No se encontraron productos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedProduct?.id === product.id
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleSelectProduct(product)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-16 h-16 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded bg-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-normal text-gray-900">{product.name}</p>
                      {product.is_featured && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                          ⭐ Destacado
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{product.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-normal text-gray-900">{formatCurrency(product.price)}</span>
                      {product.category_name && (
                        <span className="text-xs text-gray-400">{product.category_name}</span>
                      )}
                      {product.business_name && (
                        <span className="text-xs text-gray-400">{product.business_name}</span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          product.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.is_available ? 'Disponible' : 'No Disponible'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product.id);
                  }}
                  className="ml-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} productos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
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

                  <div>
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

