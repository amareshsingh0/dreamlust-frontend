/**
 * Funnel Analysis Service
 * Handles funnel creation, analysis, and optimization
 */

import { prisma } from '../prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface FunnelStep {
  event: string;
  filter?: 'all' | 'newUsers' | 'returning' | 'premium';
  name?: string;
}

export interface FunnelResult {
  stepIndex: number;
  stepName: string;
  eventName: string;
  userCount: number;
  conversionRate: number;
  dropoffRate?: number;
  segment?: string;
}

/**
 * Analyze funnel and calculate results
 */
export async function analyzeFunnel(
  funnelId: string,
  dateRange?: { start: Date; end: Date }
): Promise<FunnelResult[]> {
  const funnel = await prisma.funnel.findUnique({
    where: { id: funnelId },
  });

  if (!funnel) {
    throw new Error('Funnel not found');
  }

  const steps = funnel.steps as unknown as FunnelStep[];
  const results: FunnelResult[] = [];

  const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = dateRange?.end || new Date();

  let previousUserCount = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepName = step.name || `Step ${i + 1}`;

    // Build query based on step filter
    const where: any = {
      eventType: step.event,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Apply segment filters
    if (step.filter === 'newUsers') {
      // Get users who signed up in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUserIds = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: { id: true },
      });
      where.userId = { in: newUserIds.map(u => u.id) };
    } else if (step.filter === 'returning') {
      // Get users who have been active before
      const returningUserIds = await prisma.view.findMany({
        where: {
          watchedAt: {
            lt: startDate,
          },
        },
        distinct: ['userId'],
        select: { userId: true },
      });
      where.userId = { in: returningUserIds.map(v => v.userId) };
    } else if (step.filter === 'premium') {
      // Get premium subscribers
      const premiumSubscriptions = await prisma.userSubscription.findMany({
        where: {
          status: 'active',
          plan: 'premium',
        },
        select: { userId: true },
      });
      where.userId = { in: premiumSubscriptions.map(s => s.userId) };
    }

    // Count unique users for this step
    // Use eventName field if available, otherwise use eventType
    const stepEvents = await prisma.analyticsEvent.findMany({
      where,
      distinct: ['userId'],
      select: { userId: true },
    });

    const userCount = stepEvents.length;

    // Calculate conversion rate (from first step)
    const firstStepCount = results.length > 0 ? results[0].userCount : userCount;
    const conversionRate = firstStepCount > 0 ? userCount / firstStepCount : 0;

    // Calculate dropoff rate (from previous step)
    const dropoffRate =
      previousUserCount > 0
        ? (previousUserCount - userCount) / previousUserCount
        : undefined;

    results.push({
      stepIndex: i,
      stepName,
      eventName: step.event,
      userCount,
      conversionRate,
      dropoffRate,
      segment: step.filter || 'all',
    });

    previousUserCount = userCount;
  }

  // Save results to database
  for (const result of results) {
    // Check if result already exists
    const existing = await prisma.funnelResult.findFirst({
      where: {
        funnelId,
        stepIndex: result.stepIndex,
        date: {
          gte: new Date(endDate.getTime() - 24 * 60 * 60 * 1000), // Within 24 hours
          lte: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (existing) {
      await prisma.funnelResult.update({
        where: { id: existing.id },
        data: {
          userCount: result.userCount,
          conversionRate: new Decimal(result.conversionRate),
          dropoffRate: result.dropoffRate ? new Decimal(result.dropoffRate) : null,
        },
      });
    } else {
      await prisma.funnelResult.create({
        data: {
          funnelId,
          stepIndex: result.stepIndex,
          stepName: result.stepName,
          eventName: result.eventName,
          userCount: result.userCount,
          conversionRate: new Decimal(result.conversionRate),
          dropoffRate: result.dropoffRate ? new Decimal(result.dropoffRate) : null,
          date: endDate,
          segment: result.segment,
        },
      });
    }
  }

  return results;
}

/**
 * Analyze funnel by segment
 */
export async function analyzeFunnelBySegment(
  funnelId: string,
  segments: string[] = ['all', 'newUsers', 'returning', 'premium']
): Promise<Record<string, FunnelResult[]>> {
  const funnel = await prisma.funnel.findUnique({
    where: { id: funnelId },
  });

  if (!funnel) {
    throw new Error('Funnel not found');
  }

  const segmentResults: Record<string, FunnelResult[]> = {};

  for (const segment of segments) {
    // Create a modified funnel with segment filter
    const steps = (funnel.steps as unknown as FunnelStep[]).map(step => ({
      ...step,
      filter: (segment === 'all' ? undefined : segment) as any,
    }));

    const modifiedFunnel = {
      ...funnel,
      steps,
    };

    // Analyze with segment filter
    const results = await analyzeFunnel(funnelId);
    segmentResults[segment] = results;
  }

  return segmentResults;
}

/**
 * Get dropoff insights
 */
export function getDropoffInsights(
  stepIndex: number,
  results: FunnelResult[]
): string[] {
  const insights: string[] = [];
  const currentStep = results[stepIndex];
  const nextStep = results[stepIndex + 1];

  if (!currentStep || !nextStep) return insights;

  const dropoffRate = currentStep.dropoffRate || 0;

  if (dropoffRate > 0.5) {
    insights.push('High drop-off detected - consider optimizing this step');
  }

  if (dropoffRate > 0.3 && dropoffRate <= 0.5) {
    insights.push('Moderate drop-off - review user experience');
  }

  if (currentStep.userCount < 100) {
    insights.push('Low user volume - may need more traffic');
  }

  return insights;
}

