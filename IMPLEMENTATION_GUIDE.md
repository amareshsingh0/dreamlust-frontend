# Implementation Guide - Content Versioning & Advanced Features

## Quick Start

### Step 1: Database Setup
```bash
cd backend
npx prisma generate
npx prisma db push
```

### Step 2: Install Required Dependencies
```bash
# Backend dependencies
npm install fluent-ffmpeg @types/fluent-ffmpeg
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install ioredis @types/ioredis

# Optional: For video processing
# Install FFmpeg on your system:
# Windows: choco install ffmpeg
# Mac: brew install ffmpeg
# Linux: apt-get install ffmpeg
```

### Step 3: Configure Environment Variables
Add to `backend/.env`:
```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cloudflare Workers (Optional)
API_ORIGIN_US=https://us-api.dreamlust.com
API_ORIGIN_EU=https://eu-api.dreamlust.com
API_ORIGIN_ASIA=https://asia-api.dreamlust.com
```

### Step 4: Register Routes in Server
Add to `backend/src/server.ts`:

```typescript
// Import new routes
import contentVersionsRouter from './routes/content-versions.js';
import contentExperimentsRouter from './routes/content-experiments.js';
import contentReviewsRouter from './routes/content-reviews.js';

// Register routes (add after existing routes)
app.use('/api/content', contentVersionsRouter);
app.use('/api/content', contentExperimentsRouter);
app.use('/api/content', contentReviewsRouter);
```

### Step 5: Initialize Cache on Server Startup
Add to `backend/src/server.ts`:

```typescript
import { warmupCache } from './lib/cache-manager.js';

// After server starts
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Warm up cache with popular content
  await warmupCache();
});
```

## Feature Usage

### 1. Content Versioning

#### Creating a New Version
```typescript
// Frontend usage
import axios from 'axios';

const createVersion = async (contentId: string) => {
  const response = await axios.post(`/api/content/${contentId}/versions`, {
    videoUrl: 'https://cdn.example.com/video-v2.mp4',
    thumbnailUrl: 'https://cdn.example.com/thumb-v2.jpg',
    title: 'Updated Video Title',
    description: 'Improved version with better audio',
    changes: 'Enhanced audio quality, added intro sequence'
  });
  
  return response.data;
};
```

#### Publishing a Version
```typescript
const publishVersion = async (contentId: string, versionId: string) => {
  const response = await axios.post(
    `/api/content/${contentId}/versions/${versionId}/publish`
  );
  
  return response.data;
};
```

#### Using the UI Component
```tsx
import { ContentVersioning } from '@/components/content/ContentVersioning';

function ContentManagementPage() {
  return (
    <div>
      <h1>Manage Content Versions</h1>
      <ContentVersioning contentId="your-content-id" />
    </div>
  );
}
```

### 2. A/B Testing

#### Starting an Experiment
```typescript
const startExperiment = async (contentId: string) => {
  const response = await axios.post(`/api/content/${contentId}/experiments`, {
    variants: [
      { versionId: 'version-1-id', weight: 50 },
      { versionId: 'version-2-id', weight: 50 }
    ]
  });
  
  return response.data;
};
```

#### Tracking Metrics
```typescript
// Track a view
await axios.post(
  `/api/content/${contentId}/experiments/${experimentId}/track`,
  {
    versionId: 'version-1-id',
    eventType: 'view',
    value: 1
  }
);

// Track watch time
await axios.post(
  `/api/content/${contentId}/experiments/${experimentId}/track`,
  {
    versionId: 'version-1-id',
    eventType: 'watchTime',
    value: 120 // seconds
  }
);
```

#### Completing an Experiment
```typescript
const completeExperiment = async (contentId: string, experimentId: string, winnerId: string) => {
  const response = await axios.post(
    `/api/content/${contentId}/experiments/${experimentId}/complete`,
    { winnerVersionId: winnerId }
  );
  
  return response.data;
};
```

