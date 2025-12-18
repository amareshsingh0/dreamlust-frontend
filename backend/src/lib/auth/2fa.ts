import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../prisma';

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
}

/**
 * Generate 2FA secret for a user
 */
export async function generate2FASecret(userId: string, email: string): Promise<TwoFactorSecret> {
  const secret = speakeasy.generateSecret({
    name: `Dreamlust (${email})`,
    issuer: 'Dreamlust',
    length: 32,
  });

  // Store secret temporarily (user needs to verify before enabling)
  // In production, store in encrypted format
  const secretBase32 = secret.base32;

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  return {
    secret: secretBase32,
    qrCodeUrl,
  };
}

/**
 * Verify 2FA token
 */
export function verify2FAToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps (60 seconds) before/after
  });
}

/**
 * Enable 2FA for a user (after verification)
 */
export async function enable2FA(userId: string, secret: string): Promise<void> {
  // Store secret in database (in production, encrypt before storing)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret, // TODO: Encrypt before storing in production
    },
  });
}

/**
 * Disable 2FA for a user
 */
export async function disable2FA(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });
}

