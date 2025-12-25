import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';
import {
  createPaymentIntent,
  getOrCreateCustomer,
  createConnectedAccount,
  createAccountLink,
  transferToConnectedAccount,
  getPaymentIntent,
  refundPayment,
  stripe,
} from '../lib/stripe';

const router = Router();

const createPaymentIntentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('usd'),
  metadata: z.record(z.string()).optional(),
});

const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
});

const refundPaymentSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().positive().optional(),
});

/**
 * POST /api/payments/intent
 * Create a payment intent for one-time payments (tips, purchases)
 */
router.post(
  '/intent',
  authenticate,
  userRateLimiter,
  validateBody(createPaymentIntentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { amount, currency, metadata } = req.body;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, username: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      userId,
      user.email,
      user.displayName || user.username
    );

    // Create payment intent
    const paymentIntent = await createPaymentIntent(amount, currency, {
      userId,
      ...metadata,
    });

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: userId,
        type: metadata?.type === 'tip' ? 'TIP' : 'PREMIUM_CONTENT',
        amount: amount,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        metadata: metadata || {},
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId: transaction.id,
      },
    });
  })
);

/**
 * POST /api/payments/confirm
 * Confirm a payment intent
 */
router.post(
  '/confirm',
  authenticate,
  userRateLimiter,
  validateBody(confirmPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { paymentIntentId } = req.body;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Get payment intent from Stripe
    const paymentIntent = await getPaymentIntent(paymentIntentId);

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        stripePaymentId: paymentIntentId,
        userId: userId,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    // Update transaction status based on Stripe status
    let status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELED' = 'PENDING';
    if (paymentIntent.status === 'succeeded') {
      status = 'COMPLETED';
    } else if (paymentIntent.status === 'canceled') {
      status = 'CANCELED';
    } else if (paymentIntent.status === 'requires_payment_method') {
      status = 'FAILED';
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status,
        paymentId: paymentIntent.id,
        receiptUrl: (paymentIntent as any).charges?.data[0]?.receiptUrl || null,
      },
    });

    // If it's a tip, update creator earnings
    if (transaction.type === 'TIP' && transaction.metadata && typeof transaction.metadata === 'object') {
      const metadata = transaction.metadata as { creatorId?: string };
      if (metadata.creatorId && status === 'COMPLETED') {
        // Update creator earnings
        await prisma.creatorEarnings.upsert({
          where: { creatorId: metadata.creatorId },
          create: {
            creatorId: metadata.creatorId,
            balance: transaction.amount,
            lifetimeEarnings: transaction.amount,
          },
          update: {
            balance: { increment: transaction.amount },
            lifetimeEarnings: { increment: transaction.amount },
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        status,
        transactionId: transaction.id,
      },
    });
  })
);

/**
 * POST /api/payments/refund
 * Refund a payment
 */
router.post(
  '/refund',
  authenticate,
  userRateLimiter,
  validateBody(refundPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { paymentIntentId, amount } = req.body;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        stripePaymentId: paymentIntentId,
        userId: userId,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transaction not found');
    }

    if (transaction.status !== 'COMPLETED') {
      throw new ValidationError('Can only refund completed transactions');
    }

    // Process refund via Stripe
    const refund = await refundPayment(paymentIntentId, amount);

    // Create refund transaction
    await prisma.transaction.create({
      data: {
        userId: userId,
        type: 'REFUND',
        amount: amount || transaction.amount,
        currency: transaction.currency || 'USD',
        status: refund.status === 'succeeded' ? 'COMPLETED' : 'FAILED',
        stripePaymentId: refund.id,
        metadata: {
          originalTransactionId: transaction.id,
          originalPaymentIntentId: paymentIntentId,
        },
      },
    });

    // Update original transaction
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: amount && amount < transaction.amount ? 'COMPLETED' : 'REFUNDED',
      },
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
    });
  })
);

/**
 * GET /api/payments/transactions
 * Get user's transaction history
 */
router.get(
  '/transactions',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { userId: userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * POST /api/payments/creator/connect
 * Create Stripe connected account for creator payouts
 */
router.post(
  '/creator/connect',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
      select: { id: true, stripeAccountId: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // If already connected, return existing account
    if (creator.stripeAccountId) {
      const account = await stripe.accounts.retrieve(creator.stripeAccountId);
      return res.json({
        success: true,
        data: {
          accountId: account.id,
          connected: account.details_submitted,
        },
      });
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Create connected account
    const account = await createConnectedAccount(creator.id, user.email);

    // Update creator with account ID
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        stripeAccountId: account.id,
      },
    });

    // Create account link for onboarding
    const accountLink = await createAccountLink(
      account.id,
      `${process.env.FRONTEND_URL || 'http://localhost:4001'}/creator/payouts/return`,
      `${process.env.FRONTEND_URL || 'http://localhost:4001'}/creator/payouts/refresh`
    );

    res.json({
      success: true,
      data: {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      },
    });
  })
);

/**
 * POST /api/payments/creator/payout
 * Request a payout (creator only)
 */
router.post(
  '/creator/payout',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(z.object({
    amount: z.number().positive(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { amount } = req.body;

    if (!stripe) {
      throw new ValidationError('Stripe is not configured');
    }

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
      select: {
        id: true,
        stripeAccountId: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    if (!creator.stripeAccountId) {
      throw new ValidationError('Stripe account not connected. Please connect your account first.');
    }

    // Get or create earnings record
    let earnings = await prisma.creatorEarnings.findUnique({
      where: { creatorId: creator.id },
    });

    if (!earnings) {
      earnings = await prisma.creatorEarnings.create({
        data: {
          creatorId: creator.id,
          balance: 0,
          lifetimeEarnings: 0,
          pendingPayout: 0,
        },
      });
    }

    if (earnings.balance < amount) {
      throw new ValidationError('Insufficient balance');
    }

    // Transfer to connected account
    const transfer = await transferToConnectedAccount(
      creator.stripeAccountId,
      amount,
      'usd',
      {
        creatorId: creator.id,
        userId,
      }
    );

    // Update earnings
    await prisma.creatorEarnings.update({
      where: { creatorId: creator.id },
      data: {
        balance: { decrement: amount },
        pendingPayout: { increment: amount },
        lastPayoutAt: new Date(),
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: userId,
        type: 'WITHDRAWAL',
        amount: amount,
        currency: 'USD',
        status: 'COMPLETED',
        stripePaymentId: transfer.id,
        metadata: {
          creatorId: creator.id,
          transferId: transfer.id,
        },
      },
    });

    res.json({
      success: true,
      message: 'Payout processed successfully',
      data: {
        transferId: transfer.id,
        amount,
      },
    });
  })
);

/**
 * GET /api/payments/creator/earnings
 * Get creator earnings (creator only)
 */
router.get(
  '/creator/earnings',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Get or create earnings
    const earnings = await prisma.creatorEarnings.upsert({
      where: { creatorId: creator.id },
      create: {
        creatorId: creator.id,
        balance: 0,
        lifetimeEarnings: 0,
        pendingPayout: 0,
      },
      update: {},
    });

    res.json({
      success: true,
      data: earnings,
    });
  })
);

export default router;
