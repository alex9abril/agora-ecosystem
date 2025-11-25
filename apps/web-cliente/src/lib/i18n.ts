/**
 * Sistema de internacionalización
 * Detecta el idioma del dispositivo y permite cambiarlo
 */

export type Language = 'en' | 'es';

export const supportedLanguages: Language[] = ['en', 'es'];

export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
};

/**
 * Detectar idioma del dispositivo
 */
export function detectDeviceLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'es'; // Default para SSR
  }

  // Primero verificar si hay un idioma guardado
  const { getLanguage } = require('./storage');
  const savedLanguage = getLanguage();
  if (savedLanguage) {
    return savedLanguage;
  }

  // Detectar del navegador
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  if (browserLang) {
    const langCode = browserLang.split('-')[0].toLowerCase();
    if (langCode === 'es' || langCode === 'en') {
      return langCode;
    }
  }

  // Default a español
  return 'es';
}

/**
 * Cambiar idioma
 */
export function setLanguage(lang: Language): void {
  if (typeof window !== 'undefined') {
    const { setLanguage: saveLanguage } = require('./storage');
    saveLanguage(lang);
  }
}

