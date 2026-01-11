/**
 * Currency Helper Functions
 * Format prices for display
 */

import { CURRENCY_SYMBOLS } from './constants';

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  
  // Format number based on currency
  let formattedAmount: string;
  
  if (currency === 'JPY' || currency === 'KRW') {
    // No decimal places for JPY and KRW
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } else {
    formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Some currencies put symbol after amount
  if (currency === 'EUR' || currency === 'GBP') {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}

/**
 * Format price for display (with locale-aware formatting)
 */
export function formatPriceLocalized(amount: number, currency: string = 'INR', locale: string = 'en'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback to simple formatting
    return formatPrice(amount, currency);
  }
}

