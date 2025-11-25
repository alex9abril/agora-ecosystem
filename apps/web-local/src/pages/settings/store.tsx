import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { businessService, Business } from '@/lib/business';
import LocationMapPicker from '@/components/LocationMapPicker';

interface AddressComponents {
  street_number?: string;
  route?: string;
  sublocality?: string;
  locality?: string;
  administrative_area_level_1?: string;
  postal_code?: string;
  country?: string;
}

export default function StoreSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAddress, setPendingAddress] = useState<{
    longitude: number;
    latitude: number;
    address: string;
    addressComponents?: AddressComponents;
  } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    description: '',
    category: '',
    phone: '',
    email: '',
    website_url: '',
  });
  const [locationValidation, setLocationValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  const { selectedBusiness } = useSelectedBusiness();

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        setLoading(true);
        // Usar la tienda seleccionada si está disponible
        const businessId = selectedBusiness?.business_id;
        const businessData = await businessService.getMyBusiness(businessId);
        setBusiness(businessData);
        
        // Inicializar formData con los datos del negocio
        if (businessData) {
          setFormData({
            name: businessData.name || '',
            legal_name: businessData.legal_name || '',
            description: businessData.description || '',
            category: businessData.category || '',
            phone: businessData.phone || '',
            email: businessData.email || '',
            website_url: businessData.website_url || '',
          });
        }
        
        // Verificar si el usuario es superadmin
        if (businessData && businessData.user_role === 'superadmin') {
          setIsSuperadmin(true);
        } else {
          // Si no es superadmin, redirigir a la página principal
          console.log('[StoreSettings] Usuario no es superadmin, redirigiendo...');
          router.push('/');
        }
      } catch (err: any) {
        console.error('Error cargando negocio:', err);
        if (err?.statusCode === 404) {
          router.push('/');
        } else {
          setError('Error al cargar la información de la tienda');
        }
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [router, selectedBusiness?.business_id]);


  const handleLocationChange = (
    longitude: number,
    latitude: number,
    address: string,
    addressComponents?: AddressComponents
  ) => {
    if (isEditingAddress) {
      setPendingAddress({ longitude, latitude, address, addressComponents });
    }
  };

  const handleSaveAddress = async () => {
    if (!pendingAddress || !business) return;

    try {
      setSavingAddress(true);
      
      // Construir address_line1 desde los componentes
      let address_line1 = '';
      if (pendingAddress.addressComponents) {
        const comp = pendingAddress.addressComponents;
        const streetNumber = comp.street_number || '';
        const route = comp.route || '';
        address_line1 = `${route} ${streetNumber}`.trim();
      } else {
        // Si no hay componentes, usar la dirección completa
        address_line1 = pendingAddress.address;
      }

      const updatedBusiness = await businessService.updateAddress(business.id, {
        longitude: pendingAddress.longitude,
        latitude: pendingAddress.latitude,
        address_line1: address_line1 || undefined,
        address_line2: pendingAddress.addressComponents?.sublocality || undefined,
        city: pendingAddress.addressComponents?.locality || undefined,
        state: pendingAddress.addressComponents?.administrative_area_level_1 || undefined,
        postal_code: pendingAddress.addressComponents?.postal_code || undefined,
        country: pendingAddress.addressComponents?.country || 'México',
      });

      console.log('[StoreSettings] Negocio actualizado recibido:', {
        updatedBusiness,
        location: updatedBusiness.location,
        longitude: updatedBusiness.location?.longitude,
        latitude: updatedBusiness.location?.latitude,
        business_address: updatedBusiness.business_address,
      });

      // Siempre recargar desde el servidor para obtener todos los datos actualizados
      // incluyendo business_address y otros campos relacionados
      const reloadedBusiness = await businessService.getMyBusiness();
      console.log('[StoreSettings] Negocio recargado:', {
        reloadedBusiness,
        business_address: reloadedBusiness?.business_address,
        location: reloadedBusiness?.location,
      });
      setBusiness(reloadedBusiness);
      
      // Cerrar modales y resetear estados
      setShowConfirmModal(false);
      setIsEditingAddress(false);
      setPendingAddress(null);
    } catch (err: any) {
      console.error('Error actualizando dirección:', err);
      alert('Error al actualizar la dirección. Por favor, intenta de nuevo.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    setPendingAddress(null);
    setShowConfirmModal(false);
  };

  const handleConfirmEdit = () => {
    if (pendingAddress) {
      setShowConfirmModal(true);
    }
  };

  const handleBusinessEdit = () => {
    setIsEditingBusiness(true);
  };

  const handleBusinessCancel = () => {
    // Restaurar valores originales
    if (business) {
      setFormData({
        name: business.name || '',
        legal_name: business.legal_name || '',
        description: business.description || '',
        category: business.category || '',
        phone: business.phone || '',
        email: business.email || '',
        website_url: business.website_url || '',
      });
    }
    setIsEditingBusiness(false);
  };

  const handleBusinessSave = async () => {
    if (!business) return;

    try {
      setSavingBusiness(true);
      
      await businessService.updateBusiness(business.id, {
        name: formData.name,
        legal_name: formData.legal_name || undefined,
        description: formData.description || undefined,
        // category no se envía porque no es editable
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        website_url: formData.website_url || undefined,
      });

      // Recargar el negocio para obtener los datos actualizados
      const reloadedBusiness = await businessService.getMyBusiness();
      setBusiness(reloadedBusiness);
      
      // Actualizar formData con los nuevos valores
      if (reloadedBusiness) {
        setFormData({
          name: reloadedBusiness.name || '',
          legal_name: reloadedBusiness.legal_name || '',
          description: reloadedBusiness.description || '',
          category: reloadedBusiness.category || '',
          phone: reloadedBusiness.phone || '',
          email: reloadedBusiness.email || '',
          website_url: reloadedBusiness.website_url || '',
        });
      }
      
      setIsEditingBusiness(false);
    } catch (err: any) {
      console.error('Error actualizando negocio:', err);
      alert('Error al actualizar la información. Por favor, intenta de nuevo.');
    } finally {
      setSavingBusiness(false);
    }
  };

  // Log de diagnóstico en el frontend (debe estar antes de cualquier return condicional)
  useEffect(() => {
    if (business) {
      console.log('[StoreSettings] Coordenadas del negocio:', {
        business_location: business.location,
        longitude: business.location?.longitude,
        latitude: business.location?.latitude,
        business_address: business.business_address,
      });
    }
  }, [business]);

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </LocalLayout>
    );
  }

  // Si no es superadmin, no mostrar nada (ya se redirigió en useEffect)
  if (!isSuperadmin) {
    return null;
  }

  if (error || !business) {
    return (
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'No se encontró información de la tienda'}</p>
          </div>
        </div>
      </LocalLayout>
    );
  }

  const currentLongitude = business.location?.longitude || -99.1600;
  const currentLatitude = business.location?.latitude || 19.4220;

  console.log('[StoreSettings] Coordenadas para el mapa:', {
    currentLongitude,
    currentLatitude,
    business_location: business.location,
  });

  return (
    <>
      <Head>
        <title>Configuración de Tienda - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver a Configuración
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Configuración de Tienda</h1>
            <p className="mt-2 text-sm text-gray-600">
              Gestiona la información básica de tu tienda
            </p>
          </div>

          {/* Store Information Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Información de la Tienda</h2>
            
            {!isEditingBusiness ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Tienda
                    </label>
                    <p className="text-gray-900">{business.name}</p>
                  </div>

                  {business.legal_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Legal
                      </label>
                      <p className="text-gray-900">{business.legal_name}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <p className="text-gray-900">{business.category}</p>
                  </div>

                  {business.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900">{business.email}</p>
                    </div>
                  )}

                  {business.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <p className="text-gray-900">{business.phone}</p>
                    </div>
                  )}

                  {business.description && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción
                      </label>
                      <p className="text-gray-900">{business.description}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {business.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verificación
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.is_verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {business.is_verified ? 'Verificada' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleBusinessEdit}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Editar Información
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Tienda *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Legal
                    </label>
                    <input
                      type="text"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sitio Web
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="https://ejemplo.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Describe tu negocio..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {business.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verificación
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        business.is_verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {business.is_verified ? 'Verificada' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-end gap-3">
                  <button
                    onClick={handleBusinessCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={savingBusiness}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBusinessSave}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    disabled={savingBusiness || !formData.name}
                  >
                    {savingBusiness ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                      </span>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Dirección de la Tienda</h2>
              {!isEditingAddress && (
                <button
                  onClick={() => setIsEditingAddress(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  Modificar Dirección
                </button>
              )}
            </div>

            {!isEditingAddress ? (
              <>
                {/* Display current address */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección Actual
                  </label>
                  <p className="text-gray-900">
                    {business.business_address || 'Sin dirección registrada'}
                  </p>
                </div>

                {/* Display map (read-only) */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación en el Mapa
                  </label>
                  <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200">
                    <LocationMapPicker
                      longitude={currentLongitude}
                      latitude={currentLatitude}
                      onLocationChange={() => {}}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Edit mode */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Dirección
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Mueve el marcador en el mapa para seleccionar la nueva ubicación. La dirección se actualizará automáticamente.
                  </p>
                  {pendingAddress && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>Nueva dirección:</strong> {pendingAddress.address}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mensaje de validación de zona */}
                {locationValidation && (
                  <div className={`mt-4 mb-4 p-3 rounded-lg border ${
                    locationValidation.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      locationValidation.isValid 
                        ? 'text-green-800' 
                        : 'text-red-800'
                    }`}>
                      {locationValidation.message}
                    </p>
                  </div>
                )}

                {/* Editable map */}
                <div className="mt-4 mb-6">
                  <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-200">
                    <LocationMapPicker
                      longitude={pendingAddress?.longitude || currentLongitude}
                      latitude={pendingAddress?.latitude || currentLatitude}
                      onLocationChange={handleLocationChange}
                      onValidationChange={(isValid, message) => {
                        setLocationValidation({ isValid, message });
                      }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={savingAddress}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmEdit}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    disabled={!pendingAddress || savingAddress}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirmar Cambio de Dirección
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que deseas cambiar la dirección de la tienda?
              </p>
              {pendingAddress && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Nueva dirección:</strong>
                  </p>
                  <p className="text-sm text-gray-900 mt-1">{pendingAddress.address}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={savingAddress}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  disabled={savingAddress}
                >
                  {savingAddress ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </LocalLayout>
    </>
  );
}
