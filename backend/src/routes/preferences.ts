import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter } from '../middleware/rateLimit';
import { updatePreferencesSchema } from '../schemas/preferences';
import { BadRequestError } from '../lib/errors';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '../lib/preferences/constants';

const router = Router();

/**
 * GET /api/preferences
 * Get user preferences
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: userId },
    });

    // If preferences don't exist, create default ones
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: userId,
          theme: 'auto',
          language: 'en',
          currency: 'USD',
          hideHistory: false,
          anonymousMode: false,
          defaultQuality: 'auto',
          autoplay: true,
          notifications: {
            email: {},
            push: {},
            inApp: {},
          },
        },
      });
    }

    // Map database field names to frontend field names
    res.json({
      success: true,
      data: {
        ...preferences,
        hideHistory: preferences.hideHistory,
        anonymousMode: preferences.anonymousMode,
        defaultQuality: preferences.defaultQuality,
      },
    });
  }
);

/**
 * PUT /api/preferences
 * Update user preferences
 */
router.put(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(updatePreferencesSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const updateData = req.body;

    // Validate language if provided
    if (updateData.language && !SUPPORTED_LANGUAGES.includes(updateData.language)) {
      throw new BadRequestError(`Unsupported language: ${updateData.language}`);
    }

    // Validate currency if provided
    if (updateData.currency && !SUPPORTED_CURRENCIES.includes(updateData.currency)) {
      throw new BadRequestError(`Unsupported currency: ${updateData.currency}`);
    }

    // Map frontend field names to database field names
    const mappedData: any = {};
    if (updateData.language !== undefined) mappedData.language = updateData.language;
    if (updateData.currency !== undefined) mappedData.currency = updateData.currency;
    if (updateData.theme !== undefined) mappedData.theme = updateData.theme;
    if (updateData.hideHistory !== undefined) mappedData.hideHistory = updateData.hideHistory;
    if (updateData.anonymousMode !== undefined) mappedData.anonymousMode = updateData.anonymousMode;
    if (updateData.defaultQuality !== undefined) mappedData.defaultQuality = updateData.defaultQuality;
    if (updateData.autoplay !== undefined) mappedData.autoplay = updateData.autoplay;
    if (updateData.notifications !== undefined) mappedData.notifications = updateData.notifications;

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: userId },
    });

    if (!preferences) {
      // Create new preferences with defaults
      preferences = await prisma.userPreferences.create({
        data: {
          userId: userId,
          ...mappedData,
          language: mappedData.language || 'en',
          currency: mappedData.currency || 'USD',
          notifications: mappedData.notifications || {
            email: {},
            push: {},
            inApp: {},
          },
        },
      });
    } else {
      // Update existing preferences
      preferences = await prisma.userPreferences.update({
        where: { userId: userId },
        data: mappedData,
      });
    }

    // Map database field names to frontend field names
    res.json({
      success: true,
      data: {
        ...preferences,
        hideHistory: preferences.hideHistory,
        anonymousMode: preferences.anonymousMode,
        defaultQuality: preferences.defaultQuality,
      },
      message: 'Preferences updated successfully',
    });
  }
);

/**
 * GET /api/preferences/languages
 * Get supported languages
 */
router.get(
  '/languages',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        supported: SUPPORTED_LANGUAGES,
      },
    });
  }
);

/**
 * GET /api/preferences/currencies
 * Get supported currencies
 */
router.get(
  '/currencies',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        supported: SUPPORTED_CURRENCIES,
      },
    });
  }
);

export default router;

