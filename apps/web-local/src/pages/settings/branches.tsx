import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { businessService, Business, CreateBusinessData, BusinessCategory } from '@/lib/business';
import LocationMapPicker from '@/components/LocationMapPicker';
import BrandingManager from '@/components/branding/BrandingManager';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

export default function BranchesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Business | null>(null);
  const [brandingBranch, setBrandingBranch] = useState<Business | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadBranches();
    }
  }, [user]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }
      const allBranches = await businessService.getAllBranches(user.id);
      setBranches(allBranches);
    } catch (err: any) {
      console.error('Error cargando sucursales:', err);
      setError(err.message || 'Error al cargar las sucursales');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (formData: CreateBusinessData, selectedBrandIds: string[] = []) => {
    try {
      setSaving(true);
      const newBusiness = await businessService.createBusiness(formData);
      
      // Agregar las marcas seleccionadas después de crear la sucursal
      if (selectedBrandIds.length > 0 && newBusiness?.id) {
        try {
          for (const brandId of selectedBrandIds) {
            await businessService.addVehicleBrandToBusiness(newBusiness.id, brandId);
          }
        } catch (brandError: any) {
          console.error('Error agregando marcas a la sucursal:', brandError);
          // No fallar la creación si hay error al agregar marcas, solo mostrar advertencia
          alert('Sucursal creada exitosamente, pero hubo un error al asignar algunas marcas. Puedes editarlas después.');
        }
      }
      
      await loadBranches();
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Error creando sucursal:', err);
      alert(err.message || 'Error al crear la sucursal');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranch = async (branchId: string, formData: CreateBusinessData) => {
    try {
      setSaving(true);
      // Actualizar información básica (incluyendo nuevos campos)
      await businessService.updateBusiness(branchId, {
        name: formData.name,
        legal_name: formData.legal_name,
        description: formData.description,
        category: formData.category,
        phone: formData.phone,
        email: formData.email,
        website_url: formData.website_url,
        slug: formData.slug,
        accepts_pickup: formData.accepts_pickup,
        is_active: formData.is_active,
      });
      
      // Actualizar dirección si cambió
      if (formData.longitude && formData.latitude) {
        await businessService.updateAddress(branchId, {
          longitude: formData.longitude,
          latitude: formData.latitude,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country,
        });
      }
      
      await loadBranches();
      setEditingBranch(null);
    } catch (err: any) {
      console.error('Error actualizando sucursal:', err);
      alert(err.message || 'Error al actualizar la sucursal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Sucursales - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="flex h-full bg-gray-50">
          {/* Sidebar: Categorías */}
          <SettingsSidebar />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-8">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sucursales</h1>
                <p className="text-sm text-gray-600">
                  Gestiona las sucursales de tu tienda y agrega nuevas ubicaciones
                </p>
              </div>

              {!showAddForm && !editingBranch && !brandingBranch && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Sucursal
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {showAddForm ? (
                <AddBranchForm
                  onSave={handleAddBranch}
                  onCancel={() => setShowAddForm(false)}
                  saving={saving}
                />
              ) : editingBranch ? (
                <EditBranchForm
                  branch={editingBranch}
                  onSave={(formData) => handleUpdateBranch(editingBranch.id, formData)}
                  onCancel={() => setEditingBranch(null)}
                  saving={saving}
                />
              ) : brandingBranch ? (
                <div>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <button
                        onClick={() => setBrandingBranch(null)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a sucursales
                      </button>
                      <h2 className="text-2xl font-semibold text-gray-900">Personalizacion</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Ajusta logos, colores y mensajes para la sucursal: <strong>{brandingBranch.name}</strong>
                      </p>
                    </div>
                  </div>
                  <BrandingManager type="business" id={brandingBranch.id} name={brandingBranch.name} />
                </div>
              ) : (
                <BranchesList 
                  branches={branches} 
                  onRefresh={loadBranches}
                  onEdit={(branch) => {
                    setBrandingBranch(null);
                    setShowAddForm(false);
                    setEditingBranch(branch);
                  }}
                  onBranding={(branch) => {
                    setShowAddForm(false);
                    setEditingBranch(null);
                    setBrandingBranch(branch);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

interface BranchesListProps {
  branches: Business[];
  onRefresh: () => void;
  onEdit: (branch: Business) => void;
  onBranding?: (branch: Business) => void;
}

function BranchesList({ branches, onRefresh, onEdit, onBranding }: BranchesListProps) {
  if (branches.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No hay sucursales</h3>
        <p className="mt-2 text-sm text-gray-500">
          Comienza agregando tu primera sucursal adicional.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {branches.map((branch) => (
        <div
          key={branch.id}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
              {branch.legal_name && (
                <p className="text-sm text-gray-600 mt-1">{branch.legal_name}</p>
              )}
              {branch.business_address && (
                <p className="text-sm text-gray-500 mt-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {branch.business_address}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    branch.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {branch.is_active ? 'Activa' : 'Inactiva'}
                </span>
                {branch.accepts_orders && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Acepta pedidos
                  </span>
                )}
                {branch.accepts_pickup && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Acepta recolección
                  </span>
                )}
                {branch.slug && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Slug: {branch.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <button
                onClick={() => onEdit(branch)}
                className="px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                Editar
              </button>
              {onBranding && (
                <button
                  onClick={() => onBranding(branch)}
                  className="px-3 py-1.5 text-sm text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                >
                  Personalizar
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface AddBranchFormProps {
  onSave: (data: CreateBusinessData, selectedBrandIds?: string[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

// Función helper para generar slug desde un texto
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

function AddBranchForm({ onSave, onCancel, saving }: AddBranchFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateBusinessData>({
    name: '',
    legal_name: '',
    description: '',
    category: '',
    phone: '',
    email: '',
    longitude: -99.1332, // CDMX por defecto
    latitude: 19.4326, // CDMX por defecto
    address_line1: '',
    address_line2: '',
    city: 'Ciudad de México',
    state: 'CDMX',
    postal_code: '',
    country: 'México',
  });
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [locationValidation, setLocationValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: false });
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Estados para gestión de marcas
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [selectedBrands, setSelectedBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  
  // Estado para rastrear si el slug fue editado manualmente
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  // Estado para grupo empresarial
  const [businessGroup, setBusinessGroup] = useState<{ id: string; name: string } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await businessService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        // Si falla, usar categorías por defecto
        setCategories([
          { name: 'Restaurante' },
          { name: 'Cafetería' },
          { name: 'Pizzería' },
          { name: 'Taquería' },
          { name: 'Panadería' },
          { name: 'Heladería' },
          { name: 'Comida Rápida' },
          { name: 'Asiático' },
          { name: 'Saludable/Vegano' },
          { name: 'Pollería' },
          { name: 'Sandwich Shop' },
          { name: 'Repostería' },
          { name: 'Otro' },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Cargar marcas disponibles al montar el componente
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoadingBrands(true);
        console.log('[AddBranchForm] Cargando marcas disponibles...');
        const available = await businessService.getAvailableVehicleBrands().catch((err) => {
          console.error('[AddBranchForm] Error cargando marcas disponibles:', err);
          return [];
        });
        console.log('[AddBranchForm] Marcas disponibles cargadas:', available.length);
        setAvailableBrands(available);
      } catch (err) {
        console.error('[AddBranchForm] Error general cargando marcas:', err);
        setAvailableBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    loadBrands();
  }, []);

  const handleAddBrand = (brandId: string) => {
    const brand = availableBrands.find(b => b.id === brandId);
    if (brand && !selectedBrands.some(sb => sb.id === brandId)) {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleRemoveBrand = (brandId: string) => {
    setSelectedBrands(selectedBrands.filter(b => b.id !== brandId));
  };

  const handleLocationChange = (
    longitude: number,
    latitude: number,
    address?: string,
    addressComponents?: {
      street_number?: string;
      route?: string;
      sublocality?: string;
      locality?: string;
      administrative_area_level_1?: string;
      postal_code?: string;
      country?: string;
    }
  ) => {
    setFormData(prev => ({
      ...prev,
      longitude,
      latitude,
      // Actualizar campos de dirección con los componentes de Google Maps
      address_line1: addressComponents?.route 
        ? `${addressComponents.route}${addressComponents.street_number ? ' ' + addressComponents.street_number : ''}`.trim()
        : prev.address_line1 || address?.split(',')[0]?.trim() || '',
      address_line2: addressComponents?.sublocality || prev.address_line2 || '',
      city: addressComponents?.locality || prev.city || 'Ciudad de México',
      state: addressComponents?.administrative_area_level_1 || prev.state || 'CDMX',
      postal_code: addressComponents?.postal_code || prev.postal_code || '',
      country: addressComponents?.country || prev.country || 'México',
    }));
    if (address) {
      setSelectedAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.longitude || !formData.latitude) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    const selectedBrandIds = selectedBrands.map(b => b.id);
    await onSave(formData, selectedBrandIds);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Agregar Nueva Sucursal</h2>
      {/* Mensaje informativo sobre asignación automática al grupo */}
      {!loadingGroup && (
        businessGroup ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-blue-800">
                  <strong>Asignación automática:</strong> Esta sucursal será asignada automáticamente al grupo <strong>{businessGroup.name}</strong> al crearla.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-gray-700">
                  Puedes crear un grupo empresarial después para organizar tus sucursales. Ve a <strong>Configuración → Tienda</strong> para crear un grupo.
                </p>
              </div>
            </div>
          </div>
        )
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA - Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Sucursal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Si el slug no fue editado manualmente, generarlo automáticamente desde el nombre
                    if (!slugManuallyEdited) {
                      const autoSlug = generateSlug(newName);
                      setFormData({ ...formData, name: newName, slug: autoSlug });
                    } else {
                      setFormData({ ...formData, name: newName });
                    }
                  }}
                  placeholder="Ej: Sucursal Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length > 0 && formData.category && (
                  <p className="mt-1 text-xs text-gray-500">
                    {categories.find(c => c.name === formData.category)?.description || ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Mapa de selección de ubicación */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona la ubicación de la sucursal <span className="text-red-500">*</span>
                </label>
                <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
                  <LocationMapPicker
                    longitude={formData.longitude}
                    latitude={formData.latitude}
                    onLocationChange={handleLocationChange}
                    onValidationChange={(isValid, message) => {
                      setLocationValidation({ isValid, message: message || undefined });
                    }}
                  />
                </div>
                {selectedAddress && (
                  <p className="mt-2 text-sm text-gray-600">
                    <strong>Dirección detectada:</strong> {selectedAddress}
                  </p>
                )}
                {locationValidation.message && (
                  <p className={`mt-2 text-sm ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {locationValidation.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Calle y número"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              {/* Campos de coordenadas (solo lectura, se actualizan desde el mapa) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.longitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.latitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>
            </div>

            {/* Sección de gestión de marcas de vehículos */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marcas de Vehículos Comercializadas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona las marcas de vehículos que esta sucursal comercializará. Solo podrás crear productos para las marcas seleccionadas.
              </p>

              {loadingBrands ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando marcas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Marcas seleccionadas */}
                  {selectedBrands.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marcas Seleccionadas ({selectedBrands.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedBrands.map((brand) => (
                          <span
                            key={brand.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-md text-sm font-medium"
                          >
                            {brand.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveBrand(brand.id)}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Quitar marca"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcas disponibles para agregar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agregar Marca
                    </label>
                    <select
                      className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loadingBrands}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddBrand(e.target.value);
                          e.target.value = ''; // Resetear el select
                        }
                      }}
                      value=""
                    >
                      <option value="">Selecciona una marca para agregar...</option>
                      {availableBrands
                        .filter((brand) => !selectedBrands.some((sb) => sb.id === brand.id))
                        .sort((a, b) => {
                          if (a.display_order !== b.display_order) {
                            return a.display_order - b.display_order;
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                    </select>
                    {availableBrands.filter((brand) => !selectedBrands.some((sb) => sb.id === brand.id)).length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">Todas las marcas disponibles ya están seleccionadas</p>
                    )}
                  </div>

                  {selectedBrands.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No hay marcas seleccionadas. Selecciona una marca del menú desplegable para comenzar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA - Configuración Adicional */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuración Adicional */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Configuración
              </h3>

              {/* Slug */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Slug (URL amigable)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.slug || ''}
                  onChange={(e) => {
                    // Convertir a slug automáticamente (solo minúsculas, guiones, números)
                    const slugValue = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');
                    setFormData({ ...formData, slug: slugValue });
                    // Marcar que el slug fue editado manualmente
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {slugManuallyEdited 
                    ? 'El slug se mantendrá aunque cambies el nombre' 
                    : 'Identificador para el storefront (se genera desde el nombre)'}
                </p>
              </div>

              {/* Estado (is_active) */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Estado de la Sucursal
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active !== false}
                      onChange={() => setFormData({ ...formData, is_active: true })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Activa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active"
                      checked={formData.is_active === false}
                      onChange={() => setFormData({ ...formData, is_active: false })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Inactiva</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Las inactivas no aparecen en el storefront
                </p>
              </div>

              {/* Acepta recolección (pickup) */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.accepts_pickup || false}
                    onChange={(e) => setFormData({ ...formData, accepts_pickup: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-600">Acepta recolección</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Los clientes pueden recoger en la sucursal
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Crear Sucursal'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface EditBranchFormProps {
  branch: Business;
  onSave: (data: CreateBusinessData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

function EditBranchForm({ branch, onSave, onCancel, saving }: EditBranchFormProps) {
  // Debug: Verificar cómo vienen las coordenadas del backend
  console.log('[EditBranchForm] Datos de la sucursal recibidos:', {
    branch_id: branch.id,
    branch_name: branch.name,
    location_object: branch.location,
    location_longitude: branch.location?.longitude,
    location_latitude: branch.location?.latitude,
    // También verificar si vienen directamente en el objeto branch
    branch_longitude: (branch as any).longitude,
    branch_latitude: (branch as any).latitude,
  });

  // Extraer coordenadas: primero del objeto location, luego directamente del branch (por si acaso)
  const initialLongitude = branch.location?.longitude ?? (branch as any).longitude ?? -99.1332;
  const initialLatitude = branch.location?.latitude ?? (branch as any).latitude ?? 19.4326;

  console.log('[EditBranchForm] Coordenadas extraídas:', {
    initialLongitude,
    initialLatitude,
  });

  const [formData, setFormData] = useState<CreateBusinessData>({
    name: branch.name || '',
    legal_name: branch.legal_name || '',
    description: branch.description || '',
    category: branch.category || '',
    phone: branch.phone || '',
    email: branch.email || '',
    website_url: branch.website_url || '',
    longitude: initialLongitude,
    latitude: initialLatitude,
    address_line1: branch.street ? `${branch.street}${branch.street_number ? ' ' + branch.street_number : ''}`.trim() : '',
    address_line2: branch.neighborhood || '',
    city: branch.address_city || 'Ciudad de México',
    state: branch.address_state || 'CDMX',
    postal_code: branch.postal_code || '',
    country: branch.address_country || 'México',
    slug: branch.slug || '',
    accepts_pickup: branch.accepts_pickup !== undefined ? branch.accepts_pickup : false,
    is_active: branch.is_active !== undefined ? branch.is_active : true,
  });
  const [selectedAddress, setSelectedAddress] = useState<string>(branch.business_address || '');
  const [locationValidation, setLocationValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: false });
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Verificar si el slug fue editado manualmente comparándolo con el generado automáticamente
  const autoGeneratedSlug = generateSlug(branch.name || '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    branch.slug ? branch.slug !== autoGeneratedSlug : false
  );
  
  // Estados para gestión de marcas
  const [availableBrands, setAvailableBrands] = useState<Array<{ id: string; name: string; code: string; display_order: number }>>([]);
  const [assignedBrands, setAssignedBrands] = useState<Array<{ brand_id: string; brand_name: string; brand_code: string; display_order: number }>>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [managingBrands, setManagingBrands] = useState(false);

  // Cargar categorías al montar el componente
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const cats = await businessService.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error cargando categorías:', err);
        // Si falla, usar categorías por defecto
        setCategories([
          { name: 'Restaurante' },
          { name: 'Cafetería' },
          { name: 'Pizzería' },
          { name: 'Taquería' },
          { name: 'Panadería' },
          { name: 'Heladería' },
          { name: 'Comida Rápida' },
          { name: 'Asiático' },
          { name: 'Saludable/Vegano' },
          { name: 'Pollería' },
          { name: 'Sandwich Shop' },
          { name: 'Repostería' },
          { name: 'Otro' },
        ]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Cargar marcas disponibles y asignadas al montar el componente
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoadingBrands(true);
        console.log('[EditBranchForm] Cargando marcas para sucursal:', branch.id);
        
        const [available, assigned] = await Promise.all([
          businessService.getAvailableVehicleBrands().catch((err) => {
            console.error('[EditBranchForm] Error cargando marcas disponibles:', err);
            return [];
          }),
          businessService.getBusinessVehicleBrands(branch.id).catch((err) => {
            console.error('[EditBranchForm] Error cargando marcas asignadas:', err);
            return [];
          }),
        ]);
        
        console.log('[EditBranchForm] Marcas cargadas:', { available: available.length, assigned: assigned.length });
        setAvailableBrands(available);
        setAssignedBrands(assigned);
      } catch (err) {
        console.error('[EditBranchForm] Error general cargando marcas:', err);
        setAvailableBrands([]);
        setAssignedBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    };

    loadBrands();
  }, [branch.id]);

  const handleAddBrand = async (brandId: string) => {
    try {
      setManagingBrands(true);
      const updated = await businessService.addVehicleBrandToBusiness(branch.id, brandId);
      setAssignedBrands(updated);
    } catch (err: any) {
      console.error('Error agregando marca:', err);
      alert(err.message || 'Error al agregar la marca');
    } finally {
      setManagingBrands(false);
    }
  };

  const handleRemoveBrand = async (brandId: string) => {
    try {
      setManagingBrands(true);
      const updated = await businessService.removeVehicleBrandFromBusiness(branch.id, brandId);
      setAssignedBrands(updated);
    } catch (err: any) {
      console.error('Error quitando marca:', err);
      alert(err.message || 'Error al quitar la marca');
    } finally {
      setManagingBrands(false);
    }
  };

  const handleLocationChange = (
    longitude: number,
    latitude: number,
    address?: string,
    addressComponents?: {
      street_number?: string;
      route?: string;
      sublocality?: string;
      locality?: string;
      administrative_area_level_1?: string;
      postal_code?: string;
      country?: string;
    }
  ) => {
    setFormData(prev => ({
      ...prev,
      longitude,
      latitude,
      // Actualizar campos de dirección con los componentes de Google Maps
      address_line1: addressComponents?.route 
        ? `${addressComponents.route}${addressComponents.street_number ? ' ' + addressComponents.street_number : ''}`.trim()
        : prev.address_line1 || address?.split(',')[0]?.trim() || '',
      address_line2: addressComponents?.sublocality || prev.address_line2 || '',
      city: addressComponents?.locality || prev.city || 'Ciudad de México',
      state: addressComponents?.administrative_area_level_1 || prev.state || 'CDMX',
      postal_code: addressComponents?.postal_code || prev.postal_code || '',
      country: addressComponents?.country || prev.country || 'México',
    }));
    if (address) {
      setSelectedAddress(address);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.longitude || !formData.latitude) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    await onSave(formData);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Editar Sucursal</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA - Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la Sucursal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    // Si el slug no fue editado manualmente, generarlo automáticamente desde el nombre
                    if (!slugManuallyEdited) {
                      const autoSlug = generateSlug(newName);
                      setFormData({ ...formData, name: newName, slug: autoSlug });
                    } else {
                      setFormData({ ...formData, name: newName });
                    }
                  }}
                  placeholder="Ej: Sucursal Centro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.legal_name || ''}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {categories.length > 0 && formData.category && (
                  <p className="mt-1 text-xs text-gray-500">
                    {categories.find(c => c.name === formData.category)?.description || ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
                </label>
                <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
              Sitio Web
                </label>
                <input
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.website_url || ''}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
            />
          </div>

              {/* Mapa de selección de ubicación */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona la ubicación de la sucursal <span className="text-red-500">*</span>
                </label>
                <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
                  <LocationMapPicker
                    longitude={formData.longitude}
                    latitude={formData.latitude}
                    onLocationChange={handleLocationChange}
                    onValidationChange={(isValid, message) => {
                      setLocationValidation({ isValid, message: message || undefined });
                    }}
                  />
                </div>
                {selectedAddress && (
                  <p className="mt-2 text-sm text-gray-600">
                    <strong>Dirección detectada:</strong> {selectedAddress}
                  </p>
                )}
                {locationValidation.message && (
                  <p className={`mt-2 text-sm ${locationValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                    {locationValidation.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line1 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Calle y número"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line2 || ''}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código Postal
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.postal_code || ''}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se completa automáticamente al seleccionar en el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              {/* Campos de coordenadas (solo lectura, se actualizan desde el mapa) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.longitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitud
                </label>
                <input
                  type="number"
                  step="any"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  value={formData.latitude || ''}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se actualiza automáticamente desde el mapa
                </p>
              </div>
            </div>

            {/* Sección de gestión de marcas de vehículos */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Marcas de Vehículos Comercializadas</h3>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona las marcas de vehículos que esta sucursal comercializará. Solo podrás crear productos para las marcas seleccionadas.
              </p>

              {loadingBrands ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Cargando marcas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Marcas asignadas */}
                  {assignedBrands.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marcas Asignadas ({assignedBrands.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {assignedBrands.map((brand) => (
                          <span
                            key={brand.brand_id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-md text-sm font-medium"
                          >
                            {brand.brand_name}
                            <button
                              type="button"
                              onClick={() => handleRemoveBrand(brand.brand_id)}
                              disabled={managingBrands}
                              className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Quitar marca"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcas disponibles para agregar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agregar Marca
                    </label>
                    <select
                      className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={managingBrands || loadingBrands}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddBrand(e.target.value);
                          e.target.value = ''; // Resetear el select
                        }
                      }}
                      value=""
                    >
                      <option value="">Selecciona una marca para agregar...</option>
                      {availableBrands
                        .filter((brand) => !assignedBrands.some((ab) => ab.brand_id === brand.id))
                        .sort((a, b) => {
                          if (a.display_order !== b.display_order) {
                            return a.display_order - b.display_order;
                          }
                          return a.name.localeCompare(b.name);
                        })
                        .map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                    </select>
                    {availableBrands.filter((brand) => !assignedBrands.some((ab) => ab.brand_id === brand.id)).length === 0 && (
                      <p className="mt-2 text-sm text-gray-500">Todas las marcas disponibles ya están asignadas</p>
                    )}
                  </div>

                  {assignedBrands.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No hay marcas asignadas. Selecciona una marca del menú desplegable para comenzar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA - Configuración Adicional */}
          <div className="lg:col-span-1 space-y-6">
            {/* Configuración Adicional */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                Configuración
              </h3>

              {/* Slug */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Slug (URL amigable)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.slug || ''}
                  onChange={(e) => {
                    // Convertir a slug automáticamente (solo minúsculas, guiones, números)
                    const slugValue = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-')
                      .replace(/-+/g, '-')
                      .replace(/^-|-$/g, '');
                    setFormData({ ...formData, slug: slugValue });
                    // Marcar que el slug fue editado manualmente
                    setSlugManuallyEdited(true);
                  }}
                  placeholder="Se genera automáticamente"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {slugManuallyEdited 
                    ? 'El slug se mantendrá aunque cambies el nombre' 
                    : 'Identificador para el storefront (se genera desde el nombre)'}
                </p>
              </div>

              {/* Estado (is_active) */}
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Estado de la Sucursal
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active_edit"
                      checked={formData.is_active !== false}
                      onChange={() => setFormData({ ...formData, is_active: true })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Activa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="is_active_edit"
                      checked={formData.is_active === false}
                      onChange={() => setFormData({ ...formData, is_active: false })}
                      className="h-4 w-4 text-indigo-600 focus:ring-gray-400 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-600">Inactiva</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Las inactivas no aparecen en el storefront
                </p>
              </div>

              {/* Acepta recolección (pickup) */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.accepts_pickup || false}
                    onChange={(e) => setFormData({ ...formData, accepts_pickup: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  />
                  <span className="ml-2 text-sm text-gray-600">Acepta recolección</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  Los clientes pueden recoger en la sucursal
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

