/**
 * Currency Helper Functions
 * Format prices and convert currencies
 */

import { EXCHANGE_RATES, CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES } from './constants';

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1.0;
  const toRate = EXCHANGE_RATES[toCurrency] || 1.0;

  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Some currencies put symbol after amount
  if (currency === 'EUR' || currency === 'GBP') {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}

/**
 * Get localized price (convert and format)
 */
export function getLocalizedPrice(amount: number, fromCurrency: string, toCurrency: string): string {
  const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency);
  return formatPrice(convertedAmount, toCurrency);
}

/**
 * Validate currency code
 */
export function isValidCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency as any);
}

