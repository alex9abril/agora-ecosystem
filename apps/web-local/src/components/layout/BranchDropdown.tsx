'use client';

import { useState, useRef, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';

export default function BranchDropdown() {
  const { availableBusinesses, selectedBusiness, selectBusiness, isLoading } = useSelectedBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isLoading && availableBusinesses.length === 0) {
    return null;
  }

  const handleSelect = (businessId: string) => {
    selectBusiness(businessId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => !isLoading && availableBusinesses.length > 0 && setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 min-w-[10rem] max-w-[14rem] rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-neutral-600 text-left"
        aria-label="Sucursal"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate">Cargando...</span>
        ) : (
          <>
            <svg
              className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <span className="text-sm font-normal truncate">
              {selectedBusiness?.business_name ?? 'Elegir sucursal'}
            </span>
            <svg
              className={`w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && availableBusinesses.length > 0 && (
        <div
          className="absolute left-0 mt-1 min-w-[12rem] max-w-[16rem] max-h-[20rem] overflow-y-auto bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-gray-200 dark:border-neutral-600 z-50 py-1"
          role="listbox"
          aria-label="Lista de sucursales"
        >
          {availableBusinesses.map((business) => (
            <button
              key={business.business_id}
              type="button"
              role="option"
              aria-selected={selectedBusiness?.business_id === business.business_id}
              onClick={() => handleSelect(business.business_id)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                selectedBusiness?.business_id === business.business_id
                  ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700'
              }`}
            >
              <svg
                className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="truncate">{business.business_name}</span>
              {selectedBusiness?.business_id === business.business_id && (
                <svg
                  className="w-4 h-4 flex-shrink-0 ml-auto text-emerald-600 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
