/**
 * Language and Currency Constants
 * Frontend constants matching backend
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
  'INR', // Indian Rupee (default)
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
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

