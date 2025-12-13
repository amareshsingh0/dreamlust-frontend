import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter } from '../middleware/rateLimit';
import { updatePreferencesSchema } from '../schemas/preferences';
import { NotFoundError } from '../lib/errors';

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
      where: { userId },
    });

    // If preferences don't exist, create default ones
    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          theme: 'auto',
          language: 'en',
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

    res.json({
      success: true,
      data: preferences,
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

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create new preferences with defaults
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          ...updateData,
          notifications: updateData.notifications || {
            email: {},
            push: {},
            inApp: {},
          },
        },
      });
    } else {
      // Update existing preferences
      preferences = await prisma.userPreferences.update({
        where: { userId },
        data: updateData,
      });
    }

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    });
  }
);

export default router;

