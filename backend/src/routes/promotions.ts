/**
 * Promotions Routes
 * Handles promo codes and flash sales
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validatePromoCode, recordPromoCodeUsage } from '../lib/pricing/pricingEngine';
import { BadRequestError, NotFoundError } from '../lib/errors';

const router = Router();

/**
 * POST /api/promotions/validate-code
 * Validate a promo code
 */
router.post(
  '/validate-code',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, productType, amount } = req.body;

    if (!code) {
      throw new BadRequestError('Promo code is required');
    }

    const promo = await validatePromoCode(code);

    if (!promo) {
      return res.json({
        success: false,
        error: {
          code: 'INVALID_PROMO',
          message: 'Invalid or expired promo code',
        },
      });
    }

    // Check if applicable to product type
    if (promo.applicableProducts.length > 0 && !promo.applicableProducts.includes(productType)) {
      return res.json({
        success: false,
        error: {
          code: 'NOT_APPLICABLE',
          message: 'Promo code is not applicable to this product type',
        },
      });
    }

    // Check minimum purchase
    if (promo.minPurchase && amount && amount < Number(promo.minPurchase)) {
      return res.json({
        success: false,
        error: {
          code: 'MIN_PURCHASE',
          message: `Minimum purchase of ${promo.minPurchase} required`,
        },
      });
    }

    res.json({
      success: true,
      data: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        description: promo.description,
      },
    });
  })
);

/**
 * GET /api/promotions/codes
 * Get promo codes (admin only)
 */
router.get(
  '/codes',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.query;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const codes = await prisma.promoCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: codes,
    });
  })
);

/**
 * POST /api/promotions/codes
 * Create promo code (admin only)
 */
router.post(
  '/codes',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxUses,
      validFrom,
      validUntil,
      applicableProducts,
    } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      throw new BadRequestError('Code, discountType, and discountValue are required');
    }

    // TODO: Check if user is admin

    const promo = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minPurchase: minPurchase || null,
        maxUses: maxUses || null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        applicableProducts: applicableProducts || [],
        createdBy: req.user!.userId,
      },
    });

    res.json({
      success: true,
      data: promo,
    });
  })
);

/**
 * PUT /api/promotions/codes/:id
 * Update promo code (admin only)
 */
router.put(
  '/codes/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      description,
      discountType,
      discountValue,
      minPurchase,
      maxUses,
      validFrom,
      validUntil,
      applicableProducts,
      isActive,
    } = req.body;

    // TODO: Check if user is admin

    const promo = await prisma.promoCode.update({
      where: { id },
      data: {
        ...(description !== undefined && { description }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue }),
        ...(minPurchase !== undefined && { minPurchase }),
        ...(maxUses !== undefined && { maxUses }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(applicableProducts !== undefined && { applicableProducts }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: promo,
    });
  })
);

/**
 * DELETE /api/promotions/codes/:id
 * Delete promo code (admin only)
 */
router.delete(
  '/codes/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // TODO: Check if user is admin

    await prisma.promoCode.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Promo code deleted',
    });
  })
);

/**
 * GET /api/promotions/flash-sales
 * Get active flash sales
 */
router.get(
  '/flash-sales',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();

    const sales = await prisma.flashSale.findMany({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({
      success: true,
      data: sales,
    });
  })
);

/**
 * GET /api/promotions/flash-sales/:id
 * Get flash sale details
 */
router.get(
  '/flash-sales/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const sale = await prisma.flashSale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundError('Flash sale not found');
    }

    res.json({
      success: true,
      data: sale,
    });
  })
);

/**
 * POST /api/promotions/flash-sales
 * Create flash sale (admin only)
 */
router.post(
  '/flash-sales',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      productId,
      productType,
      title,
      description,
      discountPercent,
      stock,
      startTime,
      endTime,
    } = req.body;

    if (!title || discountPercent === undefined || !stock || !startTime || !endTime) {
      throw new BadRequestError('Title, discountPercent, stock, startTime, and endTime are required');
    }

    // TODO: Check if user is admin

    const sale = await prisma.flashSale.create({
      data: {
        productId: productId || null,
        productType: productType || 'content',
        title,
        description,
        discountPercent,
        stock,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    res.json({
      success: true,
      data: sale,
    });
  })
);

/**
 * PUT /api/promotions/flash-sales/:id
 * Update flash sale (admin only)
 */
router.put(
  '/flash-sales/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      title,
      description,
      discountPercent,
      stock,
      startTime,
      endTime,
      isActive,
    } = req.body;

    // TODO: Check if user is admin

    const sale = await prisma.flashSale.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(discountPercent !== undefined && { discountPercent }),
        ...(stock !== undefined && { stock }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: sale,
    });
  })
);

/**
 * POST /api/promotions/flash-sales/:id/purchase
 * Purchase from flash sale
 */
router.post(
  '/flash-sales/:id/purchase',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const sale = await prisma.flashSale.findUnique({
      where: { id },
    });

    if (!sale) {
      throw new NotFoundError('Flash sale not found');
    }

    if (!sale.isActive) {
      throw new BadRequestError('Flash sale is not active');
    }

    const now = new Date();
    if (now < sale.startTime || now > sale.endTime) {
      throw new BadRequestError('Flash sale is not currently active');
    }

    if (sale.sold >= sale.stock) {
      throw new BadRequestError('Flash sale is sold out');
    }

    // Update sold count
    const updated = await prisma.flashSale.update({
      where: { id },
      data: {
        sold: { increment: 1 },
      },
    });

    // TODO: Create order/transaction here

    res.json({
      success: true,
      data: {
        sale: updated,
        message: 'Purchase successful',
      },
    });
  })
);

export default router;

