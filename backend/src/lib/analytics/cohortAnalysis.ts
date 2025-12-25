/**
 * Cohort Analysis Service
 * Handles cohort creation, metrics calculation, and retention analysis
 */

import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface CohortDefinition {
  signupDate?: {
    gte?: string;
    lt?: string;
  };
  hasSubscription?: boolean;
  plan?: string;
  avgDailyWatchTime?: {
    gte?: number;
  };
  primaryDevice?: string;
  mobileUsagePercent?: {
    gte?: number;
  };
  [key: string]: any;
}

export interface CohortData {
  id: string;
  name: string;
  userIds: string[];
  retentionByWeek: number[];
  metrics: {
    week: number;
    activeUsers: number;
    newUsers: number;
    churnedUsers: number;
    avgWatchTime: number;
    avgRevenue: number;
    retention: number;
  }[];
}

/**
 * Find users matching cohort criteria
 */
export async function findUsersMatchingCriteria(definition: CohortDefinition): Promise<string[]> {
  const where: any = {};

  // Signup date filter
  if (definition.signupDate) {
    where.createdAt = {};
    if (definition.signupDate.gte) {
      where.createdAt.gte = new Date(definition.signupDate.gte);
    }
    if (definition.signupDate.lt) {
      where.createdAt.lt = new Date(definition.signupDate.lt);
    }
  }

  // Platform filter (from user preferences or analytics)
  if (definition.platform) {
    // This would need to be tracked in analytics events or user preferences
    // For now, we'll check user preferences if available
    const usersWithPlatform = await prisma.userPreferences.findMany({
      where: {
        // Assuming platform is stored somewhere - adjust based on your schema
      },
      select: { userId: true },
    });
    // This is a placeholder - implement based on your actual platform tracking
  }

  // Country/Region filter
  if (definition.country || definition.region) {
    // Check user preferences for location
    const locationFilter: any = {};
    if (definition.country) {
      // Assuming country is stored in user preferences or analytics
      // Adjust based on your actual schema
    }
    if (definition.region) {
      // Map region to countries if needed
      const regionCountries: Record<string, string[]> = {
        US: ['US'],
        EU: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'PL', 'IE', 'PT', 'GR'],
        APAC: ['IN', 'JP', 'KR', 'CN', 'AU', 'SG', 'MY', 'TH', 'ID', 'PH', 'VN'],
      };
      const countries = regionCountries[definition.region] || [];
      // Filter logic here
    }
  }

  // Signup source filter
  if (definition.signupSource) {
    // Check referrals table for signup source
    if (definition.signupSource === 'referral') {
      const referredUsers = await prisma.referral.findMany({
        select: { referredUserId: true },
      });
      where.id = { in: referredUsers.map(r => r.referredUserId) };
    } else if (definition.signupSource === 'organic') {
      const referredUsers = await prisma.referral.findMany({
        select: { referredUserId: true },
      });
      where.id = { notIn: referredUsers.map(r => r.referredUserId) };
    }
    // Add other signup sources as needed
  }

  // Subscription filter
  if (definition.hasSubscription !== undefined || definition.plan || definition.planType) {
    const subscriptionWhere: any = {
      status: 'active',
    };
    if (definition.plan) {
      subscriptionWhere.plan = definition.plan;
    }
    if (definition.planType) {
      subscriptionWhere.plan = definition.planType;
    }

    const subscriptions = await prisma.userSubscription.findMany({
      where: subscriptionWhere,
      select: { userId: true },
    });
    const subscribedUserIds = subscriptions.map(s => s.userId);

    if (definition.hasSubscription !== false) {
      where.id = { in: subscribedUserIds };
    } else {
      where.id = { notIn: subscribedUserIds };
    }
  }

  // Get users matching basic criteria
  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  let userIds = users.map(u => u.id);

  // Platform filter (from user preferences or analytics)
  if (definition.platform) {
    // Filter based on platform - this would need platform tracking
    // For now, we'll use a placeholder that can be enhanced
    const platformUsers = await prisma.analyticsEvent.findMany({
      where: {
        eventType: 'page_view',
        // Note: For JSON path filtering, use raw queries or filter in memory
        // This is a simplified version that can be enhanced with proper JSON filtering
      } as any,
      distinct: ['userId'],
      select: { userId: true },
    });
    // Filter in memory for platform
    const filteredPlatformUsers = platformUsers.filter(e => {
      const meta = e as any;
      return meta?.metadata?.device?.platform === definition.platform;
    });
    if (filteredPlatformUsers.length > 0) {
      const platformUserIds = filteredPlatformUsers.map(e => e.userId);
      userIds = userIds.filter(id => platformUserIds.includes(id));
    }
  }

  // Country/Region filter
  if (definition.country || definition.region) {
    // Check user preferences for location
    const locationUsers = await prisma.userPreferences.findMany({
      where: {
        region: definition.region || definition.country,
      },
      select: { userId: true },
    });
    if (locationUsers.length > 0) {
      const locationUserIds = locationUsers.map(u => u.userId);
      userIds = userIds.filter(id => locationUserIds.includes(id));
    }
  }

  // Signup source filter
  if (definition.signupSource) {
    if (definition.signupSource === 'referral') {
      const referredUsers = await prisma.referral.findMany({
        select: { referredUserId: true },
      });
      const referredUserIds = referredUsers.map(r => r.referredUserId);
      userIds = userIds.filter(id => referredUserIds.includes(id));
    } else if (definition.signupSource === 'organic') {
      const referredUsers = await prisma.referral.findMany({
        select: { referredUserId: true },
      });
      const referredUserIds = referredUsers.map(r => r.referredUserId);
      userIds = userIds.filter(id => !referredUserIds.includes(id));
    }
  }

  // Additional filters that require calculations
  if (definition.avgDailyWatchTime?.gte) {
    const filteredUserIds: string[] = [];
    for (const userId of userIds) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const views = await prisma.view.findMany({
        where: {
          userId,
          watchedAt: { gte: thirtyDaysAgo },
        },
        select: { duration: true },
      });

      const totalWatchTime = views.reduce((sum, v) => sum + (v.duration || 0), 0);
      const avgDailyWatchTime = totalWatchTime / 30;

      if (avgDailyWatchTime >= (definition.avgDailyWatchTime.gte || 0)) {
        filteredUserIds.push(userId);
      }
    }
    userIds = filteredUserIds;
  }

  // Device filter (would need device tracking in views/analytics)
  // For now, skip this filter or implement based on available data

  return userIds;
}

