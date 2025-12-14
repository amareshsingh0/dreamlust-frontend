# CDN & Asset Delivery + Background Jobs

This document describes the CDN/asset delivery and background job systems implemented for the Dreamlust platform.

## CDN & Asset Delivery

### Compression Middleware

The Express server now includes compression middleware (gzip/brotli) for all text responses:

- **Location**: `src/server.ts`
- **Configuration**: 
  - Compression level: 6 (1-9 scale)
  - Threshold: 1KB (only compresses responses > 1KB)
  - Automatically detects and compresses text responses

### Storage Services

#### S3/R2 Storage (`src/lib/storage/s3Storage.ts`)

Handles file uploads to S3-compatible storage (AWS S3, Cloudflare R2, etc.)

**Features:**
- Upload images, thumbnails, and other static assets
- Automatic CDN URL generation
- Presigned URLs for temporary access
- File existence checking
- File deletion

**Environment Variables:**
```env
# S3 Configuration
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
S3_REGION=us-east-1
S3_CDN_URL=https://cdn.example.com

# OR Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Usage:**
```typescript
import { s3Storage } from './lib/storage/s3Storage';

// Upload image
const result = await s3Storage.uploadImage(buffer, 'image.jpg', 'thumbnails');
// Returns: { url, key, cdnUrl }

// Upload video
const result = await s3Storage.uploadVideo(buffer, 'video.mp4', 'videos');

// Delete file
await s3Storage.deleteFile(key);
```

#### Video Storage (`src/lib/storage/videoStorage.ts`)

Handles video uploads to Cloudflare Stream or Mux (automatic CDN)

**Features:**
- Automatic transcoding to multiple qualities
- HLS streaming support
- Thumbnail generation
- Status tracking

**Environment Variables:**
```env
# Cloudflare Stream
CLOUDFLARE_STREAM_API_TOKEN=your_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# OR Mux
MUX_TOKEN_ID=your_token_id
MUX_TOKEN_SECRET=your_token_secret
MUX_SIGNING_KEY=your_signing_key
MUX_SIGNING_KEY_ID=your_signing_key_id
```

**Usage:**
```typescript
import { videoStorage } from './lib/storage/videoStorage';

// Upload video
const result = await videoStorage.uploadVideo(buffer, {
  title: 'My Video',
  description: 'Video description',
});
// Returns: { videoId, playbackId, url, thumbnailUrl, duration, status }
```

## Background Jobs

### Queue System (BullMQ)

All background jobs use BullMQ with Redis as the message broker.

**Queues:**
1. **video-processing** - Video transcoding
2. **thumbnail-generation** - Thumbnail generation
3. **notifications** - Email and in-app notifications
4. **trending-scores** - Trending content calculation
5. **recommendations** - Personalized recommendations
6. **cleanup** - Cleanup old temp files

### Workers

#### Video Processing Worker (`src/lib/queues/workers/videoProcessingWorker.ts`)

- Transcodes videos to multiple qualities (720p, 1080p, 4K)
- Uploads to Cloudflare Stream/Mux
- Updates content status
- Concurrency: 2 videos at a time

**Queue Job:**
```typescript
import { queueVideoTranscoding } from './lib/queues/queueManager';

await queueVideoTranscoding({
  contentId: 'content-id',
  videoUrl: 'https://...',
  qualities: ['720p', '1080p', '4K'],
});
```

#### Thumbnail Generation Worker (`src/lib/queues/workers/thumbnailWorker.ts`)

- Generates thumbnails from videos or processes image thumbnails
- Uploads to S3/R2
- Generates blur placeholders
- Concurrency: 5 thumbnails at a time

**Queue Job:**
```typescript
import { queueThumbnailGeneration } from './lib/queues/queueManager';

await queueThumbnailGeneration({
  contentId: 'content-id',
  videoUrl: 'https://...',
  timestamp: 0, // Frame time in seconds
});
```

#### Notification Worker (`src/lib/queues/workers/notificationWorker.ts`)

- Sends in-app notifications
- Sends email notifications (if enabled)
- Concurrency: 10 notifications at a time

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@dreamlust.com
```

**Queue Job:**
```typescript
import { queueNotification } from './lib/queues/queueManager';

await queueNotification({
  userId: 'user-id',
  type: 'NEW_SUBSCRIBER',
  title: 'New Subscriber',
  message: 'You have a new subscriber!',
  link: '/subscribers',
});
```

#### Trending Scores Worker (`src/lib/queues/workers/trendingWorker.ts`)

- Calculates trending scores based on views, engagement, and recency
- Runs every 6 hours automatically
- Updates homepage cache

**Queue Job:**
```typescript
import { queueTrendingCalculation } from './lib/queues/queueManager';

await queueTrendingCalculation({ period: 'today' });
```

#### Recommendations Worker (`src/lib/queues/workers/recommendationsWorker.ts`)

- Generates personalized content recommendations
- Based on viewing history, categories, and tags
- Concurrency: 3 recommendations at a time

**Queue Job:**
```typescript
import { queueRecommendationsGeneration } from './lib/queues/queueManager';

await queueRecommendationsGeneration({
  userId: 'user-id',
  limit: 20,
});
```

#### Cleanup Worker (`src/lib/queues/workers/cleanupWorker.ts`)

- Cleans up old draft content
- Removes old soft-deleted content (after 30 days)
- Runs daily at 2 AM automatically

**Queue Job:**
```typescript
import { queueCleanup } from './lib/queues/queueManager';

await queueCleanup({ olderThanDays: 7 });
```

## Running Workers

### Start Workers Separately

```bash
# Start all workers
bun run workers

# Or in development (server + workers)
bun run dev:all
```

### Worker Process

Workers run as separate processes and can be scaled independently:

```bash
# Production: Use PM2 or similar
pm2 start src/workers.ts --name "dreamlust-workers"
```

## Integration with Upload Route

The upload route (`src/routes/upload.ts`) now:

1. **Uploads files to storage:**
   - Videos → Cloudflare Stream/Mux
   - Images/Thumbnails → S3/R2

2. **Queues background jobs:**
   - Video transcoding (for videos)
   - Thumbnail generation (if not provided)
   - Notification to creator

3. **Returns CDN URLs:**
   - All assets are served via CDN
   - Automatic compression for text responses

## Monitoring

### Queue Status

```typescript
import { getQueueStatus } from './lib/queues/queueManager';

const status = await getQueueStatus('video-processing');
// Returns: { waiting, active, completed, failed, delayed }
```

### Job Retry

All jobs have automatic retry with exponential backoff:
- Attempts: 3
- Backoff: Exponential (2s, 4s, 8s)

### Job Cleanup

- Completed jobs: Kept for 24 hours (last 1000)
- Failed jobs: Kept for 7 days

## Next Steps

1. **Configure Storage:**
   - Set up S3/R2 credentials
   - Set up Cloudflare Stream or Mux
   - Configure CDN URLs

2. **Configure SMTP:**
   - Set up email service (SendGrid, AWS SES, etc.)
   - Configure SMTP credentials

3. **Start Workers:**
   - Run `bun run workers` in production
   - Or use PM2/systemd for process management

4. **Monitor:**
   - Set up monitoring for queue health
   - Monitor job failures
   - Track processing times
