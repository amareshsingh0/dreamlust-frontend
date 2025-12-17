# Backend Troubleshooting Guide

## Common Issues and Solutions

### 1. **Port Already in Use Error**

**Error:**
```
Port already in use Please free the port or change PORT in .env
```

**Solution:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Or change port in backend/.env
PORT=3002
```

**Quick Fix:**
```powershell
# Kill all bun processes (be careful!)
Get-Process bun | Stop-Process -Force
```

---

### 2. **DATABASE_URL Not Set**

**Error:**
```
❌ DATABASE_URL is not set in environment variables!
```

**Solution:**
1. Check `backend/.env` file exists
2. Add `DATABASE_URL`:
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

---

### 3. **JWT_SECRET Missing**

**Error:**
```
JWT_SECRET must be at least 32 characters
```

**Solution:**
Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `backend/.env`:
```env
JWT_SECRET=your-generated-secret-here
```

---

### 4. **Prisma Client Not Generated**

**Error:**
```
Cannot find module '@prisma/client'
```

**Solution:**
```bash
cd backend
bun run db:generate
```

---

### 5. **Database Connection Failed**

**Error:**
```
Database connection failed
```

**Solution:**
1. Check database is running
2. Verify `DATABASE_URL` is correct
3. Test connection:
```bash
cd backend
bun run db:test
```

---

### 6. **Redis Connection Failed**

**Error:**
```
Redis connection failed
```

**Solution:**
- Redis is optional - server will start without it
- If you need Redis:
  1. Install Redis locally or use cloud service
  2. Add to `backend/.env`:
```env
REDIS_URL=redis://localhost:6379
```

---

### 7. **Missing Environment Variables**

**Error:**
```
Missing required environment variable
```

**Solution:**
Check `backend/.env` has all required variables:
- `DATABASE_URL` ✅ Required
- `JWT_SECRET` ✅ Required (min 32 chars)
- `PORT` ✅ Optional (default: 3001)
- `FRONTEND_URL` ✅ Optional (default: http://localhost:4001)

All other variables are optional.

---

## Quick Start Commands

### Start Backend
```bash
cd backend
bun run dev
```

### Check Health
```bash
curl http://localhost:3001/health
```

### Test Database Connection
```bash
cd backend
bun run db:test
```

### Generate Prisma Client
```bash
cd backend
bun run db:generate
```

### View Logs
```bash
# Logs are in backend/logs/ directory
# Or check console output
```

---

## Server Status Check

### Health Endpoint
```bash
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-17T01:20:37.807Z",
  "uptime": 13.22,
  "version": "1.0.0",
  "environment": "development"
}
```

### Detailed Health Check
```bash
GET http://localhost:3001/api/health
```

Shows:
- Database status
- Redis status (if configured)
- Supabase status (if configured)
- S3/R2 status (if configured)

---

## Port Management

### Change Port
Edit `backend/.env`:
```env
PORT=3002
```

### Find What's Using Port
```powershell
netstat -ano | findstr :3001
```

### Kill Process on Port
```powershell
# Find PID first
netstat -ano | findstr :3001

# Kill process
Stop-Process -Id <PID> -Force
```

---

## Common Fixes

### 1. Restart Backend
```powershell
# Kill existing process
Get-Process bun | Where-Object {$_.Path -like "*dreamlust*"} | Stop-Process -Force

# Start fresh
cd backend
bun run dev
```

### 2. Clear Prisma Cache
```bash
cd backend
rm -rf node_modules/.prisma
bun run db:generate
```

### 3. Reinstall Dependencies
```bash
cd backend
rm -rf node_modules
bun install
```

### 4. Check Environment Variables
```bash
cd backend
# Check .env file exists
cat .env

# Verify DATABASE_URL
echo $DATABASE_URL
```

---

## Debug Mode

### Enable Debug Logging
Edit `backend/.env`:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### View Detailed Logs
```bash
# Logs are written to:
backend/logs/
  - error.log
  - combined.log
  - debug.log (if enabled)
```

---

## Still Having Issues?

1. **Check Logs:**
   - Console output
   - `backend/logs/` directory

2. **Verify Environment:**
   ```bash
   cd backend
   bun run -e "console.log(process.env.DATABASE_URL)"
   ```

3. **Test Database:**
   ```bash
   cd backend
   bun run db:test
   ```

4. **Check Port:**
   ```powershell
   netstat -ano | findstr :3001
   ```

5. **Restart Everything:**
   ```powershell
   # Kill all bun processes
   Get-Process bun | Stop-Process -Force
   
   # Start backend
   cd backend
   bun run dev
   ```

---

**Last Updated:** 2025-12-17
**Status:** ✅ Backend Running on Port 3001

