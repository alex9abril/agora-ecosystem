import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Página de callback para manejar la confirmación de email de Supabase
 * 
 * Supabase redirige aquí después de que el usuario confirma su email
 * con el token en la URL (#access_token=...)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando confirmación...');

  useEffect(() => {
    // Extraer el token del hash de la URL
    const hash = window.location.hash.substring(1); // Remover el #
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || 'Error al confirmar el email');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      return;
    }

    if (accessToken && refreshToken) {
      // Importar funciones de storage
      const storage = await import('@/lib/storage');
      
      // Guardar tokens en sessionStorage
      storage.setAuthToken(accessToken);
      storage.setRefreshToken(refreshToken);

      // Obtener información del usuario desde el token
      try {
        // Decodificar el JWT para obtener información básica
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        
        // Guardar información básica del usuario
        const user = {
          id: payload.sub,
          email: payload.email,
          first_name: payload.user_metadata?.first_name,
          last_name: payload.user_metadata?.last_name,
          phone: payload.user_metadata?.phone,
        };
        
        storage.setUser(user);

        setStatus('success');
        setMessage('Email confirmado exitosamente. Redirigiendo...');

        // Redirigir al dashboard después de 1 segundo
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } catch (err) {
        console.error('Error procesando token:', err);
        setStatus('error');
        setMessage('Error al procesar la confirmación');
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      }
    } else {
      setStatus('error');
      setMessage('No se encontró el token de acceso');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    }
  }, [router, signIn]);

  return (
    <>
      <Head>
        <title>Confirmando Email - LOCALIA Admin</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-green-600 font-medium">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-red-600 font-medium">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Serás redirigido al inicio de sesión...
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

