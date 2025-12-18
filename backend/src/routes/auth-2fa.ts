import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { validateBody } from '../middleware/validation';
import { strictRateLimiter, userRateLimiter, loginRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { generate2FASecret, verify2FAToken, enable2FA, disable2FA } from '../lib/auth/2fa';
import { generateTokenPair } from '../lib/auth/jwt';
import { sessionStore, generateSessionId } from '../lib/auth/session';
import { z } from 'zod';
import { UnauthorizedError, ValidationError } from '../lib/errors';
import { csrfProtect } from '../middleware/csrf';

const router = Router();

const enable2FASchema = z.object({
  token: z.string().length(6, '2FA token must be 6 digits'),
});

const verify2FALoginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  token: z.string().length(6, '2FA token must be 6 digits'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * GET /api/auth/2fa/generate
 * Generate 2FA secret and QR code (for admin accounts)
 */
router.get(
  '/generate',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate 2FA secret
    const secret = await generate2FASecret(userId, user.email);

    // Store secret temporarily (user needs to verify before enabling)
    // In production, store in session or encrypted temporary storage
    // For now, we'll return it and require immediate verification

    res.json({
      success: true,
      data: {
        secret: secret.secret,
        qrCodeUrl: secret.qrCodeUrl,
        message: 'Scan QR code with authenticator app and verify with token',
      },
    });
  })
);

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA after verification (for admin accounts)
 */
router.post(
  '/enable',
  authenticate,
  requireAdmin,
  strictRateLimiter,
  csrfProtect,
  validateBody(enable2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { token, secret } = req.body;

    if (!secret) {
      throw new ValidationError('2FA secret is required');
    }

    // Verify token
    const isValid = verify2FAToken(secret, token);

    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    // Enable 2FA
    await enable2FA(userId, secret);

    res.json({
      success: true,
      message: '2FA has been enabled successfully',
    });
  })
);

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires current 2FA token)
 */
router.post(
  '/disable',
  authenticate,
  requireAdmin,
  strictRateLimiter,
  csrfProtect,
  validateBody(enable2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { token } = req.body;

    // Get user's 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ValidationError('2FA is not enabled for this account');
    }

    // Verify token before disabling
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    // Disable 2FA
    await disable2FA(userId);

    res.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  })
);

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA token (for login)
 */
router.post(
  '/verify',
  authenticate,
  strictRateLimiter,
  validateBody(enable2FASchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { token } = req.body;

    // Get user's 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ValidationError('2FA is not enabled for this account');
    }

    // Verify token
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    res.json({
      success: true,
      message: '2FA token verified successfully',
    });
  })
);

/**
 * POST /api/auth/2fa/verify-login
 * Verify 2FA token during login (completes the login process)
 * This endpoint is for users who have 2FA enabled and need to complete login
 */
router.post(
  '/verify-login',
  loginRateLimiter,
  validateBody(verify2FALoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, token, rememberMe } = req.body;

    // Get user with 2FA settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Verify 2FA is enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ValidationError('2FA is not enabled for this account');
    }

    // Verify the 2FA token
    const isValid = verify2FAToken(user.twoFactorSecret, token);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA token');
    }

    // 2FA verified - generate tokens and complete login
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const sessionData = {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
    };

    await sessionStore.create(sessionId, sessionData);

    // Set httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        tokens: {
          accessToken: tokens.accessToken,
        },
      },
    });
  })
);

export default router;

