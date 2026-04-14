import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ResetPasswordPanel from '@/components/auth/ResetPasswordPanel';

export default function ContextualResetPasswordPage() {
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

  return <ResetPasswordPanel loginHref={`/${origen}/${slug}/auth/login`} />;
}
