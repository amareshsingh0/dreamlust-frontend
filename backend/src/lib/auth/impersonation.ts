/**
 * JWT Impersonation Service
 * Allows admins to impersonate users for support purposes
 */

import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../prisma';

const IMPERSONATION_SECRET = env.JWT_SECRET + '_IMPERSONATION';
const IMPERSONATION_EXPIRY = '1h'; // 1 hour max impersonation

export interface ImpersonationTokenPayload {
  userId: string;
  originalAdminId: string;
  isImpersonation: true;
  iat?: number;
  exp?: number;
}

/**
 * Generate impersonation token
 */
export function generateImpersonationToken(
  userId: string,
  adminId: string
): string {
  const payload: ImpersonationTokenPayload = {
    userId,
    originalAdminId: adminId,
    isImpersonation: true,
  };

  return jwt.sign(payload, IMPERSONATION_SECRET, {
    expiresIn: IMPERSONATION_EXPIRY,
  });
}

/**
 * Verify impersonation token
 */
export function verifyImpersonationToken(
  token: string
): ImpersonationTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      IMPERSONATION_SECRET
    ) as ImpersonationTokenPayload;

    if (!decoded.isImpersonation) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if current request is impersonation
 */
export function isImpersonation(token: string): boolean {
  const decoded = verifyImpersonationToken(token);
  return decoded !== null;
}

/**
 * Get impersonation info from token
 */
export async function getImpersonationInfo(token: string): Promise<{
  isImpersonating: boolean;
  impersonatedUserId?: string;
  originalAdminId?: string;
  originalAdmin?: {
    id: string;
    email: string;
    username: string | null;
  } | null;
}> {
  const decoded = verifyImpersonationToken(token);

  if (!decoded) {
    return { isImpersonating: false };
  }

  const admin = await prisma.user.findUnique({
    where: { id: decoded.originalAdminId },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  return {
    isImpersonating: true,
    impersonatedUserId: decoded.userId,
    originalAdminId: decoded.originalAdminId,
    originalAdmin: admin,
  };
}

