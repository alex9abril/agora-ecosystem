import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usersService } from '@/lib/users';
import { useAuth } from './AuthContext';
import { businessService } from '@/lib/business';

interface BusinessSummary {
  business_id: string;
  business_name: string;
  role: 'superadmin' | 'admin' | 'operations_staff' | 'kitchen_staff';
  permissions: Record<string, any>;
  is_active: boolean;
  can_access: boolean;
  assigned_at: string;
  // Campos opcionales que pueden venir del backend completo
  category?: string;
  business_address?: string;
}

interface SelectedBusinessContextType {
  selectedBusiness: BusinessSummary | null;
  availableBusinesses: BusinessSummary[];
  isLoading: boolean;
  selectBusiness: (businessId: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const SelectedBusinessContext = createContext<SelectedBusinessContextType | undefined>(undefined);

// Clave para guardar solo el UUID (compatibilidad hacia atrás)
const STORAGE_KEY_ID = 'localia_selected_business_id';
// Clave para guardar datos básicos (UUID + nombre + categoría)
const STORAGE_KEY_DATA = 'localia_selected_business_data';

interface StoredBusinessData {
  business_id: string;
  business_name: string;
  category?: string;
  updated_at: string; // Timestamp para validar si está desactualizado
}

export function SelectedBusinessProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSummary | null>(null);
  const [availableBusinesses, setAvailableBusinesses] = useState<BusinessSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Función auxiliar para guardar datos básicos en localStorage
  const saveBusinessDataToStorage = (businessId: string, businessName: string, category?: string) => {
    try {
      const data: StoredBusinessData = {
        business_id: businessId,
        business_name: businessName,
        category,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
      // También guardar UUID para compatibilidad
      localStorage.setItem(STORAGE_KEY_ID, businessId);
    } catch (e) {
      console.warn('[SelectedBusinessContext] Error guardando datos en localStorage:', e);
    }
  };

  const loadBusinesses = async () => {
    if (!user || !token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const businesses = await usersService.getUserBusinessesSummary(user.id);
      setAvailableBusinesses(businesses);

      // Filtrar solo las tiendas activas y accesibles
      const activeBusinesses = businesses.filter(b => b.can_access && b.is_active);

      // Intentar recuperar la tienda guardada (nuevo formato con datos o formato antiguo solo UUID)
      let savedBusinessId: string | null = null;
      let savedBusinessData: StoredBusinessData | null = null;

      try {
        const savedDataStr = localStorage.getItem(STORAGE_KEY_DATA);
        if (savedDataStr) {
          savedBusinessData = JSON.parse(savedDataStr);
          savedBusinessId = savedBusinessData.business_id;
        } else {
          // Fallback al formato antiguo (solo UUID)
          savedBusinessId = localStorage.getItem(STORAGE_KEY_ID);
        }
      } catch (e) {
        console.warn('[SelectedBusinessContext] Error parseando datos guardados, usando formato antiguo');
        savedBusinessId = localStorage.getItem(STORAGE_KEY_ID);
      }

      if (savedBusinessId) {
        const savedBusiness = activeBusinesses.find(b => b.business_id === savedBusinessId);
        if (savedBusiness && savedBusiness.can_access && savedBusiness.is_active) {
          // Si tenemos datos guardados, enriquecer con categoría si no está en el resumen
          if (savedBusinessData?.category && !savedBusiness.category) {
            savedBusiness.category = savedBusinessData.category;
          }

          // Cargar datos completos de la tienda (incluyendo categoría) en segundo plano
          // Esto enriquece el cache sin bloquear la UI
          businessService.getMyBusiness(savedBusinessId)
            .then((fullBusiness) => {
              if (fullBusiness) {
                // Actualizar el business seleccionado con datos completos
                setSelectedBusiness({
                  ...savedBusiness,
                  category: fullBusiness.category || savedBusiness.category,
                  business_address: fullBusiness.business_address,
                });
                // Guardar datos actualizados en localStorage
                saveBusinessDataToStorage(savedBusinessId, fullBusiness.name, fullBusiness.category);
              }
            })
            .catch((err) => {
              console.warn('[SelectedBusinessContext] No se pudo cargar datos completos de la tienda:', err);
              // Continuar con los datos del resumen
            });

          setSelectedBusiness(savedBusiness);
          setIsLoading(false);
          return;
        } else {
          // La tienda guardada ya no está disponible, limpiar
          localStorage.removeItem(STORAGE_KEY_ID);
          localStorage.removeItem(STORAGE_KEY_DATA);
        }
      }

      // Si solo hay una tienda, autoseleccionarla
      if (activeBusinesses.length === 1) {
        const business = activeBusinesses[0];
        setSelectedBusiness(business);
        // Guardar solo UUID (compatibilidad) y datos básicos
        localStorage.setItem(STORAGE_KEY_ID, business.business_id);
        saveBusinessDataToStorage(business.business_id, business.business_name);

        // Cargar datos completos en segundo plano
        businessService.getMyBusiness(business.business_id)
          .then((fullBusiness) => {
            if (fullBusiness) {
              setSelectedBusiness({
                ...business,
                category: fullBusiness.category,
                business_address: fullBusiness.business_address,
              });
              saveBusinessDataToStorage(business.business_id, fullBusiness.name, fullBusiness.category);
            }
          })
          .catch((err) => {
            console.warn('[SelectedBusinessContext] No se pudo cargar datos completos:', err);
          });

        setIsLoading(false);
        return;
      }

      // Si hay múltiples tiendas, no autoseleccionar (el usuario debe elegir)
      setIsLoading(false);
    } catch (error: any) {
      console.error('[SelectedBusinessContext] Error cargando tiendas:', error);
      setAvailableBusinesses([]);
      setIsLoading(false);
    }
  };

  const selectBusiness = (businessId: string) => {
    const business = availableBusinesses.find(b => b.business_id === businessId);
    if (business && business.can_access && business.is_active) {
      setSelectedBusiness(business);
      // Guardar datos básicos
      saveBusinessDataToStorage(businessId, business.business_name, business.category);

      // Cargar datos completos en segundo plano para enriquecer el cache
      businessService.getMyBusiness(businessId)
        .then((fullBusiness) => {
          if (fullBusiness) {
            setSelectedBusiness({
              ...business,
              category: fullBusiness.category || business.category,
              business_address: fullBusiness.business_address,
            });
            saveBusinessDataToStorage(businessId, fullBusiness.name, fullBusiness.category);
          }
        })
        .catch((err) => {
          console.warn('[SelectedBusinessContext] No se pudo cargar datos completos:', err);
        });
    }
  };

  useEffect(() => {
    if (user && token) {
      loadBusinesses();
    } else {
      // Limpiar al cerrar sesión
      setSelectedBusiness(null);
      setAvailableBusinesses([]);
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_DATA);
    }
  }, [user, token]);

  return (
    <SelectedBusinessContext.Provider
      value={{
        selectedBusiness,
        availableBusinesses: availableBusinesses.filter(b => b.can_access && b.is_active),
        isLoading,
        selectBusiness,
        refreshBusinesses: loadBusinesses,
      }}
    >
      {children}
    </SelectedBusinessContext.Provider>
  );
}

export function useSelectedBusiness() {
  const context = useContext(SelectedBusinessContext);
  if (context === undefined) {
    throw new Error('useSelectedBusiness must be used within a SelectedBusinessProvider');
  }
  return context;
}

