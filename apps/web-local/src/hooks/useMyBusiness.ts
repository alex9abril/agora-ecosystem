import { useEffect, useState } from 'react';
import { businessService, Business } from '@/lib/business';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

/**
 * Hook personalizado para obtener el negocio del usuario actual
 * Automáticamente usa la tienda seleccionada del contexto si está disponible
 */
export function useMyBusiness() {
  const { selectedBusiness } = useSelectedBusiness();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Usar la tienda seleccionada si está disponible
        const businessId = selectedBusiness?.business_id;
        const businessData = await businessService.getMyBusiness(businessId);
        
        setBusiness(businessData);
      } catch (err: any) {
        console.error('[useMyBusiness] Error cargando negocio:', err);
        setError(err);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [selectedBusiness?.business_id]);

  return { business, loading, error };
}

