/**
 * Interactive Engagement Analyzer
 * Analyzes user engagement with interactive elements
 */

import { prisma } from '../prisma';

export interface EngagementMetrics {
  elementId: string;
  type: string;
  timestamp: number;
  responseCount: number;
  engagementRate: number;
  responseDistribution?: Record<string, number>;
}

export interface ContentEngagement {
  contentId: string;
  totalElements: number;
  totalResponses: number;
  elements: EngagementMetrics[];
}

/**
 * Analyze interactive engagement for content
 */
export async function analyzeInteractiveEngagement(
  contentId: string
): Promise<ContentEngagement> {
  // Get response counts grouped by element
  const responseCounts = await prisma.interactiveResponse.groupBy({
    by: ['elementId'],
    where: {
      element: { contentId },
    },
    _count: true,
  });

  // Get all elements with their responses
  const elements = await prisma.interactiveElement.findMany({
    where: { contentId },
    include: {
      responses: {
        select: {
          id: true,
          response: true,
        },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Get total views for engagement rate calculation
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { viewCount: true },
  });

  const totalViews = content?.viewCount || 0;

  // Calculate engagement metrics for each element
  const engagement: EngagementMetrics[] = elements.map((element) => {
    const responseCount = responseCounts.find((r) => r.elementId === element.id)?._count || 0;
    const engagementRate = totalViews > 0 ? (responseCount / totalViews) * 100 : 0;

    // Get response distribution for polls/quizzes
    let responseDistribution: Record<string, number> | undefined;
    if (element.type === 'poll' || element.type === 'quiz') {
      const distribution: Record<string, number> = {};
      
      element.responses.forEach((r) => {
        const responseData = r.response as any;
        const answer = responseData.answer || responseData.choice;
        if (answer !== undefined) {
          distribution[answer] = (distribution[answer] || 0) + 1;
        }
      });
      
      responseDistribution = distribution;
    }

    return {
      elementId: element.id,
      type: element.type,
      timestamp: element.timestamp,
      responseCount,
      engagementRate: Math.round(engagementRate * 100) / 100,
      responseDistribution,
    };
  });

  return {
    contentId,
    totalElements: elements.length,
    totalResponses: responseCounts.reduce((sum, r) => sum + r._count, 0),
    elements: engagement,
  };
}

/**
 * Calculate engagement rate for an element
 */
function calculateEngagementRate(element: any): number {
  // This can be enhanced with more sophisticated calculations
  // For now, return basic response count
  return element.responses?.length || 0;
}

