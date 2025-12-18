import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/auth/password';
import { generateTokenPair, verifyToken, TokenType } from '../lib/auth/jwt';
import { generateSessionId, sessionStore } from '../lib/auth/session';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter, strictRateLimiter, loginRateLimiter } from '../middleware/rateLimit';
import { getCsrfToken } from '../middleware/csrf';
import { csrfProtect } from '../middleware/csrf';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../schemas/auth';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';
import { UserRole } from '../config/constants';
import cookieParser from 'cookie-parser';
import { awardDailyLogin } from '../lib/loyalty/points';
// Session caching is now handled in sessionStore

const router = Router();

// Use cookie parser for httpOnly cookies
router.use(cookieParser());

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  strictRateLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, username, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        deleted_at: null,
      },
    });

    if (existingUser) {
      throw new ConflictError(
        existingUser.email === email ? 'Email already registered' : 'Username already taken'
      );
    }

    // Validate password strength (minimum 6 chars, warnings for weak passwords)
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors);
    }
    // Log warnings but don't block registration
    if (passwordValidation.warnings && passwordValidation.warnings.length > 0) {
      console.log('Password strength warnings:', passwordValidation.warnings);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        display_name: displayName || username,
        role: UserRole.USER,
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        role: true,
        created_at: true,
      },
    });

    // Track referral if affiliate code provided
    const affiliateCode = req.body.affiliateCode || req.query.affiliateCode;
    if (affiliateCode) {
      try {
        // Track referral directly (non-blocking)
        const affiliate = await prisma.affiliate.findUnique({
          where: { code: affiliateCode },
        });

        if (affiliate && affiliate.status === 'approved') {
          // Check if referral already exists
          const existing = await prisma.referral.findFirst({
            where: { referredUserId: user.id },
          });

          if (!existing) {
            // Create referral
            await prisma.referral.create({
              data: {
                affiliateId: affiliate.id,
                referredUserId: user.id,
                status: 'pending',
              },
            });

            // Update affiliate total referrals
            await prisma.affiliate.update({
              where: { id: affiliate.id },
              data: {
                totalReferrals: { increment: 1 },
              },
            });
          }
        }
      } catch (error) {
        // Don't fail registration if referral tracking fails
        // Log error but don't throw
        const logger = (await import('../lib/logger')).default;
        logger.warn('Referral tracking failed', {
          error: error instanceof Error ? error.message : String(error),
          affiliateCode,
        });
      }
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    await sessionStore.create(sessionId, {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          // Don't send refresh token in response if using httpOnly cookie
        },
      },
    });
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, rememberMe } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        role: true,
        status: true,
        deleted_at: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if 2FA is enabled for this user
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Return response indicating 2FA is required
      // Don't generate full tokens yet - user must verify 2FA first
      return res.json({
        success: true,
        data: {
          requires2FA: true,
          userId: user.id,
          message: 'Two-factor authentication required',
        },
      });
    }

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days
    
    const sessionData = {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
    };
    
    // Store in memory and cache in Redis
    await sessionStore.create(sessionId, sessionData);

    // Set httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: expiresIn,
    });

    // Award daily login bonus (async, don't wait)
    awardDailyLogin(user.id).catch((error) => {
      console.error('Failed to award daily login bonus:', error);
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

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  optionalAuth,
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const cookieToken = req.cookies?.refreshToken;

    // Use cookie token if available, otherwise body token
    const token = cookieToken || refreshToken;

    if (!token) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // Verify refresh token
    const payload = verifyToken(token, TokenType.REFRESH);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticate, csrfProtect, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  
  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  // Get all user sessions before deleting
  const userSessions = sessionStore.getUserSessions(userId);
  
  // Invalidate all sessions for user in memory store and Redis
  await sessionStore.deleteAllForUser(userId);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}));

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  strictRateLimiter,
  csrfProtect,
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError('New password does not meet requirements', passwordValidation.errors);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        version: { increment: 1 }, // Optimistic locking
      },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      avatar: true,
      bio: true,
      role: true,
      is_creator: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.json({
    success: true,
    data: { user },
  });
}));

/**
 * GET /api/auth/csrf-token
 * Get CSRF token for the current session
 */
router.get('/csrf-token', asyncHandler(async (req: Request, res: Response) => {
  await getCsrfToken(req, res);
}));

export default router;

