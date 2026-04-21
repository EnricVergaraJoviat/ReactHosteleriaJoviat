import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const DEFAULT_LANGUAGE = 'ca';
const LANGUAGE_STORAGE_KEY = 'joviat-language';
const SUPPORTED_LANGUAGES = ['ca', 'es', 'en'];

const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  languages: SUPPORTED_LANGUAGES,
  setLanguage: () => {},
  t: (key, params) => interpolate(translations[DEFAULT_LANGUAGE]?.[key] ?? key, params),
});

function interpolate(template, params = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] == null ? '' : String(params[key])
  );
}

function getInitialLanguage() {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
}

function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (nextLanguage) => {
    if (SUPPORTED_LANGUAGES.includes(nextLanguage)) {
      setLanguageState(nextLanguage);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {}
  }, [language]);

  const value = useMemo(() => {
    const t = (key, params) => {
      const template = translations[language]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
      return interpolate(template, params);
    };

    return {
      language,
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n() {
  return useContext(I18nContext);
}

export { I18nProvider, useI18n };
