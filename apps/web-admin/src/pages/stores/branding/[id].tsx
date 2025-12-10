import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import BrandingManager from '@/components/branding/BrandingManager';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function BrandingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { id, type } = router.query;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadName = async () => {
      if (!token || !id || !type) return;

      setLoading(true);
      try {
        if (type === 'group') {
          const response = await apiRequest<{ name: string }>(
            `/businesses/groups/${id}`,
            { method: 'GET' }
          );
          setName(response.name || 'Grupo');
        } else {
          const response = await apiRequest<{ name: string }>(
            `/businesses/${id}`,
            { method: 'GET' }
          );
          setName(response.name || 'Sucursal');
        }
      } catch (error) {
        console.error('Error cargando nombre:', error);
        setName(type === 'group' ? 'Grupo' : 'Sucursal');
      } finally {
        setLoading(false);
      }
    };

    loadName();
  }, [token, id, type]);

  if (!id || !type) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-xs text-gray-600">Cargando...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Personalización - {name} - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="text-xs text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-xs text-gray-600">Cargando...</p>
            </div>
          ) : (
            <BrandingManager
              type={type as 'group' | 'business'}
              id={id as string}
              name={name}
            />
          )}
        </div>
      </AdminLayout>
    </>
  );
}

