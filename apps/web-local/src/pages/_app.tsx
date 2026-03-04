import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfilePanelProvider } from '@/contexts/ProfilePanelContext';
import { SelectedBusinessProvider } from '@/contexts/SelectedBusinessContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfilePanelProvider>
          <SelectedBusinessProvider>
            <Component {...pageProps} />
          </SelectedBusinessProvider>
        </ProfilePanelProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

