import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter, tipRateLimiter } from '../middleware/rateLimit';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { createTipSchema, tipQuerySchema, confirmPaymentSchema } from '../schemas/tip';
import { asyncHandler } from '../middleware/asyncHandler';
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
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { toCreatorId, amount, currency, message, isAnonymous } = req.body;

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: toCreatorId },
      select: { id: true, userId: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    // Prevent tipping yourself
    if (creator.userId === userId) {
      throw new ValidationError('You cannot tip yourself');
    }

    // Create tip with pending status first
    const tip = await prisma.tip.create({
      data: {
        fromUserId: userId,
        toCreatorId: toCreatorId,
        amount: amount,
        currency: currency || 'INR', // Use INR for Razorpay
        message: message || null,
        isAnonymous: isAnonymous || false,
        status: 'pending',
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        toCreator: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatar: true,
          },
        },
      },
    });

    // In development mode without Razorpay, auto-complete the tip
    if (!razorpay) {
      if (process.env.NODE_ENV === 'development') {
        // Auto-complete tip in development mode
        const completedTip = await prisma.tip.update({
          where: { id: tip.id },
          data: {
            status: 'completed',
            transactionId: `dev_tip_${Date.now()}`,
          },
          include: {
            fromUser: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            toCreator: {
              select: {
                id: true,
                displayName: true,
                handle: true,
                avatar: true,
              },
            },
          },
        });

        return res.status(201).json({
          success: true,
          data: {
            tip: completedTip,
            paymentOrder: null,
          },
          message: 'Tip completed (development mode - no payment required).',
        });
      }
      throw new ValidationError('Razorpay is not configured');
    }

    // Create Razorpay payment order
    let order;
    try {
      console.log('[Tips] Creating Razorpay order for amount:', amount, 'INR');
      console.log('[Tips] Razorpay Key ID:', env.RAZORPAY_KEY_ID?.substring(0, 15) + '...');

      // Create short receipt (max 40 chars for Razorpay)
      // tip.id is a UUID (36 chars), so we take first 8 chars without dashes
      const shortTipId = tip.id.replace(/-/g, '').substring(0, 8);
      const shortTimestamp = String(Date.now()).slice(-8);
      const receipt = `tip_${shortTipId}_${shortTimestamp}`; // ~21 chars

      order = await createPaymentOrder(
        amount,
        currency || 'INR', // Use INR for Razorpay
        receipt,
        {
          tipId: tip.id,
          fromUserId: userId,
          toCreatorId: toCreatorId,
          type: 'tip',
        }
      );

      console.log('[Tips] Razorpay order created successfully:', order.id);
    } catch (razorpayError: any) {
      console.error('[Tips] Razorpay order creation failed:', {
        message: razorpayError?.message,
        error: razorpayError?.error,
        statusCode: razorpayError?.statusCode,
        description: razorpayError?.error?.description,
      });

      // Delete the pending tip
      await prisma.tip.delete({ where: { id: tip.id } });

      // Return actual error message so user knows what went wrong
      const errorMessage = razorpayError?.error?.description ||
        razorpayError?.message ||
        'Payment service error. Please check Razorpay credentials.';

      throw new ValidationError(`Razorpay Error: ${errorMessage}`);
    }

    // Update tip with Razorpay order ID
    const updatedTip = await prisma.tip.update({
      where: { id: tip.id },
      data: {
        transactionId: order.id, // Razorpay order ID
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        toCreator: {
          select: {
            id: true,
            displayName: true,
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
  })
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
  asyncHandler(async (req: Request, res: Response) => {
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
      where.toCreatorId = creatorId;
    } else {
      // Get tips sent by current user
      where.fromUserId = userId;
    }

    if (status) {
      where.status = status;
    }

    const [tips, total] = await prisma.$transaction([
      prisma.tip.findMany({
        where,
        include: {
          fromUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          toCreator: {
            select: {
              id: true,
              displayName: true,
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
  })
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
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })),
  asyncHandler(async (req: Request, res: Response) => {
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
          toCreatorId: creatorId,
          status: 'completed',
        },
        include: {
          fromUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
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
          toCreatorId: creatorId,
          status: 'completed',
        },
      }),
    ]);

    // Filter out user info for anonymous tips
    const filteredTips = tips.map(tip => ({
      ...tip,
      fromUser: tip.isAnonymous ? null : tip.fromUser,
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
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const tip = await prisma.tip.findUnique({
      where: { id },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        toCreator: {
          select: {
            id: true,
            displayName: true,
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
      where: { id: tip.toCreatorId },
      select: { userId: true },
    });

    if (tip.fromUserId !== userId && creator?.userId !== userId) {
      throw new UnauthorizedError('You are not authorized to view this tip');
    }

    res.json({
      success: true,
      data: tip,
    });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id: tipId } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user!.userId;

    // Get the tip
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        toCreator: {
          select: {
            userId: true,
            handle: true,
          },
        },
      },
    });

    if (!tip) {
      throw new NotFoundError('Tip not found');
    }

    if (tip.fromUserId !== userId) {
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
          transactionId: payment.id,
        },
      });

      // Update creator earnings (85% to creator, 15% platform fee)
      const creatorEarnings = Number(tip.amount) * 0.85;
      await prisma.creatorEarnings.upsert({
        where: { creatorId: tip.toCreatorId },
        create: {
          creatorId: tip.toCreatorId,
          balance: creatorEarnings,
          lifetimeEarnings: creatorEarnings,
        },
        update: {
          balance: { increment: creatorEarnings },
          lifetimeEarnings: { increment: creatorEarnings },
        },
      });

      // Create notification for creator
      try {
        await prisma.notification.create({
          data: {
            userId: tip.toCreator.userId,
            type: 'PAYMENT_RECEIVED',
            title: 'Tip Received!',
            message: tip.isAnonymous
              ? `You received a ₹${tip.amount} ${tip.currency} tip!`
              : `You received a ₹${tip.amount} ${tip.currency} tip from a supporter!`,
            link: `/creator/${tip.toCreator.handle}`,
            metadata: {
              tipId: tip.id,
              amount: tip.amount,
              currency: tip.currency,
              isAnonymous: tip.isAnonymous,
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
  })
);

export default router;

