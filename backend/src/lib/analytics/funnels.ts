/**
 * Funnel Analysis Service
 * 
 * Tracks and analyzes conversion funnels to identify dropoff points
 */

import { prisma } from '../prisma';
import logger from '../logger';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FunnelStep {
  step: string;
  count: number;
  dropoff: number; // Percentage of users who dropped off at this step
  conversionRate: number; // Percentage of users who completed this step
}

export interface FunnelAnalysis {
  funnelName: string;
  steps: FunnelStep[];
  totalUsers: number;
  finalConversionRate: number;
  timeRange: DateRange;
}

/**
 * Define key conversion funnels
 */
export const FUNNELS = {
  signup: [
    'visit_homepage',
    'click_signup',
    'fill_email',
    'verify_email',
    'complete_profile',
  ],
  video_watch: [
    'search_content',
    'click_result',
    'start_playback',
    'watch_25%',
    'watch_50%',
    'watch_75%',
    'watch_complete',
  ],
  creator_conversion: [
    'visit_creator_page',
    'click_follow',
    'watch_3_videos',
    'enable_notifications',
    'send_tip',
  ],
  subscription: [
    'view_pricing',
    'click_subscribe',
    'select_plan',
    'enter_payment',
    'complete_payment',
  ],
  content_upload: [
    'click_upload',
    'select_file',
    'upload_progress',
    'add_metadata',
    'publish_content',
  ],
} as const;

export type FunnelName = keyof typeof FUNNELS;

/**
 * Analyze a funnel to calculate dropoff rates
 */
export async function analyzeFunnel(
  funnelName: FunnelName,
  timeRange: DateRange,
  userId?: string
): Promise<FunnelAnalysis> {
  const funnel = FUNNELS[funnelName];
  
  if (!funnel || funnel.length === 0) {
    throw new Error(`Invalid funnel: ${funnelName}`);
  }

  try {
    // Build where clause
    const where: any = {
      eventType: { in: funnel },
      timestamp: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    // Get all events for this funnel
    const events = await prisma.analyticsEvent.findMany({
      where,
      select: {
        eventType: true,
        userId: true,
        sessionId: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group events by session or user
    const sessionGroups = new Map<string, Map<string, Date>>();
    
    events.forEach((event) => {
      const key = userId ? event.userId || 'anonymous' : event.sessionId;
      if (!sessionGroups.has(key)) {
        sessionGroups.set(key, new Map());
      }
      const userEvents = sessionGroups.get(key)!;
      
      // Keep only the first occurrence of each event type per session/user
      if (!userEvents.has(event.eventType)) {
        userEvents.set(event.eventType, event.timestamp);
      }
    });

    // Count users who reached each step (in order)
    // A user must have completed all previous steps to be counted for a later step
    const stepCounts = funnel.map((step, stepIndex) => {
      let count = 0;
      sessionGroups.forEach((userEvents) => {
        // Check if user completed all previous steps and this step
        const requiredSteps = funnel.slice(0, stepIndex + 1);
        const hasAllRequiredSteps = requiredSteps.every((s) => userEvents.has(s));
        
        if (hasAllRequiredSteps) {
          // Get timestamps for required steps
          const stepTimestamps = requiredSteps
            .map((s) => userEvents.get(s))
            .filter((t): t is Date => t !== undefined);
          
          // Verify timestamps are in ascending order (steps occurred in sequence)
          if (stepTimestamps.length === requiredSteps.length) {
            const isOrdered = stepTimestamps.every((timestamp, idx) => {
              if (idx === 0) return true;
              return timestamp >= stepTimestamps[idx - 1];
            });
            
            if (isOrdered) {
              count++;
            }
          }
        }
      });
      return count;
    });

    // Calculate dropoff and conversion rates
    const steps: FunnelStep[] = funnel.map((step, index) => {
      const count = stepCounts[index];
      const previousCount = index > 0 ? stepCounts[index - 1] : count;
      const dropoff = previousCount > 0 
        ? (previousCount - count) / previousCount 
        : 0;
      const conversionRate = stepCounts[0] > 0 
        ? count / stepCounts[0] 
        : 0;

      return {
        step,
        count,
        dropoff: Math.round(dropoff * 100 * 100) / 100, // Round to 2 decimal places
        conversionRate: Math.round(conversionRate * 100 * 100) / 100,
      };
    });

    const totalUsers = stepCounts[0];
    const finalConversionRate = totalUsers > 0
      ? Math.round((stepCounts[stepCounts.length - 1] / totalUsers) * 100 * 100) / 100
      : 0;

    return {
      funnelName,
      steps,
      totalUsers,
      finalConversionRate,
      timeRange,
    };
  } catch (error: any) {
    logger.error('Error analyzing funnel', {
      funnelName,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Analyze multiple funnels at once
 */
export async function analyzeMultipleFunnels(
  funnelNames: FunnelName[],
  timeRange: DateRange,
  userId?: string
): Promise<FunnelAnalysis[]> {
  return Promise.all(
    funnelNames.map((funnelName) => analyzeFunnel(funnelName, timeRange, userId))
  );
}

/**
 * Get funnel dropoff summary (simplified version for quick insights)
 */
export async function getFunnelDropoffSummary(
  funnelName: FunnelName,
  timeRange: DateRange
): Promise<{
  funnelName: string;
  totalUsers: number;
  finalConversionRate: number;
  biggestDropoff: {
    step: string;
    dropoff: number;
  } | null;
}> {
  const analysis = await analyzeFunnel(funnelName, timeRange);
  
  const biggestDropoff = analysis.steps.reduce(
    (max, step) => (step.dropoff > (max?.dropoff || 0) ? step : max),
    null as FunnelStep | null
  );

  return {
    funnelName,
    totalUsers: analysis.totalUsers,
    finalConversionRate: analysis.finalConversionRate,
    biggestDropoff: biggestDropoff
      ? {
          step: biggestDropoff.step,
          dropoff: biggestDropoff.dropoff,
        }
      : null,
  };
}

/**
 * Compare funnel performance across time periods
 */
export async function compareFunnelPeriods(
  funnelName: FunnelName,
  period1: DateRange,
  period2: DateRange
): Promise<{
  funnelName: string;
  period1: FunnelAnalysis;
  period2: FunnelAnalysis;
  improvements: Array<{
    step: string;
    improvement: number; // Percentage change
  }>;
}> {
  const [analysis1, analysis2] = await Promise.all([
    analyzeFunnel(funnelName, period1),
    analyzeFunnel(funnelName, period2),
  ]);

  const improvements = analysis1.steps.map((step1, index) => {
    const step2 = analysis2.steps[index];
    const improvement = step1.conversionRate > 0
      ? ((step2.conversionRate - step1.conversionRate) / step1.conversionRate) * 100
      : 0;

    return {
      step: step1.step,
      improvement: Math.round(improvement * 100) / 100,
    };
  });

  return {
    funnelName,
    period1: analysis1,
    period2: analysis2,
    improvements,
  };
}

