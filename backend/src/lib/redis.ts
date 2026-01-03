import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis Client Singleton
 * Provides caching layer for frequently accessed data
 *
 * Redis is OPTIONAL - the server works fine without it.
 * If Redis isn't available, caching is simply disabled.
 */

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisDisabled: boolean;
};

// Track if Redis has been disabled due to connection failures
let redisDisabled = globalForRedis.redisDisabled || false;
let connectionAttempted = false;

// Create Redis client if REDIS_URL is provided, otherwise return null
function createRedisClient(): Redis | null {
  // Skip if already disabled or no URL configured
  if (redisDisabled || !env.REDIS_URL) {
    return null;
  }

  // Return existing client if available
  if (globalForRedis.redis) {
    return globalForRedis.redis;
  }

  try {
    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Disable automatic retries to prevent unhandled rejections
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when disconnected
      connectTimeout: 5000, // 5 second timeout
      retryStrategy: (times) => {
        // Stop retrying after 2 attempts to fail fast
        if (times > 2) {
          redisDisabled = true;
          globalForRedis.redisDisabled = true;
          return null; // Return null to stop retrying
        }
        return Math.min(times * 100, 1000);
      },
      reconnectOnError: () => false, // Don't auto-reconnect on errors
    });

    return client;
  } catch {
    redisDisabled = true;
    globalForRedis.redisDisabled = true;
    return null;
  }
}

export const redis: Redis | null = createRedisClient();

if (redis && process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// Graceful shutdown and connection handling
if (redis && !connectionAttempted) {
  connectionAttempted = true;
  let errorLogged = false;

  // Suppress error logging to avoid spam
  redis.on('error', () => {
    // Only log once, not repeatedly
    if (!errorLogged) {
      errorLogged = true;
      // Disable Redis to prevent further connection attempts
      redisDisabled = true;
      globalForRedis.redisDisabled = true;
    }
    // Errors are handled gracefully - server continues without Redis
  });

  redis.on('connect', () => {
    errorLogged = false;
    redisDisabled = false;
    globalForRedis.redisDisabled = false;
    console.log('✅ Redis connected');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready');
  });

  // Attempt to connect silently - don't crash if it fails
  redis.connect().catch(() => {
    // Silently disable Redis - it's optional
    redisDisabled = true;
    globalForRedis.redisDisabled = true;
  });

  process.on('SIGINT', async () => {
    if (redis && redis.status === 'ready') {
      try {
        await redis.quit();
      } catch {
        // Ignore errors during shutdown
      }
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
      // Use replacer to handle BigInt serialization
      const jsonString = JSON.stringify(value, (_, val) =>
        typeof val === 'bigint' ? Number(val) : val
      );
      await redis!.setex(key, ttlSeconds, jsonString);
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
  sessionBehavior: (sessionId: string) => `session:behavior:${sessionId}`,
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

