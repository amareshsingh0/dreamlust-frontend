# 🚀 Quick Start Server Guide

## ✅ Current Status

**Server is RUNNING at:** `http://localhost:3001`

Health Check: ✅ Healthy
Status: 200 OK

## 🔄 Keep Server Running (IMPORTANT)

To prevent the connection errors from happening again, use the monitor script:

```powershell
cd backend
.\keep-server-running.ps1
```

Or:

```powershell
cd backend
bun run start:monitor
```

**Leave this terminal open** - it will automatically restart the server if it stops.

## 🛠️ Manual Start (If Needed)

If the server stops, restart it:

```powershell
cd C:\desktop\dreamlust-project\backend
.\start-server.ps1
```

## 🔍 Verify Server is Running

```powershell
# Should return Status 200
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

## 🌐 Test in Browser

1. **Hard refresh** your browser: `Ctrl+Shift+R`
2. Go to: `http://localhost:4000/auth`
3. The "Backend connection issue" warning should be gone
4. Try signing in

## ⚠️ If Server Stops Again

1. Check if port is in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 3001
   ```

2. Kill the process if needed:
   ```powershell
   $pid = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess
   Stop-Process -Id $pid -Force
   ```

3. Restart:
   ```powershell
   cd backend
   .\start-server.ps1
   ```

## 📝 Common Issues Fixed

- ✅ Prisma field names (displayName → display_name, etc.)
- ✅ Server startup errors
- ✅ Port conflicts
- ✅ Health check endpoint

## 💡 Pro Tip

**Always use the monitor script** to keep the server running:
```powershell
cd backend
.\keep-server-running.ps1
```

This prevents the "Failed to fetch" errors you were seeing!
