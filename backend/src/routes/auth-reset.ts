import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, validatePasswordStrength } from '../lib/auth/password';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter, strictRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from '../schemas/auth';
import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../lib/email/passwordReset';

const router = Router();

// Import Redis for token storage
import { redis, isRedisAvailable } from '../lib/redis';

// Fallback in-memory storage for when Redis is unavailable
const resetTokensFallback = new Map<string, { userId: string; expiresAt: Date }>();

/**
 * POST /api/auth/reset-password/request
 * Request password reset
 */
router.post(
  '/request',
  strictRateLimiter, // Limit to prevent email spam
  validateBody(resetPasswordRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresIn = 60 * 60; // 1 hour in seconds

    // Store token in Redis (or fallback to in-memory if Redis unavailable)
    if (isRedisAvailable() && redis) {
      await redis.setex(`password-reset:${resetToken}`, expiresIn, user.id);
    } else {
      // Fallback to in-memory storage
      resetTokensFallback.set(resetToken, {
        userId: user.id,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      });
    }

    // Send reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.username || user.email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  })
);

/**
 * POST /api/auth/reset-password/verify
 * Verify reset token
 */
router.post(
  '/verify',
  strictRateLimiter,
  validateBody(z.object({
    token: z.string().min(1),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    // Get token from Redis or in-memory fallback
    let userId: string | null = null;
    
    if (isRedisAvailable() && redis) {
      userId = await redis.get(`password-reset:${token}`);
    } else {
      // Fallback to in-memory storage (for development)
      const tokenData = resetTokensFallback.get(token);
      if (tokenData && tokenData.expiresAt >= new Date()) {
        userId = tokenData.userId;
      } else if (tokenData) {
        // Clean up expired token
        resetTokensFallback.delete(token);
      }
    }

    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    res.json({
      success: true,
      message: 'Token is valid',
    });
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/',
  strictRateLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    // Get token from Redis or in-memory fallback
    let userId: string | null = null;
    
    if (isRedisAvailable() && redis) {
      userId = await redis.get(`password-reset:${token}`);
      if (userId) {
        // Delete token after use
        await redis.del(`password-reset:${token}`);
      }
    } else {
      // Fallback to in-memory storage (for development)
      const tokenData = resetTokensFallback.get(token);
      if (tokenData && tokenData.expiresAt >= new Date()) {
        userId = tokenData.userId;
        resetTokensFallback.delete(token);
      } else if (tokenData) {
        // Clean up expired token
        resetTokensFallback.delete(token);
      }
    }

    if (!userId) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Invalidate all user sessions (force re-login)
    const { sessionStore } = await import('../lib/auth/session');
    const userSessions = sessionStore.getUserSessions(userId);
    for (const sessionId of userSessions) {
      sessionStore.delete(sessionId);
    }

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    });
  })
);

export default router;

