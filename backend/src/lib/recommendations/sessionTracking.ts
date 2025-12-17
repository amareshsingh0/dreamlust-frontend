/**
 * Session-based Recommendation Tracking
 * Tracks anonymous user behavior in session storage for recommendations
 */

import { CacheService, CacheKeys } from '../redis';

export interface SessionBehavior {
  viewedContent: string[]; // Content IDs viewed in this session
  likedContent: string[]; // Content IDs liked in this session
  categories: string[]; // Category IDs from viewed content
  tags: string[]; // Tag IDs from viewed content
  creators: string[]; // Creator IDs from viewed content
  lastUpdated: number; // Timestamp of last update
}

const SESSION_TTL = 3600; // 1 hour session TTL

/**
 * Get or create session behavior tracking
 */
export async function getSessionBehavior(sessionId: string): Promise<SessionBehavior> {
  const cacheKey = CacheKeys.sessionBehavior(sessionId);
  const cached = await CacheService.get<SessionBehavior>(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // Create new session behavior
  const newBehavior: SessionBehavior = {
    viewedContent: [],
    likedContent: [],
    categories: [],
    tags: [],
    creators: [],
    lastUpdated: Date.now(),
  };
  
  await CacheService.set(cacheKey, newBehavior, SESSION_TTL);
  return newBehavior;
}

/**
 * Track content view in session
 */
export async function trackContentView(
  sessionId: string,
  contentId: string,
  categoryIds: string[],
  tagIds: string[],
  creatorId: string
): Promise<void> {
  const behavior = await getSessionBehavior(sessionId);
  
  // Add content if not already tracked
  if (!behavior.viewedContent.includes(contentId)) {
    behavior.viewedContent.push(contentId);
  }
  
  // Add categories
  categoryIds.forEach(catId => {
    if (!behavior.categories.includes(catId)) {
      behavior.categories.push(catId);
    }
  });
  
  // Add tags
  tagIds.forEach(tagId => {
    if (!behavior.tags.includes(tagId)) {
      behavior.tags.push(tagId);
    }
  });
  
  // Add creator
  if (!behavior.creators.includes(creatorId)) {
    behavior.creators.push(creatorId);
  }
  
  behavior.lastUpdated = Date.now();
  
  const cacheKey = CacheKeys.sessionBehavior(sessionId);
  await CacheService.set(cacheKey, behavior, SESSION_TTL);
}

/**
 * Track content like in session
 */
export async function trackContentLike(sessionId: string, contentId: string): Promise<void> {
  const behavior = await getSessionBehavior(sessionId);
  
  if (!behavior.likedContent.includes(contentId)) {
    behavior.likedContent.push(contentId);
  }
  
  behavior.lastUpdated = Date.now();
  
  const cacheKey = CacheKeys.sessionBehavior(sessionId);
  await CacheService.set(cacheKey, behavior, SESSION_TTL);
}

/**
 * Get session-based recommendations using collaborative filtering
 * Finds content similar to what was viewed in this session
 */
export async function getSessionBasedRecommendations(
  sessionId: string,
  excludeContentIds: string[] = []
): Promise<string[]> {
  const behavior = await getSessionBehavior(sessionId);
  
  if (behavior.viewedContent.length === 0) {
    return [];
  }
  
  // Return viewed content IDs (excluding already viewed)
  // In a real implementation, this would find similar content based on categories/tags
  return behavior.viewedContent.filter(id => !excludeContentIds.includes(id));
}

/**
 * Clear session behavior (on logout or session end)
 */
export async function clearSessionBehavior(sessionId: string): Promise<void> {
  const cacheKey = CacheKeys.sessionBehavior(sessionId);
  await CacheService.delete(cacheKey);
}

