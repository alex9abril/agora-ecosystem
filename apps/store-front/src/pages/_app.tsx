import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { StoreProvider } from '@/contexts/StoreContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { MessagesProvider } from '@/contexts/MessagesContext';
import { SupportChatProvider } from '@/contexts/SupportChatContext';
import CategoriesInitializer from '@/components/CategoriesInitializer';
import FloatingSupportChat from '@/components/support/FloatingSupportChat';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <StoreProvider>
        <AuthProvider>
          <MessagesProvider>
            <FavoritesProvider>
              <CartProvider>
                <SupportChatProvider>
                  <CategoriesInitializer />
                  <Component {...pageProps} />
                  <FloatingSupportChat />
                </SupportChatProvider>
              </CartProvider>
            </FavoritesProvider>
          </MessagesProvider>
        </AuthProvider>
      </StoreProvider>
    </Provider>
  );
}
