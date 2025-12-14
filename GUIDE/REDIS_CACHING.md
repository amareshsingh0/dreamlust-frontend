# Redis Caching Strategy

This document describes the Redis caching implementation for the Dreamlust backend.

## Overview

Redis caching is used to improve performance by storing frequently accessed data in memory. The system gracefully falls back to database queries if Redis is unavailable.

## Setup

### 1. Install Redis

**Local Development:**
```bash
# macOS
brew install redis
brew services start redis

# Windows (using WSL or Docker)
docker run -d -p 6379:6379 redis:alpine

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

### 2. Environment Variables

Add to `backend/.env`:
```env
REDIS_URL=redis://localhost:6379
```

For production (e.g., Redis Cloud, AWS ElastiCache):
```env
REDIS_URL=redis://username:password@host:port
```

## Caching Strategy

### Cache TTLs

| Data Type | TTL | Invalidation Trigger |
|-----------|-----|---------------------|
| Trending Content | 1 hour | Recalculate hourly |
| Search Results | 5 minutes | On new upload |
| User Sessions | 15 minutes | On logout |
| Creator Profiles | 15 minutes | On profile update |
| Category Lists | 1 day | On category change |
| Homepage Sections | 30 minutes | On new trending |

### Cache Keys

- `trending:today` - Trending content for today
- `trending:week` - Trending content for the week
- `search:{query}:{filters}:{sort}:{page}:{limit}` - Search results
- `creator:{id}` - Creator profile by ID
- `creator:handle:{handle}` - Creator profile by handle
- `category:{id}` - Category by ID
- `categories:all` - All categories
- `homepage:{section}` - Homepage section data
- `session:{sessionId}` - User session
- `user:{userId}` - User data

## Implementation

### Core Files

1. **`backend/src/lib/redis.ts`**
   - Redis client singleton
   - Cache service utilities
   - Key generators and TTL constants

2. **`backend/src/lib/cache/contentCache.ts`**
   - Trending content caching
   - Search results caching
   - Homepage sections caching

3. **`backend/src/lib/cache/creatorCache.ts`**
   - Creator profile caching (by ID and handle)

4. **`backend/src/lib/cache/categoryCache.ts`**
   - Category list and individual category caching

5. **`backend/src/lib/cache/sessionCache.ts`**
   - User session caching
   - User data caching

### Usage Examples

#### Trending Content

```typescript
import { getCachedTrendingContent } from '../lib/cache/contentCache';

// In route handler
const trending = await getCachedTrendingContent('today');
```

#### Search Results

```typescript
import { getCachedSearchResults } from '../lib/cache/contentCache';

const results = await getCachedSearchResults(
  query,
  filters,
  sort,
  page,
  limit,
  async () => {
    // Fetch function - called only on cache miss
    return await prisma.content.findMany({ /* ... */ });
  }
);
```

#### Creator Profile

```typescript
import { getCachedCreatorById } from '../lib/cache/creatorCache';

const creator = await getCachedCreatorById(creatorId);
```

#### Cache Invalidation

```typescript
import { invalidateSearchCache, invalidateHomepageCache } from '../lib/cache/contentCache';
import { invalidateCreatorCache } from '../lib/cache/creatorCache';
import { invalidateCategoryCache } from '../lib/cache/categoryCache';
import { invalidateSession } from '../lib/cache/sessionCache';

// On content upload
await invalidateSearchCache();
await invalidateHomepageCache();

// On creator profile update
await invalidateCreatorCache(creatorId, handle);

// On category change
await invalidateCategoryCache(categoryId);

// On logout
await invalidateSession(sessionId);
```

## Integration Points

### Routes Using Caching

1. **`/api/recommendations/trending-now`**
   - Uses `getCachedTrendingContent()`
   - Cache TTL: 1 hour

2. **`/api/search`**
   - Uses `getCachedSearchResults()`
   - Cache TTL: 5 minutes
   - Skips cache for trending sort (changes frequently)

3. **`/api/upload/content`**
   - Invalidates search and homepage caches on upload

4. **`/api/auth/login`** and **`/api/auth/register`**
   - Caches user sessions in Redis

5. **`/api/auth/logout`**
   - Invalidates session cache

## Graceful Degradation

The caching system is designed to work even if Redis is unavailable:

- If `REDIS_URL` is not set, Redis client is `null`
- All cache functions check `isRedisAvailable()` before use
- On cache miss or Redis unavailability, data is fetched from database
- No errors are thrown if Redis is unavailable

## Monitoring

### Check Redis Connection

```typescript
import { isRedisAvailable } from '../lib/redis';

if (isRedisAvailable()) {
  console.log('Redis is connected');
} else {
  console.log('Redis is not available, using database only');
}
```

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Check all keys
KEYS *

# Check specific pattern
KEYS trending:*

# Get value
GET trending:today

# Check TTL
TTL trending:today

# Delete key
DEL trending:today

# Delete all keys matching pattern
KEYS search:* | xargs redis-cli DEL
```

## Performance Benefits

- **Trending Content**: Reduces database load by ~95% (1 query per hour vs. per request)
- **Search Results**: Reduces database load by ~80% for repeated searches
- **Creator Profiles**: Reduces database load by ~90% for popular creators
- **Session Lookups**: Reduces database load by ~99% (Redis is optimized for key-value lookups)

## Production Considerations

1. **Redis Persistence**: Configure Redis persistence (RDB or AOF) for data durability
2. **Redis Clustering**: Use Redis Cluster for high availability
3. **Memory Limits**: Set appropriate `maxmemory` and eviction policies
4. **Monitoring**: Use Redis monitoring tools (e.g., RedisInsight, Prometheus)
5. **Backup**: Regular backups of Redis data
6. **Connection Pooling**: Already handled by ioredis client

## Testing

### Test Cache Hit

```bash
# First request (cache miss)
curl http://localhost:3001/api/recommendations/trending-now

# Second request (cache hit - should be faster)
curl http://localhost:3001/api/recommendations/trending-now
```

### Test Cache Invalidation

```bash
# Upload content
curl -X POST http://localhost:3001/api/upload/content

# Search cache should be invalidated
# Next search request will be a cache miss
```

## Troubleshooting

### Redis Not Connecting

1. Check `REDIS_URL` in `.env`
2. Verify Redis is running: `redis-cli ping` (should return `PONG`)
3. Check firewall/network settings
4. Review Redis logs

### Cache Not Working

1. Verify `isRedisAvailable()` returns `true`
2. Check Redis keys: `redis-cli KEYS *`
3. Verify TTLs are set correctly
4. Check for errors in application logs

### Memory Issues

1. Monitor Redis memory: `redis-cli INFO memory`
2. Adjust TTLs if needed
3. Implement cache eviction policies
4. Consider Redis maxmemory settings

