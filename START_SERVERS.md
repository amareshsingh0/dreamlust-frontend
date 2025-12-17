# Starting Frontend and Backend Servers

## Quick Start

### Backend (Port 3001)
```bash
cd backend
bun run dev
```

### Frontend (Port 4001)
```bash
cd frontend
bun run dev
```

## Troubleshooting

### Backend won't start

1. **Check environment variables:**
   ```bash
   cd backend
   bun run check-startup.js
   ```

2. **Required environment variables:**
   - `DATABASE_URL` - PostgreSQL connection string (required)
   - `JWT_SECRET` - Must be at least 32 characters (required)
   - `PORT` - Server port (default: 3001)

3. **Port already in use:**
   - Change `PORT` in `.env` file
   - Or kill the process using port 3001:
     ```powershell
     # Find process using port 3001
     netstat -ano | findstr ":3001"
     # Kill process (replace PID with actual process ID)
     taskkill /PID <PID> /F
     ```

### Frontend won't start

1. **Check configuration:**
   ```bash
   cd frontend
   bun run check-startup.js
   ```

2. **Port already in use:**
   - Change port in `vite.config.ts` (line 45):
     ```typescript
     server: {
       host: "::",
       port: 4001, // Change this to another port
     },
     ```
   - Or kill the process using port 4001:
     ```powershell
     # Find process using port 4001
     netstat -ano | findstr ":4001"
     # Kill process (replace PID with actual process ID)
     taskkill /PID <PID> /F
     ```

3. **Missing dependencies:**
   ```bash
   cd frontend
   bun install
   ```

## Common Issues Fixed

✅ **ES Module compatibility** - Fixed `require()` calls in `server.ts` to use ES module imports
✅ **Sentry initialization** - Properly configured for ES modules
✅ **Datadog APM** - Fixed to use dynamic imports for ES modules
✅ **Port conflicts** - Added diagnostic scripts to check port availability

## Access URLs

- **Frontend:** http://localhost:4001
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/api/health


