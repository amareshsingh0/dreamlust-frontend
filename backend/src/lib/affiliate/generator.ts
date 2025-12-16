/**
 * Affiliate Code Generator
 * Generates unique affiliate codes
 */

/**
 * Generate a unique affiliate code
 * Format: 6-8 alphanumeric characters, uppercase
 */
export function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  const length = 6;
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Validate affiliate code format
 */
export function isValidAffiliateCode(code: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(code);
}

