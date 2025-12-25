/**
 * Subscription Management Routes
 * Handles subscription pause, cancellation, and retention
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { pauseRazorpaySubscription, resumeRazorpaySubscription } from '../lib/payments/razorpayService';

const router = Router();

/**
 * GET /api/subscription-management/current
 * Get current subscription with usage stats
 */
router.get(
  '/current',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription',
      });
    }

    // Get usage stats for current period
    const periodStart = subscription.currentPeriodStart || subscription.createdAt;
    const periodEnd = subscription.currentPeriodEnd || new Date();

    const [videosWatched, hoursWatched, downloads] = await Promise.all([
      prisma.view.count({
        where: {
          userId,
          watchedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      }),
      prisma.view.aggregate({
        where: {
          userId,
          watchedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: {
          duration: true,
        },
      }),
      prisma.download.count({
        where: {
          userId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      }),
    ]);

    const hours = (hoursWatched._sum.duration || 0) / 3600;

    res.json({
      success: true,
      data: {
        subscription,
        usageStats: {
          videosWatched,
          hoursWatched: Math.round(hours * 10) / 10,
          downloads,
        },
      },
    });
  })
);

/**
 * POST /api/subscription-management/pause
 * Pause subscription
 */
router.post(
  '/pause',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { subscriptionId, resumeAt, reason } = req.body;

    if (!subscriptionId || !resumeAt) {
      throw new BadRequestError('subscriptionId and resumeAt are required');
    }

    // Verify subscription ownership
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new UnauthorizedError('You can only pause your own subscription');
    }

    if (subscription.status !== 'active') {
      throw new BadRequestError('Only active subscriptions can be paused');
    }

    // Pause with Razorpay if subscription ID exists
    if (subscription.razorpaySubscriptionId) {
      try {
        await pauseRazorpaySubscription(subscription.razorpaySubscriptionId);
      } catch (error: any) {
        console.error('Razorpay pause failed:', error);
        // Continue with local pause even if Razorpay fails
      }
    }

    // Create pause record
    const pause = await prisma.subscriptionPause.create({
      data: {
        subscriptionId,
        resumeAt: new Date(resumeAt),
        reason: reason || null,
      },
    });

    // Update subscription status
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'paused',
      },
    });

    res.json({
      success: true,
      data: pause,
      message: 'Subscription paused successfully',
    });
  })
);

/**
 * POST /api/subscription-management/resume
 * Resume paused subscription
 */
router.post(
  '/resume',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      throw new BadRequestError('subscriptionId is required');
    }

    // Verify subscription ownership
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { pauses: true },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new UnauthorizedError('You can only resume your own subscription');
    }

    // Find active pause
    const activePause = subscription.pauses.find(
      p => p.resumeAt > new Date()
    );

    if (!activePause) {
      throw new BadRequestError('No active pause found');
    }

    // Resume with Razorpay if subscription ID exists
    if (subscription.razorpaySubscriptionId) {
      try {
        await resumeRazorpaySubscription(subscription.razorpaySubscriptionId);
      } catch (error: any) {
        console.error('Razorpay resume failed:', error);
        // Continue with local resume even if Razorpay fails
      }
    }

    // Resume subscription
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
      },
    });

    // Delete pause record
    await prisma.subscriptionPause.delete({
      where: { id: activePause.id },
    });

    res.json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  })
);

/**
 * POST /api/subscription-management/cancel
 * Cancel subscription with survey
 */
router.post(
  '/cancel',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { subscriptionId, cancelReason, feedback, acceptOffer } = req.body;

    if (!subscriptionId) {
      throw new BadRequestError('subscriptionId is required');
    }

    // Verify subscription ownership
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new UnauthorizedError('You can only cancel your own subscription');
    }

    // If user accepted a retention offer, don't cancel
    if (acceptOffer) {
      return res.json({
        success: true,
        message: 'Retention offer accepted. Subscription will continue.',
      });
    }

    // Save cancellation feedback
    if (cancelReason || feedback) {
      await prisma.feedback.create({
        data: {
          userId: userId,
          type: 'cancellation',
          message: feedback || `Cancellation reason: ${cancelReason}`,
          metadata: {
            cancelReason,
            subscriptionId,
          },
        },
      });
    }

    // Cancel subscription (set to cancel at period end)
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true,
        status: 'CANCELED',
      },
    });

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current period',
    });
  })
);

/**
 * POST /api/subscription-management/upgrade
 * Upgrade subscription plan
 */
router.post(
  '/upgrade',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { subscriptionId, newPlan } = req.body;

    if (!subscriptionId || !newPlan) {
      throw new BadRequestError('subscriptionId and newPlan are required');
    }

    // Verify subscription ownership
    const subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new UnauthorizedError('You can only upgrade your own subscription');
    }

    // TODO: Implement upgrade logic with payment provider
    // For now, just update the plan
    const updated = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        plan: newPlan,
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Subscription upgraded successfully',
    });
  })
);

/**
 * GET /api/subscription-management/churn-risk
 * Get churn risk prediction for current user
 */
router.get(
  '/churn-risk',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const prediction = await prisma.churnPrediction.findUnique({
      where: { userId },
    });

    if (!prediction) {
      return res.json({
        success: true,
        data: {
          churnProbability: 0,
          riskFactors: [],
        },
      });
    }

    res.json({
      success: true,
      data: {
        churnProbability: Number(prediction.churnProbability),
        riskFactors: prediction.riskFactors as any,
        lastCalculated: prediction.lastCalculated,
      },
    });
  })
);

export default router;

