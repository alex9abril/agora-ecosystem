import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ContextualLink from '@/components/ContextualLink';

export default function EmailVerifiedPage() {
  const router = useRouter();
  const { origen, slug, error, error_description: errorDescription } = router.query;

  const hasError = Boolean(error);
  const descriptionFromQuery = typeof errorDescription === 'string' ? decodeURIComponent(errorDescription) : '';
  const errorMessage = descriptionFromQuery || 'El enlace de verificacion es invalido o ha expirado.';

  const contextualLoginPath =
    typeof origen === 'string' && typeof slug === 'string'
      ? `/${origen}/${slug}/auth/login`
      : '/auth/login';

  return (
    <>
      <Head>
        <title>{hasError ? 'Problema al verificar correo' : 'Correo verificado'} - Agora</title>
      </Head>
      <div className="min-h-screen bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <div
              className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
                hasError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {hasError ? (
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <h1 className="text-center text-2xl font-bold text-gray-900">
              {hasError ? 'No se pudo verificar tu correo' : 'Tu correo se verifico correctamente'}
            </h1>

            <p className="mt-3 text-center text-sm text-gray-600">
              {hasError
                ? errorMessage
                : 'Tu cuenta ya esta confirmada. Ahora puedes iniciar sesion para continuar con tu compra.'}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <ContextualLink
                href={contextualLoginPath}
                className="inline-flex w-full items-center justify-center rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
              >
                Ir a iniciar sesion
              </ContextualLink>

              <ContextualLink
                href="/"
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Volver al inicio
              </ContextualLink>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