### 3. Collaborative Review

#### Creating a Review Session
```typescript
const createReview = async (contentId: string) => {
  const response = await axios.post(`/api/content/${contentId}/reviews`, {
    overallFeedback: ''
  });
  
  return response.data;
};
```

#### Adding Timestamped Comments
```typescript
const addComment = async (contentId: string, reviewId: string) => {
  const response = await axios.post(
    `/api/content/${contentId}/reviews/${reviewId}/comments`,
    {
      timestamp: 45, // seconds
      comment: 'Audio levels are too low here',
      type: 'issue' // 'note', 'issue', or 'suggestion'
    }
  );
  
  return response.data;
};
```

#### Submitting a Review
```typescript
const submitReview = async (contentId: string, reviewId: string) => {
  const response = await axios.post(
    `/api/content/${contentId}/reviews/${reviewId}/submit`,
    {
      status: 'approved', // 'approved', 'changes_requested', or 'rejected'
      overallFeedback: 'Great content! Ready to publish.'
    }
  );
  
  return response.data;
};
```

#### Using the Review Interface
```tsx
import { ContentReviewInterface } from '@/components/content/ContentReviewInterface';

function ReviewPage() {
  return (
    <div>
      <h1>Review Content</h1>
      <ContentReviewInterface 
        contentId="your-content-id"
        videoUrl="https://cdn.example.com/video.mp4"
      />
    </div>
  );
}
```

### 4. Video Preprocessing

#### Processing Uploaded Video
```typescript
import { processUploadedVideo } from './lib/video-preprocessing';

// After video upload
const handleVideoUpload = async (fileUrl: string, contentId: string) => {
  // Start background processing
  processUploadedVideo(fileUrl, contentId)
    .then(() => {
      console.log('Video processing complete');
    })
    .catch((error) => {
      console.error('Video processing failed:', error);
    });
};
```

#### Individual Processing Functions
```typescript
import {
  analyzeVideoMetadata,
  generateThumbnails,
  generatePreview,
  transcodeVideo
} from './lib/video-preprocessing';

// Analyze metadata
const metadata = await analyzeVideoMetadata(videoUrl);
console.log(`Duration: ${metadata.duration}s, Resolution: ${metadata.resolution}`);

// Generate thumbnails
const thumbnails = await generateThumbnails(videoUrl, {
  count: 4,
  timestamps: [0, 0.25, 0.5, 0.75]
});

// Generate preview clip
const previewUrl = await generatePreview(videoUrl, { duration: 30 });

// Transcode to multiple qualities
const streamUrls = await transcodeVideo(videoUrl, {
  formats: [
    { name: '1080p', width: 1920, height: 1080, bitrate: '5M' },
    { name: '720p', width: 1280, height: 720, bitrate: '2.5M' },
    { name: '480p', width: 854, height: 480, bitrate: '1M' }
  ],
  outputFormat: 'HLS'
});
```

### 5. Smart Caching

#### Using the Cache Manager
```typescript
import { cache, getCachedContent, invalidateContentCache } from './lib/cache-manager';

// Get cached content
const content = await getCachedContent(contentId);

// Set custom cache
await cache.set('custom-key', { data: 'value' }, {
  ttl: 3600, // 1 hour
  tags: ['custom', 'data']
});

// Get custom cache
const data = await cache.get('custom-key');

// Invalidate by tags
await cache.invalidate(['custom', 'data']);

// Invalidate content cache
await invalidateContentCache(contentId, creatorId);
```

#### Cache Strategies by Data Type
```typescript
// Content (30 min TTL)
await cache.set(`content:${id}`, content, {
  ttl: 1800,
  tags: [`content:${id}`, `creator:${creatorId}`]
});

// Creator (60 min TTL)
await cache.set(`creator:${id}`, creator, {
  ttl: 3600,
  tags: [`creator:${id}`]
});

// Search results (10 min TTL)
await cache.set(`search:${query}`, results, {
  ttl: 600,
  tags: ['search']
});
```

