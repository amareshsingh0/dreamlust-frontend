# Quick Fix: Backend Connection Issues

## Problem
Frontend shows: "Cannot connect to backend server at http://localhost:3001"

## Solution

### Step 1: Check if server is running
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

### Step 2: If server is NOT running, start it
```powershell
cd backend
bun run dev
```

### Step 3: If you get "port in use" error
```powershell
cd backend
.\fix-port.ps1
```

### Step 4: Refresh your browser
- Press `Ctrl+Shift+R` (hard refresh)
- Or press `F5` to refresh
- The connection error should disappear

## Keep Server Running

**Option 1: Keep terminal open**
- Run `bun run dev` in a terminal
- Keep that terminal window open

**Option 2: Use the helper script**
```powershell
cd backend
.\fix-port.ps1
```

**Option 3: Run in background (Windows)**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\desktop\dreamlust-project\backend; bun run dev"
```

## Verify Server is Working

```powershell
# Should return Status 200
Invoke-WebRequest -Uri "http://localhost:3001/health"
```

## Common Issues

1. **Port 3001 in use**: Use `.\fix-port.ps1` to free it
2. **Server keeps stopping**: Check terminal for error messages
3. **Browser cache**: Do a hard refresh (Ctrl+Shift+R)
4. **CORS errors**: Server should allow `localhost:4000` automatically
