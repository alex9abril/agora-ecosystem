/**
 * Contexto de internacionalización
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, detectDeviceLanguage } from '@/lib/i18n';
import { setLanguage as saveLanguage } from '@/lib/storage';
import { translations } from '@/lib/i18n/translations';

interface I18nContextType {
  language: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');

  // Inicializar idioma
  useEffect(() => {
    const detectedLang = detectDeviceLanguage();
    setLanguageState(detectedLang);
  }, []);

  // Función de traducción
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Retornar la clave si no se encuentra
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  // Cambiar idioma
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
    // No recargar la página, solo actualizar el estado
    // El cambio se aplicará inmediatamente en todos los componentes
  };

  const value: I18nContextType = {
    language,
    t,
    setLanguage,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n debe usarse dentro de un I18nProvider');
  }
  return context;
}

