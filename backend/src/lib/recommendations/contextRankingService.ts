/**
 * Context-Aware Ranking Service
 * Adjusts content ranking based on user context (time, day, device, connection, etc.)
 */

import type { EnhancedUserContext } from './userContextService';

export interface Content {
  id: string;
  baseScore: number;
  duration?: number;
  category?: string;
  fileSize?: number;
  mobileOptimized?: boolean;
  contextualScore?: number;
  [key: string]: any;
}

/**
 * Adjust ranking by context
 */
export function adjustRankingByContext(
  content: Content[],
  context: EnhancedUserContext
): Content[] {
  return content
    .map(item => {
      let score = item.baseScore || 0;

      // Time-based adjustments
      if (context.timeOfDay === 'morning' && item.duration && item.duration < 600) {
        score *= 1.3; // Boost short content in mornings
      } else if (context.timeOfDay === 'evening' && item.duration && item.duration > 1200) {
        score *= 1.2; // Boost longer content in evenings
      }

      // Weekend vs weekday
      if (context.dayOfWeek === 'Saturday' || context.dayOfWeek === 'Sunday') {
        if (item.category === 'entertainment' || item.category === 'lifestyle') {
          score *= 1.15;
        }
      } else {
        // Weekday - boost educational/professional content
        if (item.category === 'education' || item.category === 'business') {
          score *= 1.1;
        }
      }

      // Device optimization
      if (context.device === 'mobile' && item.mobileOptimized) {
        score *= 1.1;
      } else if (context.device === 'desktop' && item.duration && item.duration > 1800) {
        score *= 1.05; // Slight boost for longer content on desktop
      }

      // Connection speed
      if (context.connectionSpeed === 'slow' && item.fileSize && item.fileSize < 50000000) {
        score *= 1.2; // Prefer smaller files on slow connections
      } else if (context.connectionSpeed === 'fast' && item.fileSize && item.fileSize > 100000000) {
        score *= 1.1; // Can handle larger files on fast connections
      }

      // Preferred duration
      if (item.duration) {
        const duration = item.duration;
        if (context.recentBehavior.preferredDuration === 'short' && duration < 300) {
          score *= 1.15;
        } else if (context.recentBehavior.preferredDuration === 'medium' && duration >= 300 && duration < 1200) {
          score *= 1.15;
        } else if (context.recentBehavior.preferredDuration === 'long' && duration >= 1200) {
          score *= 1.15;
        }
      }

      // Preferred categories boost
      if (item.category && context.recentBehavior.preferredCategories.length > 0) {
        // This would need category matching logic
        score *= 1.1;
      }

      return {
        ...item,
        contextualScore: score,
      };
    })
    .sort((a, b) => (b.contextualScore || 0) - (a.contextualScore || 0));
}

