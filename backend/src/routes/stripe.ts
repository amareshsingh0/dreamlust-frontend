import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import { stripe, getOrCreateCustomer } from '../lib/stripe';
import { getPlanById } from '../lib/plans';
import { env } from '../config/env';

const router = Router();

const createCheckoutSchema = z.object({
  planId: z.enum(['basic', 'premium', 'pro', 'creator']), // 'creator' kept for backward compatibility
});

/**
 * POST /api/stripe/create-checkout
 * Create a Stripe Checkout session for subscription
 */
router.post(
  '/create-checkout',
  authenticate,
  userRateLimiter,
  validateBody(createCheckoutSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { planId } = req.body;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Get plan
    const plan = getPlanById(planId);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    if (plan.price === 0) {
      throw new ValidationError('Cannot create checkout for free plan');
    }

    if (!plan.priceId) {
      throw new ValidationError('Plan price ID not configured');
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

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      userId,
      user.email,
      user.display_name || user.username
    );

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription-plans`,
      metadata: {
        userId: userId,
        plan: planId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: planId,
        },
      },
    });

    res.json({
      success: true,
      data: {
        url: session.url,
        sessionId: session.id,
      },
    });
  })
);

/**
 * GET /api/stripe/checkout-session/:sessionId
 * Get checkout session details
 */
router.get(
  '/checkout-session/:sessionId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session belongs to user
    if (session.metadata?.userId !== userId) {
      throw new ValidationError('Session does not belong to you');
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionId: session.subscription as string | null,
        customerId: session.customer as string | null,
      },
    });
  })
);

export default router;
