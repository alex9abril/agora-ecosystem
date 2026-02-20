import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import BrandingManager from '@/components/branding/BrandingManager';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleBrand {
  id: string;
  name: string;
  code: string;
  display_order: number;
  is_active: boolean;
}

export default function BrandingBrandsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<VehicleBrand | null>(null);

  useEffect(() => {
    const loadBrands = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await apiRequest<VehicleBrand[]>('/catalog/vehicles/brands', { method: 'GET' });
        setBrands(Array.isArray(response) ? response : (response as any)?.data ?? []);
      } catch (error) {
        console.error('Error cargando marcas:', error);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, [token]);

  return (
    <>
      <Head>
        <title>Personalización por Marca - AGORA Admin</title>
      </Head>

      <AdminLayout>
        <div className="flex h-full bg-gray-50">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {selectedBrand ? (
                <>
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <button
                        onClick={() => setSelectedBrand(null)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver a marcas
                      </button>
                      <h2 className="text-xl font-normal text-gray-900">Personalizacion</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Ajusta logos, colores y mensajes para la marca: <strong>{selectedBrand.name}</strong>
                      </p>
                    </div>
                  </div>
                  <BrandingManager
                    type="brand"
                    id={selectedBrand.id}
                    name={selectedBrand.name}
                  />
                </>
              ) : (
                <>
                  <div className="mb-8">
                    <h1 className="text-xl font-normal text-gray-900 mb-2">Personalización por Marca</h1>
                    <p className="text-sm text-gray-600">
                      Elige una marca para configurar la tienda por marca (logos, colores, textos).
                    </p>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : brands.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-sm text-gray-600">
                      No hay marcas de vehículos registradas.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {brands.map((brand) => (
                        <div
                          key={brand.id}
                          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between shadow-sm"
                        >
                          <span className="font-medium text-gray-900">{brand.name}</span>
                          <button
                            onClick={() => setSelectedBrand(brand)}
                            className="px-3 py-1.5 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            Personalización
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
