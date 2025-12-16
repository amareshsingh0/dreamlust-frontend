import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateQuery } from '../middleware/validation';
import { NotFoundError } from '../lib/errors';
import { z } from 'zod';
import {
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getNotificationPreferences,
} from '../lib/notifications/service';

const router = Router();

const updatePreferencesSchema = z.object({
  email: z.record(z.boolean()).optional(),
  push: z.record(z.boolean()).optional(),
  inApp: z.record(z.boolean()).optional(),
  frequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
  unsubscribedAll: z.boolean().optional(),
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: z.coerce.boolean().optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { page, limit, unreadOnly } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = {
      user_id: userId,
    };

    if (unreadOnly) {
      where.is_read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      getUnreadCount(userId),
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          isRead: n.is_read,
          metadata: n.metadata,
          createdAt: n.created_at,
          readAt: n.read_at,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  })
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get(
  '/unread-count',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const count = await getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  })
);

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch(
  '/:id/read',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    await markNotificationAsRead(id, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  })
);

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch(
  '/read-all',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    await markAllNotificationsAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  })
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const deleted = await prisma.notification.deleteMany({
      where: {
        id,
        user_id: userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Notification not found');
    }

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  })
);

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get(
  '/preferences',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const preferences = await getNotificationPreferences(userId);

    res.json({
      success: true,
      data: {
        email: preferences.email,
        push: preferences.push,
        inApp: preferences.inApp,
        frequency: preferences.frequency,
        unsubscribedAll: preferences.unsubscribedAll,
      },
    });
  })
);

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put(
  '/preferences',
  authenticate,
  userRateLimiter,
  validateBody(updatePreferencesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { email, push, inApp, frequency, unsubscribedAll } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (push !== undefined) updateData.push = push;
    if (inApp !== undefined) updateData.inApp = inApp;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (unsubscribedAll !== undefined) updateData.unsubscribedAll = unsubscribedAll;

    const preferences = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        email: email || {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        push: push || {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        inApp: inApp || {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        frequency: frequency || 'instant',
        unsubscribedAll: unsubscribedAll || false,
      },
    });

    res.json({
      success: true,
      data: {
        email: preferences.email,
        push: preferences.push,
        inApp: preferences.inApp,
        frequency: preferences.frequency,
        unsubscribedAll: preferences.unsubscribedAll,
      },
    });
  })
);

export default router;

