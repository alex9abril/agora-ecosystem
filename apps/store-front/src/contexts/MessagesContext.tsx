import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreContext } from '@/contexts/StoreContext';
import { messagesService } from '@/lib/messages';

type MessagesContextValue = {
  unread: number;
  refreshUnread: () => Promise<void>;
  markReadLocal: () => void;
};

const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { branchId } = useStoreContext();
  const [unread, setUnread] = useState(0);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }

    if (refreshInFlight.current) return refreshInFlight.current;

    refreshInFlight.current = (async () => {
      try {
        const res = await messagesService.unreadCount(branchId ? { business_id: branchId } : undefined);
        setUnread(Number(res.unread || 0));
      } catch {
        // ignore noisy errors in UI badge
      } finally {
        refreshInFlight.current = null;
      }
    })();

    return refreshInFlight.current;
  }, [isAuthenticated, branchId]);

  const markReadLocal = useCallback(() => {
    setUnread((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onFocus = () => refreshUnread();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, refreshUnread]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = window.setInterval(() => refreshUnread(), 60_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo<MessagesContextValue>(
    () => ({ unread, refreshUnread, markReadLocal }),
    [unread, refreshUnread, markReadLocal],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessagesNotifications() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessagesNotifications debe usarse dentro de MessagesProvider');
  return ctx;
}

