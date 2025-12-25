import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import { razorpay, createDirectPayout, getPayout } from '../lib/razorpay';

const router = Router();

const MINIMUM_PAYOUT_AMOUNT = 50; // Minimum ₹50 for payout

const requestPayoutSchema = z.object({
  accountNumber: z.string().min(9).max(18),
  ifsc: z.string().length(11),
  beneficiaryName: z.string().min(3).max(100),
  amount: z.number().positive().optional(), // Optional - defaults to full balance
});

/**
 * GET /api/payouts
 * Get payout history for creator
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get creator profile
    const creator = await prisma.creator.findUnique({
      where: { userId: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Get payout transactions
    const payouts = await prisma.transaction.findMany({
      where: {
        userId: userId,
        type: 'WITHDRAWAL',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: {
        payouts,
      },
    });
  }
);

/**
 * GET /api/payouts/balance
 * Get current earnings balance and payout eligibility
 */
router.get(
  '/balance',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get creator profile with earnings
    const creator = await prisma.creator.findUnique({
      where: { userId: userId },
      include: {
        creatorEarnings: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const earnings = creator.creatorEarnings || {
      balance: 0,
      lifetimeEarnings: 0,
      pendingPayout: 0,
      lastPayoutAt: null,
    };

    const balance = Number(earnings.balance || 0);
    const canRequestPayout = balance >= MINIMUM_PAYOUT_AMOUNT;

    res.json({
      success: true,
      data: {
        balance,
        lifetimeEarnings: Number(earnings.lifetimeEarnings || 0),
        pendingPayout: Number(earnings.pendingPayout || 0),
        lastPayoutAt: earnings.lastPayoutAt,
        canRequestPayout,
        minimumPayoutAmount: MINIMUM_PAYOUT_AMOUNT,
      },
    });
  }
);

/**
 * POST /api/payouts/request
 * Request a payout
 */
router.post(
  '/request',
  authenticate,
  userRateLimiter,
  validateBody(requestPayoutSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { accountNumber, ifsc, beneficiaryName, amount } = req.body;

    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    // Get creator profile with earnings
    const creator = await prisma.creator.findUnique({
      where: { userId: userId },
      include: {
        creatorEarnings: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const earnings = creator.creatorEarnings || {
      balance: 0,
      lifetimeEarnings: 0,
      pendingPayout: 0,
      lastPayoutAt: null,
    };

    const availableBalance = Number(earnings.balance || 0);
    const payoutAmount = amount ? Number(amount) : availableBalance;

    // Validate payout amount
    if (payoutAmount < MINIMUM_PAYOUT_AMOUNT) {
      throw new ValidationError(
        `Minimum payout amount is ₹${MINIMUM_PAYOUT_AMOUNT}`
      );
    }

    if (payoutAmount > availableBalance) {
      throw new ValidationError('Insufficient balance');
    }

    // Create payout via Razorpay
    try {
      const payout = await createDirectPayout(
        payoutAmount,
        accountNumber,
        ifsc,
        beneficiaryName,
        'INR',
        {
          creatorId: creator.id,
          userId: userId,
          type: 'payout',
        }
      );

      // Update creator earnings
      await prisma.creatorEarnings.update({
        where: { creatorId: creator.id },
        data: {
          balance: { decrement: payoutAmount },
          pendingPayout: { increment: payoutAmount },
          lastPayoutAt: new Date(),
        },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          userId: userId,
          type: 'WITHDRAWAL',
          amount: payoutAmount,
          currency: 'INR',
          status: 'PENDING', // Will be updated by webhook
          razorpayPaymentId: payout.id,
          metadata: {
            payoutId: payout.id,
            accountNumber: accountNumber.substring(accountNumber.length - 4), // Last 4 digits only
            ifsc,
            beneficiaryName,
          },
        },
      });

      res.json({
        success: true,
        data: {
          payoutId: payout.id,
          amount: payoutAmount,
          status: payout.status || 'pending',
          transactionId: transaction.id,
        },
        message: 'Payout request submitted successfully',
      });
    } catch (error: any) {
      console.error('Payout error:', error);
      throw new ValidationError(
        error.message || 'Failed to process payout request'
      );
    }
  }
);

/**
 * GET /api/payouts/:payoutId
 * Get payout details
 */
router.get(
  '/:payoutId',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { payoutId } = req.params;

    // Get transaction to verify ownership
    const transaction = await prisma.transaction.findFirst({
      where: {
        razorpayPaymentId: payoutId,
        userId: userId,
        type: 'WITHDRAWAL',
      },
    });

    if (!transaction) {
      throw new NotFoundError('Payout not found');
    }

    // Get payout details from Razorpay
    if (!razorpay) {
      throw new ValidationError('Razorpay is not configured');
    }

    try {
      const payout = await getPayout(payoutId);

      // Update transaction status if changed
      const transactionStatus = transaction.status || '';
      if (payout.status && payout.status !== transactionStatus.toLowerCase()) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: payout.status.toUpperCase(),
          },
        });

        // If payout is processed, update earnings
        if (payout.status === 'processed' || payout.status === 'completed') {
          const metadata = transaction.metadata as { creatorId?: string } | null;
          if (metadata?.creatorId) {
            await prisma.creatorEarnings.update({
              where: { creatorId: metadata.creatorId },
              data: {
                pendingPayout: { decrement: transaction.amount },
              },
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          payout,
          transaction,
        },
      });
    } catch (error: any) {
      throw new ValidationError(error.message || 'Failed to fetch payout details');
    }
  }
);

export default router;
