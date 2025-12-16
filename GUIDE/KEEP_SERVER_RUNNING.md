# How to Keep Backend Server Running

## The Problem

The backend server keeps stopping, causing the frontend to show connection errors.

## Solutions

### Option 1: Use the Monitor Script (Recommended)

This script automatically restarts the server if it stops:

```powershell
cd backend
bun run start:monitor
```

Or directly:
```powershell
cd backend
.\keep-server-running.ps1
```

**What it does:**
- Starts the server
- Checks every 10 seconds if it's still running
- Automatically restarts if it stops
- Shows status messages

**To stop:** Press `Ctrl+C`

### Option 2: Use PM2 (Process Manager)

Install PM2 globally:
```powershell
npm install -g pm2
```

Start server with PM2:
```powershell
cd backend
pm2 start "bun run dev" --name dreamlust-backend
pm2 save
pm2 startup
```

**PM2 Commands:**
- `pm2 list` - See running processes
- `pm2 logs dreamlust-backend` - View logs
- `pm2 restart dreamlust-backend` - Restart
- `pm2 stop dreamlust-backend` - Stop
- `pm2 delete dreamlust-backend` - Remove

### Option 3: Keep Terminal Open

Simply run:
```powershell
cd backend
bun run dev
```

And **keep that terminal window open**. The server will run as long as the terminal is open.

### Option 4: Run in Background (Windows)

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\desktop\dreamlust-project\backend; bun run dev"
```

This opens a new terminal window that stays open.

## Why Does the Server Stop?

Common reasons:
1. **Prisma errors** - Field name mismatches (we fixed these)
2. **Database connection issues** - Check your `.env` file
3. **Port conflicts** - Another process using port 3001
4. **Code errors** - Syntax errors or runtime exceptions
5. **Manual stop** - You closed the terminal or pressed Ctrl+C

## Quick Fixes

### If Server Keeps Crashing:

1. **Check the terminal output** for error messages
2. **Verify environment variables** in `.env`
3. **Check database connection** - Is PostgreSQL running?
4. **Regenerate Prisma client:**
   ```powershell
   cd backend
   bunx prisma generate
   ```

### If Port is in Use:

```powershell
cd backend
.\start-server.ps1 -Force
```

## Recommended Setup

For development, use the monitor script:
```powershell
cd backend
bun run start:monitor
```

This ensures the server stays running even if it crashes.

## Production

For production, use PM2 or a proper process manager like systemd (Linux) or a Windows service.
