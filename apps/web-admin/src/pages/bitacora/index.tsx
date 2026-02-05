import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/api';

type OrderLogSummary = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  total_amount: number | string;
  business_name: string | null;
  client_email: string | null;
  logs_count: number | string;
  last_log_at: string | null;
};

type IntegrationLog = {
  id: string;
  business_id: string | null;
  user_id: string | null;
  order_id: string | null;
  integration: string;
  event_type: string;
  channel: string | null;
  status: string;
  message: string | null;
  error_message: string | null;
  request_payload: any;
  response_payload: any;
  metadata: any;
  created_at: string;
};

export default function BitacoraPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderLogSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const response = await apiRequest<OrderLogSummary[]>('/orders/logs');
        setOrders(response || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar la bitácora.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setLogs([]);
      return;
    }

    const loadLogs = async () => {
      try {
        setLogsLoading(true);
        const response = await apiRequest<IntegrationLog[]>(`/orders/${selectedOrderId}/logs`);
        setLogs(response || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudieron cargar los logs del pedido.');
      } finally {
        setLogsLoading(false);
      }
    };

    loadLogs();
  }, [selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return { label: 'Éxito', className: 'bg-green-100 text-green-700 border-green-200', icon: '✅' };
      case 'failed':
        return { label: 'Error', className: 'bg-red-100 text-red-700 border-red-200', icon: '❌' };
      case 'skipped':
        return { label: 'Omitido', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⚠️' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200', icon: 'ℹ️' };
    }
  };

  const getIntegrationBadge = (integration: string) => {
    const normalized = integration.toLowerCase();
    if (normalized.includes('karlopay')) return { label: 'Karlopay', className: 'bg-blue-100 text-blue-700' };
    if (normalized.includes('karbot')) return { label: 'Karbot', className: 'bg-emerald-100 text-emerald-700' };
    if (normalized.includes('email')) return { label: 'Email', className: 'bg-purple-100 text-purple-700' };
    if (normalized.includes('notification')) return { label: 'Notificaciones', className: 'bg-indigo-100 text-indigo-700' };
    return { label: integration, className: 'bg-gray-100 text-gray-700' };
  };

  const buildLogPrompt = (log: IntegrationLog) => {
    const payload = {
      order_id: log.order_id,
      business_id: log.business_id,
      user_id: log.user_id,
      integration: log.integration,
      event_type: log.event_type,
      channel: log.channel,
      status: log.status,
      message: log.message,
      error_message: log.error_message,
      request_payload: log.request_payload,
      response_payload: log.response_payload,
      metadata: log.metadata,
      created_at: log.created_at,
    };

    return [
      '### Contexto de integración',
      '```json',
      JSON.stringify(payload, null, 2),
      '```',
    ].join('\n');
  };

  const handleCopyLog = async (log: IntegrationLog) => {
    const text = buildLogPrompt(log);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('No se pudo copiar al portapapeles:', err);
    }
  };

  return (
    <AdminLayout title="Bitácora">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-normal text-gray-900">Bitácora de Integraciones</h1>
          <p className="text-xs text-gray-600">
            Solo se muestran órdenes que ya tienen logs registrados.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {!selectedOrder ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-3 text-xs font-medium text-gray-600">
              Órdenes con actividad
            </div>
            {loading ? (
              <div className="p-6 text-xs text-gray-500">Cargando órdenes...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-xs text-gray-500">No hay órdenes con logs todavía.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Orden</th>
                      <th className="px-4 py-2 text-left font-medium">Sucursal</th>
                      <th className="px-4 py-2 text-left font-medium">Cliente</th>
                      <th className="px-4 py-2 text-left font-medium">Pago</th>
                      <th className="px-4 py-2 text-left font-medium">Logs</th>
                      <th className="px-4 py-2 text-left font-medium">Último</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <td className="px-4 py-2">
                          <div className="text-gray-900">{order.id.slice(-8).toUpperCase()}</div>
                          <div className="text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-2 text-gray-700">{order.business_name || 'Sin sucursal'}</td>
                        <td className="px-4 py-2 text-gray-700">{order.client_email || 'Sin email'}</td>
                        <td className="px-4 py-2 text-gray-700">{order.payment_status}</td>
                        <td className="px-4 py-2 text-gray-700">{order.logs_count}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {order.last_log_at ? new Date(order.last_log_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="border-b border-gray-200 px-4 py-3 text-xs font-medium text-gray-600 flex items-center justify-between">
              <span>Logs de orden {selectedOrder.id.slice(-8).toUpperCase()}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = orders.findIndex((order) => order.id === selectedOrder.id);
                    if (currentIndex > 0) {
                      setSelectedOrderId(orders[currentIndex - 1].id);
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = orders.findIndex((order) => order.id === selectedOrder.id);
                    if (currentIndex >= 0 && currentIndex < orders.length - 1) {
                      setSelectedOrderId(orders[currentIndex + 1].id);
                    }
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
            {logsLoading ? (
              <div className="p-6 text-xs text-gray-500">Cargando logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-xs text-gray-500">No hay logs registrados para esta orden.</div>
            ) : (
              <div className="p-4 space-y-3">
                {logs.map((log) => {
                  const statusStyle = getStatusStyle(log.status);
                  const integrationBadge = getIntegrationBadge(log.integration);

                  return (
                    <details key={log.id} className="rounded border border-gray-200 bg-gray-50">
                      <summary className="cursor-pointer px-3 py-2 text-xs text-gray-800 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${integrationBadge.className}`}>
                            {integrationBadge.label}
                          </span>
                          <span className="text-gray-700">{log.event_type}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] border ${statusStyle.className}`}
                          >
                            {statusStyle.icon} {statusStyle.label}
                          </span>
                        </span>
                        <span className="flex items-center gap-2 text-gray-500">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyLog(log);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-900"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h8a2 2 0 002-2V8l-6-6H9a2 2 0 00-2 2v1M7 8H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            Copiar
                          </button>
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </summary>
                      <div className="px-4 py-3 text-xs text-gray-700 space-y-2">
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Canal: {log.channel || 'N/A'}</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Evento: {log.event_type}</span>
                        </div>
                      {log.message && <div><strong>Mensaje:</strong> {log.message}</div>}
                      {log.error_message && <div className="text-red-600"><strong>Error:</strong> {log.error_message}</div>}
                      {log.request_payload && (
                        <div>
                          <strong>Request:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-[11px] text-gray-600">
                            {JSON.stringify(log.request_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.response_payload && (
                        <div>
                          <strong>Response:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-[11px] text-gray-600">
                            {JSON.stringify(log.response_payload, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.metadata && (
                        <div>
                          <strong>Metadata:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-[11px] text-gray-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
