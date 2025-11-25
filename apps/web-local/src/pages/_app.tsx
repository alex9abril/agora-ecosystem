import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { SelectedBusinessProvider } from '@/contexts/SelectedBusinessContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <SelectedBusinessProvider>
        <Component {...pageProps} />
      </SelectedBusinessProvider>
    </AuthProvider>
  );
}

