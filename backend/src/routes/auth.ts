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
import { markUserReturned } from '../lib/analytics/retentionAnalytics';
import { trackEvent, EventTypes } from '../lib/analytics/tracker';
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
    const { email, username, password, displayName, birthDate } = req.body;

    // Track signup started event
    await trackEvent(req, EventTypes.SIGNUP_STARTED, {
      email,
      username,
    }).catch(() => {}); // Non-blocking

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        deletedAt: null,
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
        displayName: displayName || username,
        role: UserRole.USER,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        avatar: true,
        bio: true,
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
                status: 'PENDING',
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
      role: user.role || 'USER',
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

    // Track signup completed event
    await trackEvent(req, EventTypes.SIGNUP_COMPLETED, {
      userId: user.id,
      email: user.email,
      username: user.username,
    }, user.id).catch(() => {}); // Non-blocking

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
        deletedAt: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        displayName: true,
        avatar: true,
        bio: true,
        creator: {
          select: {
            banner: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
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
      role: user.role || 'USER',
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

    // Mark user as returned for retention tracking (non-blocking)
    markUserReturned(user.id).catch((error) => {
      console.error('Failed to mark user returned:', error);
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          displayName: user.displayName,
          avatar: user.avatar,
          banner: user.creator?.banner || null,
          bio: user.bio,
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
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role || 'USER',
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
  const userId = req.user!.userId;

  const [user, followingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        website: true,
        socialLinks: true,
        role: true,
        isCreator: true,
        createdAt: true,
        creator: {
          select: {
            banner: true,
          },
        },
      },
    }),
    prisma.subscription.count({
      where: {
        subscriberId: userId,
        status: 'ACTIVE',
      },
    }),
  ]);

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        followingCount,
      },
    },
  });
}));

/**
 * PUT /api/auth/me
 * Update current user profile
 */
router.put(
  '/me',
  authenticate,
  csrfProtect,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { displayName, username, bio, socialLinks } = req.body;

    // Build update data
    const updateData: any = {};

    if (displayName !== undefined) {
      if (displayName.length < 2 || displayName.length > 50) {
        throw new ValidationError('Display name must be between 2 and 50 characters');
      }
      if (!/^[a-zA-Z0-9\s_-]+$/.test(displayName)) {
        throw new ValidationError('Display name can only contain letters, numbers, spaces, underscores, and hyphens');
      }
      updateData.displayName = displayName;
    }

    if (username !== undefined) {
      if (username.length < 3 || username.length > 30) {
        throw new ValidationError('Username must be between 3 and 30 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new ValidationError('Username can only contain letters, numbers, and underscores');
      }

      // Check if username is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: userId },
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new ConflictError('Username already taken');
      }

      updateData.username = username;
    }

    if (bio !== undefined) {
      if (bio.length > 500) {
        throw new ValidationError('Bio must be at most 500 characters');
      }
      updateData.bio = bio;
    }

    // Handle social links
    if (socialLinks !== undefined) {
      // Validate social links structure
      if (typeof socialLinks !== 'object' || socialLinks === null) {
        throw new ValidationError('Social links must be an object');
      }

      const validPlatforms = ['twitter', 'instagram', 'facebook', 'pinterest', 'website', 'youtube', 'tiktok'];
      const cleanedLinks: Record<string, string> = {};

      for (const [platform, url] of Object.entries(socialLinks)) {
        if (!validPlatforms.includes(platform)) {
          continue; // Skip invalid platforms
        }
        if (url && typeof url === 'string' && url.trim()) {
          // Basic URL validation for non-empty values
          if (url.length > 500) {
            throw new ValidationError(`${platform} URL is too long`);
          }
          cleanedLinks[platform] = url.trim();
        }
      }

      updateData.socialLinks = Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        socialLinks: true,
        role: true,
        isCreator: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  })
);

/**
 * PUT /api/auth/me/avatar
 * Update current user avatar (also updates Creator avatar if user is a creator)
 */
router.put(
  '/me/avatar',
  authenticate,
  csrfProtect,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { avatar } = req.body;

    if (!avatar || typeof avatar !== 'string') {
      throw new ValidationError('Avatar URL is required');
    }

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        isCreator: true,
        createdAt: true,
      },
    });

    // Also update creator avatar if user is a creator
    if (updatedUser.isCreator) {
      await prisma.creator.updateMany({
        where: { userId },
        data: { avatar },
      });
    }

    res.json({
      success: true,
      data: { user: updatedUser },
    });
  })
);

/**
 * PUT /api/auth/me/banner
 * Update creator banner (banner is only on Creator model)
 */
router.put(
  '/me/banner',
  authenticate,
  csrfProtect,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { banner } = req.body;

    if (!banner || typeof banner !== 'string') {
      throw new ValidationError('Banner URL is required');
    }

    // Check if user is a creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new ValidationError('Only creators can update banners');
    }

    // Update creator banner (banner field is only on Creator model, not User)
    const updatedCreator = await prisma.creator.update({
      where: { userId },
      data: { banner },
      select: {
        id: true,
        banner: true,
        displayName: true,
        handle: true,
      },
    });

    res.json({
      success: true,
      data: {
        banner: updatedCreator.banner,
        creator: updatedCreator,
      },
    });
  })
);

/**
 * GET /api/auth/csrf-token
 * Get CSRF token for the current session
 */
router.get('/csrf-token', asyncHandler(async (req: Request, res: Response) => {
  await getCsrfToken(req, res);
}));

export default router;

