import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import {
  createSubscription as createRazorpaySubscription,
  getOrCreateCustomer,
  cancelSubscription,
  getSubscription,
  razorpay,
} from '../lib/razorpay';
import { getPlanById } from '../lib/plans';

const router = Router();

const createSubscriptionSchema = z.object({
  plan: z.enum(['basic', 'premium', 'pro', 'creator']), // 'creator' kept for backward compatibility
});

const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  cancelAtPeriodEnd: z.boolean().default(false),
});

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(createSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { plan } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Check if user already has an active subscription for this plan
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        plan,
        status: 'active',
      },
    });

    if (existingSubscription) {
      throw new ValidationError('You already have an active subscription for this plan');
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, display_name: true, username: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get plan configuration
    const planConfig = getPlanById(plan);
    if (!planConfig || !planConfig.razorpayPlanId) {
      throw new ValidationError('Plan Razorpay ID not configured');
    }

    // Get or create Razorpay customer
    const customer = await getOrCreateCustomer(
      userId,
      user.email,
      user.display_name || user.username
    );

    // Create subscription in Razorpay
    const subscription = await createRazorpaySubscription(
      planConfig.razorpayPlanId,
      1, // Notify customer
      {
        userId,
        plan,
      }
    );

    // Calculate period dates (Razorpay uses Unix timestamps)
    const currentPeriodStart = subscription.current_start 
      ? new Date(subscription.current_start * 1000)
      : new Date();
    const currentPeriodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date();

    // Create subscription record
    const userSubscription = await prisma.userSubscription.create({
      data: {
        user_id: userId,
        plan,
        status: subscription.status === 'active' ? 'active' : 'canceled',
        razorpay_subscription_id: subscription.id,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
      },
    });

    // Create transaction record
    const amount = planConfig.price;

    if (amount > 0) {
      await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'SUBSCRIPTION',
          amount: amount,
          currency: planConfig.currency || 'INR',
          status: subscription.status === 'active' ? 'COMPLETED' : 'PENDING',
          razorpay_payment_id: subscription.id,
          metadata: {
            subscriptionId: subscription.id,
            plan,
          },
        },
      });
    }

    res.json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription: userSubscription,
        shortUrl: subscription.short_url,
        subscriptionId: subscription.id,
      },
    });
  })
);

/**
 * GET /api/subscriptions
 * Get user's active subscriptions
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        user_id: userId,
        status: 'active',
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: subscriptions,
    });
  })
);

/**
 * GET /api/subscriptions/:id
 * Get subscription details
 */
router.get(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const subscription = await prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.user_id !== userId) {
      throw new ValidationError('You do not have permission to view this subscription');
    }

    // Get latest info from Stripe if available
    let stripeSubscription = null;
    if (subscription.stripe_subscription_id && stripe) {
      try {
        stripeSubscription = await getSubscription(subscription.stripe_subscription_id);
        
        // Update local record if status changed
        if (stripeSubscription.status !== subscription.status) {
          await prisma.userSubscription.update({
            where: { id },
            data: {
              status: stripeSubscription.status === 'active' ? 'active' : 'canceled',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000),
              cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
            },
          });
        }
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...subscription,
        stripeSubscription,
      },
    });
  })
);

/**
 * POST /api/subscriptions/:id/cancel
 * Cancel a subscription
 */
router.post(
  '/:id/cancel',
  authenticate,
  userRateLimiter,
  validateBody(cancelSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { cancelAtPeriodEnd } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    if (subscription.user_id !== userId) {
      throw new ValidationError('You do not have permission to cancel this subscription');
    }

    if (subscription.status !== 'active') {
      throw new ValidationError('Subscription is not active');
    }

    if (!subscription.razorpay_subscription_id) {
      throw new ValidationError('Razorpay subscription ID not found');
    }

    // Cancel in Razorpay
    const canceledSubscription = await cancelSubscription(
      subscription.razorpay_subscription_id,
      cancelAtPeriodEnd
    );

    // Update local record
    await prisma.userSubscription.update({
      where: { id },
      data: {
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    });

    res.json({
      success: true,
      message: cancelAtPeriodEnd
        ? 'Subscription will be canceled at the end of the billing period'
        : 'Subscription canceled successfully',
      data: {
        subscription: {
          ...subscription,
          status: cancelAtPeriodEnd ? 'active' : 'canceled',
          cancel_at_period_end: cancelAtPeriodEnd,
        },
      },
    });
  })
);

export default router;
