# Download System Setup Guide

## ✅ Quick Start

### 1. Start Redis (Required for Queue System)

Redis container is already running. If you need to restart it:

```powershell
# Check if Redis is running
docker ps --filter "name=redis"

# If not running, start it
docker start redis

# If container doesn't exist, create it
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Configure Environment Variables

Make sure your `backend/.env` file has:

```env
# Redis (Required for download queue)
REDIS_URL=redis://localhost:6379

# Storage Path (for local downloads)
STORAGE_PATH=./storage/downloads

# Optional - Cloud Storage (S3/R2)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-cdn-url.com
```

### 3. Run the Application

**Option A: Run Server and Workers Separately (Recommended for Development)**

Terminal 1 - Server:
```powershell
cd backend
bun run dev
```

Terminal 2 - Workers:
```powershell
cd backend
bun run workers
```

**Option B: Run Both Together**
```powershell
cd backend
bun run dev:all
```

## 📋 Available Scripts

- `bun run dev` - Start server only
- `bun run workers` - Start workers only (⚠️ Note: plural "workers", not "worker")
- `bun run dev:all` - Start both server and workers
- `bun run dev:server` - Start server only
- `bun run dev:workers` - Start workers only

## 🔍 Troubleshooting

### Redis Connection Issues

If you see "Redis connection failed after 3 attempts":

1. **Check Redis is running:**
   ```powershell
   docker ps --filter "name=redis"
   Test-NetConnection -ComputerName localhost -Port 6379
   ```

2. **Check REDIS_URL in .env:**
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. **Restart Redis container:**
   ```powershell
   docker restart redis
   ```

### Download Queue Not Working

1. **Verify Redis connection:**
   - Check server logs for "✅ Redis connected"
   - If not connected, workers won't process downloads

2. **Check workers are running:**
   - Workers must be running in a separate terminal
   - Look for "✅ Download worker initialized" in logs

3. **Verify storage directory exists:**
   ```powershell
   Test-Path backend\storage\downloads
   ```

## 🎯 How It Works

1. User requests download → `POST /api/downloads`
2. Download record created in database
3. Job queued in BullMQ (requires Redis)
4. Worker picks up job from queue
5. File downloaded from `mediaUrl`
6. Stored locally (`STORAGE_PATH`) or uploaded to S3/R2
7. Database updated with file path and status
8. Progress tracked throughout

## 📁 File Structure

```
backend/
├── src/
│   ├── lib/
│   │   ├── queues/
│   │   │   ├── downloadQueue.ts      # Queue management
│   │   │   └── workers/
│   │   │       └── downloadWorker.ts # Background worker
│   │   └── download/
│   │       └── downloadService.ts    # Business logic
│   └── routes/
│       └── downloads.ts               # API routes
└── storage/
    └── downloads/                     # Local file storage
```

## 🚀 Testing

1. **Start server:**
   ```powershell
   cd backend
   bun run dev
   ```

2. **Start workers (new terminal):**
   ```powershell
   cd backend
   bun run workers
   ```

3. **Test download endpoint:**
   ```powershell
   # Create a download
   curl -X POST http://localhost:3001/api/downloads \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"contentId": "content-uuid", "quality": "720p"}'
   ```

4. **Check download status:**
   ```powershell
   curl http://localhost:3001/api/downloads \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## 📝 Notes

- Downloads work without Redis, but queue system requires Redis
- If Redis is unavailable, downloads will be created but won't process
- Workers must be running separately from the server
- Storage can be local (`STORAGE_PATH`) or cloud (S3/R2)

