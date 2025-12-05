/**
 * Grid de productos con filtros por contexto
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { productsService, Product } from '@/lib/products';
import { useStoreContext } from '@/contexts/StoreContext';
import ProductCard from './ProductCard';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface ProductGridProps {
  filters?: {
    categoryId?: string;
    search?: string;
    isFeatured?: boolean;
  };
  onProductClick?: (product: Product) => void;
  className?: string;
}

export default function ProductGrid({ filters, onProductClick, className = '' }: ProductGridProps) {
  const router = useRouter();
  const { contextType, groupId, branchId, brandId } = useStoreContext();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [contextType, groupId, branchId, brandId, filters]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        isAvailable: true,
        ...filters,
      };

      // Filtrar según contexto
      if (contextType === 'grupo' && groupId) {
        params.groupId = groupId;
      } else if (contextType === 'sucursal' && branchId) {
        params.branchId = branchId;
      } else if (contextType === 'brand' && brandId) {
        params.vehicleBrandId = brandId;
      }

      const response = await productsService.getProducts(params);
      setProducts(response.data || []);
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: Product) => {
    // Requerir login solo al agregar al carrito
    if (!isAuthenticated) {
      const shouldLogin = confirm('Debes iniciar sesión para agregar productos al carrito. ¿Deseas iniciar sesión ahora?');
      if (shouldLogin) {
        router.push('/auth/login');
      }
      return;
    }

    try {
      await addItem(product.id, 1);
    } catch (error: any) {
      console.error('Error agregando al carrito:', error);
      alert(error.message || 'Error al agregar producto al carrito');
    }
  };

  if (loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg ${className}`}>
        {error}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="max-w-md mx-auto">
          {/* Icono grande y llamativo */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Círculo de fondo con gradiente */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full blur-xl opacity-50"></div>
              {/* Icono principal */}
              <div className="relative bg-gray-50 rounded-full p-8 border-4 border-gray-200">
                <svg 
                  className="w-24 h-24 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" 
                  />
                </svg>
              </div>
              {/* Icono de búsqueda superpuesto */}
              <div className="absolute -bottom-2 -right-2 bg-toyota-red rounded-full p-3 shadow-lg">
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Mensaje principal */}
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          
          {/* Mensaje secundario */}
          <p className="text-gray-600 mb-6">
            No hay productos disponibles en este momento. 
            <br />
            Intenta con otros filtros o vuelve más tarde.
          </p>
          
          {/* Línea decorativa */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px bg-gray-200 flex-1 max-w-20"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <div className="h-px bg-gray-200 flex-1 max-w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onProductClick ? undefined : handleAddToCart}
        />
      ))}
    </div>
  );
}

