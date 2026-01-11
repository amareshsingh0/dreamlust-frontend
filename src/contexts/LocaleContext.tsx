/**
 * Locale Context
 * Manages user's language and currency preferences from backend
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, SUPPORTED_CURRENCIES, CURRENCY_NAMES } from '@/lib/preferences/constants';

interface LocaleContextType {
  language: string;
  currency: string;
  setLanguage: (language: string) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  detectedLanguage?: string;
  languages: typeof LANGUAGE_NAMES;
  currencies: typeof CURRENCY_NAMES;
  supportedLanguages: readonly string[];
  supportedCurrencies: readonly string[];
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('language') || 'en';
  });
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('currency') || 'INR';
  });
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Load preferences from backend when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadPreferences();
    } else {
      // For non-authenticated users, use localStorage and detect browser language
      const browserLang = navigator.language.split('-')[0];
      if (SUPPORTED_LANGUAGES.includes(browserLang as any) && !localStorage.getItem('language')) {
        setLanguageState(browserLang);
        setDetectedLanguage(browserLang);
      }
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadPreferences = async () => {
    try {
      const response = await api.preferences.get();
      if (response.success && response.data) {
        const prefs = response.data as { language?: string; currency?: string };
        if (prefs.language) {
          setLanguageState(prefs.language);
          localStorage.setItem('language', prefs.language);
        }
        if (prefs.currency) {
          setCurrencyState(prefs.currency);
          localStorage.setItem('currency', prefs.currency);
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Fallback to localStorage
      const storedLang = localStorage.getItem('language');
      const storedCurrency = localStorage.getItem('currency');
      if (storedLang) setLanguageState(storedLang);
      if (storedCurrency) setCurrencyState(storedCurrency);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = async (newLanguage: string) => {
    if (!SUPPORTED_LANGUAGES.includes(newLanguage as any)) {
      return;
    }

    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
    setDetectedLanguage(undefined);

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        await api.preferences.update({ language: newLanguage });
      } catch (error) {
        console.error('Failed to save language preference:', error);
      }
    }
  };

  const setCurrency = async (newCurrency: string) => {
    if (!SUPPORTED_CURRENCIES.includes(newCurrency as any)) {
      return;
    }

    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);

    // Save to backend if authenticated
    if (isAuthenticated) {
      try {
        await api.preferences.update({ currency: newCurrency });
      } catch (error) {
        console.error('Failed to save currency preference:', error);
      }
    }
  };

  return (
    <LocaleContext.Provider
      value={{
        language,
        currency,
        setLanguage,
        setCurrency,
        detectedLanguage,
        languages: LANGUAGE_NAMES,
        currencies: CURRENCY_NAMES,
        supportedLanguages: SUPPORTED_LANGUAGES,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        loading,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
