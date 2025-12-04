/**
 * Hook para navegación con contexto
 * Proporciona funciones de navegación que mantienen el contexto
 */

import { useStoreContext } from '@/contexts/StoreContext';
import { useRouter } from 'next/router';

export function useStoreRouting() {
  const { getContextualUrl, contextType, slug, isInStore } = useStoreContext();
  const router = useRouter();

  const push = (path: string, options?: any) => {
    const contextualPath = getContextualUrl(path);
    return router.push(contextualPath, undefined, options);
  };

  const replace = (path: string, options?: any) => {
    const contextualPath = getContextualUrl(path);
    return router.replace(contextualPath, undefined, options);
  };

  const back = () => {
    router.back();
  };

  const getProductUrl = (productId: string) => {
    return getContextualUrl(`/products/${productId}`);
  };

  const getProductsUrl = () => {
    return getContextualUrl('/products');
  };

  const getCartUrl = () => {
    return getContextualUrl('/cart');
  };

  const getCheckoutUrl = () => {
    return getContextualUrl('/checkout');
  };

  return {
    push,
    replace,
    back,
    getProductUrl,
    getProductsUrl,
    getCartUrl,
    getCheckoutUrl,
    contextType,
    slug,
    isInStore,
  };
}

