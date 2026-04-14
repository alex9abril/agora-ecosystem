import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ForgotPasswordPanel from '@/components/auth/ForgotPasswordPanel';
import { getAbsoluteResetUrl } from '@/lib/password-recovery';

export default function ContextualForgotPasswordPage() {
  const router = useRouter();
  const { origen, slug } = router.query;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!router.isReady || !mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-600">Cargando…</div>
    );
  }

  if (typeof origen !== 'string' || typeof slug !== 'string') {
    return null;
  }

  return (
    <ForgotPasswordPanel
      redirectTo={getAbsoluteResetUrl(origen, slug)}
      loginHref={`/${origen}/${slug}/auth/login`}
    />
  );
}
