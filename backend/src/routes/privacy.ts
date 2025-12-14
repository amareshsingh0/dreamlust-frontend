import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import {
  updatePrivacySchema,
  setHistoryLockSchema,
  verifyHistoryLockSchema,
  requestAccountDeletionSchema,
  requestDataExportSchema,
} from '../schemas/privacy';
import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors';
import { verifyPassword, hashPassword } from '../lib/auth/password';

const router = Router();

/**
 * GET /api/privacy
 * Get user privacy settings
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        hideHistory: true,
        anonymousMode: true,
        allowPersonalization: true,
        showActivityStatus: true,
        allowMessages: true,
        showWatchHistory: true,
        showPlaylists: true,
        showLikedContent: true,
        historyLockEnabled: true,
      },
    });

    if (!preferences) {
      // Create default preferences if they don't exist
      const defaultPrefs = await prisma.userPreferences.create({
        data: { userId },
      });
      return res.json({
        success: true,
        data: defaultPrefs,
      });
    }

    res.json({
      success: true,
      data: preferences,
    });
  }
);

/**
 * PUT /api/privacy
 * Update privacy settings
 */
router.put(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(updatePrivacySchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const updates = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });

    res.json({
      success: true,
      data: preferences,
      message: 'Privacy settings updated successfully',
    });
  }
);

/**
 * POST /api/privacy/history-lock
 * Enable/disable history lock with PIN
 */
router.post(
  '/history-lock',
  authenticate,
  userRateLimiter,
  validateBody(setHistoryLockSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { enabled, pin } = req.body;

    if (enabled && !pin) {
      throw new ValidationError('PIN is required when enabling history lock');
    }

    let pinHash: string | null = null;
    if (enabled && pin) {
      // Hash PIN using Web Crypto API approach (bcrypt for consistency)
      pinHash = await hashPassword(pin);
    }

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        historyLockEnabled: enabled,
        historyLockPinHash: pinHash,
      },
      create: {
        userId,
        historyLockEnabled: enabled,
        historyLockPinHash: pinHash,
      },
    });

    res.json({
      success: true,
      data: {
        historyLockEnabled: preferences.historyLockEnabled,
      },
      message: enabled ? 'History lock enabled' : 'History lock disabled',
    });
  }
);

/**
 * POST /api/privacy/verify-history-lock
 * Verify history lock PIN
 */
router.post(
  '/verify-history-lock',
  authenticate,
  userRateLimiter,
  validateBody(verifyHistoryLockSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { pin } = req.body;

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: {
        historyLockEnabled: true,
        historyLockPinHash: true,
      },
    });

    if (!preferences || !preferences.historyLockEnabled || !preferences.historyLockPinHash) {
      throw new ValidationError('History lock is not enabled');
    }

    const isValid = await verifyPassword(pin, preferences.historyLockPinHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid PIN');
    }

    res.json({
      success: true,
      message: 'PIN verified successfully',
    });
  }
);

/**
 * POST /api/privacy/export-data
 * Request data export (GDPR compliance)
 */
router.post(
  '/export-data',
  authenticate,
  userRateLimiter,
  validateBody(requestDataExportSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { format, includeContent, includeHistory, includePlaylists } = req.body;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        createdAt: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const exportData: any = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      preferences: user.preferences,
      exportedAt: new Date().toISOString(),
    };

    // Include history if requested
    if (includeHistory) {
      const views = await prisma.view.findMany({
        where: { userId },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      exportData.watchHistory = views;
    }

    // Include playlists if requested
    if (includePlaylists) {
      const playlists = await prisma.playlist.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              content: {
                select: {
                  id: true,
                  title: true,
                  thumbnail: true,
                },
              },
            },
          },
        },
      });
      exportData.playlists = playlists;
    }

    // Include content if requested (for creators)
    if (includeContent) {
      const creator = await prisma.creator.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (creator) {
        const content = await prisma.content.findMany({
          where: { creatorId: creator.id },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            viewCount: true,
            likeCount: true,
            createdAt: true,
            publishedAt: true,
          },
        });
        exportData.content = content;
      }
    }

    // Return data in requested format
    if (format === 'csv') {
      // For CSV, return JSON with instructions (actual CSV conversion would be done client-side)
      res.json({
        success: true,
        data: exportData,
        format: 'json', // CSV conversion handled client-side
        message: 'Data export ready. Convert to CSV on client side.',
      });
    } else {
      res.json({
        success: true,
        data: exportData,
        format: 'json',
      });
    }
  }
);

/**
 * POST /api/privacy/delete-account
 * Request account deletion (30-day grace period)
 */
router.post(
  '/delete-account',
  authenticate,
  userRateLimiter,
  validateBody(requestAccountDeletionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { reason, password } = req.body;

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Check if deletion already requested
    const existingDeletion = await prisma.accountDeletion.findUnique({
      where: { userId },
    });

    if (existingDeletion && existingDeletion.status === 'pending') {
      throw new ValidationError('Account deletion already requested');
    }

    // Schedule deletion for 30 days from now
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + 30);

    const deletion = await prisma.accountDeletion.upsert({
      where: { userId },
      update: {
        requestedAt: new Date(),
        scheduledFor,
        reason: reason || null,
        status: 'pending',
      },
      create: {
        userId,
        scheduledFor,
        reason: reason || null,
        status: 'pending',
      },
    });

    res.json({
      success: true,
      data: {
        scheduledFor: deletion.scheduledFor,
        daysRemaining: Math.ceil((scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      },
      message: 'Account deletion scheduled. You have 30 days to cancel.',
    });
  }
);

/**
 * POST /api/privacy/cancel-deletion
 * Cancel account deletion request
 */
router.post(
  '/cancel-deletion',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const deletion = await prisma.accountDeletion.findUnique({
      where: { userId },
    });

    if (!deletion || deletion.status !== 'pending') {
      throw new ValidationError('No pending account deletion request found');
    }

    await prisma.accountDeletion.update({
      where: { userId },
      data: {
        status: 'cancelled',
      },
    });

    res.json({
      success: true,
      message: 'Account deletion cancelled successfully',
    });
  }
);

/**
 * GET /api/privacy/deletion-status
 * Get account deletion status
 */
router.get(
  '/deletion-status',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const deletion = await prisma.accountDeletion.findUnique({
      where: { userId },
    });

    if (!deletion) {
      return res.json({
        success: true,
        data: {
          requested: false,
        },
      });
    }

    const daysRemaining = deletion.status === 'pending'
      ? Math.ceil((deletion.scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      success: true,
      data: {
        requested: true,
        status: deletion.status,
        requestedAt: deletion.requestedAt,
        scheduledFor: deletion.scheduledFor,
        daysRemaining,
      },
    });
  }
);

export default router;

