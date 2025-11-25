import { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '@/components/layout/AdminLayout';
import CategoriesManager from '@/components/catalog/CategoriesManager';
import ProductsManager from '@/components/catalog/ProductsManager';
import ProductTypeFieldConfigManager from '@/components/catalog/ProductTypeFieldConfigManager';
import TaxesManager from '@/components/catalog/TaxesManager';

type CatalogType = 'categories' | 'products' | 'product-type-field-config' | 'taxes' | 'collections' | 'promotions' | 'subscriptions' | 'ads';

interface CatalogItem {
  id: string;
  name: string;
  type: CatalogType;
  icon: React.ReactNode;
  description: string;
}

const catalogs: CatalogItem[] = [
  {
    id: 'categories',
    name: 'Categorías de Productos',
    type: 'categories',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    description: 'Categorías globales y por negocio',
  },
  {
    id: 'products',
    name: 'Productos',
    type: 'products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    description: 'Productos del menú de cada local',
  },
  {
    id: 'product-type-field-config',
    name: 'Tipos de Productos',
    type: 'product-type-field-config',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    description: 'Configurar campos del formulario por tipo de producto',
  },
  {
    id: 'taxes',
    name: 'Impuestos',
    type: 'taxes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Gestionar tipos de impuestos y tasas',
  },
  {
    id: 'collections',
    name: 'Colecciones',
    type: 'collections',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    description: 'Combos, menús del día, paquetes',
  },
  {
    id: 'promotions',
    name: 'Promociones',
    type: 'promotions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    description: 'Ofertas y códigos promocionales',
  },
  {
    id: 'subscriptions',
    name: 'Suscripciones',
    type: 'subscriptions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    description: 'Planes premium y suscripciones',
  },
  {
    id: 'ads',
    name: 'Publicidad',
    type: 'ads',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    description: 'Anuncios internos de negocios',
  },
];

export default function CatalogPage() {
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogType | null>(null);

  return (
    <>
      <Head>
        <title>Catálogo - LOCALIA Admin</title>
      </Head>

      <AdminLayout>
        <div className="flex h-[calc(100vh-120px)] gap-4">
          {/* Columna izquierda: Listado de catálogos */}
          <div className="w-64 bg-white rounded-lg border border-gray-200 p-4 overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-xs font-normal text-gray-900">Catálogos</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Selecciona un catálogo para gestionar
              </p>
            </div>

            <div className="space-y-1">
              {catalogs.map((catalog) => (
                <button
                  key={catalog.id}
                  onClick={() => setSelectedCatalog(catalog.type)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                    selectedCatalog === catalog.type
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className={`mt-0.5 ${selectedCatalog === catalog.type ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {catalog.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal">{catalog.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {catalog.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Columna derecha: Contenido del catálogo seleccionado */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 overflow-y-auto">
            {selectedCatalog ? (
              <div>
                <h1 className="text-sm font-normal text-gray-900 mb-1">
                  {catalogs.find((c) => c.type === selectedCatalog)?.name}
                </h1>
                <p className="text-xs text-gray-500 mb-6">
                  {catalogs.find((c) => c.type === selectedCatalog)?.description}
                </p>

                {/* Renderizar componente específico del catálogo */}
                {selectedCatalog === 'categories' && <CategoriesManager />}
                {selectedCatalog === 'products' && <ProductsManager />}
                {selectedCatalog === 'product-type-field-config' && <ProductTypeFieldConfigManager />}
                {selectedCatalog === 'taxes' && <TaxesManager />}
                {selectedCatalog !== 'categories' && selectedCatalog !== 'products' && selectedCatalog !== 'product-type-field-config' && selectedCatalog !== 'taxes' && (
                  <div className="text-center py-12">
                    <p className="text-xs text-gray-500">
                      Gestión de {selectedCatalog} - Por implementar
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <p className="text-xs text-gray-500">
                    Selecciona un catálogo del menú izquierdo para comenzar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

