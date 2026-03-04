'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ProfilePanelContextValue {
  isProfilePanelOpen: boolean;
  setProfilePanelOpen: (open: boolean) => void;
  openProfilePanel: () => void;
  closeProfilePanel: () => void;
}

const ProfilePanelContext = createContext<ProfilePanelContextValue | null>(null);

export function ProfilePanelProvider({ children }: { children: ReactNode }) {
  const [isProfilePanelOpen, setProfilePanelOpen] = useState(false);
  const openProfilePanel = useCallback(() => setProfilePanelOpen(true), []);
  const closeProfilePanel = useCallback(() => setProfilePanelOpen(false), []);

  return (
    <ProfilePanelContext.Provider
      value={{
        isProfilePanelOpen,
        setProfilePanelOpen,
        openProfilePanel,
        closeProfilePanel,
      }}
    >
      {children}
    </ProfilePanelContext.Provider>
  );
}

export function useProfilePanel() {
  const ctx = useContext(ProfilePanelContext);
  if (!ctx) throw new Error('useProfilePanel must be used within ProfilePanelProvider');
  return ctx;
}
