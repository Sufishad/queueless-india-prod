import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LanguageCode, TranslationSchema, translations } from '../i18n/translations';
import { zustandStorage } from '../storage';

interface LanguageState {
  language: LanguageCode;
  currentLanguage: LanguageCode;
  t: TranslationSchema;
  setLanguage: (lang: LanguageCode) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'hi', // Default to Hindi / Indian Market priority
      currentLanguage: 'hi',
      t: translations.hi,
      setLanguage: (lang: LanguageCode) => {
        set({
          language: lang,
          currentLanguage: lang,
          t: translations[lang] || translations.hi,
        });
      },
    }),
    {
      name: 'queueless_language_store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ language: state.language, currentLanguage: state.language }),
      onRehydrateStorage: () => (state) => {
        if (state && state.language) {
          state.currentLanguage = state.language;
          state.t = translations[state.language] || translations.hi;
        }
      },
    }
  )
);
