/**
 * Card de tienda para móvil
 */

import React from 'react';
import Link from 'next/link';
import { Business } from '@/lib/stores';
import { useI18n } from '@/contexts/I18nContext';
import StarIcon from '@mui/icons-material/Star';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface StoreCardProps {
  store: Business;
}

export default function StoreCard({ store }: StoreCardProps) {
  const { t } = useI18n();

  const rating = typeof store.rating_average === 'string' 
    ? parseFloat(store.rating_average) 
    : store.rating_average || 0;

  return (
    <Link href={`/stores/${store.id}`}>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
        {store.image_url && (
          <div className="aspect-video bg-gray-200 relative">
            <img
              src={store.image_url}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1">{store.name}</h3>
          {store.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {store.description}
            </p>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {rating > 0 && (
                <>
                  <StarIcon className="text-yellow-500 text-lg" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                  <span className="text-gray-500">
                    ({store.total_reviews} {t('stores.reviews')})
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                store.is_active ? 'bg-green-600' : 'bg-gray-400'
              }`} />
              <span className="text-gray-600">
                {store.is_active ? t('stores.open') : t('stores.closed')}
              </span>
            </div>
          </div>
          {store.address_city && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <LocationOnIcon className="text-sm" />
              <span>{store.address_city}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

