/**
 * Currency Conversion Service
 * Handles currency conversion and regional pricing
 */

// Currency exchange rates (base: USD)
// In production, fetch from external API (ExchangeRate-API, Fixer.io, etc.)
const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  INR: 83.12,
  BRL: 4.97,
  MXN: 17.05,
  CAD: 1.35,
  AUD: 1.52,
  CNY: 7.24,
  KRW: 1320.0,
  RUB: 92.5,
  AED: 3.67,
  SAR: 3.75,
  ZAR: 18.5,
  TRY: 32.0,
};

// Regional pricing adjustments (PPP - Purchasing Power Parity)
const REGIONAL_PRICING_ADJUSTMENTS: Record<string, number> = {
  US: 1.0,
  EU: 0.95,
  GB: 1.05,
  IN: 0.3,   // Adjusted for purchasing power
  BR: 0.4,
  MX: 0.45,
  PK: 0.25,
  BD: 0.2,
  NG: 0.35,
  KE: 0.4,
  PH: 0.5,
  VN: 0.45,
  ID: 0.4,
  TH: 0.5,
  // Add more countries as needed
};

/**
 * Get currency rate
 */
export function getCurrencyRate(currency: string): number {
  return CURRENCY_RATES[currency.toUpperCase()] || 1.0;
}

/**
 * Get regional pricing adjustment
 */
export function getRegionalAdjustment(country: string): number {
  return REGIONAL_PRICING_ADJUSTMENTS[country.toUpperCase()] || 1.0;
}

/**
 * Convert price to target currency
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = getCurrencyRate(fromCurrency);
  const toRate = getCurrencyRate(toCurrency);
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Get localized price with regional adjustment
 */
export function getLocalizedPrice(
  basePrice: number,
  baseCurrency: string,
  country: string,
  targetCurrency: string
): number {
  const convertedPrice = convertCurrency(basePrice, baseCurrency, targetCurrency);
  const adjustment = getRegionalAdjustment(country);
  return convertedPrice * adjustment;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string, locale?: string): string {
  const currencyCode = currency.toUpperCase();
  const localeCode = locale || getLocaleFromCurrency(currencyCode);
  
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Get locale from currency
 */
function getLocaleFromCurrency(currency: string): string {
  const currencyLocaleMap: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    INR: 'en-IN',
    BRL: 'pt-BR',
    MXN: 'es-MX',
    CAD: 'en-CA',
    AUD: 'en-AU',
    CNY: 'zh-CN',
    KRW: 'ko-KR',
    RUB: 'ru-RU',
    AED: 'ar-AE',
    SAR: 'ar-SA',
    ZAR: 'en-ZA',
    TRY: 'tr-TR',
  };
  
  return currencyLocaleMap[currency] || 'en-US';
}

/**
 * Get supported currencies
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_RATES);
}

/**
 * Get supported countries
 */
export function getSupportedCountries(): string[] {
  return Object.keys(REGIONAL_PRICING_ADJUSTMENTS);
}


