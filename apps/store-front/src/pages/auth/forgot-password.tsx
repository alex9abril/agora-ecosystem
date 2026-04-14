import { useEffect, useState } from 'react';
import ForgotPasswordPanel from '@/components/auth/ForgotPasswordPanel';

export default function GlobalForgotPasswordPage() {
  const [redirectTo, setRedirectTo] = useState('');

  useEffect(() => {
    setRedirectTo(`${window.location.origin}/auth/reset-password`);
  }, []);

  if (!redirectTo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-600">Cargando…</div>
    );
  }

  return <ForgotPasswordPanel redirectTo={redirectTo} loginHref="/auth/login" />;
}
