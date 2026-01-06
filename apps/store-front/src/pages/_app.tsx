import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { StoreProvider } from '@/contexts/StoreContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import CategoriesInitializer from '@/components/CategoriesInitializer';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <StoreProvider>
        <AuthProvider>
          <CartProvider>
            <CategoriesInitializer />
            <Component {...pageProps} />
          </CartProvider>
        </AuthProvider>
      </StoreProvider>
    </Provider>
  );
}

