import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import BrandingManager from '@/components/branding/BrandingManager';

export default function BrandingGlobalPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Personalización Tienda Global - AGORA Admin</title>
      </Head>

      <AdminLayout>
        <div className="flex h-full bg-gray-50">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <button
                    onClick={() => router.push('/settings')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 mb-3 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a Configuración
                  </button>
                  <h2 className="text-xl font-normal text-gray-900">Personalizacion</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Ajusta logos, colores y mensajes para la <strong>Tienda Global</strong>
                  </p>
                </div>
              </div>
              <BrandingManager type="global" id="global" name="Tienda global" />
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
