/**
 * Language and Currency Constants
 * Supported languages and currencies for the platform
 */

export const SUPPORTED_LANGUAGES = [
  'en', // English
  'es', // Spanish
  'fr', // French
  'de', // German
  'it', // Italian
  'pt', // Portuguese
  'ru', // Russian
  'ja', // Japanese
  'ko', // Korean
  'zh', // Chinese
  'hi', // Hindi
  'ar', // Arabic
] as const;

export const LANGUAGE_NAMES: Record<string, { native: string; english: string }> = {
  en: { native: 'English', english: 'English' },
  es: { native: 'Español', english: 'Spanish' },
  fr: { native: 'Français', english: 'French' },
  de: { native: 'Deutsch', english: 'German' },
  it: { native: 'Italiano', english: 'Italian' },
  pt: { native: 'Português', english: 'Portuguese' },
  ru: { native: 'Русский', english: 'Russian' },
  ja: { native: '日本語', english: 'Japanese' },
  ko: { native: '한국어', english: 'Korean' },
  zh: { native: '中文', english: 'Chinese' },
  hi: { native: 'हिन्दी', english: 'Hindi' },
  ar: { native: 'العربية', english: 'Arabic' },
};

export const SUPPORTED_CURRENCIES = [
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'INR', // Indian Rupee
  'JPY', // Japanese Yen
  'CNY', // Chinese Yuan
  'KRW', // South Korean Won
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'SGD', // Singapore Dollar
  'AED', // UAE Dirham
  'SAR', // Saudi Riyal
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
  SAR: '﷼',
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  INR: 'Indian Rupee',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  KRW: 'South Korean Won',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar',
  AED: 'UAE Dirham',
  SAR: 'Saudi Riyal',
};

// Exchange rates (simplified - in production, use real-time API)
// Base currency: USD
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.0,
  JPY: 149.0,
  CNY: 7.2,
  KRW: 1320.0,
  AUD: 1.52,
  CAD: 1.35,
  SGD: 1.34,
  AED: 3.67,
  SAR: 3.75,
};