/**
 * Calculate cohort metrics for a specific date
 */
export async function calculateCohortMetrics(
  cohortId: string,
  date: Date
): Promise<void> {
  const cohort = await prisma.userCohort.findUnique({
    where: { id: cohortId },
  });

  if (!cohort) {
    throw new Error('Cohort not found');
  }

  const userIds = cohort.userIds;
  const cohortStartDate = cohort.createdAt || new Date();
  const daysSinceStart = Math.floor(
    (date.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const week = Math.floor(daysSinceStart / 7);

  // Get date range for this period
  const periodStart = new Date(date);
  periodStart.setDate(periodStart.getDate() - 7);
  const periodEnd = date;

  // Active users (users who had activity in this period)
  const activeUsersData = await prisma.view.findMany({
    where: {
      userId: { in: userIds },
      watchedAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    distinct: ['userId'],
    select: { userId: true },
  });
  const activeUsers = activeUsersData.length;

  // New users (users who joined in this period)
  const newUsers = await prisma.user.count({
    where: {
      id: { in: userIds },
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });

  // Churned users (users who were active before but not in this period)
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
  const previousActiveUsers = await prisma.view.findMany({
    where: {
      userId: { in: userIds },
      watchedAt: {
        gte: previousPeriodStart,
        lt: periodStart,
      },
    },
    select: { userId: true },
  });
  const previousActiveUserIds = previousActiveUsers.map(v => v.userId).filter((id): id is string => id !== null);

  const currentActiveUsers = await prisma.view.findMany({
    where: {
      userId: { in: previousActiveUserIds },
      watchedAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    distinct: ['userId'],
    select: { userId: true },
  });
  const currentActiveUserIds = currentActiveUsers.map(v => v.userId).filter((id): id is string => id !== null);
  const churnedUsers = previousActiveUserIds.length - currentActiveUserIds.length;

  // Average watch time
  const watchTimeData = await prisma.view.aggregate({
    where: {
      userId: { in: userIds },
      watchedAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    _avg: {
      duration: true,
    },
  });
  const avgWatchTime = Math.round(watchTimeData._avg.duration || 0);

  // Average revenue (from transactions)
  const revenueData = await prisma.transaction.aggregate({
    where: {
      userId: { in: userIds },
      status: 'COMPLETED',
      createdAt: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
    _avg: {
      amount: true,
    },
  });
  const avgRevenue = revenueData._avg.amount || new Decimal(0);

  // Retention (percentage of original cohort still active)
  const retention = userIds.length > 0
    ? activeUsers / userIds.length
    : 0;

  // Upsert metrics
  await prisma.cohortMetrics.upsert({
    where: {
      cohortId_date: {
        cohortId,
        date,
      },
    },
    create: {
      cohortId,
      date,
      activeUsers,
      newUsers,
      churnedUsers: Math.max(0, churnedUsers),
      avgWatchTime,
      avgRevenue,
      retention: new Decimal(retention),
    },
    update: {
      activeUsers,
      newUsers,
      churnedUsers: Math.max(0, churnedUsers),
      avgWatchTime,
      avgRevenue,
      retention: new Decimal(retention),
    },
  });
}

/**
 * Get cohort retention data
 */
export async function getCohortRetentionData(cohortId: string): Promise<CohortData> {
  const cohort = await prisma.userCohort.findUnique({
    where: { id: cohortId },
    include: {
      metrics: {
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!cohort) {
    throw new Error('Cohort not found');
  }

  // Calculate retention by week
  const retentionByWeek: number[] = [];
  const cohortStartDate = cohort.createdAt || new Date();

  for (let week = 0; week < 8; week++) {
    const weekDate = new Date(cohortStartDate);
    weekDate.setDate(weekDate.getDate() + week * 7);

    const weekMetric = cohort.metrics.find(m => {
      const metricWeek = Math.floor(
        (m.date.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      return metricWeek === week;
    });

    if (weekMetric) {
      retentionByWeek.push(Number(weekMetric.retention));
    } else {
      retentionByWeek.push(0);
    }
  }

  return {
    id: cohort.id,
    name: cohort.name,
    userIds: cohort.userIds,
    retentionByWeek,
    metrics: cohort.metrics.map(m => ({
      week: Math.floor(
        (m.date.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      ),
      activeUsers: m.activeUsers,
      newUsers: m.newUsers,
      churnedUsers: m.churnedUsers,
      avgWatchTime: m.avgWatchTime,
      avgRevenue: Number(m.avgRevenue),
      retention: Number(m.retention),
    })),
  };
}

/**
 * Generate automatic cohorts
 */
export async function generateCohorts(): Promise<void> {
  const cohortDefinitions = [
    {
      name: 'January 2025 Signups',
      definition: {
        signupDate: { gte: '2025-01-01', lt: '2025-02-01' },
      },
    },
    {
      name: 'Premium Subscribers',
      definition: {
        hasSubscription: true,
        plan: 'premium',
      },
    },
    {
      name: 'High Engagement Users',
      definition: {
        avgDailyWatchTime: { gte: 1800 }, // 30+ min/day
      },
    },
  ];

  for (const def of cohortDefinitions) {
    try {
      const userIds = await findUsersMatchingCriteria(def.definition);

      await prisma.userCohort.upsert({
        where: { name: def.name },
        create: {
          name: def.name,
          definition: def.definition,
          userIds,
        },
        update: {
          definition: def.definition,
          userIds,
        },
      });

      console.log(`✅ Generated cohort: ${def.name} (${userIds.length} users)`);
    } catch (error) {
      console.error(`❌ Failed to generate cohort ${def.name}:`, error);
    }
  }
}

/**
 * Calculate metrics for all cohorts
 */
export async function calculateAllCohortMetrics(): Promise<void> {
  const cohorts = await prisma.userCohort.findMany();
  const today = new Date();

  for (const cohort of cohorts) {
    const cohortStartDate = cohort.createdAt || new Date();
    const weeksSinceStart = Math.floor(
      (today.getTime() - cohortStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // Calculate metrics for each week up to 8 weeks
    for (let week = 0; week <= Math.min(weeksSinceStart, 8); week++) {
      const weekDate = new Date(cohortStartDate);
      weekDate.setDate(weekDate.getDate() + week * 7);

      try {
        await calculateCohortMetrics(cohort.id, weekDate);
      } catch (error) {
        console.error(`Error calculating metrics for cohort ${cohort.name}, week ${week}:`, error);
      }
    }
  }
}