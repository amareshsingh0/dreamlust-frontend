/**
 * Multi-layer Cache Manager
 * Implements L1 (in-memory) and L2 (Redis) caching strategy
 * Optimized for Bun runtime
 */

import Redis from 'ioredis';
import { env } from '../../config/env';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

class CacheManager {
  private redis: Redis;
  private memcache: Map<string, { value: any; expiry: number }>;
  private maxMemoryCacheSize: number = 1000;

  constructor() {
    this.redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');
    this.memcache = new Map();

    // Cleanup expired memory cache entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60000);
  }

  /**
   * Get value from cache (L1 -> L2)
   */
  async get<T = any>(key: string): Promise<T | null> {
    // L1: In-memory cache (instant)
    const memEntry = this.memcache.get(key);
    if (memEntry) {
      if (Date.now() < memEntry.expiry) {
        return memEntry.value as T;
      } else {
        this.memcache.delete(key);
      }
    }

    // L2: Redis cache (fast)
    try {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const parsed = JSON.parse(redisValue);
        
        // Store in L1 for next access
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          this.setMemoryCache(key, parsed, ttl);
        }
        
        return parsed as T;
      }
    } catch (error) {
      console.error('Redis get error:', error);
    }

    return null;
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || 3600; // Default 1 hour

    try {
      // Store in L1 (memory)
      this.setMemoryCache(key, value, ttl);

      // Store in L2 (Redis)
      await this.redis.setex(key, ttl, JSON.stringify(value));

      // Track cache tags for invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      }
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    // Remove from L1
    this.memcache.delete(key);

    // Remove from L2
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidate(tags: string[]): Promise<void> {
    for (const tag of tags) {
      try {
        const keys = await this.redis.smembers(`tag:${tag}`);

        if (keys.length > 0) {
          // Remove from Redis
          await this.redis.del(...keys);

          // Remove from memory cache
          keys.forEach(key => this.memcache.delete(key));
        }

        // Clean up tag set
        await this.redis.del(`tag:${tag}`);
      } catch (error) {
        console.error(`Error invalidating tag ${tag}:`, error);
      }
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.memcache.delete(key));
      }
    } catch (error) {
      console.error('Error invalidating pattern:', error);
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Increment counter in cache
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      console.error('Redis increment error:', error);
      return 0;
    }
  }

  /**
   * Decrement counter in cache
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, amount);
    } catch (error) {
      console.error('Redis decrement error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    // Check L1
    if (this.memcache.has(key)) {
      const entry = this.memcache.get(key)!;
      if (Date.now() < entry.expiry) {
        return true;
      }
      this.memcache.delete(key);
    }

    // Check L2
    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  /**
   * Set multiple keys at once
   */
  async mset(entries: Array<{ key: string; value: any; options?: CacheOptions }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    redisKeys: number;
    memoryHitRate: number;
  }> {
    const redisKeys = await this.redis.dbsize();

    return {
      memorySize: this.memcache.size,
      redisKeys,
      memoryHitRate: 0, // Would need to track hits/misses
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    // Clear L1
    this.memcache.clear();

    // Clear L2 (use with caution!)
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis flush error:', error);
    }
  }

  /**
   * Set value in memory cache
   */
  private setMemoryCache(key: string, value: any, ttlSeconds: number): void {
    // Enforce max size
    if (this.memcache.size >= this.maxMemoryCacheSize) {
      // Remove oldest entry
      const firstKey = this.memcache.keys().next().value;
      if (firstKey) {
        this.memcache.delete(firstKey);
      }
    }

    this.memcache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
  }

  /**
   * Cleanup expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memcache.entries()) {
      if (now >= entry.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memcache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const cache = new CacheManager();

/**
 * Cache decorator for functions
 */
export function Cacheable(options: CacheOptions & { keyGenerator?: (...args: any[]) => string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${propertyKey}:${JSON.stringify(args)}`;

      return cache.getOrSet(
        cacheKey,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}
