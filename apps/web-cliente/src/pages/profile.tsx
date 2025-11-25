/**
 * Página de Mi Cuenta - Gestión de pedidos y direcciones
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MobileLayout from '@/components/layout/MobileLayout';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { ordersService, Order } from '@/lib/orders';
import { addressesService, Address, CreateAddressDto } from '@/lib/addresses';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type TabType = 'profile' | 'orders' | 'addresses';

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (activeTab === 'orders') {
      loadOrders();
    } else if (activeTab === 'addresses') {
      loadAddresses();
    }
  }, [isAuthenticated, activeTab, router]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando pedidos...');
      const data = await ordersService.findAll();
      console.log('✅ Pedidos cargados:', data);
      setOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('❌ Error cargando pedidos:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await addressesService.findAll();
      setAddresses(data);
    } catch (error: any) {
      console.error('Error cargando direcciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
      return;
    }
    try {
      await addressesService.remove(id);
      await loadAddresses();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar dirección');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await addressesService.setDefault(id);
      await loadAddresses();
    } catch (error: any) {
      alert(error.message || 'Error al establecer dirección predeterminada');
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      in_transit: 'En camino',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      ready: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Mi Cuenta - Localia</title>
      </Head>
      <MobileLayout>
        <div className="mb-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-black mb-2">Mi Cuenta</h1>
            {user && (
              <p className="text-gray-600">
                {user.profile?.first_name || user.email}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pedidos
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'addresses'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Direcciones
            </button>
          </div>

          {/* Contenido según tab activo */}
          {activeTab === 'profile' && (
            <ProfileTab user={user} signOut={signOut} />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              loading={loading}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              onOrderClick={(id) => router.push(`/orders/${id}`)}
            />
          )}
          
          {/* Debug info - remover después */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
              <p>Debug - Pedidos: {orders.length}</p>
              <p>Loading: {loading ? 'Sí' : 'No'}</p>
              <p>Active Tab: {activeTab}</p>
            </div>
          )}

          {activeTab === 'addresses' && (
            <AddressesTab
              addresses={addresses}
              loading={loading}
              showForm={showAddressForm}
              editingAddress={editingAddress}
              onToggleForm={() => {
                setShowAddressForm(!showAddressForm);
                setEditingAddress(null);
              }}
              onEdit={(address) => {
                setEditingAddress(address);
                setShowAddressForm(true);
              }}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefaultAddress}
              onSave={async () => {
                await loadAddresses();
                setShowAddressForm(false);
                setEditingAddress(null);
              }}
            />
          )}
        </div>
      </MobileLayout>
    </>
  );
}

