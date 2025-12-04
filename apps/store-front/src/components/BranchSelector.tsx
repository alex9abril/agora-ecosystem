/**
 * Componente para seleccionar sucursal
 * Soporta geolocalización y selección manual por dirección
 */

import React, { useState, useEffect } from 'react';
import { branchesService, Business } from '@/lib/branches';
import { addressesService, Address } from '@/lib/addresses';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StoreIcon from '@mui/icons-material/Store';

interface BranchSelectorProps {
  onSelect?: (branch: Business) => void;
  className?: string;
}

export default function BranchSelector({ onSelect, className = '' }: BranchSelectorProps) {
  const { isAuthenticated } = useAuth();
  const { navigateToContext } = useStoreContext();
  const [branches, setBranches] = useState<Business[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocation, setUseLocation] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (useLocation) {
      loadBranchesByLocation();
    } else if (selectedAddressId) {
      loadBranchesByAddress(selectedAddressId);
    } else {
      loadAllBranches();
    }
  }, [useLocation, selectedAddressId]);

  const loadAddresses = async () => {
    try {
      const data = await addressesService.findAll();
      setAddresses(data);
      if (data.length > 0) {
        const defaultAddress = data.find(a => a.is_default) || data[0];
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      console.error('Error cargando direcciones:', error);
    }
  };

  const loadAllBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await branchesService.getBranches({ isActive: true });
      setBranches(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando sucursales');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchesByAddress = async (addressId: string) => {
    try {
      setLoading(true);
      setError(null);
      const address = await addressesService.findOne(addressId);
      const response = await branchesService.getNearbyBranches(
        address.latitude,
        address.longitude,
        5000
      );
      setBranches(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Error cargando sucursales');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchesByLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en tu navegador');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await branchesService.getNearbyBranches(
              position.coords.latitude,
              position.coords.longitude,
              5000 // 5km radius
            );
            setBranches(response.data || []);
          } catch (err: any) {
            setError(err.message || 'Error cargando sucursales cercanas');
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          setError('No se pudo obtener tu ubicación');
          setLoading(false);
        }
      );
    } catch (err: any) {
      setError(err.message || 'Error obteniendo ubicación');
      setLoading(false);
    }
  };

  const handleBranchSelect = (branch: Business) => {
    navigateToContext('sucursal', branch.slug);
    if (onSelect) {
      onSelect(branch);
    }
  };

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Seleccionar Sucursal</h3>
        
        {/* Opciones de selección */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => {
              setUseLocation(true);
              setSelectedAddressId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
              useLocation
                ? 'border-black bg-black text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <LocationOnIcon className="w-5 h-5" />
            Por ubicación
          </button>

          {isAuthenticated && addresses.length > 0 && (
            <div className="flex-1">
              <select
                value={selectedAddressId || ''}
                onChange={(e) => {
                  setSelectedAddressId(e.target.value);
                  setUseLocation(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
              >
                <option value="">Todas las sucursales</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label || `${address.street}, ${address.neighborhood}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Lista de sucursales */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando sucursales...</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron sucursales</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => handleBranchSelect(branch)}
              className="bg-white p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-3">
                <StoreIcon className="w-6 h-6 text-gray-400 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-black mb-1">{branch.name}</h4>
                  {branch.address && (
                    <p className="text-sm text-gray-600">{branch.address}</p>
                  )}
                  {branch.phone && (
                    <p className="text-sm text-gray-600">{branch.phone}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

