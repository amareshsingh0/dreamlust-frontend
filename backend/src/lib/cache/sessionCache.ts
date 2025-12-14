/**
 * Session Caching Utilities
 * Handles caching for user sessions
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';

/**
 * Cache user session
 */
export async function cacheSession(sessionId: string, sessionData: any): Promise<boolean> {
  const cacheKey = CacheKeys.session(sessionId);
  return await CacheService.set(cacheKey, sessionData, CacheTTL.SESSION);
}

/**
 * Get cached session
 */
export async function getCachedSession(sessionId: string): Promise<any | null> {
  const cacheKey = CacheKeys.session(sessionId);
  return await CacheService.get(cacheKey);
}

/**
 * Delete cached session (on logout)
 */
export async function invalidateSession(sessionId: string): Promise<boolean> {
  const cacheKey = CacheKeys.session(sessionId);
  return await CacheService.delete(cacheKey);
}

/**
 * Cache user data
 */
export async function cacheUser(userId: string, userData: any): Promise<boolean> {
  const cacheKey = CacheKeys.user(userId);
  return await CacheService.set(cacheKey, userData, CacheTTL.USER);
}

/**
 * Get cached user
 */
export async function getCachedUser(userId: string): Promise<any | null> {
  const cacheKey = CacheKeys.user(userId);
  return await CacheService.get(cacheKey);
}

/**
 * Invalidate user cache
 */
export async function invalidateUserCache(userId: string): Promise<boolean> {
  const cacheKey = CacheKeys.user(userId);
  return await CacheService.delete(cacheKey);
}

