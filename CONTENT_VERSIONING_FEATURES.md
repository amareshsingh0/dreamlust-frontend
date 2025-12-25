# Content Versioning & A/B Testing Features

## Overview
This document describes the newly implemented content versioning, A/B testing, collaborative review, and platform optimization features.

## Features Implemented

### 1. Content Versioning
Track and manage multiple versions of content with full history.

#### Database Models
- **ContentVersion**: Stores different versions of content
  - `id`: Unique identifier
  - `contentId`: Reference to parent content
  - `version`: Version number
  - `videoUrl`: URL to video file
  - `thumbnailUrl`: URL to thumbnail
  - `title`: Version title
  - `description`: Version description
  - `changes`: Summary of changes
  - `isPublished`: Publication status
  - `publishedAt`: Publication timestamp
  - `createdAt`: Creation timestamp

#### API Endpoints
- `POST /api/content/:contentId/versions` - Create new version
- `GET /api/content/:contentId/versions` - List all versions
- `GET /api/content/:contentId/versions/:versionId` - Get specific version
- `POST /api/content/:contentId/versions/:versionId/publish` - Publish version
- `DELETE /api/content/:contentId/versions/:versionId` - Delete version

#### Frontend Component
- `ContentVersioning.tsx` - UI for managing versions
  - Version history timeline
  - Preview functionality
  - Publish controls
  - A/B test initiation

### 2. A/B Testing (Content Experiments)
Run experiments to test different content versions and determine winners.

#### Database Models
- **ContentExperiment**: Manages A/B tests
  - `id`: Unique identifier
  - `contentId`: Reference to content
  - `variants`: JSON array of test variants with metrics
  - `status`: running, paused, completed
  - `startDate`: Experiment start date
  - `endDate`: Experiment end date
  - `winnerVersionId`: ID of winning version

#### API Endpoints
- `POST /api/content/:contentId/experiments` - Create experiment
- `GET /api/content/:contentId/experiments` - List experiments
- `GET /api/content/:contentId/experiments/:experimentId` - Get experiment
- `POST /api/content/:contentId/experiments/:experimentId/track` - Track metrics
- `POST /api/content/:contentId/experiments/:experimentId/complete` - Complete experiment
- `PATCH /api/content/:contentId/experiments/:experimentId/pause` - Pause experiment
- `PATCH /api/content/:contentId/experiments/:experimentId/resume` - Resume experiment

#### Metrics Tracked
- Views
- Click-through rate (CTR)
- Average watch time
- Completion rate

### 3. Collaborative Review System
Enable team members to review content with timestamped comments.

#### Database Models
- **ContentReview**: Review session
  - `id`: Unique identifier
  - `contentId`: Reference to content
  - `reviewerId`: User performing review
  - `status`: pending, approved, changes_requested, rejected
  - `overallFeedback`: Summary feedback
  - `createdAt`: Creation timestamp
  - `resolvedAt`: Resolution timestamp

- **ContentReviewComment**: Individual comments
  - `id`: Unique identifier
  - `reviewId`: Reference to review
  - `timestamp`: Video timestamp (seconds)
  - `comment`: Comment text
  - `type`: note, issue, suggestion
  - `resolved`: Resolution status
  - `createdAt`: Creation timestamp

#### API Endpoints
- `POST /api/content/:contentId/reviews` - Create review
- `GET /api/content/:contentId/reviews` - List reviews
- `GET /api/content/:contentId/reviews/:reviewId` - Get review
- `POST /api/content/:contentId/reviews/:reviewId/comments` - Add comment
- `PATCH /api/content/:contentId/reviews/:reviewId/comments/:commentId` - Update comment
- `DELETE /api/content/:contentId/reviews/:reviewId/comments/:commentId` - Delete comment
- `POST /api/content/:contentId/reviews/:reviewId/submit` - Submit review
- `GET /api/content/:contentId/reviews/:reviewId/comments/at/:timestamp` - Get comments at timestamp

#### Frontend Component
- `ContentReviewInterface.tsx` - Review UI
  - Video player with timeline markers
  - Comment panel with filtering
  - Timestamped feedback
  - Review submission workflow

### 4. Video Preprocessing Service
Automated video processing pipeline for uploaded content.

#### Features
- **Metadata Extraction**: Duration, resolution, FPS, codec, file size
- **Thumbnail Generation**: Multiple thumbnails at different timestamps
- **Preview Generation**: 30-second preview clips
- **Sprite Sheet Generation**: Hover preview thumbnails
- **Transcoding**: Multiple quality levels (4K, 1080p, 720p, 480p, 360p)
- **Auto-Subtitles**: Speech-to-text integration (placeholder)
- **Content Analysis**: Object detection and scene analysis (placeholder)
- **Quality Check**: Automated quality validation

#### Service Functions
```typescript
analyzeVideoMetadata(fileUrl: string): Promise<VideoMetadata>
generateThumbnails(fileUrl: string, options: ThumbnailOptions): Promise<string[]>
generatePreview(fileUrl: string, options: { duration: number }): Promise<string>
generateSpriteSheet(fileUrl: string, options: SpriteOptions): Promise<SpriteData>
transcodeVideo(fileUrl: string, options: TranscodeOptions): Promise<StreamUrls>
processUploadedVideo(fileUrl: string, contentId: string): Promise<void>
```

### 5. Smart Caching Strategy
Multi-layer caching system for optimal performance.

