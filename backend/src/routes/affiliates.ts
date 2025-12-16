import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody, validateQuery } from '../middleware/validation';
import { NotFoundError, ConflictError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';
import { generateAffiliateCode } from '../lib/affiliate/generator';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router();

const applyAffiliateSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
});

const updateAffiliateSchema = z.object({
  status: z.enum(['pending', 'approved', 'suspended']).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
});

/**
 * POST /api/affiliates/apply
 * Apply to become an affiliate
 */
router.post(
  '/apply',
  authenticate,
  userRateLimiter,
  validateBody(applyAffiliateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Check if user already has an affiliate account
    const existing = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictError('You already have an affiliate account');
    }

    // Generate unique affiliate code
    let code = generateAffiliateCode();
    let attempts = 0;
    while (await prisma.affiliate.findUnique({ where: { code } })) {
      code = generateAffiliateCode();
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique affiliate code');
      }
    }

    // Create affiliate account
    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        code,
        status: 'pending',
        commissionRate: req.body.commissionRate ? new Decimal(req.body.commissionRate) : new Decimal(10),
      },
      select: {
        id: true,
        code: true,
        status: true,
        commissionRate: true,
        totalReferrals: true,
        totalEarnings: true,
        pendingPayout: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...affiliate,
        commissionRate: Number(affiliate.commissionRate),
        totalEarnings: Number(affiliate.totalEarnings),
        pendingPayout: Number(affiliate.pendingPayout),
      },
    });
  })
);

/**
 * GET /api/affiliates/me
 * Get current user's affiliate account
 */
router.get(
  '/me',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        referrals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            referredUserId: true,
            status: true,
            commissionAmount: true,
            conversionDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate account not found');
    }

    res.json({
      success: true,
      data: {
        ...affiliate,
        commissionRate: Number(affiliate.commissionRate),
        totalEarnings: Number(affiliate.totalEarnings),
        pendingPayout: Number(affiliate.pendingPayout),
        referrals: affiliate.referrals.map((r) => ({
          ...r,
          commissionAmount: r.commissionAmount ? Number(r.commissionAmount) : null,
        })),
      },
    });
  })
);

/**
 * GET /api/affiliates/referrals
 * Get referrals for current affiliate
 */
router.get(
  '/referrals',
  authenticate,
  userRateLimiter,
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['pending', 'converted', 'paid']).optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { page, limit, status } = req.query as any;
    const skip = (page - 1) * limit;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate account not found');
    }

    const where: any = {
      affiliateId: affiliate.id,
    };

    if (status) {
      where.status = status;
    }

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referredUser: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.referral.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        referrals: referrals.map((r) => ({
          id: r.id,
          referredUser: r.referredUser,
          email: r.referredUser?.email || null,
          status: r.status,
          commissionAmount: r.commissionAmount ? Number(r.commissionAmount) : null,
          conversionDate: r.conversionDate,
          createdAt: r.createdAt,
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
 * GET /api/affiliates/stats
 * Get affiliate statistics
 */
router.get(
  '/stats',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            referrals: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate account not found');
    }

    const [pendingCount, convertedCount, paidCount] = await Promise.all([
      prisma.referral.count({
        where: {
          affiliateId: affiliate.id,
          status: 'pending',
        },
      }),
      prisma.referral.count({
        where: {
          affiliateId: affiliate.id,
          status: 'converted',
        },
      }),
      prisma.referral.count({
        where: {
          affiliateId: affiliate.id,
          status: 'paid',
        },
      }),
    ]);

    // Calculate conversion rate
    const totalReferrals = affiliate.totalReferrals || 0;
    const convertedReferrals = convertedCount + paidCount;
    const conversionRate = totalReferrals > 0 
      ? ((convertedReferrals / totalReferrals) * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        totalReferrals: affiliate.totalReferrals,
        totalEarnings: Number(affiliate.totalEarnings),
        pendingPayout: Number(affiliate.pendingPayout),
        commissionRate: Number(affiliate.commissionRate),
        conversionRate: parseFloat(conversionRate),
        status: affiliate.status,
        code: affiliate.code,
        stats: {
          pending: pendingCount,
          converted: convertedCount,
          paid: paidCount,
        },
      },
    });
  })
);

