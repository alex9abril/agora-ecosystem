import type { AppProps } from 'next/app';
import { StoreProvider } from '@/contexts/StoreContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider>
      <AuthProvider>
        <CartProvider>
          <Component {...pageProps} />
        </CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}