// Componente para la pestaña de Perfil
function ProfileTab({ user, signOut }: { user: any; signOut: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <PersonIcon className="text-3xl text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-black">
              {user?.profile?.first_name && user?.profile?.last_name
                ? `${user.profile.first_name} ${user.profile.last_name}`
                : user?.email}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <p className="text-gray-900">
              {user?.profile?.first_name && user?.profile?.last_name
                ? `${user.profile.first_name} ${user.profile.last_name}`
                : 'No especificado'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          {user?.profile?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <p className="text-gray-900">{user.profile.phone}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={signOut}
        className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <LogoutIcon className="w-5 h-5" />
        Cerrar Sesión
      </button>
    </div>
  );
}

// Componente para la pestaña de Pedidos
function OrdersTab({
  orders,
  loading,
  getStatusLabel,
  getStatusColor,
  onOrderClick,
}: {
  orders: Order[];
  loading: boolean;
  getStatusLabel: (status: string) => string;
  getStatusColor: (status: string) => string;
  onOrderClick: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando pedidos...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBagIcon className="text-6xl text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-black mb-2">No tienes pedidos</h3>
        <p className="text-gray-500 mb-6">Cuando realices un pedido, aparecerá aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <button
          key={order.id}
          onClick={() => onOrderClick(order.id)}
          className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-black">Pedido #{order.id.slice(0, 8)}</p>
              {order.business_name && (
                <p className="text-sm text-gray-600">{order.business_name}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-xs text-gray-500">
                {new Date(order.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <p className="text-lg font-bold text-black">
              ${parseFloat(String(order.total_amount || 0)).toFixed(2)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// Componente para la pestaña de Direcciones
function AddressesTab({
  addresses,
  loading,
  showForm,
  editingAddress,
  onToggleForm,
  onEdit,
  onDelete,
  onSetDefault,
  onSave,
}: {
  addresses: Address[];
  loading: boolean;
  showForm: boolean;
  editingAddress: Address | null;
  onToggleForm: () => void;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onSave: () => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateAddressDto>({
    street: '',
    neighborhood: '',
    postal_code: '',
    longitude: 0,
    latitude: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingAddress) {
      setFormData({
        label: editingAddress.label || '',
        street: editingAddress.street,
        street_number: editingAddress.street_number || '',
        interior_number: editingAddress.interior_number || '',
        neighborhood: editingAddress.neighborhood,
        city: editingAddress.city,
        state: editingAddress.state,
        postal_code: editingAddress.postal_code,
        country: editingAddress.country,
        longitude: editingAddress.longitude,
        latitude: editingAddress.latitude,
        additional_references: editingAddress.additional_references || '',
        is_default: editingAddress.is_default,
      });
    } else {
      setFormData({
        street: '',
        neighborhood: '',
        postal_code: '',
        longitude: 0,
        latitude: 0,
      });
    }
  }, [editingAddress, showForm]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      alert('Por favor, obtén tu ubicación primero');
      return;
    }

    try {
      setSaving(true);
      if (editingAddress) {
        await addressesService.update(editingAddress.id, formData);
      } else {
        await addressesService.create(formData);
      }
      await onSave();
    } catch (error: any) {
      alert(error.message || 'Error al guardar dirección');
    } finally {
      setSaving(false);
    }
  };

  if (showForm) {
    return (
      <AddressForm
        formData={formData}
        setFormData={setFormData}
        editingAddress={editingAddress}
        onCancel={onToggleForm}
        onSubmit={handleSubmit}
        onGetLocation={getCurrentLocation}
        saving={saving}
      />
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando direcciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={onToggleForm}
        className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
      >
        <AddIcon className="w-5 h-5" />
        Agregar Dirección
      </button>

      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <LocationOnIcon className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-black mb-2">No tienes direcciones</h3>
          <p className="text-gray-500">Agrega una dirección para facilitar tus pedidos</p>
        </div>
      ) : (
        addresses.map((address) => (
          <div
            key={address.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-black">
                    {address.label || 'Dirección'}
                  </span>
                  {address.is_default && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900">
                  {address.street} {address.street_number}
                  {address.interior_number && ` Int. ${address.interior_number}`}
                </p>
                <p className="text-sm text-gray-600">
                  {address.neighborhood}, {address.city}, {address.state} {address.postal_code}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {!address.is_default && (
                <button
                  onClick={() => onSetDefault(address.id)}
                  className="flex-1 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Establecer como predeterminada
                </button>
              )}
              <button
                onClick={() => onEdit(address)}
                className="px-3 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
              >
                <EditIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(address.id)}
                className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
              >
                <DeleteIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Componente de formulario de dirección
function AddressForm({
  formData,
  setFormData,
  editingAddress,
  onCancel,
  onSubmit,
  onGetLocation,
  saving,
}: {
  formData: CreateAddressDto;
  setFormData: (data: CreateAddressDto) => void;
  editingAddress: Address | null;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onGetLocation: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowBackIcon className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-black">
          {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Etiqueta (opcional)
          </label>
          <input
            type="text"
            value={formData.label || ''}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            placeholder="Casa, Trabajo, etc."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calle *
          </label>
          <input
            type="text"
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número exterior
            </label>
            <input
              type="text"
              value={formData.street_number || ''}
              onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colonia *
            </label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código postal *
          </label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onGetLocation}
            className="w-full py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            📍 Obtener mi ubicación
          </button>
          <button
            type="button"
            onClick={() => {
              // Datos de prueba completos para Colonia Roma, CDMX
              setFormData({
                label: 'Casa',
                street: 'Avenida Álvaro Obregón',
                street_number: '45',
                interior_number: '',
                neighborhood: 'Roma Norte',
                city: 'Ciudad de México',
                state: 'CDMX',
                postal_code: '06700',
                country: 'México',
                longitude: -99.1600,
                latitude: 19.4220,
                additional_references: '',
                is_default: false,
              });
            }}
            className="w-full py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium border border-green-300"
          >
            🧪 Completar con Colonia Roma (Pruebas)
          </button>
          {formData.latitude && formData.longitude && (
            <p className="text-xs text-gray-500">
              Ubicación: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
