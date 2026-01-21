import Head from 'next/head';
import Link from 'next/link';
import LocalLayout from '@/components/layout/LocalLayout';

const catalogSections = [
  {
    title: 'Colecciones',
    description: 'Agrupa productos en colecciones por sucursal.',
    href: '/catalog/collections',
  },
];

export default function CatalogIndexPage() {
  return (
    <LocalLayout>
      <Head>
        <title>Catálogo | LOCALIA Local</title>
      </Head>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Catálogo</h1>
          <p className="text-sm text-gray-600">Selecciona un módulo para administrar.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </LocalLayout>
  );
}
