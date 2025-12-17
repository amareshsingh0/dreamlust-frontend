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
      maxRetriesPerRequest: null, // Disable automatic retries to prevent unhandled rejections
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when disconnected
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.warn('⚠️  Redis connection failed after 3 attempts. Running without Redis cache.');
          return null; // Return null to stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY error
        }
        return false; // Don't reconnect on other errors
      },
    }))
  : null;

if (env.REDIS_URL && process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis as Redis;
}

// Graceful shutdown and connection handling
if (redis) {
  let errorLogged = false;
  
  // Suppress error logging to avoid spam
  redis.on('error', (err) => {
    // Only log once, not repeatedly
    if (!errorLogged) {
      errorLogged = true;
      console.warn('⚠️  Redis connection error. Running without cache.');
      console.warn('   To use Redis caching, ensure Redis is running on the configured URL.');
    }
    // Prevent error from crashing the process
    // Errors are handled gracefully - server continues without Redis
  });

  redis.on('connect', () => {
    errorLogged = false; // Reset on successful connection
    console.log('✅ Redis connected');
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready');
  });

  redis.on('close', () => {
    // Connection closed - this is normal, don't log as error
  });

  redis.on('end', () => {
    // Connection ended - this is normal, don't log as error
  });

  // Attempt to connect, but don't crash if it fails
  redis.connect().catch((err) => {
    // Error already handled by 'error' event handler
    // This catch is just to prevent unhandled promise rejection
  });

  process.on('SIGINT', async () => {
    if (redis && redis.status === 'ready') {
      try {
        await redis.quit();
        console.log('Redis connection closed');
      } catch (err) {
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

