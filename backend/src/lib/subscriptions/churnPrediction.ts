/**
 * Churn Prediction Service
 * Identifies users at risk of churning and calculates churn probability
 */

import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { sendRetentionEmail } from '../email/emailService';

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ChurnAnalysis {
  userId: string;
  churnProbability: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
}

/**
 * Get view count for a user in a date range
 */
async function getViewCount(
  userId: string,
  daysAgoStart: number,
  daysAgoEnd: number
): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + daysAgoStart);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAgoEnd);

  return prisma.view.count({
    where: {
      userId,
      watchedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
}

/**
 * Get days since a date
 */
function getDaysSince(date: Date | null | undefined): number {
  if (!date) return 999;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get days until a date
 */
function getDaysUntil(date: Date | null | undefined): number {
  if (!date) return 999;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Analyze churn risk for a user
 */
export async function analyzeChurnRisk(userId: string): Promise<ChurnAnalysis> {
  const riskFactors: RiskFactor[] = [];
  let churnScore = 0;
  const recommendations: string[] = [];

  // Get user subscription
  const subscription = await prisma.userSubscription.findFirst({
    where: {
      userId: userId,
      status: 'active',
    },
  });

  if (!subscription) {
    return {
      userId,
      churnProbability: 0,
      riskFactors: [],
      recommendations: [],
    };
  }

  // Get user with view history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const viewHistory = await prisma.view.findMany({
    where: {
      userId,
      watchedAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  // Risk Factor 1: Low engagement
  if (viewHistory.length < 5) {
    riskFactors.push({
      type: 'low_engagement',
      severity: 'high',
      description: `Only ${viewHistory.length} views in the last 30 days`,
    });
    churnScore += 0.3;
    recommendations.push('Send personalized content recommendations');
  }

  // Risk Factor 2: Decreased usage
  const lastMonthViews = await getViewCount(userId, -60, -30);
  const thisMonthViews = viewHistory.length;
  if (lastMonthViews > 0 && thisMonthViews < lastMonthViews * 0.5) {
    riskFactors.push({
      type: 'decreased_usage',
      severity: 'medium',
      description: `Usage decreased by ${Math.round((1 - thisMonthViews / lastMonthViews) * 100)}%`,
    });
    churnScore += 0.2;
    recommendations.push('Highlight new features and content');
  }

  // Risk Factor 3: No recent login (using createdAt as proxy)
  const daysSinceCreated = getDaysSince(user?.createdAt);
  const daysSinceLastView = viewHistory.length > 0
    ? getDaysSince(viewHistory[viewHistory.length - 1].watchedAt)
    : daysSinceCreated;

  if (daysSinceLastView > 7) {
    riskFactors.push({
      type: 'inactive',
      severity: daysSinceLastView > 14 ? 'high' : 'medium',
      description: `No activity for ${daysSinceLastView} days`,
    });
    churnScore += 0.25;
    recommendations.push('Send "We miss you" campaign with special offer');
  }

  // Risk Factor 4: Payment issues (check for failed transactions)
  const failedTransactions = await prisma.transaction.count({
    where: {
      userId: userId,
      status: 'FAILED',
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  if (failedTransactions > 0) {
    riskFactors.push({
      type: 'payment_issues',
      severity: 'high',
      description: `${failedTransactions} failed payment(s)`,
    });
    churnScore += 0.15;
    recommendations.push('Contact user about payment issues');
  }

  // Risk Factor 5: Approaching renewal with low engagement
  const daysToRenewal = getDaysUntil(subscription.currentPeriodEnd);
  if (daysToRenewal < 7 && churnScore > 0.3) {
    riskFactors.push({
      type: 'approaching_renewal',
      severity: 'medium',
      description: `Renewal in ${daysToRenewal} days with low engagement`,
    });
    churnScore += 0.1;
    recommendations.push('Send retention offer before renewal');
  }

  // Cap churn score at 1.0
  churnScore = Math.min(churnScore, 1.0);

  return {
    userId,
    churnProbability: churnScore,
    riskFactors,
    recommendations,
  };
}

/**
 * Identify churn risk for all active subscribers
 */
export async function identifyChurnRisk(): Promise<void> {
  const activeSubscriptions = await prisma.userSubscription.findMany({
    where: { status: 'active' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  for (const sub of activeSubscriptions) {
    const analysis = await analyzeChurnRisk(sub.userId);

    // Only save if churn probability is above threshold
    if (analysis.churnProbability > 0.5) {
      await prisma.churnPrediction.upsert({
        where: { userId: sub.userId },
        create: {
          userId: sub.userId,
          churnProbability: new Decimal(analysis.churnProbability),
          riskFactors: analysis.riskFactors as any,
          lastCalculated: new Date(),
        },
        update: {
          churnProbability: new Decimal(analysis.churnProbability),
          riskFactors: analysis.riskFactors as any,
          lastCalculated: new Date(),
          interventionSent: false, // Reset if risk increases
        },
      });

      // Trigger intervention if not already sent
      const prediction = await prisma.churnPrediction.findUnique({
        where: { userId: sub.userId },
      });

      if (prediction && !prediction.interventionSent) {
        await sendRetentionCampaign(sub.userId, analysis.riskFactors);
      }
    }
  }
}

/**
 * Send retention campaign based on risk factors
 */
async function sendRetentionCampaign(
  userId: string,
  riskFactors: RiskFactor[]
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
    },
  });

  if (!user) return;

  // Mark intervention as sent
  await prisma.churnPrediction.update({
    where: { userId },
    data: { interventionSent: true },
  });

  // Determine campaign type based on risk factors
  const riskTypes = riskFactors.map(r => r.type);

  // Create retention campaign record
  const campaign = await prisma.retentionCampaign.create({
    data: {
      userId,
      campaignType: riskTypes[0] || 'inactive', // Use first risk type
    },
  });

  // Determine campaign type and send email
  let emailSent = false;
  if (riskTypes.includes('low_engagement')) {
    emailSent = await sendRetentionEmail(user.email, user.username || 'User', 'low_engagement');
  } else if (riskTypes.includes('decreased_usage')) {
    emailSent = await sendRetentionEmail(user.email, user.username || 'User', 'decreased_usage');
  } else if (riskTypes.includes('inactive')) {
    emailSent = await sendRetentionEmail(user.email, user.username || 'User', 'inactive', {
      offerCode: 'WELCOMEBACK20',
    });
  } else if (riskTypes.includes('payment_issues')) {
    emailSent = await sendRetentionEmail(user.email, user.username || 'User', 'payment_issues');
  }

  // Update campaign record
  if (emailSent) {
    await prisma.retentionCampaign.update({
      where: { id: campaign.id },
      data: {
        emailSent: true,
        emailSentAt: new Date(),
      },
    });
  }
}

/**
 * Get churn predictions for admin dashboard
 */
export async function getChurnPredictions(limit: number = 50) {
  return prisma.churnPrediction.findMany({
    where: {
      churnProbability: {
        gte: new Decimal(0.5),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      churnProbability: 'desc',
    },
    take: limit,
  });
}

