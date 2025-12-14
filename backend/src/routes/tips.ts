import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { createTipSchema, tipQuerySchema, confirmPaymentSchema } from '../schemas/tip';
import { paymentService } from '../lib/payment';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/tips
 * Create a new tip
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(createTipSchema),
  async (req: Request, res: Response) => {
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
        currency: currency || 'USD',
        message: message || null,
        isAnonymous: isAnonymous || false,
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

    // Create payment intent with payment provider
    // Include tipId in metadata for webhook handling
    const paymentIntent = await paymentService.createPaymentIntent(
      amount,
      currency || 'USD',
      {
        tipId: tip.id,
        fromUserId: userId,
        toCreatorId: toCreatorId,
        type: 'tip',
      }
    );

    // Update tip with payment intent ID
    const updatedTip = await prisma.tip.update({
      where: { id: tip.id },
      data: {
        transactionId: paymentIntent.id, // Payment intent ID
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

    // Return payment intent details for frontend to process payment

    // Create notification for creator
    try {
      await prisma.notification.create({
        data: {
          userId: creator.userId,
          type: 'PAYMENT_RECEIVED',
          title: 'New Tip Received',
          message: isAnonymous
            ? `You received a $${amount} ${currency} tip!`
            : `You received a $${amount} ${currency} tip from ${tip.fromUser.display_name || tip.fromUser.username}!`,
          link: `/creator/${creator.handle}`,
          metadata: {
            tipId: tip.id,
            amount: amount,
            currency: currency,
            isAnonymous: isAnonymous,
          },
        },
      });
    } catch (error) {
      // Log error but don't fail the tip creation
      console.error('Failed to create notification:', error);
    }

    res.status(201).json({
      success: true,
      data: {
        tip: updatedTip,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.clientSecret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
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
  }
);

/**
 * POST /api/tips/:id/confirm-payment
 * Confirm payment for a tip
 */
router.post(
  '/:id/confirm-payment',
  authenticate,
  userRateLimiter,
  validateParams(z.object({ id: z.string() })),
  validateBody(confirmPaymentSchema),
  async (req: Request, res: Response) => {
    const { id: tipId } = req.params;
    const { paymentIntentId, paymentMethodId } = req.body;
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

    // Confirm payment with payment provider
    const paymentResult = await paymentService.confirmPayment(paymentIntentId, paymentMethodId);

    if (!paymentResult.success) {
      // Update tip status to failed
      await prisma.tip.update({
        where: { id: tipId },
        data: { status: 'failed' },
      });

      throw new ValidationError('Payment confirmation failed');
    }

    // Update tip status to completed
    const updatedTip = await prisma.tip.update({
      where: { id: tipId },
      data: {
        status: 'completed',
        transactionId: paymentResult.transactionId,
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
            ? `You received a $${tip.amount} ${tip.currency} tip!`
            : `You received a $${tip.amount} ${tip.currency} tip from a supporter!`,
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
  }
);

export default router;

