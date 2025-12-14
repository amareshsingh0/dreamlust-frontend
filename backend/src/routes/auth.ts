import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../lib/auth/password';
import { generateTokenPair, verifyToken, TokenType } from '../lib/auth/jwt';
import { generateSessionId, sessionStore } from '../lib/auth/session';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter, strictRateLimiter, loginRateLimiter } from '../middleware/rateLimit';
import { getCsrfToken } from '../middleware/csrf';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../schemas/auth';
import { ConflictError, UnauthorizedError, ValidationError } from '../lib/errors';
import { UserRole } from '../config/constants';
import cookieParser from 'cookie-parser';

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
  async (req: Request, res: Response) => {
    const { email, username, password, displayName } = req.body;

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

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      throw new ValidationError('Password does not meet requirements', passwordValidation.errors);
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
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    sessionStore.create(sessionId, {
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
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  async (req: Request, res: Response) => {
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

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    const sessionId = generateSessionId();
    const expiresIn = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30 days or 7 days
    
    sessionStore.create(sessionId, {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
    });

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
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  optionalAuth,
  validateBody(refreshTokenSchema),
  async (req: Request, res: Response) => {
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
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
    });
  }
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  // In production, invalidate refresh token in Redis/database
  // For now, we'll rely on token expiration

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  strictRateLimiter,
  validateBody(changePasswordSchema),
  async (req: Request, res: Response) => {
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
  }
);

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
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

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * GET /api/auth/csrf-token
 * Get CSRF token for the current session
 */
router.get('/csrf-token', getCsrfToken);

export default router;

