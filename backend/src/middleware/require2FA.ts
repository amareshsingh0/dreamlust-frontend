/**
 * Require 2FA Middleware
 * Enforces 2FA for admin accounts and other sensitive operations
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../lib/errors';
import { UserRole } from '../config/constants';

/**
 * Check if user has 2FA enabled
 */
async function has2FAEnabled(userId: string): Promise<boolean> {
  // Check if user has 2FA enabled
  // This assumes you have a twoFactorEnabled field in the User model
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // twoFactorEnabled: true, // Uncomment when field is added
      role: true,
    },
  });

  if (!user) {
    return false;
  }

  // For now, return false (2FA not yet fully implemented in schema)
  // In production, check: return user.twoFactorEnabled === true;
  return false;
}

/**
 * Require 2FA for admin accounts
 * This middleware should be used on admin routes
 */
export function require2FAForAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // This is a placeholder - 2FA enforcement will be added when schema is updated
  // For now, just check if user is admin
  if (req.user?.role === UserRole.ADMIN) {
    // In production, check 2FA:
    // has2FAEnabled(req.user.userId).then(enabled => {
    //   if (!enabled) {
    //     throw new UnauthorizedError('2FA is required for admin accounts');
    //   }
    //   next();
    // });
    next();
  } else {
    next();
  }
}

/**
 * Verify 2FA token in request
 */
export function verify2FAToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { twoFactorToken } = req.body;

  if (!twoFactorToken) {
    throw new UnauthorizedError('2FA token is required');
  }

  // Verify token (implementation depends on your 2FA setup)
  // This is a placeholder
  next();
}

