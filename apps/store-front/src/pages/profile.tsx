/**
 * Página de perfil del usuario con direcciones guardadas
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import StoreLayout from '@/components/layout/StoreLayout';
import AddressForm from '@/components/AddressForm';
import { useAuth } from '@/contexts/AuthContext';
import { addressesService, Address, CreateAddressDto, UpdateAddressDto } from '@/lib/addresses';
import ContextualLink from '@/components/ContextualLink';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    // Perfil siempre requiere autenticación
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated, authLoading, router]);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Perfil</h1>

          {/* Información del usuario */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{user?.email || 'N/A'}</span>
              </div>
              {user?.firstName && (
                <div>
                  <span className="text-sm text-gray-600">Nombre:</span>
                  <span className="ml-2 font-medium">{user.firstName} {user.lastName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Direcciones */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Direcciones</h2>
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
                            <div className="text-sm text-gray-600">
                              {address.street} {address.street_number && `#${address.street_number}`}
                              {address.interior_number && ` Int. ${address.interior_number}`}
                              <br />
                              {address.neighborhood}, {address.city}
                              {address.postal_code && ` ${address.postal_code}`}
                            </div>
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
        </div>
      </StoreLayout>
    </>
  );
}

