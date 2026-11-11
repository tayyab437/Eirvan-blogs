import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, TRANSLATIONS, LanguageInfo } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentLanguageInfo: LanguageInfo;
  languages: LanguageInfo[];
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'eirvan_preferred_lang';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    
    // Check URL query param first (?lang=es)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as SupportedLanguage;
    if (urlLang && ['en', 'es', 'de', 'fr', 'ja'].includes(urlLang)) {
      return urlLang;
    }

    // Check localStorage next
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
    if (saved && ['en', 'es', 'de', 'fr', 'ja'].includes(saved)) {
      return saved;
    }

    // Detect browser language
    const browserLang = navigator.language.slice(0, 2) as SupportedLanguage;
    if (['es', 'de', 'fr', 'ja'].includes(browserLang)) {
      return browserLang;
    }

    return 'en';
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      
      // Update HTML lang attribute
      document.documentElement.lang = lang;

      // Update URL param without full reload
      const url = new URL(window.location.href);
      if (lang === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      window.history.replaceState({}, '', url.toString());

      // Update or create hreflang tags for Google Search Console
      updateHreflangTags(url.origin + url.pathname);
    }
  }, []);

  // Sync on initial load and route changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      updateHreflangTags(origin + pathname);
    }
  }, [language]);

  const currentLanguageInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const t = useCallback((key: string, fallback?: string): string => {
    const langDict = TRANSLATIONS[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentLanguageInfo,
        languages: SUPPORTED_LANGUAGES,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

/**
 * Injects Google-compliant <link rel="alternate" hreflang="..." href="..." /> tags
 */
function updateHreflangTags(baseUrl: string) {
  if (typeof document === 'undefined') return;

  const existingTags = document.querySelectorAll('link[rel="alternate"][hreflang]');
  existingTags.forEach(el => el.remove());

  // Generate hreflang tags for all supported languages
  SUPPORTED_LANGUAGES.forEach(lang => {
    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'alternate');
    linkEl.setAttribute('hreflang', lang.code);
    linkEl.setAttribute('href', lang.code === 'en' ? baseUrl : `${baseUrl}?lang=${lang.code}`);
    document.head.appendChild(linkEl);
  });

  // Add x-default fallback for international users
  const xDefaultEl = document.createElement('link');
  xDefaultEl.setAttribute('rel', 'alternate');
  xDefaultEl.setAttribute('hreflang', 'x-default');
  xDefaultEl.setAttribute('href', baseUrl);
  document.head.appendChild(xDefaultEl);
}
