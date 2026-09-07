import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vi } from '../locales/vi';
import { en } from '../locales/en';

const dictionaries = { vi, en };

// Helper to resolve nested keys like "nav.home"
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'vi', // 'vi' | 'en'

      setLanguage: (lang) => {
        const nextLang = lang === 'en' ? 'en' : 'vi';
        if (typeof document !== 'undefined') {
          document.documentElement.lang = nextLang;
        }
        set({ language: nextLang });
      },

      toggleLanguage: () => {
        const current = get().language;
        const next = current === 'vi' ? 'en' : 'vi';
        get().setLanguage(next);
      },

      t: (key, params = {}) => {
        const lang = get().language || 'vi';
        const dict = dictionaries[lang] || dictionaries.vi;
        
        let val = getNestedValue(dict, key);
        if (val === undefined && lang !== 'vi') {
          // Fallback to Vietnamese
          val = getNestedValue(dictionaries.vi, key);
        }

        if (val === undefined) {
          return key;
        }

        if (typeof val === 'string' && params && Object.keys(params).length > 0) {
          return val.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, match) => {
            return params[match] !== undefined ? params[match] : `{{${match}}}`;
          });
        }

        return val;
      }
    }),
    {
      name: 'hanora-language-storage',
      partialize: (state) => ({ language: state.language })
    }
  )
);

// Standalone translation helper for non-component calls
export const t = (key, params) => useLanguageStore.getState().t(key, params);
export const getLanguage = () => useLanguageStore.getState().language || 'vi';
