import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { authService } from '@/lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authService.requestPasswordReset({ email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al solicitar recuperación de contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Recuperar Contraseña - LOCALIA Local</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Recuperar Contraseña
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Ingresa tu email para recibir un enlace de recuperación
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-800">
                  Si el email existe, recibirás un enlace para recuperar tu contraseña.
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={success}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || success}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : success ? 'Email Enviado' : 'Enviar Enlace'}
              </button>
            </div>

            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

