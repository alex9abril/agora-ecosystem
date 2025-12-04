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
  const { contextType, groupId, branchId } = useStoreContext();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [contextType, groupId, branchId, filters]);

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
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500">No se encontraron productos</p>
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

