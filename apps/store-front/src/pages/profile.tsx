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
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VehicleSelectorDialog from '@/components/VehicleSelectorDialog';
import { userVehiclesService, UserVehicle } from '@/lib/user-vehicles';
import { getStoredVehicle } from '@/lib/vehicle-storage';

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
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [storedVehicle, setStoredVehicle] = useState<any | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  
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
      } else if (activeTab === 'vehicles') {
        loadVehicles();
      } else {
        // Si no estamos en direcciones o vehículos, asegurarnos de que loading sea false
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

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      if (isAuthenticated) {
        const vehicles = await userVehiclesService.getUserVehicles();
        setUserVehicles(vehicles);
      } else {
        const stored = getStoredVehicle();
        setStoredVehicle(stored);
      }
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este vehículo?')) {
      return;
    }

    try {
      await userVehiclesService.deleteUserVehicle(vehicleId);
      await loadVehicles();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar vehículo');
    }
  };

  const handleSetDefaultVehicle = async (vehicleId: string) => {
    try {
      await userVehiclesService.setDefaultVehicle(vehicleId);
      await loadVehicles();
    } catch (error: any) {
      alert(error.message || 'Error al establecer vehículo predeterminado');
    }
  };

  const getVehicleDisplayName = (vehicle: UserVehicle | any): string => {
    if (vehicle.nickname) {
      return vehicle.nickname;
    }
    
    const parts: string[] = [];
    if (vehicle.brand_name) parts.push(vehicle.brand_name);
    if (vehicle.model_name) parts.push(vehicle.model_name);
    if (vehicle.year_start) {
      if (vehicle.year_end) {
        parts.push(`${vehicle.year_start}-${vehicle.year_end}`);
      } else {
        parts.push(`${vehicle.year_start}+`);
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : 'Vehículo sin nombre';
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
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Título principal */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Cuenta</h1>
            <p className="text-gray-600">Administra tu cuenta, historial de compras, billetera, favoritos y más.</p>
          </div>

          <div className="flex gap-12">
            {/* Sidebar de navegación */}
            <AccountSidebar activeTab={activeTab} />

            {/* Contenido principal */}
            <div className="flex-1 min-w-0">
              {activeTab === 'profile' && (
                <>
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">Información de Cuenta</h2>
                    {!editingProfile && (
                      <button
                        onClick={() => setEditingProfile(true)}
                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                      >
                        <EditIcon className="w-4 h-4" />
                        Editar
                      </button>
                    )}
                    </div>
                    
                    {/* Tarjeta de Account Info */}
                    <div className="border border-gray-200 rounded-lg p-4 mb-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Inicio de Sesión de Agora Ecosystem Marketplace</div>
                            <div className="text-sm text-gray-600">Administra tu inicio de sesión de Agora Ecosystem Marketplace</div>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información del usuario */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Información Personal</h2>
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="space-y-4">
                        <div>
                          <span className="text-sm text-gray-700 block mb-1 font-medium">Email:</span>
                          <span className="text-gray-900">{user?.email || 'N/A'}</span>
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
                            <span className="text-sm text-gray-700 block mb-1 font-medium">Nombre:</span>
                            <span className="text-gray-900">
                              {user.profile.first_name || ''} {user.profile.last_name || ''}
                            </span>
                          </div>
                        )}
                        {user?.profile?.phone && (
                          <div>
                            <span className="text-sm text-gray-700 block mb-1 font-medium">Teléfono:</span>
                            <span className="text-gray-900">{user.profile.phone}</span>
                          </div>
                        )}
                        </>
                      )}
                      </div>
                    </div>
                  </div>
                </>
              )}

            {activeTab === 'addresses' && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Mis direcciones</h2>
                  <p className="text-sm text-gray-600">Guarda tus direcciones para un checkout más rápido.</p>
                </div>

                <div className="border border-gray-200 border-dashed rounded-lg min-h-[200px]">
                  {showAddressForm ? (
                    <div className="w-full p-6">
                      <AddressForm
                        address={editingAddress || undefined}
                        onSubmit={editingAddress ? handleUpdateAddress : handleCreateAddress}
                        onCancel={() => {
                          setShowAddressForm(false);
                          setEditingAddress(null);
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      {addresses.length === 0 ? (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                          <p className="text-gray-900 font-semibold">Sin direcciones</p>
                        </div>
                      ) : (
                        <div className="w-full p-6 space-y-4">
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
                
                {!showAddressForm && addresses.length === 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setEditingAddress(null);
                        setShowAddressForm(true);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900 underline"
                    >
                      Agregar dirección
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'vehicles' && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Mis Vehículos</h1>
                  <button
                    onClick={() => setShowVehicleSelector(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <AddIcon className="w-5 h-5" />
                    Agregar Vehículo
                  </button>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  {loadingVehicles ? (
                    <p className="text-gray-500 text-center py-8">Cargando...</p>
                  ) : (
                    <>
                      {isAuthenticated && userVehicles.length > 0 && (
                        <div className="space-y-4">
                          {userVehicles.map((vehicle) => (
                            <div
                              key={vehicle.id}
                              className={`p-4 border-2 rounded-lg ${
                                vehicle.is_default
                                  ? 'border-black bg-gray-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <DirectionsCarIcon className="w-5 h-5 text-gray-600" />
                                    <span className="font-semibold text-gray-900 uppercase">
                                      {getVehicleDisplayName(vehicle)}
                                    </span>
                                    {vehicle.is_default && (
                                      <span className="px-2 py-1 bg-black text-white text-xs font-medium rounded">
                                        Predeterminado
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">
                                    {vehicle.brand_name}
                                    {vehicle.model_name && ` ${vehicle.model_name}`}
                                    {vehicle.year_start && ` ${vehicle.year_start}`}
                                    {vehicle.year_end && `-${vehicle.year_end}`}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!vehicle.is_default && (
                                    <button
                                      onClick={() => handleSetDefaultVehicle(vehicle.id)}
                                      className="text-sm text-gray-600 hover:text-black"
                                    >
                                      Establecer como predeterminado
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteVehicle(vehicle.id)}
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

                      {!isAuthenticated && storedVehicle && (
                        <div className="p-4 border-2 border-black bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <DirectionsCarIcon className="w-5 h-5 text-gray-600" />
                                <span className="font-semibold text-gray-900 uppercase">
                                  {getVehicleDisplayName(storedVehicle)}
                                </span>
                                <span className="px-2 py-1 bg-black text-white text-xs font-medium rounded">
                                  Vehículo Actual
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-gray-600">
                                {storedVehicle.brand_name}
                                {storedVehicle.model_name && ` ${storedVehicle.model_name}`}
                                {storedVehicle.year_start && ` ${storedVehicle.year_start}`}
                                {storedVehicle.year_end && `-${storedVehicle.year_end}`}
                              </div>
                            </div>
                            <CheckCircleIcon className="w-5 h-5 text-black" />
                          </div>
                        </div>
                      )}

                      {isAuthenticated && userVehicles.length === 0 && !storedVehicle && (
                        <div className="text-center py-8">
                          <DirectionsCarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">No tienes vehículos agregados</p>
                          <p className="text-sm text-gray-400 mt-2">Agrega uno para ver productos compatibles</p>
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
        </div>
      </StoreLayout>

      {/* Selector de vehículos */}
      <VehicleSelectorDialog
        open={showVehicleSelector}
        onClose={() => {
          setShowVehicleSelector(false);
          if (activeTab === 'vehicles') {
            loadVehicles();
          }
        }}
        onVehicleSelected={() => {
          if (activeTab === 'vehicles') {
            loadVehicles();
          }
        }}
      />
    </>
  );
}

