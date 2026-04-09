import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/products';

const FAVORITES_KEY = 'agora_favorite_products';

type FavoriteItem = {
  id: string;
  name: string;
  image_url?: string | null;
  primary_image_url?: string | null;
  price?: number;
  added_at: string;
};

type FavoritesContextType = {
  favorites: FavoriteItem[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFavorites(parsed as FavoriteItem[]);
      }
    } catch (error) {
      console.warn('[Favorites] No se pudieron cargar favoritos:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('[Favorites] No se pudieron guardar favoritos:', error);
    }
  }, [favorites]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.id)), [favorites]);

  const isFavorite = (productId: string): boolean => favoriteIds.has(productId);

  const toggleFavorite = (product: Product): boolean => {
    const exists = favoriteIds.has(product.id);
    if (exists) {
      setFavorites((prev) => prev.filter((f) => f.id !== product.id));
      return false;
    }
    const nextItem: FavoriteItem = {
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      primary_image_url: product.primary_image_url,
      price: product.price,
      added_at: new Date().toISOString(),
    };
    setFavorites((prev) => [nextItem, ...prev.filter((f) => f.id !== product.id)]);
    return true;
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}

