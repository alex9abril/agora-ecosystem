import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import SettingsSidebar from '@/components/settings/SettingsSidebar';

export default function PermissionsSettingsPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Grupos de Permisos - LOCALIA Local</title>
      </Head>
      <LocalLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-normal text-gray-900 mb-2">Configuración</h1>
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
                  <h2 className="text-xl font-semibold text-gray-900">Grupos de Permisos</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Administra tus grupos de permisos y los permisos
                  </p>
                </div>

                {/* Permissions Info */}
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
          </div>
        </div>
      </LocalLayout>
    </>
  );
}

