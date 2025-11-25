import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  phone_verified: boolean;
  profile_image_url?: string;
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
  auth_created_at: string;
  last_sign_in_at?: string;
  confirmed_at?: string;
  total_orders: number;
  total_spent: number;
  completed_orders: number;
  cancelled_orders: number;
  avg_rating_given: number;
  total_reviews_given: number;
}

export default function ClientDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClient = async () => {
      if (!token || !id || typeof id !== 'string') return;

      setLoading(true);
      try {
        const response = await apiRequest<Client>(`/clients/${id}`, {
          method: 'GET',
        });
        setClient(response);
      } catch (error) {
        console.error('Error cargando cliente:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [token, id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-xs text-gray-600">Cargando información del cliente...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-xs text-gray-600">Cliente no encontrado</p>
            <button
              onClick={() => router.push('/clients')}
              className="mt-4 text-xs text-indigo-600 hover:text-indigo-800"
            >
              Volver a clientes
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>
          {client.first_name} {client.last_name} - LOCALIA Admin
        </title>
      </Head>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header con botón de volver */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/clients')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-normal text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Detalle del cliente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda: Información personal */}
            <div className="lg:col-span-1 space-y-4">
              {/* Foto del cliente */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-col items-center">
                  {client.profile_image_url ? (
                    <img
                      src={client.profile_image_url}
                      alt={`${client.first_name} ${client.last_name}`}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div className="mt-4 text-center">
                    <h2 className="text-sm font-normal text-gray-900">
                      {client.first_name} {client.last_name}
                    </h2>
                    {client.email && (
                      <p className="text-xs text-gray-500 mt-1">{client.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Información personal */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="text-xs font-normal text-gray-900">Información Personal</h3>
                
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-gray-900">
                      {client.phone || 'No disponible'}
                    </p>
                    {client.phone_verified && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">
                        ✓ Verificado
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {client.email || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  <div className="mt-1 flex flex-col gap-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full w-fit ${
                        client.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {client.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {client.is_blocked && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full w-fit bg-red-100 text-red-800">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Fecha de Registro</p>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {formatDate(client.created_at)}
                  </p>
                </div>

                {client.last_sign_in_at && (
                  <div>
                    <p className="text-xs text-gray-500">Último Acceso</p>
                    <p className="text-xs text-gray-900 mt-0.5">
                      {formatDate(client.last_sign_in_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Métricas */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="text-xs font-normal text-gray-900">Métricas</h3>
                
                <div>
                  <p className="text-xs text-gray-500">Total de Pedidos</p>
                  <p className="text-sm font-normal text-gray-900 mt-0.5">
                    {client.total_orders}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Pedidos Completados</p>
                  <p className="text-sm font-normal text-gray-900 mt-0.5">
                    {client.completed_orders}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Pedidos Cancelados</p>
                  <p className="text-sm font-normal text-gray-900 mt-0.5">
                    {client.cancelled_orders}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Total Gastado</p>
                  <p className="text-sm font-normal text-gray-900 mt-0.5">
                    {formatCurrency(client.total_spent)}
                  </p>
                </div>

                {client.total_reviews_given > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Reseñas Realizadas</p>
                    <p className="text-sm font-normal text-gray-900 mt-0.5">
                      {client.total_reviews_given} reseñas
                    </p>
                    {client.avg_rating_given > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.round(client.avg_rating_given)
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-xs text-gray-600 ml-0.5">
                          {client.avg_rating_given.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: Resumen de actividad (placeholder para futuras implementaciones) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-xs font-normal text-gray-900 mb-4">Resumen de Actividad</h3>
                <p className="text-xs text-gray-500">
                  Esta sección mostrará un resumen de pedidos y actividad del cliente.
                  (Por implementar)
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

