import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';

export default function CatalogIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/catalog/classifications');
  }, [router]);

  return (
    <LocalLayout>
      <Head>
        <title>Catalogo | LOCALIA Local</title>
      </Head>
      <div className="p-6">
        <p className="text-sm text-gray-600">Redirigiendo al modulo de clasificaciones...</p>
      </div>
    </LocalLayout>
  );
}
