/**
 * Página de perfil del usuario con direcciones guardadas
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AddressForm from '@/components/AddressForm';
import AccountSidebar from '@/components/AccountSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { addressesService, Address, CreateAddressDto, UpdateAddressDto } from '@/lib/addresses';
import { authService } from '@/lib/auth';
import ContextualLink from '@/components/ContextualLink';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading, token, refreshUser } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false); // Cambiar a false inicialmente
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Determinar la pestaña activa desde la query
  const activeTab = router.query.tab as string || 'profile';

  useEffect(() => {
    // Perfil siempre requiere autenticación
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    if (isAuthenticated && user) {
      // Inicializar datos del perfil
      if (user.profile) {
        setProfileData({
          first_name: user.profile.first_name || '',
          last_name: user.profile.last_name || '',
          phone: user.profile.phone || '',
        });
      }
      // Cargar direcciones solo si estamos en la pestaña de direcciones
      if (activeTab === 'addresses') {
        loadAddresses();
      } else {
        // Si no estamos en direcciones, asegurarnos de que loading sea false
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading, router, activeTab, user]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await addressesService.findAll();
      setAddresses(data);
    } catch (error) {
      console.error('Error cargando direcciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAddress = async (addressData: CreateAddressDto) => {
    try {
      await addressesService.create(addressData);
      await loadAddresses();
      setShowAddressForm(false);
    } catch (error: any) {
      alert(error.message || 'Error al crear dirección');
    }
  };

  const handleUpdateAddress = async (addressData: CreateAddressDto) => {
    if (!editingAddress) return;
    
    try {
      const updateData: UpdateAddressDto = { ...addressData };
      await addressesService.update(editingAddress.id, updateData);
      await loadAddresses();
      setEditingAddress(null);
      setShowAddressForm(false);
    } catch (error: any) {
      alert(error.message || 'Error al actualizar dirección');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('¿Eliminar esta dirección?')) return;
    
    try {
      await addressesService.remove(addressId);
      await loadAddresses();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar dirección');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await addressesService.setDefault(addressId);
      await loadAddresses();
    } catch (error: any) {
      alert(error.message || 'Error al establecer dirección predeterminada');
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    
    try {
      setSavingProfile(true);
      await authService.updateProfile(token, profileData);
      await refreshUser(); // Actualizar el usuario en el contexto
      setEditingProfile(false);
    } catch (error: any) {
      alert(error.message || 'Error al actualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEditProfile = () => {
    // Restaurar valores originales
    if (user?.profile) {
      setProfileData({
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        phone: user.profile.phone || '',
      });
    }
    setEditingProfile(false);
  };

  if (authLoading || loading) {
    return (
      <StoreLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </StoreLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Mi Perfil - Agora</title>
      </Head>
      <StoreLayout>
        <div className="flex gap-6">
          {/* Sidebar de navegación */}
          <AccountSidebar activeTab={activeTab} />

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Mis Datos de Cuenta</h1>
                  {!editingProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <EditIcon className="w-5 h-5" />
                      Editar
                    </button>
                  )}
                </div>
                
                {/* Información del usuario */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600 block mb-1">Email:</span>
                      <span className="font-medium">{user?.email || 'N/A'}</span>
                      <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
                    </div>
                    
                    {editingProfile ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre
                          </label>
                          <input
                            type="text"
                            value={profileData.first_name}
                            onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                            placeholder="Nombre"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apellido
                          </label>
                          <input
                            type="text"
                            value={profileData.last_name}
                            onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                            placeholder="Apellido"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toyota-red focus:border-transparent"
                            placeholder="Teléfono"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            className="flex items-center gap-2 px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <SaveIcon className="w-5 h-5" />
                            {savingProfile ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            onClick={handleCancelEditProfile}
                            disabled={savingProfile}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CancelIcon className="w-5 h-5" />
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {(user?.profile?.first_name || user?.profile?.last_name) && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Nombre:</span>
                            <span className="font-medium">
                              {user.profile.first_name || ''} {user.profile.last_name || ''}
                            </span>
                          </div>
                        )}
                        {user?.profile?.phone && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Teléfono:</span>
                            <span className="font-medium">{user.profile.phone}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'addresses' && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Mis Direcciones</h1>
                  {!showAddressForm && (
                    <button
                      onClick={() => {
                        setEditingAddress(null);
                        setShowAddressForm(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-toyota-red text-white rounded-lg hover:bg-toyota-red-dark transition-colors"
                    >
                      <AddIcon className="w-5 h-5" />
                      Agregar Dirección
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  {showAddressForm ? (
                    <AddressForm
                      address={editingAddress || undefined}
                      onSubmit={editingAddress ? handleUpdateAddress : handleCreateAddress}
                      onCancel={() => {
                        setShowAddressForm(false);
                        setEditingAddress(null);
                      }}
                    />
                  ) : (
                    <>
                      {addresses.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                          No tienes direcciones guardadas
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {addresses.map((address) => (
                            <div
                              key={address.id}
                              className={`p-4 rounded-lg border-2 ${
                                address.is_default
                                  ? 'border-black bg-gray-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {address.is_default && (
                                    <span className="inline-block px-2 py-1 bg-black text-white text-xs font-medium rounded mb-2">
                                      Predeterminada
                                    </span>
                                  )}
                                  {address.label && (
                                    <div className="font-semibold mb-1">{address.label}</div>
                                  )}
                                  {address.receiver_name && (
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {address.receiver_name}
                                    </div>
                                  )}
                                  <div className="text-sm text-gray-600">
                                    {address.street} {address.street_number && `#${address.street_number}`}
                                    {address.interior_number && ` Int. ${address.interior_number}`}
                                    <br />
                                    {address.neighborhood}, {address.city}
                                    {address.postal_code && ` ${address.postal_code}`}
                                  </div>
                                  {address.receiver_phone && (
                                    <div className="text-sm text-gray-500 mt-1">
                                      Tel: {address.receiver_phone}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {!address.is_default && (
                                    <button
                                      onClick={() => handleSetDefault(address.id)}
                                      className="text-sm text-gray-600 hover:text-black"
                                    >
                                      Establecer como predeterminada
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setEditingAddress(address);
                                      setShowAddressForm(true);
                                    }}
                                    className="p-2 text-gray-600 hover:text-black"
                                  >
                                    <EditIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAddress(address.id)}
                                    className="p-2 text-red-500 hover:text-red-700"
                                  >
                                    <DeleteIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {activeTab === 'payment' && (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis Métodos de Pago</h1>
                
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-gray-500 text-center py-8">
                    Esta funcionalidad estará disponible próximamente
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </StoreLayout>
    </>
  );
}

