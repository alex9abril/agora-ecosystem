import Head from 'next/head';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import { LayoutShellProvider } from './layout-shell';

const COLLAPSED_KEY = 'web-admin.sidebar-collapsed';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { loading, token, user } = useAuth();
  const router = useRouter();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsedState] = useState(true);

  useEffect(() => {
    if (!loading && !token && !user) {
      router.push('/auth/login');
    }
  }, [loading, token, user, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored === '0') setLeftCollapsedState(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const close = () => {
      setLeftOpen(false);
      setRightOpen(false);
    };
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  const setLeftCollapsed = (collapsed: boolean) => {
    setLeftCollapsedState(collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const shell = useMemo(
    () => ({
      leftOpen,
      setLeftOpen,
      leftCollapsed,
      setLeftCollapsed,
      rightOpen,
      setRightOpen,
    }),
    [leftOpen, leftCollapsed, rightOpen],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!token && !user) {
    return null;
  }

  return (
    <LayoutShellProvider value={shell}>
      {title && (
        <Head>
          <title>{title} - AGORA Admin</title>
        </Head>
      )}
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />

          <div className="flex-1 flex min-w-0 overflow-hidden">
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-auto p-4 md:p-6">
              {children}
            </main>
            <RightSidebar />
          </div>
        </div>
      </div>
    </LayoutShellProvider>
  );
}
