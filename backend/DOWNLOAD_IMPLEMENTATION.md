# Download System Implementation Guide

## ✅ Completed Implementation

### Backend Components

1. **Download Queue** (`backend/src/lib/queues/downloadQueue.ts`)
   - BullMQ queue for managing download jobs
   - Integrated with Redis
   - Functions: `queueDownload()`, `getDownloadQueueStatus()`

2. **Download Worker** (`backend/src/lib/queues/workers/downloadWorker.ts`)
   - Background worker processes downloads
   - Supports local storage and S3/R2 cloud storage
   - Real-time progress tracking via Socket.io
   - Automatic error handling and retries

3. **Quality Resolver** (`backend/src/lib/download/qualityResolver.ts`)
   - Resolves direct download URLs based on quality selection
   - Supports multiple quality options (auto, 1080p, 720p, 480p, 360p)
   - Extensible for YouTube, Vimeo, etc. (requires additional libraries)

4. **Download Service** (`backend/src/lib/download/downloadService.ts`)
   - Business logic for downloads
   - Quality URL resolution
   - File size detection
   - Queue integration

5. **Socket.io Events** (`backend/src/lib/socket/emitDownloadEvents.ts`)
   - Real-time progress updates
   - Completion/failure notifications
   - User-specific room-based messaging

### Frontend Components

1. **Downloader Component** (`frontend/src/components/downloads/Downloader.tsx`)
   - Real-time updates via Socket.io
   - Polling fallback if Socket.io unavailable
   - Quality selection dialog
   - Progress tracking
   - Download management (cancel, delete, play)

2. **DownloadManager Component** (`frontend/src/components/downloads/DownloadManager.tsx`)
   - Updated with Socket.io integration
   - Real-time progress updates
   - Active/Completed tabs

## 🔧 Quality Selection Flow

```
User selects quality → Frontend sends quality → Backend resolves direct URL → Queue job with resolved URL → Worker downloads
```

### Quality Resolution Process

1. **Frontend**: User selects quality (auto, 1080p, 720p, etc.)
2. **Backend**: `resolveDirectUrl()` function:
   - Checks if URL is direct (ends with .mp4, .webm, etc.)
   - For YouTube/Vimeo: Would use ytdl-core or similar (not implemented yet)
   - Returns direct download URL for selected quality
3. **Queue**: Job created with resolved URL
4. **Worker**: Downloads from resolved URL

### Example Quality Resolution

```typescript
// In downloadService.ts
const directUrl = await resolveDirectUrl(content.mediaUrl, options.quality || 'auto');

// For direct URLs: returns as-is
// For YouTube: would use ytdl-core to get format URL
// For HLS: would select appropriate quality variant
```

## 📡 Real-time Updates

### Socket.io Events

**Backend emits:**
- `download:progress` - Progress updates (0-100)
- `download:completed` - Download finished
- `download:failed` - Download failed with error

**Frontend listens:**
- Automatically updates UI on progress
- Shows toast notifications
- Refreshes download list

### User Rooms

Users automatically join `user:{userId}` room on socket connection. Workers emit events to this room for real-time updates.

## 🚀 Usage

### Starting the System

**Terminal 1 - Server:**
```powershell
cd backend
bun run dev
```

**Terminal 2 - Workers:**
```powershell
cd backend
bun run workers
```

### Creating a Download

**Frontend:**
```typescript
import { Downloader } from '@/components/downloads/Downloader';

<Downloader contentId="content-uuid" />
```

**API:**
```typescript
await api.downloads.create({
  contentId: 'content-uuid',
  quality: '720p', // or 'auto', '1080p', '480p', '360p'
  expiresInDays: 30 // optional
});
```

## 🔌 Socket.io Integration

### Backend Setup

Socket.io instance is automatically set when server starts:
```typescript
// In socketServer.ts
setSocketInstance(io); // Makes io available to workers
```

### Frontend Setup

Socket.io client is already configured in `frontend/src/lib/socket.ts`:
```typescript
import { getSocket } from '@/lib/socket';
const socket = getSocket();
```

### Events

**Progress Update:**
```typescript
socket.on('download:progress', (data) => {
  // data: { downloadId, progress }
});
```

**Completion:**
```typescript
socket.on('download:completed', (data) => {
  // data: { downloadId }
});
```

**Failure:**
```typescript
socket.on('download:failed', (data) => {
  // data: { downloadId, error }
});
```

## 📦 Dependencies

### Backend (Already Installed)
- ✅ `bullmq` - Queue management
- ✅ `ioredis` - Redis client
- ✅ `axios` - HTTP requests
- ✅ `socket.io` - Real-time events
- ✅ `@aws-sdk/client-s3` - Cloud storage (optional)

### Frontend (Already Installed)
- ✅ `socket.io-client` - Real-time client
- ✅ `axios` - HTTP requests (or use fetch)

## 🔄 Polling Fallback

If Socket.io is unavailable, the frontend automatically falls back to polling:
- Polls every 3-5 seconds for active downloads
- Only polls when downloads are in progress
- Stops polling when all downloads complete

## 🎯 Quality Selection Implementation

### Current Implementation

1. **Direct URLs**: Returns as-is (no quality selection needed)
2. **Generic URLs**: Returns original URL (quality selection UI only)

### Future Enhancements

For YouTube/Vimeo support, add:

```bash
bun add ytdl-core  # For YouTube
```

Then in `qualityResolver.ts`:
```typescript
if (isYouTubeUrl(sourceUrl)) {
  const ytdl = require('ytdl-core');
  const info = await ytdl.getInfo(sourceUrl);
  const format = info.formats.find(f => f.height === targetHeight);
  return format.url;
}
```

## 📝 Notes

- Downloads work without Redis, but queue system requires Redis
- If Redis unavailable, downloads created but won't process
- Workers must run separately from server
- Storage can be local (`STORAGE_PATH`) or cloud (S3/R2)
- Quality resolution is extensible - add support for specific platforms as needed

