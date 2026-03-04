import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LocalLayout from '@/components/layout/LocalLayout';

/**
 * La página /profile redirige a inicio con el panel de perfil abierto,
 * para no interrumpir la interfaz principal (el perfil se muestra en panel flotante).
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/login');
      return;
    }
    router.replace('/?profile=open');
  }, [user, token, router]);

  if (!user) return null;

  return (
    <LocalLayout>
      <Head>
        <title>Mi perfil - AGORA Local</title>
      </Head>
      <div className="flex justify-end px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirigiendo a Mi perfil…</p>
      </div>
    </LocalLayout>
  );
}
