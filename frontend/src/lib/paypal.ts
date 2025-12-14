/**
 * PayPal Client Configuration
 */

// Get PayPal Client ID from environment
const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';

export const getPayPalClientId = () => {
  if (!paypalClientId) {
    console.warn('PayPal Client ID not configured. Please set VITE_PAYPAL_CLIENT_ID in your .env file');
  }
  return paypalClientId;
};

