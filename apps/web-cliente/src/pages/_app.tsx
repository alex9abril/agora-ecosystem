import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { CartProvider } from '@/contexts/CartContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <Component {...pageProps} />
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

