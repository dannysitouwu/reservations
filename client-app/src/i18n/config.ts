import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation';
import es from './locales/es/translation';

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: es
    },
    en: {
      translation: en
    }
  },
  lng:
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('reservapro_lang') || 'es'
      : 'es',
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  nonExplicitSupportedLngs: true,
  load: 'languageOnly',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
