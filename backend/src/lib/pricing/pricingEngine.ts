/**
 * Dynamic Pricing Engine
 * Calculates prices based on various factors: user segments, time, location, promo codes, etc.
 */

import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface PricingContext {
  userId?: string;
  location?: {
    country: string;
    region?: string;
  };
  promoCode?: string;
  productType?: 'subscription' | 'tip' | 'bundle' | 'content';
  timeOfDay?: number; // 0-23
}

export interface Discount {
  type: string;
  amount: number;
  description?: string;
}

export interface PriceCalculation {
  basePrice: number;
  finalPrice: number;
  savings: number;
  appliedDiscounts: Discount[];
  currency: string;
}

export interface Product {
  id: string;
  price: number;
  minPrice?: number;
  currency?: string;
  type?: string;
}

/**
 * Get user with segment information
 */
async function getUserWithSegment(userId: string): Promise<{ segment?: string; hasPurchased?: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        // Add user segment logic here (could be from user preferences or separate table)
      },
    });

    // Check if user has made previous purchases
    const hasPurchased = await prisma.transaction.count({
      where: {
        userId: userId,
        status: 'COMPLETED',
      },
    }) > 0;

    return {
      segment: undefined, // TODO: Implement user segmentation
      hasPurchased,
    };
  } catch (error) {
    console.error('Error getting user segment:', error);
    return { segment: undefined, hasPurchased: false };
  }
}

/**
 * Get PPP (Purchasing Power Parity) adjustment for a country
 */
async function getPPPAdjustment(country: string): Promise<number> {
  // PPP adjustments (example values - should be in database or config)
  const pppAdjustments: Record<string, number> = {
    'IN': 0.3, // India - 70% discount
    'PK': 0.25, // Pakistan
    'BD': 0.2, // Bangladesh
    'NG': 0.35, // Nigeria
    'KE': 0.4, // Kenya
    'PH': 0.5, // Philippines
    'VN': 0.45, // Vietnam
    'ID': 0.4, // Indonesia
    // Add more countries as needed
  };

  return pppAdjustments[country.toUpperCase()] || 1.0;
}

/**
 * Validate and get promo code
 */
export async function validatePromoCode(code: string): Promise<any> {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo || !promo.isActive) {
    return null;
  }

  const now = new Date();
  if (now < promo.validFrom || now > promo.validUntil) {
    return null;
  }

  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return null;
  }

  return promo;
}

/**
 * Calculate promo code discount
 */
function calculatePromoDiscount(promo: any, basePrice: number): number {
  if (promo.discountType === 'percentage') {
    return (basePrice * Number(promo.discountValue)) / 100;
  } else if (promo.discountType === 'fixed') {
    return Number(promo.discountValue);
  } else if (promo.discountType === 'free_trial') {
    return basePrice; // Full discount for free trial
  }
  return 0;
}

/**
 * Apply pricing rules
 */
async function applyPricingRules(
  basePrice: number,
  context: PricingContext
): Promise<Discount[]> {
  const discounts: Discount[] = [];
  const now = new Date();

  // Get active pricing rules
  const allRules = await prisma.pricingRule.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  // Filter by usage limit (can't do this in Prisma query directly)
  const rules = allRules.filter(rule => {
    if (rule.usageLimit === null) return true;
    return rule.usageCount < rule.usageLimit;
  });

  for (const rule of rules) {
    const conditions = rule.conditions as any;
    let shouldApply = false;

    // Check rule type and conditions
    switch (rule.type) {
      case 'user_segment':
        if (context.userId) {
          const user = await getUserWithSegment(context.userId);
          if (conditions.segments?.includes(user.segment)) {
            shouldApply = true;
          }
        }
        break;

      case 'time_based':
        const hour = context.timeOfDay ?? new Date().getHours();
        if (conditions.hours?.includes(hour)) {
          shouldApply = true;
        }
        break;

      case 'early_bird':
        if (conditions.daysBefore && context.userId) {
          const user = await getUserWithSegment(context.userId);
          if (!user.hasPurchased) {
            shouldApply = true;
          }
        }
        break;

      case 'bundle':
        if (conditions.productTypes?.includes(context.productType)) {
          shouldApply = true;
        }
        break;
    }

    if (shouldApply) {
      const discountAmount = (basePrice * Number(rule.discount)) / 100;
      discounts.push({
        type: rule.type,
        amount: discountAmount,
        description: rule.name,
      });
    }
  }

  return discounts;
}

/**
 * Calculate dynamic price
 */
export async function calculatePrice(
  product: Product,
  context: PricingContext
): Promise<PriceCalculation> {
  let basePrice = product.price;
  const appliedDiscounts: Discount[] = [];

  // Get user information if userId provided
  if (context.userId) {
    const user = await getUserWithSegment(context.userId);

    // User segment pricing
    if (user.segment === 'student') {
      appliedDiscounts.push({
        type: 'student',
        amount: basePrice * 0.2,
        description: 'Student Discount (20%)',
      });
    } else if (user.segment === 'senior') {
      appliedDiscounts.push({
        type: 'senior',
        amount: basePrice * 0.15,
        description: 'Senior Discount (15%)',
      });
    }

    // First-time buyer discount
    if (!user.hasPurchased) {
      appliedDiscounts.push({
        type: 'first_time',
        amount: basePrice * 0.25,
        description: 'First-Time Buyer Discount (25%)',
      });
    }
  }

  // Time-based pricing (off-peak hours: 2 AM - 6 AM)
  const hour = context.timeOfDay ?? new Date().getHours();
  if (hour >= 2 && hour <= 6) {
    appliedDiscounts.push({
      type: 'off_peak',
      amount: basePrice * 0.1,
      description: 'Off-Peak Hours Discount (10%)',
    });
  }

  // Location-based pricing (PPP - Purchasing Power Parity)
  if (context.location?.country) {
    const adjustment = await getPPPAdjustment(context.location.country);
    if (adjustment < 1) {
      appliedDiscounts.push({
        type: 'regional',
        amount: basePrice * (1 - adjustment),
        description: `Regional Pricing Adjustment (${Math.round((1 - adjustment) * 100)}%)`,
      });
    }
  }

  // Apply pricing rules
  const ruleDiscounts = await applyPricingRules(basePrice, context);
  appliedDiscounts.push(...ruleDiscounts);

  // Promo code
  if (context.promoCode) {
    const promo = await validatePromoCode(context.promoCode);
    if (promo) {
      // Check minimum purchase
      if (promo.minPurchase && basePrice < Number(promo.minPurchase)) {
        // Don't apply promo if minimum purchase not met
      } else {
        const promoDiscount = calculatePromoDiscount(promo, basePrice);
        appliedDiscounts.push({
          type: 'promo',
          amount: promoDiscount,
          description: `Promo Code: ${promo.code} (${promo.discountType})`,
        });
      }
    }
  }

  // Calculate final price
  const totalDiscount = appliedDiscounts.reduce((sum, d) => sum + d.amount, 0);
  const finalPrice = Math.max(
    basePrice - totalDiscount,
    product.minPrice || 0
  );

  return {
    basePrice,
    finalPrice,
    savings: totalDiscount,
    appliedDiscounts,
    currency: product.currency || 'INR',
  };
}

/**
 * Record promo code usage
 */
export async function recordPromoCodeUsage(code: string): Promise<void> {
  await prisma.promoCode.update({
    where: { code: code.toUpperCase() },
    data: {
      usedCount: { increment: 1 },
    },
  });
}

