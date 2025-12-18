# Quick Redis Connection Test

## Method 1: Test via Backend API (Easiest)

Since `redis-cli` is not installed, use the backend API to test:

### Step 1: Start Backend Server
```bash
cd backend
bun run dev
```

### Step 2: Get Admin Token
Login as admin user and get the JWT token from the response.

### Step 3: Test Redis Status
```bash
# Using curl (if available)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3001/api/cache-test/status

# Or using PowerShell
$token = "YOUR_ADMIN_TOKEN"
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3001/api/cache-test/status" -Headers $headers
```

**Expected Response (Redis Connected):**
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

**Expected Response (Redis Not Connected):**
```json
{
  "success": true,
  "data": {
    "redisConfigured": true,
    "redisAvailable": false,
    "connectionTest": "error",
    "environment": "development"
  }
}
```

## Method 2: Check Backend Server Logs

When you start the backend server, look for these messages:

**If Redis is connected:**
```
✅ Redis connected
✅ Redis ready
```

**If Redis is NOT connected:**
```
⚠️  Redis connection error. Running without cache.
⚠️  Redis connection failed after 3 attempts. Running without Redis cache.
```

## Method 3: Install Redis CLI (Optional)

### Option A: Install Redis via Chocolatey
```powershell
# Install Chocolatey first (if not installed)
# Then install Redis
choco install redis-64 -y

# Test
redis-cli ping
```

### Option B: Use Docker
```powershell
# Install Docker Desktop, then:
docker run -d --name redis -p 6379:6379 redis:latest

# Test via Docker
docker exec -it redis redis-cli ping
```

### Option C: Use WSL (Windows Subsystem for Linux)
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
redis-cli ping
```

## Current Setup

You've set `REDIS_URL` as a system environment variable:
```powershell
setx REDIS_URL "redis://localhost:6379"
```

**Note:** You may need to:
1. Restart your terminal/PowerShell after setting the variable
2. Restart the backend server for it to pick up the new variable
3. Or add it to `backend/.env` file instead

## Quick Test Script

Create `backend/test-redis.js`:
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

console.log('Testing Redis connection...');

redis.ping()
  .then(result => {
    console.log('✅ Redis connected! Response:', result);
    redis.quit();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Redis connection failed:', error.message);
    console.log('\n💡 Make sure Redis is running on localhost:6379');
    process.exit(1);
  });
```

Run:
```bash
cd backend
bun run test-redis.js
```

## Next Steps

1. **If Redis is NOT running:**
   - Install Redis using one of the methods above
   - Or use Docker: `docker run -d --name redis -p 6379:6379 redis:latest`

2. **If Redis IS running but not connecting:**
   - Check if port 6379 is open
   - Verify `REDIS_URL` is correct
   - Restart backend server

3. **If you don't want to use Redis:**
   - Backend will work fine without it (uses in-memory cache)
   - Just remove or comment out `REDIS_URL` in environment

## Verify Environment Variable

Check if `REDIS_URL` is set:
```powershell
$env:REDIS_URL
```

If it shows the URL, it's set. If empty, you may need to:
- Restart PowerShell/terminal
- Or add to `backend/.env` file directly

