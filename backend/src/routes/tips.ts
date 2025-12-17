import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter, tipRateLimiter } from '../middleware/rateLimit';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { createTipSchema, tipQuerySchema, confirmPaymentSchema } from '../schemas/tip';
import { z } from 'zod';
import {
  razorpay,
  createPaymentOrder,
  verifyPaymentSignature,
} from '../lib/razorpay';
import { env } from '../config/env';

const router = Router();

/**
 * POST /api/tips
 * Create a new tip
 */
router.post(
  '/',
  authenticate,
  tipRateLimiter,
  validateBody(createTipSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { toCreatorId, amount, currency, message, isAnonymous } = req.body;

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: toCreatorId },
      select: { id: true, user_id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    // Prevent tipping yourself
    if (creator.user_id === userId) {
      throw new ValidationError('You cannot tip yourself');
    }

    // Create tip with pending status first
    const tip = await prisma.tip.create({
      data: {
        from_user_id: userId,
        to_creator_id: toCreatorId,
        amount: amount,
        currency: currency || 'INR', // Use INR for Razorpay
        message: message || null,
        is_anonymous: isAnonymous || false,
        status: 'pending',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
          },
        },
        toCreator: {
          select: {
            id: true,
            display_name: true,
            handle: true,
            avatar: true,
          },
        },
      },
    });

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Create Razorpay payment order
    const order = await createPaymentOrder(
      amount,
      currency || 'INR', // Use INR for Razorpay
      `tip_${tip.id}_${Date.now()}`,
      {
        tipId: tip.id,
        fromUserId: userId,
        toCreatorId: toCreatorId,
        type: 'tip',
      }
    );

    // Update tip with Razorpay order ID
    const updatedTip = await prisma.tip.update({
      where: { id: tip.id },
      data: {
        transaction_id: order.id, // Razorpay order ID
      },
      include: {
        from_user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
          },
        },
        to_creator: {
          select: {
            id: true,
            display_name: true,
            handle: true,
            avatar: true,
          },
        },
      },
    });

    // Don't create notification here - wait for payment to be completed
    // Notification will be created in webhook handler when payment is captured

    res.status(201).json({
      success: true,
      data: {
        tip: updatedTip,
        paymentOrder: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay checkout
        },
      },
      message: 'Tip created. Please complete payment.',
    });
  }
);

/**
 * GET /api/tips
 * Get tips (for creator's received tips or user's sent tips)
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  validateQuery(tipQuerySchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { creatorId, status, page, limit } = req.query as unknown as {
      creatorId?: string;
      status?: 'pending' | 'completed' | 'failed' | 'refunded';
      page: number;
      limit: number;
    };

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (creatorId) {
      // Get tips received by a specific creator
      where.to_creator_id = creatorId;
    } else {
      // Get tips sent by current user
      where.from_user_id = userId;
    }

    if (status) {
      where.status = status;
    }

    const [tips, total] = await prisma.$transaction([
      prisma.tip.findMany({
        where,
        include: {
          from_user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar: true,
            },
          },
          to_creator: {
            select: {
              id: true,
              display_name: true,
              handle: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.tip.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tips,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * GET /api/tips/creator/:creatorId
 * Get tips received by a creator (public endpoint)
 */
