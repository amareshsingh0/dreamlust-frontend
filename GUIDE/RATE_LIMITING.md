# Rate Limiting Configuration

This document describes the rate limiting implementation in the Dreamlust application.

## Overview

Rate limiting is implemented using `express-rate-limit` to protect the API from abuse and ensure fair resource usage. Different endpoints have different rate limits based on their sensitivity and usage patterns.

## Rate Limiters

### Global Rate Limiters

1. **IP Rate Limiter** (`ipRateLimiter`)
   - **Limit**: 1000 requests per minute
   - **Scope**: Applied globally to all routes
   - **Key**: IP address
   - **Purpose**: Prevents DDoS attacks and abuse from single IPs

2. **User Rate Limiter** (`userRateLimiter`)
   - **Limit**: 100 requests per minute
   - **Scope**: Applied to authenticated user endpoints
   - **Key**: User ID (if authenticated) or IP address
   - **Purpose**: Limits per-user API usage

3. **Strict Rate Limiter** (`strictRateLimiter`)
   - **Limit**: 10 requests per minute
   - **Scope**: Sensitive endpoints (registration, password reset)
   - **Key**: IP address
   - **Purpose**: Prevents brute force attacks

### Per-Endpoint Rate Limiters

#### 1. Search Endpoint (`/api/search`)
- **Rate Limiter**: `searchRateLimiter`
- **Limit**: 60 requests per minute
- **Key**: User ID (if authenticated) or IP address
- **Purpose**: Prevents search abuse while allowing reasonable usage

#### 2. Comments Endpoint (`/api/comments`)
- **Rate Limiter**: `commentsRateLimiter`
- **Limit**: 30 requests per minute
- **Key**: User ID (if authenticated) or IP address
- **Purpose**: Prevents comment spam while allowing normal interaction

#### 3. Login Endpoint (`/api/auth/login`)
- **Rate Limiter**: `loginRateLimiter`
- **Limit**: 10 requests per minute
- **Key**: Email address (from request body) or IP address
- **Purpose**: Prevents brute force login attempts

#### 4. Upload Endpoint (`/api/upload`) - For Creators Only
- **Rate Limiter**: `uploadRateLimiter`
- **Limit**: 5 requests per hour
- **Key**: User ID (creators only)
- **Purpose**: Prevents abuse of upload functionality, ensures quality content
- **Note**: This endpoint requires authentication and creator role

## Implementation Details

### Rate Limit Headers

All rate-limited responses include standard rate limit headers:

- `RateLimit-Limit`: Maximum number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit window resets (Unix timestamp)
- `RateLimit-Policy`: Rate limit policy description

### Error Response

When rate limit is exceeded, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "timestamp": "2025-12-14T12:00:00.000Z"
  }
}
```

HTTP Status Code: `429 Too Many Requests`

## Configuration

Rate limits are configured in `backend/src/middleware/rateLimit.ts`:

```typescript
// Search: 60 requests per minute
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  // ...
});

// Comments: 30 requests per minute
export const commentsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  // ...
});

// Login: 10 requests per minute
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  // ...
});

// Upload: 5 requests per hour (creators only)
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  // ...
});
```

## Usage in Routes

Rate limiters are applied as middleware in route definitions:

```typescript
import { searchRateLimiter } from '../middleware/rateLimit';

router.post(
  '/',
  searchRateLimiter, // Apply rate limiter
  validateBody(searchSchema),
  async (req: Request, res: Response) => {
    // Route handler
  }
);
```

## Current Implementation Status

✅ **Implemented:**
- `/api/search`: 60/min - `searchRateLimiter` applied
- `/api/comments`: 30/min - `commentsRateLimiter` applied
- `/api/auth/login`: 10/min - `loginRateLimiter` applied
- `/api/upload`: 5/hour - `uploadRateLimiter` ready (endpoint to be created)

## Future Enhancements

### Redis-Based Rate Limiting (Optional)

For production at scale, consider using Redis-based rate limiting with `@upstash/ratelimit`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});
```

**Benefits:**
- Distributed rate limiting across multiple servers
- Persistent rate limit data
- Better analytics and monitoring
- More accurate rate limiting in load-balanced environments

**When to use:**
- Multiple server instances
- Need for persistent rate limit data
- Advanced analytics requirements
- High-traffic applications

## Testing Rate Limits

### Using cURL

```bash
# Test search endpoint (60/min)
for i in {1..65}; do
  curl -X POST http://localhost:3001/api/search \
    -H "Content-Type: application/json" \
    -d '{"query": "test"}'
  echo ""
done

# Check rate limit headers
curl -I -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Expected Behavior

1. First 60 requests: Success (200 OK)
2. Request 61+: Rate limit error (429 Too Many Requests)
3. After 1 minute: Rate limit resets, requests allowed again

## Best Practices

1. **Monitor Rate Limit Usage**: Track which endpoints hit rate limits frequently
2. **Adjust Limits**: Tune limits based on actual usage patterns
3. **User Communication**: Inform users when they approach rate limits
4. **Graceful Degradation**: Provide helpful error messages
5. **Whitelist**: Consider whitelisting trusted IPs or users for higher limits

## Notes

- Rate limits are per-user (authenticated) or per-IP (anonymous)
- Rate limit windows use sliding window algorithm
- Rate limit data is stored in memory (consider Redis for production)
- Rate limits apply independently per endpoint
- Global IP rate limiter (1000/min) is applied to all routes first
