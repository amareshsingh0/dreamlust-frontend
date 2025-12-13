# Backend Server Troubleshooting Guide

## Quick Diagnostics

### 1. Check if Backend is Running on Port 3001

```powershell
# Show processes listening on port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Format-Table

# Alternative using netstat
netstat -ano | Select-String ":3001"
```

**Expected Output:** Should show a process listening on port 3001.

**If no output:** Server is not running. Start it with:
```powershell
cd backend
bun run dev
```

### 2. Test Backend Endpoint Manually

```powershell
# Test health endpoint (no auth required)
curl.exe "http://localhost:3001/health" -v

# Test recommendations endpoint (auth required)
curl.exe "http://localhost:3001/api/recommendations/for-you?limit=1" -v
```

**Expected:** 
- Health endpoint: `{"success":true,"message":"API is healthy",...}`
- Recommendations: Either JSON response or 401 Unauthorized (both mean server is running)

**If connection refused:** Server is not listening on port 3001.

### 3. Check Server Logs

When starting the server, you should see:
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔗 Frontend URL: http://localhost:4000
```

**If you see errors:**
- **Port in use:** Kill the process using port 3001:
  ```powershell
  Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
  ```
- **Database connection error:** Check `DATABASE_URL` in `.env`
- **Missing environment variables:** Ensure `.env` has all required variables

### 4. Verify Configuration

**Backend Port:** Check `backend/src/config/env.ts` or `.env` file:
```env
PORT=3001
```

**Frontend API URL:** Check `frontend/src/lib/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**If using Vite proxy:** Check `frontend/vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### 5. Common Issues & Solutions

#### Issue: Port 3001 Already in Use
```powershell
# Find and kill process
$pid = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess
Stop-Process -Id $pid -Force
```

#### Issue: Server Crashes on Start
**Check:**
1. Environment variables in `.env`:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT`
2. Database connection (Prisma)
3. TypeScript compilation errors

#### Issue: Connection Refused from Frontend
**Check:**
1. Backend is actually running (step 1)
2. Port matches in frontend config (step 4)
3. CORS is configured in `backend/src/server.ts`:
   ```typescript
   app.use(cors({
     origin: env.FRONTEND_URL,
     credentials: true,
   }));
   ```

#### Issue: 404 Not Found (not connection refused)
- Check route registration in `backend/src/server.ts`
- Verify endpoint path matches frontend call
- Check route file exports default router

### 6. Quick Test Server

If main server won't start, test with minimal server:

```javascript
// backend/test-server.js
const express = require('express');
const app = express();
app.get('/ping', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('Test server on 3001'));
```

Run:
```powershell
cd backend
node test-server.js
# In another terminal:
curl.exe http://localhost:3001/ping
```

If this works, your machine can accept connections. The issue is in your main server code.

### 7. Firewall Check (Rare)

If server is running but still refused:

```powershell
# Check firewall state
Get-NetFirewallProfile | Format-Table Name,Enabled

# Temporarily disable for testing (admin required)
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

**⚠️ Re-enable firewall after testing!**

### 8. Server Binding

Check `backend/src/server.ts`:
```typescript
app.listen(PORT, () => {
  // Should bind to 0.0.0.0 or 127.0.0.1
});
```

For local development, `0.0.0.0` or default (all interfaces) is fine.

## Quick Checklist

Run these commands in order:

```powershell
# 1. Check port
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

# 2. Start backend
cd C:\desktop\dreamlust-project\backend
bun run dev

# 3. Test endpoint
Start-Sleep -Seconds 3
curl.exe "http://localhost:3001/health"

# 4. Check frontend API config
# Open frontend/src/lib/api.ts and verify API_BASE_URL
```

## Getting Help

If still stuck, provide:
1. Backend startup logs (full terminal output from `bun run dev`)
2. Output of `Get-NetTCPConnection -LocalPort 3001`
3. Contents of `backend/.env` (redact secrets)
4. Frontend API base URL from `frontend/src/lib/api.ts`

