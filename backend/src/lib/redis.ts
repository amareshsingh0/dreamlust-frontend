import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis Client Singleton
 * Provides caching layer for frequently accessed data
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Create Redis client if REDIS_URL is provided, otherwise return null
export const redis: Redis | null = env.REDIS_URL
  ? (globalForRedis.redis ??
    new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY error
        }
        return false;
      },
    }))
  : null;

if (env.REDIS_URL && process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis as Redis;
}

// Graceful shutdown
if (redis) {
  redis.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  process.on('SIGINT', async () => {
    if (redis) {
      await redis.quit();
      console.log('Redis connection closed');
    }
  });
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null && redis.status === 'ready';
}

/**
 * Cache helper functions
 */
export class CacheService {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;

    try {
      const cached = await redis!.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      await redis!.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    try {
      await redis!.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  static async deletePattern(pattern: string): Promise<number> {
    if (!isRedisAvailable()) return 0;

    try {
      const keys = await redis!.keys(pattern);
      if (keys.length === 0) return 0;
      return await redis!.del(...keys);
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  static async invalidate(pattern: string): Promise<void> {
    await this.deletePattern(pattern);
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  trending: (period: string = 'today') => `trending:${period}`,
  search: (query: string, filters: string) => `search:${query}:${filters}`,
  creator: (id: string) => `creator:${id}`,
  creatorByHandle: (handle: string) => `creator:handle:${handle}`,
  category: (id: string) => `category:${id}`,
  categories: () => 'categories:all',
  homepage: (section: string) => `homepage:${section}`,
  session: (sessionId: string) => `session:${sessionId}`,
  user: (userId: string) => `user:${userId}`,
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  TRENDING: 3600, // 1 hour
  SEARCH: 300, // 5 minutes
  CREATOR: 900, // 15 minutes
  CATEGORY: 86400, // 1 day
  HOMEPAGE: 1800, // 30 minutes
  SESSION: 900, // 15 minutes
  USER: 300, // 5 minutes
};