router.get(
  '/creator/:creatorId',
  optionalAuth,
  userRateLimiter,
  validateParams(z.object({ creatorId: z.string() })),
  validateQuery(z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('20'),
  })),
  async (req: Request, res: Response) => {
    const { creatorId } = req.params;
    const { page, limit } = req.query as unknown as { page: number; limit: number };

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    const skip = (page - 1) * limit;

    // Only show completed tips publicly
    const [tips, total] = await prisma.$transaction([
      prisma.tip.findMany({
        where: {
          to_creator_id: creatorId,
          status: 'completed',
        },
        include: {
          from_user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.tip.count({
        where: {
          to_creator_id: creatorId,
          status: 'completed',
        },
      }),
    ]);

    // Filter out user info for anonymous tips
    const filteredTips = tips.map(tip => ({
      ...tip,
      from_user: tip.is_anonymous ? null : tip.from_user,
    }));

    res.json({
      success: true,
      data: {
        tips: filteredTips,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * GET /api/tips/:id
 * Get a specific tip
 */
router.get(
  '/:id',
  authenticate,
  userRateLimiter,
  validateParams(z.object({ id: z.string() })),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const tip = await prisma.tip.findUnique({
      where: { id },
      include: {
        from_user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
          },
        },
        to_creator: {
          select: {
            id: true,
            display_name: true,
            handle: true,
            avatar: true,
          },
        },
      },
    });

    if (!tip) {
      throw new NotFoundError('Tip not found');
    }

    // Only allow access if user is the sender or receiver
    const creator = await prisma.creator.findUnique({
      where: { id: tip.to_creator_id },
      select: { user_id: true },
    });

    if (tip.from_user_id !== userId && creator?.user_id !== userId) {
      throw new UnauthorizedError('You are not authorized to view this tip');
    }

    res.json({
      success: true,
      data: tip,
    });
  }
);

/**
 * POST /api/tips/:id/confirm-payment
 * Confirm payment for a tip
 */
router.post(
  '/:id/confirm-payment',
  authenticate,
  tipRateLimiter,
  validateParams(z.object({ id: z.string() })),
  validateBody(confirmPaymentSchema),
  async (req: Request, res: Response) => {
    const { id: tipId } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user!.userId;

    // Get the tip
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        to_creator: {
          select: {
            user_id: true,
            handle: true,
          },
        },
      },
    });

    if (!tip) {
      throw new NotFoundError('Tip not found');
    }

    if (tip.from_user_id !== userId) {
      throw new UnauthorizedError('You can only confirm payments for your own tips');
    }

    if (tip.status !== 'pending') {
      throw new ValidationError('Tip payment has already been processed');
    }

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Get payment details from Razorpay to verify
    try {
      const payment = await razorpay.payments.fetch(paymentIntentId);
      
      if (payment.status !== 'captured') {
        await prisma.tip.update({
          where: { id: tipId },
          data: { status: 'failed' },
        });
        throw new ValidationError('Payment not captured');
      }

      // Update tip status to completed
      const updatedTip = await prisma.tip.update({
        where: { id: tipId },
        data: {
          status: 'completed',
          transaction_id: payment.id,
        },
      });

      // Update creator earnings (85% to creator, 15% platform fee)
      const creatorEarnings = Number(tip.amount) * 0.85;
      await prisma.creatorEarnings.upsert({
        where: { creator_id: tip.to_creator_id },
        create: {
          creator_id: tip.to_creator_id,
          balance: creatorEarnings,
          lifetime_earnings: creatorEarnings,
        },
        update: {
          balance: { increment: creatorEarnings },
          lifetime_earnings: { increment: creatorEarnings },
        },
      });

      // Create notification for creator
      try {
        await prisma.notification.create({
          data: {
            user_id: tip.to_creator.user_id,
            type: 'PAYMENT_RECEIVED',
            title: 'Tip Received!',
            message: tip.is_anonymous
              ? `You received a ₹${tip.amount} ${tip.currency} tip!`
              : `You received a ₹${tip.amount} ${tip.currency} tip from a supporter!`,
            link: `/creator/${tip.to_creator.handle}`,
            metadata: {
              tipId: tip.id,
              amount: tip.amount,
              currency: tip.currency,
              isAnonymous: tip.is_anonymous,
            },
          },
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
      }

      res.json({
        success: true,
        data: updatedTip,
        message: 'Payment confirmed successfully',
      });
    } catch (error: any) {
      // Update tip status to failed
      await prisma.tip.update({
        where: { id: tipId },
        data: { status: 'failed' },
      });
      throw new ValidationError(error.message || 'Payment confirmation failed');
    }
  }
);

export default router;

