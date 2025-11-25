import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Repartidor {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_description?: string;
  license_plate?: string;
  is_available: boolean;
  is_verified: boolean;
  is_active: boolean;
  is_green_repartidor: boolean;
  total_deliveries: number;
  rating_average: number | string | null;
  total_reviews: number;
  longitude?: number;
  latitude?: number;
  last_location_update?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    profile_image_url?: string;
  };
}

interface TimelineActivity {
  type: 'delivery' | 'review' | 'tip';
  id: string;
  order_id: string;
  timestamp: string;
  data: any;
}

interface Timeline {
  today: TimelineActivity[];
  lastWeek: TimelineActivity[];
  lastMonth: TimelineActivity[];
  older: TimelineActivity[];
}

export default function DeliveryDriverDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();
  const [repartidor, setRepartidor] = useState<Repartidor | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [repartidorData, timelineData] = await Promise.all([
          apiRequest<Repartidor>(`/repartidores/${id}`, { method: 'GET' }),
          apiRequest<Timeline>(`/repartidores/${id}/timeline`, { method: 'GET' }),
        ]);
        setRepartidor(repartidorData);
        setTimeline(timelineData);
      } catch (error) {
        console.error('Error cargando datos del repartidor:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, token]);

  const getVehicleTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      bicycle: 'Bicicleta',
      motorcycle: 'Motocicleta',
      car: 'Automóvil',
      scooter: 'Scooter',
      electric: 'Eléctrico',
      electric_motorcycle: 'Motocicleta Eléctrica',
      electric_scooter: 'Scooter Eléctrico',
      hybrid_motorcycle: 'Motocicleta Híbrida',
      traditional_motorcycle: 'Motocicleta Tradicional',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderActivityItem = (activity: TimelineActivity) => {
    switch (activity.type) {
      case 'delivery':
        return (
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900">
                <span className="font-normal">Entrega completada</span> - {activity.data.business_name}
              </p>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                {activity.data.distance_km && (
                  <span>Distancia: {Number(activity.data.distance_km).toFixed(2)} km</span>
                )}
                {activity.data.actual_time_minutes && (
                  <span>Tiempo: {activity.data.actual_time_minutes} min</span>
                )}
                {activity.data.delivery_fee && (
                  <span>Envío: ${Number(activity.data.delivery_fee).toFixed(2)}</span>
                )}
                {activity.data.tip_amount > 0 && (
                  <span className="text-green-600">Propina: ${Number(activity.data.tip_amount).toFixed(2)}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
            </div>
          </div>
        );
      case 'review':
        return (
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900">
                <span className="font-normal">Reseña recibida</span> de {activity.data.reviewer_name}
              </p>
              <div className="mt-1 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${
                      i < activity.data.rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs text-gray-600 ml-1">{activity.data.rating}/5</span>
              </div>
              {activity.data.comment && (
                <p className="text-xs text-gray-600 mt-1 italic">"{activity.data.comment}"</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
            </div>
          </div>
        );
      case 'tip':
        return (
          <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-900">
                <span className="font-normal">Propina recibida</span> de {activity.data.client_name}
              </p>
              <p className="text-xs text-green-600 font-normal mt-1">
                ${Number(activity.data.amount).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-xs text-gray-600">Cargando información del repartidor...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!repartidor) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-xs text-gray-600">Repartidor no encontrado</p>
            <button
              onClick={() => router.push('/delivery-drivers')}
              className="mt-4 text-xs text-indigo-600 hover:text-indigo-800"
            >
              Volver a repartidores
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
          {repartidor.user?.first_name} {repartidor.user?.last_name} - LOCALIA Admin
        </title>
      </Head>

      <AdminLayout>
        <div className="space-y-6">
          {/* Header con botón de volver */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/delivery-drivers')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-sm font-normal text-gray-900">
              {repartidor.user?.first_name} {repartidor.user?.last_name}
            </h1>
          </div>

          {/* Contenido en dos columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Columna izquierda - Datos personales (más angosta) */}
            <div className="lg:col-span-1 space-y-4">
              {/* Foto del repartidor */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex flex-col items-center">
                  {repartidor.user?.profile_image_url ? (
                    <img
                      src={repartidor.user.profile_image_url}
                      alt={`${repartidor.user.first_name} ${repartidor.user.last_name}`}
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
                      {repartidor.user?.first_name} {repartidor.user?.last_name}
                    </h2>
                    {repartidor.is_verified && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>Verificado</title>
                          <path
                            fillRule="evenodd"
                            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-xs text-blue-600">Verificado</span>
                      </div>
                    )}
                    {repartidor.rating_average != null && repartidor.total_reviews > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.round(Number(repartidor.rating_average))
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
                          {Number(repartidor.rating_average).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400 ml-0.5">
                          ({repartidor.total_reviews})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos personales */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                <h3 className="text-xs font-normal text-gray-900">Información Personal</h3>
                
                <div>
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {repartidor.user?.phone || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Vehículo</p>
                  <p className="text-xs text-gray-900 mt-0.5">
                    {getVehicleTypeLabel(repartidor.vehicle_type)}
                  </p>
                  {repartidor.vehicle_description && (
                    <p className="text-xs text-gray-500 mt-0.5">{repartidor.vehicle_description}</p>
                  )}
                  {repartidor.license_plate && (
                    <p className="text-xs text-gray-500 mt-0.5">Placa: {repartidor.license_plate}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500">Estado</p>
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          repartidor.is_available && repartidor.is_active
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                        }`}
                      ></div>
                      <span className="text-xs text-gray-900">
                        {repartidor.is_available && repartidor.is_active ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {repartidor.is_green_repartidor && (
                      <span className="inline-flex px-2 py-1 text-xs rounded-full w-fit bg-green-100 text-green-800">
                        🌱 Ecológico
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Métricas</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-gray-900">
                      Entregas: <span className="font-normal">{repartidor.total_deliveries || 0}</span>
                    </p>
                    <p className="text-xs text-gray-900">
                      Calificación: <span className="font-normal">
                        {repartidor.rating_average != null
                          ? Number(repartidor.rating_average).toFixed(1)
                          : '0.0'}
                      </span>
                      <span className="text-gray-400 ml-1">
                        ({repartidor.total_reviews || 0} reseñas)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Última ubicación con mapa */}
              {repartidor.latitude && repartidor.longitude && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                  <h3 className="text-xs font-normal text-gray-900">Última Ubicación</h3>
                  {repartidor.last_location_update && (
                    <p className="text-xs text-gray-500">
                      Actualizada: {formatTime(repartidor.last_location_update)}
                    </p>
                  )}
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      width="100%"
                      height="200"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(repartidor.longitude) - 0.002},${Number(repartidor.latitude) - 0.002},${Number(repartidor.longitude) + 0.002},${Number(repartidor.latitude) + 0.002}&layer=mapnik&marker=${repartidor.latitude},${repartidor.longitude}`}
                      allowFullScreen
                    ></iframe>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${repartidor.latitude},${repartidor.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Abrir en Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Columna derecha - Timeline (más ancha) */}
            <div className="lg:col-span-3 space-y-6">
              <h2 className="text-sm font-normal text-gray-900">Timeline de Actividad</h2>

              {/* Hoy */}
              {timeline && timeline.today.length > 0 && (
                <div>
                  <h3 className="text-xs font-normal text-gray-700 mb-3">Hoy</h3>
                  <div className="space-y-2">
                    {timeline.today.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`}>
                        {renderActivityItem(activity)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Última semana */}
              {timeline && timeline.lastWeek.length > 0 && (
                <div>
                  <h3 className="text-xs font-normal text-gray-700 mb-3">Última Semana</h3>
                  <div className="space-y-2">
                    {timeline.lastWeek.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`}>
                        {renderActivityItem(activity)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Último mes */}
              {timeline && timeline.lastMonth.length > 0 && (
                <div>
                  <h3 className="text-xs font-normal text-gray-700 mb-3">Último Mes</h3>
                  <div className="space-y-2">
                    {timeline.lastMonth.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`}>
                        {renderActivityItem(activity)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resto del tiempo */}
              {timeline && timeline.older.length > 0 && (
                <div>
                  <h3 className="text-xs font-normal text-gray-700 mb-3">Anterior</h3>
                  <div className="space-y-2">
                    {timeline.older.map((activity) => (
                      <div key={`${activity.type}-${activity.id}`}>
                        {renderActivityItem(activity)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sin actividad */}
              {timeline &&
                timeline.today.length === 0 &&
                timeline.lastWeek.length === 0 &&
                timeline.lastMonth.length === 0 &&
                timeline.older.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-xs text-gray-500">No hay actividad registrada</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

