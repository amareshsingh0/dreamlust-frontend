import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import {
  savePushSubscription,
  removePushSubscription,
  getUserPushSubscriptions,
} from '../lib/push/service';
import { getVAPIDPublicKey } from '../lib/push/vapid';

const router = Router();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
  device: z.string().optional(),
});

/**
 * GET /api/push/vapid-key
 * Get VAPID public key for frontend
 */
router.get(
  '/vapid-key',
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const publicKey = getVAPIDPublicKey();

    if (!publicKey) {
      return res.status(503).json({
        success: false,
        message: 'Push notifications not configured',
      });
    }

    res.json({
      success: true,
      data: { publicKey },
    });
  })
);

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post(
  '/subscribe',
  authenticate,
  userRateLimiter,
  validateBody(subscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { endpoint, keys, userAgent, device } = req.body;

    await savePushSubscription(
      userId,
      { endpoint, keys },
      userAgent || req.get('user-agent'),
      device
    );

    res.json({
      success: true,
      message: 'Push subscription saved',
    });
  })
);

/**
 * DELETE /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.delete(
  '/unsubscribe',
  authenticate,
  userRateLimiter,
  validateBody(z.object({
    endpoint: z.string().url(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { endpoint } = req.body;

    await removePushSubscription(userId, endpoint);

    res.json({
      success: true,
      message: 'Push subscription removed',
    });
  })
);

/**
 * GET /api/push/subscriptions
 * Get user's push subscriptions
 */
router.get(
  '/subscriptions',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const subscriptions = await getUserPushSubscriptions(userId);

    res.json({
      success: true,
      data: { subscriptions },
    });
  })
);

export default router;

