import { Router, Request, Response } from 'express';
import { getAllPlans, getPlanById } from '../lib/plans';
import { optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../lib/errors';
import { trackEvent, EventTypes } from '../lib/analytics/tracker';

const router = Router();

/**
 * GET /api/plans
 * Get all available subscription plans
 */
router.get(
  '/',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const plans = getAllPlans();

    // If user is authenticated, include their current subscription status
    let userSubscriptions: any[] = [];
    if (userId) {
      userSubscriptions = await prisma.userSubscription.findMany({
        where: {
          userId: userId,
          status: 'active',
        },
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
        },
      });
    }

    // Map plans with user's subscription status
    const plansWithStatus = plans.map((plan) => {
      const userSubscription = userSubscriptions.find((sub) => sub.plan === plan.id);
      return {
        ...plan,
        isSubscribed: !!userSubscription,
        subscriptionStatus: userSubscription?.status || null,
        currentPeriodEnd: userSubscription?.currentPeriodEnd || null,
      };
    });

    // Track subscription viewed event
    if (userId) {
      await trackEvent(req, EventTypes.SUBSCRIPTION_VIEWED, {
        planCount: plans.length,
      }, userId).catch(() => {}); // Non-blocking
    }

    res.json({
      success: true,
      data: plansWithStatus,
    });
  })
);

/**
 * GET /api/plans/:id
 * Get a specific plan by ID
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const plan = getPlanById(id);

    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    // If user is authenticated, include their subscription status for this plan
    let userSubscription: any = null;
    if (userId) {
      userSubscription = await prisma.userSubscription.findFirst({
        where: {
          userId: userId,
          plan: id,
          status: 'active',
        },
        select: {
          id: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...plan,
        isSubscribed: !!userSubscription,
        subscription: userSubscription,
      },
    });
  })
);

export default router;
