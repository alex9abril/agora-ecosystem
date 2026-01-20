import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { vehiclesService, VehicleBrand, VehicleModel, VehicleYear, VehicleSpec, UserVehicle } from '@/lib/vehicles';
import { setUserVehicle, getUserVehicle } from '@/lib/storage';

export default function VehicleSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Datos de vehículos
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<VehicleYear[]>([]);
  const [specs, setSpecs] = useState<VehicleSpec[]>([]);
  
  // Vehículo seleccionado
  const [selectedVehicle, setSelectedVehicle] = useState<UserVehicle>({
    brand_id: '',
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar marcas
      const brandsData = await vehiclesService.getBrands();
      setBrands(brandsData);

      // Cargar vehículo guardado si existe
      const savedVehicle = getUserVehicle();
      if (savedVehicle) {
        setSelectedVehicle(savedVehicle);
        
        // Cargar modelos si hay marca seleccionada
        if (savedVehicle.brand_id) {
          const modelsData = await vehiclesService.getModelsByBrand(savedVehicle.brand_id);
          setModels(modelsData);
          
          // Cargar años si hay modelo seleccionado
          if (savedVehicle.model_id) {
            const yearsData = await vehiclesService.getYearsByModel(savedVehicle.model_id);
            setYears(yearsData);
            
            // Cargar especificaciones si hay año seleccionado
            if (savedVehicle.year_id) {
              const specsData = await vehiclesService.getSpecsByYear(savedVehicle.year_id);
              setSpecs(specsData);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = async (brandId: string) => {
    setSelectedVehicle({
      brand_id: brandId,
      brand_name: brands.find(b => b.id === brandId)?.name,
    });
    setModels([]);
    setYears([]);
    setSpecs([]);
    
    if (brandId) {
      try {
        const modelsData = await vehiclesService.getModelsByBrand(brandId);
        setModels(modelsData);
      } catch (err: any) {
        console.error('Error cargando modelos:', err);
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedVehicle({
      ...selectedVehicle,
      model_id: modelId,
      model_name: models.find(m => m.id === modelId)?.name,
    });
    setYears([]);
    setSpecs([]);
    
    if (modelId) {
      try {
        const yearsData = await vehiclesService.getYearsByModel(modelId);
        setYears(yearsData);
      } catch (err: any) {
        console.error('Error cargando años:', err);
      }
    }
  };

  const handleYearChange = async (yearId: string) => {
    const selectedYear = years.find(y => y.id === yearId);
    setSelectedVehicle({
      ...selectedVehicle,
      year_id: yearId,
      year_start: selectedYear?.year_start,
      year_end: selectedYear?.year_end || null,
      generation: selectedYear?.generation || null,
    });
    setSpecs([]);
    
    if (yearId) {
      try {
        const specsData = await vehiclesService.getSpecsByYear(yearId);
        setSpecs(specsData);
      } catch (err: any) {
        console.error('Error cargando especificaciones:', err);
      }
    }
  };

  const handleSpecChange = (specId: string) => {
    const selectedSpec = specs.find(s => s.id === specId);
    setSelectedVehicle({
      ...selectedVehicle,
      spec_id: specId,
      engine_code: selectedSpec?.engine_code || null,
      transmission_type: selectedSpec?.transmission_type || null,
    });
  };

  const handleSave = () => {
    if (!selectedVehicle.brand_id) {
      setError('Por favor selecciona al menos la marca del vehículo');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      // Guardar en localStorage
      setUserVehicle(selectedVehicle);
      
      // Mostrar mensaje de éxito
      alert('Vehículo guardado exitosamente. Los productos se filtrarán automáticamente por compatibilidad.');
      
      // Opcional: redirigir a productos
      // router.push('/products');
    } catch (err: any) {
      console.error('Error guardando vehículo:', err);
      setError('Error al guardar el vehículo');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (confirm('¿Estás seguro de que deseas eliminar tu vehículo? Los productos ya no se filtrarán por compatibilidad.')) {
      setSelectedVehicle({ brand_id: '' });
      setModels([]);
      setYears([]);
      setSpecs([]);
      // También limpiar de localStorage
      const { clearUserVehicle } = require('@/lib/storage');
      clearUserVehicle();
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
        <title>Mi Vehículo - AGORA Local</title>
      </Head>
      <LocalLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-normal text-gray-900 mb-2">Configuración</h1>
            <p className="text-sm text-gray-600">
              Gestiona la configuración de tu tienda y personal
            </p>
          </div>

          <div className="flex gap-6">
            {/* Sidebar: Categorías */}
            <SettingsSidebar />

            {/* Contenido principal */}
            <div className="flex-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Header */}
                <div className="mb-6">
            <h2 className="text-lg font-normal text-gray-900">Mi Vehículo</h2>
            <p className="mt-2 text-sm text-gray-600">
              Selecciona tu vehículo para ver solo productos compatibles
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Formulario de selección */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Marca */}
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Marca <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedVehicle.brand_id || ''}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Selecciona una marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modelo */}
            {selectedVehicle.brand_id && (
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  Modelo
                </label>
                <select
                  value={selectedVehicle.model_id || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecciona un modelo (opcional)</option>
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Año/Generación */}
            {selectedVehicle.model_id && (
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  Año/Generación
                </label>
                <select
                  value={selectedVehicle.year_id || ''}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecciona un año (opcional)</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_start}
                      {year.year_end ? ` - ${year.year_end}` : '+'}
                      {year.generation ? ` (${year.generation})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Especificaciones (Motor/Transmisión) */}
            {selectedVehicle.year_id && specs.length > 0 && (
              <div>
                <label className="block text-sm font-normal text-gray-700 mb-2">
                  Motor/Transmisión (Opcional)
                </label>
                <select
                  value={selectedVehicle.spec_id || ''}
                  onChange={(e) => handleSpecChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecciona especificación (opcional)</option>
                  {specs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.engine_code || 'Motor'}
                      {spec.engine_displacement ? ` ${spec.engine_displacement}` : ''}
                      {spec.transmission_type ? ` - ${spec.transmission_type}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Información del vehículo seleccionado */}
            {selectedVehicle.brand_id && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="text-sm font-normal text-gray-700 mb-2">Vehículo Seleccionado:</h3>
                <p className="text-sm text-gray-600">
                  {selectedVehicle.brand_name}
                  {selectedVehicle.model_name && ` ${selectedVehicle.model_name}`}
                  {selectedVehicle.year_start && ` ${selectedVehicle.year_start}`}
                  {selectedVehicle.engine_code && ` - Motor: ${selectedVehicle.engine_code}`}
                  {selectedVehicle.transmission_type && ` - Transmisión: ${selectedVehicle.transmission_type}`}
                </p>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSave}
                disabled={saving || !selectedVehicle.brand_id}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Vehículo'}
              </button>
              {selectedVehicle.brand_id && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-normal text-blue-900 mb-2">💡 Información</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Al seleccionar tu vehículo, los productos se filtrarán automáticamente por compatibilidad</li>
              <li>Puedes seleccionar solo la marca, o ser más específico con modelo, año y motor</li>
              <li>Mientras más específico seas, más precisos serán los resultados</li>
              <li>Puedes cambiar o eliminar tu vehículo en cualquier momento</li>
            </ul>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

