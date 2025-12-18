# Redis Setup for Windows

## Option 1: Redis via WSL (Recommended)

If you have Windows Subsystem for Linux (WSL) installed:

```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start

# Test connection
redis-cli ping
# Should return: PONG
```

Then use in `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Option 2: Redis via Docker

If you have Docker Desktop installed:

```bash
# Run Redis container
docker run -d --name redis -p 6379:6379 redis:latest

# Test connection
docker exec -it redis redis-cli ping
# Should return: PONG
```

Then use in `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Option 3: Memurai (Windows Native Redis)

1. Download Memurai from: https://www.memurai.com/
2. Install Memurai (it's a Windows-compatible Redis alternative)
3. Start Memurai service
4. Use in `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Option 4: Redis for Windows (Unofficial)

1. Download from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Use in `.env`:
```
REDIS_URL=redis://localhost:6379
```

## Testing Redis Connection

### Method 1: Via Backend API (Recommended)

Start your backend server and test:

```bash
# Get admin token first (login as admin)
# Then test Redis status
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3001/api/cache-test/status
```

Expected response:
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

### Method 2: Via Node.js Script

Create `test-redis.js`:
```javascript
import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6379');

redis.ping()
  .then(result => {
    console.log('✅ Redis connected:', result);
    redis.quit();
  })
  .catch(error => {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  });
```

Run:
```bash
bun run test-redis.js
```

### Method 3: Check Backend Logs

When you start the backend server, look for:
```
✅ Redis connected
✅ Redis ready
```

If you see:
```
⚠️  Redis connection error. Running without cache.
```

Then Redis is not running or not configured.

## Quick Start (Docker - Easiest)

```bash
# Start Redis
docker run -d --name redis -p 6379:6379 redis:latest

# Verify it's running
docker ps | grep redis

# Test connection
docker exec -it redis redis-cli ping
```

## Troubleshooting

### Redis Not Starting
- Check if port 6379 is already in use
- Check Windows Firewall settings
- Verify Redis service is running

### Connection Refused
- Ensure Redis is running on port 6379
- Check `REDIS_URL` in `.env` matches your setup
- Try `redis://127.0.0.1:6379` instead of `localhost`

### Backend Falls Back to In-Memory
- This is normal if Redis is unavailable
- Backend will work without Redis (using in-memory cache)
- Check backend logs for Redis connection status

## Production Setup

For production, use a managed Redis service:
- **Redis Cloud** (free tier available)
- **AWS ElastiCache**
- **Azure Cache for Redis**
- **DigitalOcean Managed Redis**

Update `REDIS_URL` in production environment:
```
REDIS_URL=redis://username:password@host:port
```

## Current Status

Check if Redis is configured:
```bash
# In backend directory
cat .env | grep REDIS_URL
```

If `REDIS_URL` is set, Redis will be used when available.
If not set or Redis unavailable, backend uses in-memory cache (works fine for development).