### 6. Edge Computing

#### Deploying to Cloudflare Workers
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
cd backend/src/workers
wrangler publish edge-worker.ts
```

#### Configuring Worker
Create `wrangler.toml`:
```toml
name = "dreamlust-edge"
main = "src/workers/edge-worker.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { 
  API_ORIGIN_US = "https://us-api.dreamlust.com",
  API_ORIGIN_EU = "https://eu-api.dreamlust.com",
  API_ORIGIN_ASIA = "https://asia-api.dreamlust.com"
}
```

## Testing

### Testing Content Versions
```bash
# Create version
curl -X POST http://localhost:3000/api/content/{contentId}/versions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://cdn.example.com/video.mp4",
    "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
    "title": "Test Version",
    "changes": "Initial version"
  }'

# List versions
curl http://localhost:3000/api/content/{contentId}/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Testing A/B Experiments
```bash
# Start experiment
curl -X POST http://localhost:3000/api/content/{contentId}/experiments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "variants": [
      {"versionId": "v1", "weight": 50},
      {"versionId": "v2", "weight": 50}
    ]
  }'

# Track metrics
curl -X POST http://localhost:3000/api/content/{contentId}/experiments/{expId}/track \
  -H "Content-Type: application/json" \
  -d '{
    "versionId": "v1",
    "eventType": "view",
    "value": 1
  }'
```

### Testing Review System
```bash
# Create review
curl -X POST http://localhost:3000/api/content/{contentId}/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"overallFeedback": ""}'

# Add comment
curl -X POST http://localhost:3000/api/content/{contentId}/reviews/{reviewId}/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": 45,
    "comment": "Great scene!",
    "type": "note"
  }'
```

## Troubleshooting

### Video Processing Issues
- **FFmpeg not found**: Install FFmpeg on your system
- **S3 upload fails**: Check AWS credentials and bucket permissions
- **Processing timeout**: Increase timeout for large files

### Cache Issues
- **Redis connection failed**: Verify Redis is running (`redis-cli ping`)
- **Memory cache full**: Increase `maxMemCacheSize` in CacheManager
- **Stale data**: Check TTL values and invalidation logic

### Edge Worker Issues
- **Deployment fails**: Check Wrangler authentication
- **Wrong origin**: Verify environment variables
- **Cache not working**: Check Cache-Control headers

## Performance Optimization

### Database Indexes
All necessary indexes are included in Prisma schema:
- `contentId` + `version` for version lookups
- `contentId` + `status` for experiment queries
- `reviewId` + `timestamp` for comment retrieval

### Caching Strategy
- Popular content cached on startup
- Search results cached for 10 minutes
- Tag-based invalidation for related data

### Video Processing
- Use background jobs for large files
- Consider CDN for video delivery
- Implement progressive upload for better UX

## Security Considerations

### Authentication
- All routes require authentication via `authenticateToken` middleware
- Only content owners can create versions and experiments
- Reviewers must be authorized team members

### Data Validation
- Validate video URLs before processing
- Sanitize user input in comments
- Check file sizes and formats

### Rate Limiting
Consider adding rate limits:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/content', limiter);
```

## Monitoring

### Metrics to Track
- Version creation rate
- Experiment completion rate
- Review turnaround time
- Cache hit/miss ratio
- Video processing success rate

### Logging
Add structured logging:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Next Steps

1. **Test all endpoints** with Postman or Thunder Client
2. **Run database migrations** in production
3. **Configure monitoring** and alerts
4. **Set up background jobs** for video processing
5. **Deploy edge workers** for global performance
6. **Train team** on new features

## Support Resources

- Prisma Documentation: https://www.prisma.io/docs
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- Redis Documentation: https://redis.io/documentation
- Cloudflare Workers: https://developers.cloudflare.com/workers
