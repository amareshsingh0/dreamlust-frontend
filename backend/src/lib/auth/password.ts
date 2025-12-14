import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Hash password with bcrypt (12+ rounds for security)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * Updated to allow 6 characters minimum (matching UI), but encourage stronger passwords
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[]; warnings?: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Minimum requirement: 6 characters
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
    return { valid: false, errors };
  }

  // Warnings for weak passwords (but still allow them)
  if (password.length < 8) {
    warnings.push('Consider using at least 8 characters for better security');
  }
  if (!/[A-Z]/.test(password)) {
    warnings.push('Consider adding uppercase letters for better security');
  }
  if (!/[a-z]/.test(password)) {
    warnings.push('Consider adding lowercase letters for better security');
  }
  if (!/[0-9]/.test(password)) {
    warnings.push('Consider adding numbers for better security');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    warnings.push('Consider adding special characters for better security');
  }

  // Password is valid if it meets minimum length
  return {
    valid: true,
    errors: [],
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

