import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, ValidationError } from '../lib/errors';
import { z } from 'zod';
import {
  awardPoints,
  ensureUserLoyalty,
  calculateTier,
  getTierBenefits,
  getNextTier,
  awardDailyLogin,
  TIERS,
} from '../lib/loyalty/points';

const router = Router();

const earnPointsSchema = z.object({
  points: z.number().int().positive(),
  reason: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const redeemRewardSchema = z.object({
  rewardId: z.string().min(1),
});

/**
 * GET /api/loyalty/status
 * Get user's loyalty status
 */
router.get(
  '/status',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const loyalty = await ensureUserLoyalty(userId);

    // Calculate next tier requirements
    const nextTierInfo = getNextTier(loyalty.tier as keyof typeof TIERS);
    const currentTierPoints = TIERS[loyalty.tier as keyof typeof TIERS].minPoints;
    const nextTierPoints = nextTierInfo?.minPoints || null;
    const pointsToNextTier = nextTierPoints ? nextTierPoints - loyalty.lifetimePoints : null;
    const tierBenefits = getTierBenefits(loyalty.tier as keyof typeof TIERS);

    res.json({
      success: true,
      data: {
        points: loyalty.points,
        tier: loyalty.tier,
        lifetimePoints: loyalty.lifetimePoints,
        lastActivityAt: loyalty.lastActivityAt.toISOString(),
        nextTier: nextTierInfo?.tier || null,
        pointsToNextTier,
        tierProgress: nextTierPoints && currentTierPoints !== null
          ? Math.min(100, Math.max(0, ((loyalty.lifetimePoints - currentTierPoints) / (nextTierPoints - currentTierPoints)) * 100))
          : loyalty.tier === 'platinum' ? 100 : 0,
        tierBenefits,
      },
    });
  })
);

/**
 * POST /api/loyalty/earn
 * Earn loyalty points (internal use or admin)
 */
router.post(
  '/earn',
  authenticate,
  userRateLimiter,
  validateBody(earnPointsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { points, reason, metadata } = req.body;

    // Use the awardPoints function which handles everything
    const result = await awardPoints(userId, reason, { ...metadata, manualPoints: points });

    res.json({
      success: true,
      message: `Earned ${result.points} loyalty points${result.upgraded ? ` and upgraded to ${result.newTier}!` : ''}`,
      data: {
        points: result.points,
        upgraded: result.upgraded,
        newTier: result.newTier,
      },
    });
  })
);

/**
 * POST /api/loyalty/daily-login
 * Award daily login bonus
 */
router.post(
  '/daily-login',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const result = await awardDailyLogin(userId);

    if (!result.awarded) {
      return res.json({
        success: false,
        message: 'Daily login bonus already claimed today',
        data: { awarded: false },
      });
    }

    res.json({
      success: true,
      message: `Daily login bonus: ${result.points} points!`,
      data: {
        points: result.points,
        awarded: true,
      },
    });
  })
);

/**
 * GET /api/loyalty/transactions
 * Get user's loyalty transaction history
 */
router.get(
  '/transactions',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loyaltyTransaction.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          points: t.points,
          reason: t.reason,
          metadata: t.metadata,
          createdAt: t.createdAt.toISOString(),
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
 * GET /api/loyalty/rewards
 * Get available rewards
 */
router.get(
  '/rewards',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    // Filter out expired rewards
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const [rewards, total] = await Promise.all([
      prisma.reward.findMany({
        where,
        orderBy: { pointsCost: 'asc' },
        skip,
        take: limit,
      }),
      prisma.reward.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        rewards: rewards.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          pointsCost: r.pointsCost,
          type: r.type,
          value: r.value,
          stock: r.stock,
          imageUrl: r.imageUrl,
          category: r.category,
          expiresAt: r.expiresAt?.toISOString() || null,
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
 * POST /api/loyalty/redeem
 * Redeem a reward
 */
router.post(
  '/redeem',
  authenticate,
  userRateLimiter,
  validateBody(redeemRewardSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { rewardId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Get user loyalty
      const loyalty = await ensureUserLoyalty(userId);

      // Get reward
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward) {
        throw new NotFoundError('Reward');
      }

      if (!reward.isActive) {
        throw new ValidationError('This reward is no longer available');
      }

      // Check expiration
      if (reward.expiresAt && new Date() > reward.expiresAt) {
        throw new ValidationError('This reward has expired');
      }

      // Check stock
      if (reward.stock !== null && reward.stock <= 0) {
        throw new ValidationError('This reward is out of stock');
      }

      // Check points
      if (loyalty.points < reward.pointsCost) {
        throw new ValidationError(
          `Insufficient points. You need ${reward.pointsCost} points but have ${loyalty.points}`
        );
      }

      // Deduct points
      const updatedLoyalty = await tx.userLoyalty.update({
        where: { userId },
        data: {
          points: { decrement: reward.pointsCost },
          lastActivityAt: new Date(),
        },
      });

      // Decrement stock if limited
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: rewardId },
          data: {
            stock: { decrement: 1 },
          },
        });
      }

      // Create transaction record
      await tx.loyaltyTransaction.create({
        data: {
          userId,
          type: 'redeemed',
          points: -reward.pointsCost,
          reason: 'reward_redemption',
          metadata: {
            rewardId: reward.id,
            rewardTitle: reward.title,
            rewardType: reward.type,
            rewardValue: reward.value,
          },
        },
      });

      return {
        loyalty: updatedLoyalty,
        reward,
      };
    });

    res.json({
      success: true,
      message: `Successfully redeemed ${result.reward.title}`,
      data: {
        reward: {
          id: result.reward.id,
          title: result.reward.title,
          type: result.reward.type,
          value: result.reward.value,
        },
        remainingPoints: result.loyalty.points,
      },
    });
  })
);

/**
 * GET /api/loyalty/rewards/:id
 * Get reward details
 */
router.get(
  '/rewards/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const reward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      throw new NotFoundError('Reward');
    }

    res.json({
      success: true,
      data: {
        id: reward.id,
        title: reward.title,
        description: reward.description,
        pointsCost: reward.pointsCost,
        type: reward.type,
        value: reward.value,
        stock: reward.stock,
        imageUrl: reward.imageUrl,
        category: reward.category,
        expiresAt: reward.expiresAt?.toISOString() || null,
        isActive: reward.isActive,
      },
    });
  })
);

export default router;