#### Architecture
- **L1 Cache**: In-memory cache (Map) - Instant access
- **L2 Cache**: Redis cache - Fast distributed access
- **Cache Tags**: Tag-based invalidation for related data

#### CacheManager API
```typescript
get(key: string): Promise<any>
set(key: string, value: any, options?: CacheOptions): Promise<void>
invalidate(tags: string[]): Promise<void>
delete(key: string): Promise<void>
clear(): Promise<void>
exists(key: string): Promise<boolean>
```

#### Helper Functions
- `getCachedContent(id: string)` - Cache content with relations
- `getCachedCreator(id: string)` - Cache creator data
- `getCachedCategory(id: string)` - Cache category data
- `getCachedSearchResults(query: string, filters: any)` - Cache search results
- `warmupCache()` - Preload popular content

#### Cache Strategies
- Content: 30 minutes TTL
- Creators: 60 minutes TTL
- Categories: 120 minutes TTL
- Search results: 10 minutes TTL

### 6. Edge Computing (Cloudflare Workers)
Global edge caching and routing for optimal performance.

#### Features
- **Geo-routing**: Route requests to nearest origin server
- **Edge Caching**: Cache static assets and API responses at edge
- **CORS Handling**: Automatic CORS header management
- **Cache Control**: Intelligent cache TTL management

#### Region Mapping
- US: United States, Canada, Mexico
- EU: Europe (UK, Germany, France, etc.)
- ASIA: Asia-Pacific (China, Japan, India, etc.)

#### Configuration
Set environment variables:
- `API_ORIGIN_US`: US origin server URL
- `API_ORIGIN_EU`: EU origin server URL
- `API_ORIGIN_ASIA`: Asia origin server URL

## Setup Instructions

### 1. Database Migration
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 2. Install Dependencies
```bash
# Backend
cd backend
npm install fluent-ffmpeg @aws-sdk/client-s3 ioredis

# Frontend (already installed)
cd frontend
npm install
```

### 3. Environment Variables
Add to `.env`:
```env
# AWS S3 for video storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket

# Redis for caching
REDIS_URL=redis://localhost:6379

# Cloudflare Workers (optional)
API_ORIGIN_US=https://us-api.yourplatform.com
API_ORIGIN_EU=https://eu-api.yourplatform.com
API_ORIGIN_ASIA=https://asia-api.yourplatform.com
```

### 4. Register Routes
Add to `backend/src/server.ts`:
```typescript
import contentVersionsRouter from './routes/content-versions.js';
import contentExperimentsRouter from './routes/content-experiments.js';
import contentReviewsRouter from './routes/content-reviews.js';

app.use('/api/content', contentVersionsRouter);
app.use('/api/content', contentExperimentsRouter);
app.use('/api/content', contentReviewsRouter);
```

### 5. Deploy Edge Worker
```bash
cd backend/src/workers
wrangler publish edge-worker.ts
```

## Usage Examples

### Creating a New Version
```typescript
const response = await axios.post(`/api/content/${contentId}/versions`, {
  videoUrl: 'https://cdn.example.com/video-v2.mp4',
  thumbnailUrl: 'https://cdn.example.com/thumb-v2.jpg',
  title: 'Updated Title',
  description: 'Updated description',
  changes: 'Improved audio quality and added intro'
});
```

### Starting an A/B Test
```typescript
const response = await axios.post(`/api/content/${contentId}/experiments`, {
  variants: [
    { versionId: 'version-1-id', weight: 50 },
    { versionId: 'version-2-id', weight: 50 }
  ]
});
```

### Adding Review Comment
```typescript
const response = await axios.post(
  `/api/content/${contentId}/reviews/${reviewId}/comments`,
  {
    timestamp: 45, // 45 seconds into video
    comment: 'Audio levels seem low here',
    type: 'issue'
  }
);
```

### Using Cache Manager
```typescript
import { cache, getCachedContent } from './lib/cache-manager';

// Get cached content
const content = await getCachedContent(contentId);

// Invalidate cache
await cache.invalidate([`content:${contentId}`, `creator:${creatorId}`]);
```

## Performance Considerations

### Video Processing
- Processing runs asynchronously via background jobs
- Large files may take several minutes to process
- Consider using a job queue (BullMQ) for production

### Caching
- Memory cache limited to 1000 items (LRU eviction)
- Redis cache persists across server restarts
- Cache warming on server startup improves cold start performance

### Edge Computing
- Reduces latency by 50-80% for global users
- Static assets cached for 1 year
- API responses cached based on Cache-Control headers

## Monitoring & Analytics

### Experiment Metrics
Monitor A/B test performance:
- View counts per variant
- Click-through rates
- Average watch time
- Completion rates

### Cache Performance
Track cache hit rates:
- Memory cache hits
- Redis cache hits
- Cache misses requiring database queries

### Video Processing
Monitor processing pipeline:
- Processing time per video
- Success/failure rates
- Quality check results

## Future Enhancements

1. **Machine Learning Integration**
   - Auto-tagging using computer vision
   - Content recommendations
   - Predictive A/B test winners

2. **Advanced Analytics**
   - Heatmaps for viewer engagement
   - Drop-off analysis
   - Audience segmentation

3. **Real-time Collaboration**
   - Live review sessions
   - WebSocket-based comments
   - Collaborative editing

4. **Enhanced Processing**
   - HDR video support
   - 8K transcoding
   - AI-powered upscaling

## Support

For issues or questions:
- Check logs in `backend/logs/`
- Review Prisma migrations
- Verify environment variables
- Test API endpoints with Postman/Thunder Client
