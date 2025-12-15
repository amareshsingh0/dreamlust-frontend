import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import {
  razorpay,
  createPaymentOrder,
  verifyPaymentSignature,
  createSubscription,
  getOrCreateCustomer,
} from '../lib/razorpay';
import { getPlanById as getPlanConfig } from '../lib/plans';
import { env } from '../config/env';

const router = Router();

const createCheckoutSchema = z.object({
  planId: z.enum(['basic', 'premium', 'pro', 'creator']), // 'creator' kept for backward compatibility
});

const verifyPaymentSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

/**
 * POST /api/razorpay/create-order
 * Create a Razorpay order for one-time payments (tips, purchases)
 */
router.post(
  '/create-order',
  authenticate,
  userRateLimiter,
  validateBody(z.object({
    amount: z.number().positive(),
    currency: z.string().default('INR'),
    metadata: z.record(z.string()).optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { amount, currency, metadata } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, display_name: true, username: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create payment order
    const order = await createPaymentOrder(
      amount,
      currency,
      `order_${userId}_${Date.now()}`,
      {
        userId,
        ...metadata,
      }
    );

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: metadata?.type === 'tip' ? 'TIP' : 'PREMIUM_CONTENT',
        amount: amount,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        razorpay_payment_id: order.id, // Store order ID initially
        metadata: metadata || {},
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay checkout
        transactionId: transaction.id,
      },
    });
  })
);

/**
 * POST /api/razorpay/verify-payment
 * Verify a Razorpay payment
 */
router.post(
  '/verify-payment',
  authenticate,
  userRateLimiter,
  validateBody(verifyPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { orderId, paymentId, signature } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
      throw new ValidationError('Invalid payment signature');
    }

    // Find transaction by order ID
    const transaction = await prisma.transaction.findFirst({
      where: {
        razorpay_payment_id: orderId,
        user_id: userId,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: payment.status === 'captured' ? 'COMPLETED' : 'FAILED',
        razorpay_payment_id: paymentId,
        payment_id: paymentId,
      },
    });

    // If it's a tip, update creator earnings
    if (transaction.type === 'TIP' && transaction.metadata && typeof transaction.metadata === 'object') {
      const metadata = transaction.metadata as { creatorId?: string };
      if (metadata.creatorId && payment.status === 'captured') {
        await prisma.creatorEarnings.upsert({
          where: { creator_id: metadata.creatorId },
          create: {
            creator_id: metadata.creatorId,
            balance: transaction.amount,
            lifetime_earnings: transaction.amount,
          },
          update: {
            balance: { increment: transaction.amount },
            lifetime_earnings: { increment: transaction.amount },
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        status: payment.status === 'captured' ? 'COMPLETED' : 'FAILED',
        transactionId: transaction.id,
        paymentId: paymentId,
      },
    });
  })
);

/**
 * POST /api/razorpay/create-checkout
 * Create a Razorpay subscription checkout (similar to Stripe pattern)
 * This endpoint creates a subscription and returns the checkout URL
 */
router.post(
  '/create-checkout',
  authenticate,
  userRateLimiter,
  validateBody(createCheckoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { planId } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Get plan configuration
    const plan = getPlanConfig(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    if (plan.price === 0) {
      throw new ValidationError('Cannot create subscription for free plan');
    }

    if (!plan.razorpayPlanId) {
      throw new ValidationError('Plan Razorpay ID not configured');
    }

    // Check if user already has an active subscription for this plan
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        plan: planId,
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

    // Get or create Razorpay customer
    const customer = await getOrCreateCustomer(
      userId,
      user.email,
      user.display_name || user.username
    );

    // Create subscription
    const subscription = await createSubscription(
      plan.razorpayPlanId,
      1, // Notify customer
      {
        userId,
        plan: planId,
      }
    );

    // Store subscription in database
    await prisma.userSubscription.create({
      data: {
        user_id: userId,
        plan: planId,
        status: 'pending', // Will be activated by webhook
        razorpay_subscription_id: subscription.id,
        current_start: subscription.current_start ? new Date(subscription.current_start * 1000) : null,
        current_end: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
      },
    });

    // Return URL for redirect (like Stripe pattern)
    // Razorpay subscription returns short_url for payment authorization
    const checkoutUrl = subscription.short_url || subscription.shortUrl;
    
    if (!checkoutUrl) {
      throw new ValidationError('Razorpay subscription URL not received. Please try again.');
    }

    console.log('Razorpay subscription created:', {
      id: subscription.id,
      status: subscription.status,
      short_url: checkoutUrl,
    });

    res.json({
      success: true,
      data: {
        url: checkoutUrl,
        subscriptionId: subscription.id,
      },
    });
  })
);

/**
 * POST /api/razorpay/create-subscription
 * Create a Razorpay subscription (alternative endpoint with more details)
 */
router.post(
  '/create-subscription',
  authenticate,
  userRateLimiter,
  validateBody(createCheckoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { planId } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Get plan configuration
    const plan = getPlanConfig(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    if (plan.price === 0) {
      throw new ValidationError('Cannot create subscription for free plan');
    }

    if (!plan.razorpayPlanId) {
      throw new ValidationError('Plan Razorpay ID not configured');
    }

    // Check if user already has an active subscription for this plan
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        user_id: userId,
        plan: planId,
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

    // Get or create Razorpay customer
    const customer = await getOrCreateCustomer(
      userId,
      user.email,
      user.display_name || user.username
    );

    // Create subscription
    const subscription = await createSubscription(
      plan.razorpayPlanId,
      1, // Notify customer
      {
        userId,
        plan: planId,
      }
    );

    // Store subscription in database
    await prisma.userSubscription.create({
      data: {
        user_id: userId,
        plan: planId,
        status: 'pending', // Will be activated by webhook
        razorpay_subscription_id: subscription.id,
        current_start: subscription.current_start ? new Date(subscription.current_start * 1000) : null,
        current_end: subscription.current_end ? new Date(subscription.current_end * 1000) : null,
      },
    });

    // Razorpay subscription returns short_url for payment authorization
    const checkoutUrl = subscription.short_url || subscription.shortUrl;
    
    if (!checkoutUrl) {
      throw new ValidationError('Razorpay subscription URL not received. Please try again.');
    }

    console.log('Razorpay subscription created (detailed):', {
      id: subscription.id,
      status: subscription.status,
      short_url: checkoutUrl,
    });

    res.json({
      success: true,
      data: {
        url: checkoutUrl,
        subscriptionId: subscription.id,
        key: env.RAZORPAY_KEY_ID,
        customerId: customer.id,
      },
    });
  })
);

/**
 * GET /api/razorpay/subscription/:subscriptionId
 * Get subscription details
 */
router.get(
  '/subscription/:subscriptionId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { subscriptionId } = req.params;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    const subscription = await razorpay.subscriptions.fetch(subscriptionId);

    // Verify subscription belongs to user
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        razorpay_subscription_id: subscriptionId,
        user_id: userId,
      },
    });

    if (!userSubscription && subscription.notes?.userId !== userId) {
      throw new ValidationError('Subscription does not belong to you');
    }

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        planId: subscription.plan_id,
        currentStart: subscription.current_start,
        currentEnd: subscription.current_end,
        endedAt: subscription.ended_at,
        quantity: subscription.quantity,
      },
    });
  })
);

export default router;
