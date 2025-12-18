# Redis Cache Testing Guide

## Overview
This guide explains how to test Redis caching functionality in the backend.

## Prerequisites
1. Redis server running on `localhost:6379` (or configured in `REDIS_URL`)
2. Backend server running in development mode
3. Admin account for accessing test endpoints

## Cache Test Endpoints

All endpoints are available at `/api/cache-test/*` and require:
- Authentication (JWT token)
- Admin role

### 1. Check Redis Status
```bash
GET /api/cache-test/status
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "redisConfigured": true,
    "redisAvailable": true,
    "connectionTest": "connected",
    "environment": "development"
  }
}
```

### 2. Test Content Caching
```bash
GET /api/cache-test/content/:contentId
Authorization: Bearer <admin_token>
```

**Example:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/cache-test/content/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": { ... },
    "firstRequest": {
      "time": "45ms",
      "source": "database"
    },
    "secondRequest": {
      "time": "2ms",
      "source": "cache",
      "speedup": "95.6%"
    }
  }
}
```

### 3. Test Trending Content Caching
```bash
GET /api/cache-test/trending?period=today
Authorization: Bearer <admin_token>
```

**Parameters:**
- `period`: `today`, `week`, or `month` (default: `today`)

### 4. Test Categories Caching
```bash
GET /api/cache-test/categories
Authorization: Bearer <admin_token>
```

### 5. Test Search Caching
```bash
GET /api/cache-test/search?q=test
Authorization: Bearer <admin_token>
```

**Parameters:**
- `q`: Search query (default: `test`)

### 6. Clear Cache
```bash
POST /api/cache-test/clear
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "pattern": "content:*"  // Optional: specific pattern, or omit to clear all
}
```

### 7. Get Cache Information
```bash
GET /api/cache-test/info
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cacheKeys": {
      "content": "content:{id}",
      "trending": "trending:{period}",
      "search": "search:{query}:{filters}",
      "categories": "categories:all",
      "creator": "creator:{id}",
      "homepage": "homepage:{section}"
    },
    "cacheTTL": {
      "trending": "3600s (60 minutes)",
      "search": "300s (5 minutes)",
      "creator": "900s (15 minutes)",
      "category": "86400s (24 hours)",
      "homepage": "1800s (30 minutes)",
      "session": "900s (15 minutes)",
      "user": "300s (5 minutes)"
    }
  }
}
```

## Testing Workflow

### Step 1: Verify Redis Connection
```bash
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3001/api/cache-test/status
```

Expected: `"connectionTest": "connected"`

### Step 2: Test Content Cache
1. Make first request (should be slow - from database):
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/cache-test/content/<content-id>
```

2. Make second request (should be fast - from cache):
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/cache-test/content/<content-id>
```

3. Compare response times - second should be significantly faster

### Step 3: Test Cache Invalidation
1. Clear cache:
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"pattern": "content:*"}' \
  http://localhost:3001/api/cache-test/clear
```

2. Make request again (should be slow - cache cleared)

## Cache Performance Expectations

- **First Request (Database):** 20-100ms
- **Second Request (Cache):** 1-5ms
- **Speedup:** 80-95% faster

## Troubleshooting

### Redis Not Connected
**Symptoms:**
- `"redisAvailable": false`
- `"connectionTest": "not_configured"` or `"error"`

**Solutions:**
1. Check if Redis is running: `redis-cli ping` (should return `PONG`)
2. Verify `REDIS_URL` in `.env`: `REDIS_URL=redis://localhost:6379`
3. Restart backend server after setting `REDIS_URL`

### Cache Not Working
**Symptoms:**
- Second request is not faster
- `"source": "database"` on second request

**Solutions:**
1. Check Redis connection status
2. Verify cache TTL is not expired
3. Check if cache key pattern matches
4. Clear cache and test again

### Cache Test Endpoints Not Available
**Symptoms:**
- 404 Not Found

**Solutions:**
1. Ensure server is running in development mode (`NODE_ENV=development`)
2. Verify route is registered in `server.ts`
3. Check authentication token is valid
4. Verify user has admin role

## Cache Key Patterns

- `content:{id}` - Individual content items
- `trending:{period}` - Trending content (today/week/month)
- `search:{query}:{filters}` - Search results
- `categories:all` - All categories
- `creator:{id}` - Creator profiles
- `homepage:{section}` - Homepage sections

## Cache TTL (Time To Live)

- **Trending:** 1 hour (3600s)
- **Search:** 5 minutes (300s)
- **Creator:** 15 minutes (900s)
- **Category:** 1 day (86400s)
- **Homepage:** 30 minutes (1800s)
- **Session:** 15 minutes (900s)
- **User:** 5 minutes (300s)

## Production Notes

⚠️ **Cache test endpoints are ONLY available in development mode.**

In production:
- Cache test routes are disabled
- Use monitoring tools to track cache hit rates
- Monitor Redis connection status
- Set up alerts for cache failures

