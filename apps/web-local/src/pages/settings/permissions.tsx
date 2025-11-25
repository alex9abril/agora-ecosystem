import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';

export default function PermissionsSettingsPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Grupos de Permisos - LOCALIA Local</title>
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
            <h1 className="text-3xl font-bold text-gray-900">Grupos de Permisos</h1>
            <p className="mt-2 text-sm text-gray-600">
              Administra tus grupos de permisos y los permisos
            </p>
          </div>

          {/* Permissions Info */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="text-center py-12">
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Grupos de Permisos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Esta funcionalidad estará disponible próximamente.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Los permisos actualmente se gestionan a través de los roles de negocio.
              </p>
            </div>
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

