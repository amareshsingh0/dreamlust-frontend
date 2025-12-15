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
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Get payout transactions
    const payouts = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        type: 'WITHDRAWAL',
      },
      orderBy: { created_at: 'desc' },
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
      where: { user_id: userId },
      include: {
        creator_earnings: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const earnings = creator.creator_earnings || {
      balance: 0,
      lifetime_earnings: 0,
      pending_payout: 0,
      last_payout_at: null,
    };

    const balance = Number(earnings.balance || 0);
    const canRequestPayout = balance >= MINIMUM_PAYOUT_AMOUNT;

    res.json({
      success: true,
      data: {
        balance,
        lifetimeEarnings: Number(earnings.lifetime_earnings || 0),
        pendingPayout: Number(earnings.pending_payout || 0),
        lastPayoutAt: earnings.last_payout_at,
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
      where: { user_id: userId },
      include: {
        creator_earnings: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const earnings = creator.creator_earnings || {
      balance: 0,
      lifetime_earnings: 0,
      pending_payout: 0,
      last_payout_at: null,
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
        where: { creator_id: creator.id },
        data: {
          balance: { decrement: payoutAmount },
          pending_payout: { increment: payoutAmount },
          last_payout_at: new Date(),
        },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'WITHDRAWAL',
          amount: payoutAmount,
          currency: 'INR',
          status: 'PENDING', // Will be updated by webhook
          razorpay_payment_id: payout.id,
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
        razorpay_payment_id: payoutId,
        user_id: userId,
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
      if (payout.status && payout.status !== transaction.status.toLowerCase()) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: payout.status.toUpperCase(),
          },
        });

        // If payout is processed, update earnings
        if (payout.status === 'processed' || payout.status === 'completed') {
          await prisma.creatorEarnings.update({
            where: { creator_id: transaction.metadata?.creatorId as string },
            data: {
              pending_payout: { decrement: transaction.amount },
            },
          });
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
