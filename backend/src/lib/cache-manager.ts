import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export class CacheManager {
  private redis: Redis;
  private memcache: Map<string, any>;
  private maxMemCacheSize: number;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.memcache = new Map();
    this.maxMemCacheSize = 1000;
  }

  async get(key: string): Promise<any> {
    if (this.memcache.has(key)) {
      return this.memcache.get(key);
    }

    const redisValue = await this.redis.get(key);
    if (redisValue) {
      try {
        const parsed = JSON.parse(redisValue);
        
        if (this.memcache.size >= this.maxMemCacheSize) {
          const firstKey = this.memcache.keys().next().value;
          if (firstKey) this.memcache.delete(firstKey);
        }
        
        this.memcache.set(key, parsed);
        return parsed;
      } catch (error) {
        console.error('Error parsing cached value:', error);
        return null;
      }
    }

    return null;
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600;

    if (this.memcache.size >= this.maxMemCacheSize) {
      const firstKey = this.memcache.keys().next().value;
      if (firstKey) this.memcache.delete(firstKey);
    }

    this.memcache.set(key, value);
    
    await this.redis.setex(key, ttl, JSON.stringify(value));

    if (options.tags) {
      for (const tag of options.tags) {
        await this.redis.sadd(`tag:${tag}`, key);
        await this.redis.expire(`tag:${tag}`, ttl);
      }
    }
  }

  async invalidate(tags: string[]): Promise<void> {
    for (const tag of tags) {
      const keys = await this.redis.smembers(`tag:${tag}`);

      if (keys.length > 0) {
        await this.redis.del(...keys);

        keys.forEach((key) => this.memcache.delete(key));
      }

      await this.redis.del(`tag:${tag}`);
    }
  }

  async delete(key: string): Promise<void> {
    this.memcache.delete(key);
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    this.memcache.clear();
    await this.redis.flushdb();
  }

  async exists(key: string): Promise<boolean> {
    if (this.memcache.has(key)) {
      return true;
    }
    
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  disconnect(): void {
    this.redis.disconnect();
  }
}

export const cache = new CacheManager();

export async function getCachedContent(id: string): Promise<any> {
  const cacheKey = `content:${id}`;
  
  let content = await cache.get(cacheKey);
  
  if (!content) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    content = await prisma.content.findUnique({
      where: { id },
      include: { 
        creator: true, 
        categories: {
          include: {
            category: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
    });
    
    if (content) {
      await cache.set(cacheKey, content, {
        ttl: 1800,
        tags: [`content:${id}`, `creator:${content.creatorId}`],
      });
    }
  }
  
  return content;
}

export async function invalidateContentCache(id: string, creatorId?: string): Promise<void> {
  const tags = [`content:${id}`];
  
  if (creatorId) {
    tags.push(`creator:${creatorId}`);
  }
  
  await cache.invalidate(tags);
}

export async function getCachedCreator(id: string): Promise<any> {
  const cacheKey = `creator:${id}`;
  
  let creator = await cache.get(cacheKey);
  
  if (!creator) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    creator = await prisma.creator.findUnique({
      where: { id },
      include: {
        content: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (creator) {
      await cache.set(cacheKey, creator, {
        ttl: 3600,
        tags: [`creator:${id}`],
      });
    }
  }
  
  return creator;
}

export async function getCachedCategory(id: string): Promise<any> {
  const cacheKey = `category:${id}`;
  
  let category = await cache.get(cacheKey);
  
  if (!category) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    category = await prisma.category.findUnique({
      where: { id },
    });
    
    if (category) {
      await cache.set(cacheKey, category, {
        ttl: 7200,
        tags: [`category:${id}`],
      });
    }
  }
  
  return category;
}

export async function getCachedSearchResults(query: string, filters: any): Promise<any> {
  const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
  
  let results = await cache.get(cacheKey);
  
  if (!results) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    results = await prisma.content.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        ...filters,
      },
      take: 20,
      orderBy: { viewCount: 'desc' },
    });
    
    await cache.set(cacheKey, results, {
      ttl: 600,
      tags: ['search'],
    });
  }
  
  return results;
}

export async function warmupCache(): Promise<void> {
  console.log('Warming up cache...');
  
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const popularContent = await prisma.content.findMany({
    take: 50,
    orderBy: { viewCount: 'desc' },
    include: {
      creator: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
  
  for (const content of popularContent) {
    await cache.set(`content:${content.id}`, content, {
      ttl: 1800,
      tags: [`content:${content.id}`, `creator:${content.creatorId}`],
    });
  }
  
  console.log(`Cached ${popularContent.length} popular content items`);
}
