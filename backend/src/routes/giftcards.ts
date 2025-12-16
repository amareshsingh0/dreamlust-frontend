import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * Generate a unique gift card code
 */
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Ensure unique gift card code
 */
async function ensureUniqueCode(): Promise<string> {
  let code = generateGiftCardCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.giftCard.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }

    code = generateGiftCardCode();
    attempts++;
  }

  throw new Error('Failed to generate unique gift card code');
}

const purchaseGiftCardSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  recipientEmail: z.string().email().optional(),
  personalMessage: z.string().max(500).optional(),
  sendDate: z.string().datetime().optional(),
  expiresInDays: z.number().int().positive().default(365), // Default 1 year
});

const redeemGiftCardSchema = z.object({
  code: z.string().min(1).transform((val) => val.toUpperCase().replace(/\s+/g, '')),
});

/**
 * POST /api/giftcards/purchase
 * Purchase a gift card
 */
router.post(
  '/purchase',
  authenticate,
  userRateLimiter,
  validateBody(purchaseGiftCardSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { amount, currency, recipientEmail, personalMessage, sendDate, expiresInDays } = req.body;

    // Generate unique code
    const code = await ensureUniqueCode();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create gift card
    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        amount: new Prisma.Decimal(amount),
        currency: currency || 'USD',
        purchasedBy: userId,
        status: 'active',
        expiresAt,
        recipientEmail: recipientEmail || null,
        personalMessage: personalMessage || null,
        sendDate: sendDate ? new Date(sendDate) : null,
      },
    });

    // TODO: Process payment here (Stripe, Razorpay, etc.)
    // For now, we'll just create the gift card
    // In production, you'd:
    // 1. Create payment intent
    // 2. Process payment
    // 3. Only create gift card after successful payment

    res.json({
      success: true,
      data: {
        giftCard: {
          id: giftCard.id,
          code: giftCard.code,
          amount: giftCard.amount.toString(),
          currency: giftCard.currency,
          expiresAt: giftCard.expiresAt.toISOString(),
          recipientEmail: giftCard.recipientEmail,
          personalMessage: giftCard.personalMessage,
          sendDate: giftCard.sendDate?.toISOString() || null,
        },
      },
    });
  })
);

/**
 * POST /api/giftcards/redeem
 * Redeem a gift card
 */
router.post(
  '/redeem',
  authenticate,
  userRateLimiter,
  validateBody(redeemGiftCardSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { code } = req.body;

    // Find gift card
    const giftCard = await prisma.giftCard.findUnique({
      where: { code },
    });

    if (!giftCard) {
      throw new NotFoundError('Gift card not found');
    }

    // Check if already redeemed
    if (giftCard.status === 'redeemed') {
      throw new ValidationError('This gift card has already been redeemed');
    }

    // Check if expired
    if (giftCard.status === 'expired' || new Date() > giftCard.expiresAt) {
      // Update status to expired
      await prisma.giftCard.update({
        where: { id: giftCard.id },
        data: { status: 'expired' },
      });
      throw new ValidationError('This gift card has expired');
    }

    // Check if user is trying to redeem their own gift card
    if (giftCard.purchasedBy === userId) {
      throw new ValidationError('You cannot redeem a gift card you purchased');
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get current user balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const currentBalance = user.balance || new Prisma.Decimal(0);
      const newBalance = currentBalance.plus(giftCard.amount);

      // Update user balance
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: newBalance,
        },
      });

      // Mark gift card as redeemed
      const updatedCard = await tx.giftCard.update({
        where: { id: giftCard.id },
        data: {
          status: 'redeemed',
          redeemedBy: userId,
          redeemedAt: new Date(),
        },
      });

      return {
        newBalance: newBalance.toString(),
        giftCard: updatedCard,
      };
    });

    res.json({
      success: true,
      message: 'Gift card redeemed successfully',
      data: {
        newBalance: result.newBalance,
        amount: giftCard.amount.toString(),
        currency: giftCard.currency,
      },
    });
  })
);

/**
 * GET /api/giftcards/my-purchases
 * Get gift cards purchased by the user
 */
router.get(
  '/my-purchases',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where: {
          purchasedBy: userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.giftCard.count({
        where: {
          purchasedBy: userId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        giftCards: giftCards.map((card) => ({
          id: card.id,
          code: card.code,
          amount: card.amount.toString(),
          currency: card.currency,
          status: card.status,
          expiresAt: card.expiresAt.toISOString(),
          redeemedAt: card.redeemedAt?.toISOString() || null,
          recipientEmail: card.recipientEmail,
          personalMessage: card.personalMessage,
          sendDate: card.sendDate?.toISOString() || null,
          createdAt: card.createdAt.toISOString(),
        })),
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
 * GET /api/giftcards/my-redemptions
 * Get gift cards redeemed by the user
 */
router.get(
  '/my-redemptions',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where: {
          redeemedBy: userId,
        },
        orderBy: {
          redeemedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.giftCard.count({
        where: {
          redeemedBy: userId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        giftCards: giftCards.map((card) => ({
          id: card.id,
          code: card.code,
          amount: card.amount.toString(),
          currency: card.currency,
          status: card.status,
          redeemedAt: card.redeemedAt?.toISOString(),
          createdAt: card.createdAt.toISOString(),
        })),
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
 * GET /api/giftcards/:code
 * Get gift card details by code (for verification before purchase)
 */
router.get(
  '/:code',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '');

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: normalizedCode },
    });

    if (!giftCard) {
      throw new NotFoundError('Gift card not found');
    }

    // Only return safe information
    res.json({
      success: true,
      data: {
        amount: giftCard.amount.toString(),
        currency: giftCard.currency,
        status: giftCard.status,
        expiresAt: giftCard.expiresAt.toISOString(),
        isExpired: new Date() > giftCard.expiresAt,
        isRedeemed: giftCard.status === 'redeemed',
      },
    });
  })
);

export default router;

