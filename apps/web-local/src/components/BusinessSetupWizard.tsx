import { useState, useEffect } from 'react';
import { businessService, CreateBusinessData, BusinessCategory, ServiceRegion } from '@/lib/business';
import { useAuth } from '@/contexts/AuthContext';
import LocationMapPicker from './LocationMapPicker';

interface BusinessSetupWizardProps {
  onComplete: () => void;
}

export default function BusinessSetupWizard({ onComplete }: BusinessSetupWizardProps) {
  const { refreshUser, user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [region, setRegion] = useState<ServiceRegion | null>(null);
  const [locationValid, setLocationValid] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  // Cargar categorías y región desde el backend
  useEffect(() => {
    const loadData = async () => {
      // Cargar categorías
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

      // Cargar región activa
      try {
        const activeRegion = await businessService.getActiveRegion();
        if (activeRegion) {
          setRegion(activeRegion);
          // Actualizar coordenadas por defecto al centro de la región
          setFormData(prev => ({
            ...prev,
            longitude: activeRegion.center_longitude,
            latitude: activeRegion.center_latitude,
          }));
        }
      } catch (err) {
        console.error('Error cargando región:', err);
      }
    };

    loadData();
  }, []);
  
  const [formData, setFormData] = useState<CreateBusinessData>({
    name: '',
    legal_name: '',
    description: '',
    category: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'México',
    longitude: -99.1600, // CDMX por defecto
    latitude: 19.4220,
    uses_eco_packaging: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name || !formData.category) {
        setError('Por favor completa todos los campos obligatorios');
        return;
      }
    }
    if (step === 2) {
      if (!locationValid) {
        setError('Por favor selecciona una ubicación dentro de la zona de cobertura (La Roma)');
        return;
      }
      if (!formData.address_line1 || !formData.city) {
        setError('Por favor completa la dirección');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const handleLocationChange = (lng: number, lat: number, address: string, addressComponents?: {
    street_number?: string;
    route?: string;
    sublocality?: string;
    locality?: string;
    administrative_area_level_1?: string;
    postal_code?: string;
    country?: string;
  }) => {
    // Construir dirección completa (calle y número)
    const streetAddress = address || 
      [addressComponents?.street_number, addressComponents?.route]
        .filter(Boolean)
        .join(' ') || '';

    setFormData(prev => ({
      ...prev,
      longitude: lng,
      latitude: lat,
      // Solo actualizar dirección si hay datos nuevos (no limpiar si viene vacío)
      // Esto permite que el usuario ingrese la dirección manualmente cuando el geocoding falla
      address_line1: streetAddress || prev.address_line1,
      // Solo actualizar si hay datos nuevos
      address_line2: addressComponents?.sublocality || prev.address_line2,
      city: addressComponents?.locality || prev.city,
      state: addressComponents?.administrative_area_level_1 || prev.state,
      postal_code: addressComponents?.postal_code || prev.postal_code,
    }));
    
    // Solo actualizar selectedAddress si hay una dirección
    if (address || streetAddress) {
      setSelectedAddress(address || streetAddress);
    }
    
    console.log('[BusinessSetupWizard] Dirección actualizada:', {
      address,
      addressComponents,
      streetAddress,
      hasAddress: !!(address || streetAddress),
      formData: {
        address_line1: streetAddress || 'mantener valor anterior',
        address_line2: addressComponents?.sublocality || 'mantener valor anterior',
        city: addressComponents?.locality || 'mantener valor anterior',
        state: addressComponents?.administrative_area_level_1 || 'mantener valor anterior',
        postal_code: addressComponents?.postal_code || 'mantener valor anterior',
      },
    });
  };

  const handleValidationChange = (isValid: boolean, message?: string) => {
    setLocationValid(isValid);
    if (!isValid && message) {
      // No mostrar error aquí, solo actualizar el estado
      // El error se mostrará cuando intenten avanzar
    }
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Preparar datos para enviar
      // Si el email del formulario está vacío, usar el email del usuario autenticado
      // Si ambos están vacíos, no incluir el campo para evitar validación de email vacío
      const emailValue = formData.email?.trim();
      const finalEmail = emailValue || user?.email;

      // Crear objeto sin el campo email si está vacío (para que no se valide)
      const dataToSend: CreateBusinessData = {
        name: formData.name,
        legal_name: formData.legal_name,
        description: formData.description,
        category: formData.category,
        phone: formData.phone,
        // Solo incluir email si tiene un valor válido
        ...(finalEmail ? { email: finalEmail } : {}),
        longitude: formData.longitude,
        latitude: formData.latitude,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postal_code,
        country: formData.country,
        uses_eco_packaging: formData.uses_eco_packaging,
      };

      console.log('[BusinessSetupWizard] Enviando datos:', {
        ...dataToSend,
        email: dataToSend.email || 'no enviado (opcional)',
        userEmail: user?.email || 'no disponible',
      });

      await businessService.createBusiness(dataToSend);
      await refreshUser();
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Error al crear la tienda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Configurar tu Tienda
            </h2>
            <p className="text-sm text-gray-600">
              Paso {step} de 3: {step === 1 ? 'Información Básica' : step === 2 ? 'Ubicación' : 'Confirmación'}
            </p>
            {/* Progress bar */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Step 1: Información Básica */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Negocio <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Restaurante La Roma"
                />
              </div>

              <div>
                <label htmlFor="legal_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Razón Social (opcional)
                </label>
                <input
                  id="legal_name"
                  name="legal_name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.legal_name}
                  onChange={handleChange}
                  placeholder="Ej: Restaurante La Roma S.A. de C.V."
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">{loadingCategories ? 'Cargando categorías...' : 'Selecciona una categoría'}</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe tu negocio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+525555555555"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contacto@tienda.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Ubicación */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecciona la ubicación de tu negocio <span className="text-red-500">*</span>
                </label>
                <LocationMapPicker
                  longitude={formData.longitude}
                  latitude={formData.latitude}
                  onLocationChange={handleLocationChange}
                  onValidationChange={handleValidationChange}
                />
              </div>

              <div>
                <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                  Calle y Número <span className="text-red-500">*</span>
                </label>
                <input
                  id="address_line1"
                  name="address_line1"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line1}
                  onChange={handleChange}
                  placeholder="Ej: Avenida Álvaro Obregón 45"
                />
                {selectedAddress && (
                  <p className="mt-1 text-xs text-gray-500">
                    Dirección detectada: {selectedAddress}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                  Colonia/Barrio
                </label>
                <input
                  id="address_line2"
                  name="address_line2"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.address_line2}
                  onChange={handleChange}
                  placeholder="Ej: Roma Norte"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Ciudad de México"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="CDMX"
                  />
                </div>
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    id="postal_code"
                    name="postal_code"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.postal_code}
                    onChange={handleChange}
                    placeholder="06700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmación */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4 space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">Resumen de tu Tienda</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Nombre:</span>
                    <p className="font-medium text-gray-900">{formData.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Categoría:</span>
                    <p className="font-medium text-gray-900">{formData.category}</p>
                  </div>
                  {formData.phone && (
                    <div>
                      <span className="text-gray-600">Teléfono:</span>
                      <p className="font-medium text-gray-900">{formData.phone}</p>
                    </div>
                  )}
                  {formData.email && (
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">{formData.email}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-600">Dirección:</span>
                    <p className="font-medium text-gray-900">
                      {formData.address_line1}
                      {formData.address_line2 && `, ${formData.address_line2}`}
                      {formData.city && `, ${formData.city}`}
                      {formData.state && `, ${formData.state}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="uses_eco_packaging"
                  name="uses_eco_packaging"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={formData.uses_eco_packaging}
                  onChange={handleChange}
                />
                <label htmlFor="uses_eco_packaging" className="ml-2 block text-sm text-gray-900">
                  Usar empaques ecológicos
                </label>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando...' : 'Crear Tienda'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

