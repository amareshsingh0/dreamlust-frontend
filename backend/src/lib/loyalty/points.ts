import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

// Point values for different actions
export const POINT_ACTIONS = {
  WATCH_MINUTE: 1,        // 1 point per minute watched
  DAILY_LOGIN: 10,        // Login once per day
  LIKE_CONTENT: 2,        // Like a video
  COMMENT: 5,             // Post a comment
  SHARE: 10,              // Share content
  REFERRAL_SIGNUP: 100,   // Successful referral
  SUBSCRIPTION: 500,      // Subscribe to premium
  TIP_CREATOR: (amount: number) => Math.floor(amount * 10), // 10 points per dollar
  CONTENT_UPLOAD: 50,     // Upload content
  FOLLOW_CREATOR: 5,      // Follow a creator
} as const;

// Tier configuration with benefits
export const TIERS = {
  bronze: {
    minPoints: 0,
    benefits: ['Basic rewards', 'Standard support'],
  },
  silver: {
    minPoints: 1000,
    benefits: ['5% discount on purchases', 'Priority support', 'Silver badge'],
  },
  gold: {
    minPoints: 5000,
    benefits: ['10% discount on purchases', 'Early access to new features', 'Gold badge', 'Custom profile badge'],
  },
  platinum: {
    minPoints: 20000,
    benefits: ['15% discount on purchases', 'VIP support', 'Exclusive content access', 'Platinum badge', 'Custom profile theme'],
  },
} as const;

// Calculate points for an action
export function calculatePoints(action: string, metadata?: any): number {
  switch (action) {
    case 'WATCH_MINUTE':
      return metadata?.minutes ? metadata.minutes * POINT_ACTIONS.WATCH_MINUTE : 0;
    
    case 'DAILY_LOGIN':
      return POINT_ACTIONS.DAILY_LOGIN;
    
    case 'LIKE_CONTENT':
      return POINT_ACTIONS.LIKE_CONTENT;
    
    case 'COMMENT':
      return POINT_ACTIONS.COMMENT;
    
    case 'SHARE':
      return POINT_ACTIONS.SHARE;
    
    case 'REFERRAL_SIGNUP':
      return POINT_ACTIONS.REFERRAL_SIGNUP;
    
    case 'SUBSCRIPTION':
      return POINT_ACTIONS.SUBSCRIPTION;
    
    case 'TIP_CREATOR':
      return metadata?.amount ? POINT_ACTIONS.TIP_CREATOR(metadata.amount) : 0;
    
    case 'CONTENT_UPLOAD':
      return POINT_ACTIONS.CONTENT_UPLOAD;
    
    case 'FOLLOW_CREATOR':
      return POINT_ACTIONS.FOLLOW_CREATOR;
    
    // Handle manual points (for admin or special cases)
    case 'MANUAL':
      return metadata?.manualPoints ? metadata.manualPoints : 0;
    
    default:
      return 0;
  }
}

// Calculate tier based on lifetime points
export function calculateTier(lifetimePoints: number): keyof typeof TIERS {
  if (lifetimePoints >= TIERS.platinum.minPoints) return 'platinum';
  if (lifetimePoints >= TIERS.gold.minPoints) return 'gold';
  if (lifetimePoints >= TIERS.silver.minPoints) return 'silver';
  return 'bronze';
}

// Check if user should be upgraded to a new tier
export async function checkTierUpgrade(userId: string): Promise<{ upgraded: boolean; newTier?: string; oldTier?: string }> {
  const loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
  });

  if (!loyalty) {
    return { upgraded: false };
  }

  const newTier = calculateTier(loyalty.lifetimePoints);
  const oldTier = loyalty.tier;

  if (newTier !== oldTier) {
    // Tier upgrade detected
    await prisma.userLoyalty.update({
      where: { userId },
      data: {
        tier: newTier,
      },
    });

    // Create a transaction record for tier upgrade
    await prisma.loyaltyTransaction.create({
      data: {
        userId,
        type: 'earned',
        points: 0, // No points, just tier upgrade
        reason: 'tier_upgrade',
        metadata: {
          oldTier,
          newTier,
          lifetimePoints: loyalty.lifetimePoints,
        },
      },
    });

    return { upgraded: true, newTier, oldTier };
  }

  return { upgraded: false };
}

// Ensure user has loyalty record
export async function ensureUserLoyalty(userId: string) {
  let loyalty = await prisma.userLoyalty.findUnique({
    where: { userId },
  });

  if (!loyalty) {
    loyalty = await prisma.userLoyalty.create({
      data: {
        userId,
        points: 0,
        tier: 'bronze',
        lifetimePoints: 0,
      },
    });
  }

  return loyalty;
}

// Award points to a user
export async function awardPoints(
  userId: string,
  action: string,
  metadata?: any
): Promise<{ points: number; newTier?: string; upgraded: boolean }> {
  const points = calculatePoints(action, metadata);

  if (points <= 0) {
    return { points: 0, upgraded: false };
  }

  const result = await prisma.$transaction(async (tx) => {
    // Ensure loyalty record exists
    let loyalty = await tx.userLoyalty.findUnique({
      where: { userId },
    });

    if (!loyalty) {
      loyalty = await tx.userLoyalty.create({
        data: {
          userId,
          points: 0,
          tier: 'bronze',
          lifetimePoints: 0,
        },
      });
    }

    // Calculate new tier
    const newLifetimePoints = loyalty.lifetimePoints + points;
    const newTier = calculateTier(newLifetimePoints);

    // Update loyalty
    const updatedLoyalty = await tx.userLoyalty.update({
      where: { userId },
      data: {
        points: { increment: points },
        lifetimePoints: { increment: points },
        tier: newTier,
        lastActivityAt: new Date(),
      },
    });

    // Create transaction record
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        type: 'earned',
        points,
        reason: action,
        metadata: metadata || {},
      },
    });

    return {
      loyalty: updatedLoyalty,
      upgraded: newTier !== loyalty.tier,
      oldTier: loyalty.tier,
      newTier,
    };
  });

  return {
    points,
    newTier: result.upgraded ? result.newTier : undefined,
    upgraded: result.upgraded,
  };
}

// Check if user has already earned daily login bonus today
export async function hasEarnedDailyLogin(userId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const transaction = await prisma.loyaltyTransaction.findFirst({
    where: {
      userId,
      reason: 'DAILY_LOGIN',
      createdAt: {
        gte: today,
      },
    },
  });

  return !!transaction;
}

// Award daily login bonus if not already earned today
export async function awardDailyLogin(userId: string): Promise<{ awarded: boolean; points?: number }> {
  const alreadyEarned = await hasEarnedDailyLogin(userId);

  if (alreadyEarned) {
    return { awarded: false };
  }

  const result = await awardPoints(userId, 'DAILY_LOGIN');
  return { awarded: true, points: result.points };
}

// Get tier benefits for a user
export function getTierBenefits(tier: keyof typeof TIERS): string[] {
  return TIERS[tier].benefits;
}

// Get next tier information
export function getNextTier(currentTier: keyof typeof TIERS): { tier: keyof typeof TIERS; minPoints: number } | null {
  const tiers: (keyof typeof TIERS)[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tiers.indexOf(currentTier);

  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null; // Already at highest tier or invalid tier
  }

  const nextTier = tiers[currentIndex + 1];
  return {
    tier: nextTier,
    minPoints: TIERS[nextTier].minPoints,
  };
}

