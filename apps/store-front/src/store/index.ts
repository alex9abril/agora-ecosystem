/**
 * Redux Store Configuration
 * Store centralizado para el estado global de la aplicación
 */

import { configureStore } from '@reduxjs/toolkit';
import categoriesReducer from './slices/categoriesSlice';

export const store = configureStore({
  reducer: {
    categories: categoriesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignorar acciones que contengan funciones o no serializables
        ignoredActions: [],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

