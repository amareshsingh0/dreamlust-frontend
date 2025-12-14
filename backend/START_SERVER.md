# How to Start the Backend Server

## Quick Start

### Option 1: Use the Fix Port Script (Recommended)
```powershell
cd backend
.\fix-port.ps1
```
This script will automatically:
- Check if port 3001 is in use
- Kill any non-responsive processes on that port
- Start the server

### Option 2: Manual Start
```powershell
cd backend
bun run dev
```

### If Port 3001 is Already in Use

**Find and kill the process:**
```powershell
# Find what's using port 3001
Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess

# Kill the process (replace PID with the actual process ID)
Stop-Process -Id <PID> -Force
```

**Or use the fix-port script:**
```powershell
cd backend
.\fix-port.ps1
```

## If Server Keeps Stopping

The server might be crashing due to errors. Check the terminal output for error messages.

### Common Issues:

1. **Prisma Field Name Errors**
   - Error: "Unknown field `fieldName` for select statement"
   - Fix: Use snake_case field names (e.g., `display_name` not `displayName`)

2. **Database Connection Issues**
   - Error: "Can't reach database server"
   - Fix: Check your `.env` file has correct `DATABASE_URL`

3. **Port Already in Use**
   - Error: "Port 3001 is already in use"
   - Fix: Kill the process using port 3001 or change PORT in `.env`

## Keep Server Running

### Option 1: Run in Background (Windows PowerShell)
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; bun run dev"
```

### Option 2: Use a Process Manager
Install `pm2` or similar to keep the server running:
```powershell
npm install -g pm2
cd backend
pm2 start "bun run dev" --name dreamlust-backend
pm2 save
pm2 startup
```

### Option 3: Run with Auto-Restart
```powershell
cd backend
bun --watch run src/server.ts
```

## Check Server Status

```powershell
# Check if server is responding
Invoke-WebRequest -Uri "http://localhost:3001/health"

# Check if bun process is running
Get-Process -Name "bun" -ErrorAction SilentlyContinue
```

## Troubleshooting

If the server keeps stopping:

1. Check terminal logs for error messages
2. Verify all environment variables are set in `.env`
3. Ensure database is accessible
4. Check for Prisma schema mismatches
5. Verify all dependencies are installed: `bun install`