/**
 * GET /api/affiliates/:code
 * Get affiliate info by code (public)
 */
router.get(
  '/:code',
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        status: true,
        commissionRate: true,
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate not found');
    }

    if (affiliate.status !== 'approved') {
      throw new NotFoundError('Affiliate not found');
    }

    res.json({
      success: true,
      data: {
        code: affiliate.code,
        commissionRate: Number(affiliate.commissionRate),
        user: affiliate.user,
      },
    });
  })
);

/**
 * POST /api/affiliates/track
 * Track a referral (called when user signs up with affiliate code)
 */
router.post(
  '/track',
  userRateLimiter,
  validateBody(z.object({
    code: z.string().min(1),
    referredUserId: z.string().uuid(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { code, referredUserId } = req.body;

    // Find affiliate
    const affiliate = await prisma.affiliate.findUnique({
      where: { code },
    });

    if (!affiliate || affiliate.status !== 'approved') {
      throw new NotFoundError('Invalid affiliate code');
    }

    // Check if referral already exists
    const existing = await prisma.referral.findFirst({
      where: {
        referredUserId,
      },
    });

    if (existing) {
      // Referral already tracked
      res.json({
        success: true,
        message: 'Referral already tracked',
        data: { referralId: existing.id },
      });
      return;
    }

    // Create referral
    const referral = await prisma.referral.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId,
        status: 'pending',
      },
    });

    // Update affiliate total referrals
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        totalReferrals: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Referral tracked',
      data: { referralId: referral.id },
    });
  })
);

/**
 * PUT /api/affiliates/me
 * Update affiliate account (admin only for status/commission)
 */
router.put(
  '/me',
  authenticate,
  userRateLimiter,
  validateBody(updateAffiliateSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'MODERATOR';

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate account not found');
    }

    const updateData: any = {};

    // Only admins can change status and commission rate
    if (isAdmin) {
      if (req.body.status) {
        updateData.status = req.body.status;
      }
      if (req.body.commissionRate !== undefined) {
        updateData.commissionRate = new Decimal(req.body.commissionRate);
      }
    }

    const updated = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: updateData,
      select: {
        id: true,
        code: true,
        status: true,
        commissionRate: true,
        totalReferrals: true,
        totalEarnings: true,
        pendingPayout: true,
      },
    });

    res.json({
      success: true,
      data: {
        ...updated,
        commissionRate: Number(updated.commissionRate),
        totalEarnings: Number(updated.totalEarnings),
        pendingPayout: Number(updated.pendingPayout),
      },
    });
  })
);

/**
 * GET /api/affiliates/banners
 * Get affiliate banner URLs/images
 */
router.get(
  '/banners',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate account not found');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const affiliateLink = `${baseUrl}/register?affiliateCode=${affiliate.code}`;

    // Generate banner URLs (in production, these would be actual image URLs)
    const banners = [
      {
        size: '728x90',
        name: 'Leaderboard',
        url: `${baseUrl}/api/affiliates/banner/728x90?code=${affiliate.code}`,
        html: `<a href="${affiliateLink}"><img src="${baseUrl}/api/affiliates/banner/728x90?code=${affiliate.code}" alt="Join Now" /></a>`,
      },
      {
        size: '300x250',
        name: 'Medium Rectangle',
        url: `${baseUrl}/api/affiliates/banner/300x250?code=${affiliate.code}`,
        html: `<a href="${affiliateLink}"><img src="${baseUrl}/api/affiliates/banner/300x250?code=${affiliate.code}" alt="Join Now" /></a>`,
      },
      {
        size: '160x600',
        name: 'Wide Skyscraper',
        url: `${baseUrl}/api/affiliates/banner/160x600?code=${affiliate.code}`,
        html: `<a href="${affiliateLink}"><img src="${baseUrl}/api/affiliates/banner/160x600?code=${affiliate.code}" alt="Join Now" /></a>`,
      },
    ];

    res.json({
      success: true,
      data: {
        banners,
        affiliateLink,
      },
    });
  })
);

export default router;

