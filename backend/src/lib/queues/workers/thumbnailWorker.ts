/**
 * Thumbnail Generation Worker
 * Handles thumbnail generation jobs
 */

import { Worker, Job } from 'bullmq';
import { queueThumbnailGeneration } from '../queueManager';
import { generateVideoThumbnail, processThumbnailFromBuffer } from '../../imageProcessing';
import { s3Storage } from '../../storage/s3Storage';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';

export interface ThumbnailJob {
  contentId: string;
  videoUrl?: string;
  imageBuffer?: Buffer;
  timestamp?: number;
}

/**
 * Generate thumbnail from video or image
 */
async function generateThumbnail(job: Job<ThumbnailJob>) {
  const { contentId, videoUrl, imageBuffer, timestamp = 0 } = job.data;

  try {
    let thumbnailBuffer: Buffer;
    let thumbnailUrl: string;

    if (imageBuffer) {
      // Process existing image buffer
      const result = await processThumbnailFromBuffer(contentId, imageBuffer);
      thumbnailBuffer = imageBuffer;
      thumbnailUrl = result.thumbnailUrl || '';
    } else if (videoUrl) {
      // Generate thumbnail from video
      // For now, we'll need to download the video or use a service
      // This is a placeholder - in production, you'd use FFmpeg or a service
      thumbnailBuffer = await generateVideoThumbnail(Buffer.from(''), timestamp);
      thumbnailUrl = '';
    } else {
      throw new Error('Either imageBuffer or videoUrl must be provided');
    }

    // Upload thumbnail to S3/R2
    const uploadResult = await s3Storage.uploadImage(
      thumbnailBuffer,
      `${contentId}-thumbnail.jpg`,
      'thumbnails'
    );

    // Generate blur placeholder
    const { blurPlaceholder } = await processThumbnailFromBuffer(
      contentId,
      thumbnailBuffer
    );

    // Update content with thumbnail
    await prisma.content.update({
      where: { id: contentId },
      data: {
        thumbnail: uploadResult.cdnUrl || uploadResult.url,
        thumbnailBlur: blurPlaceholder,
      },
    });

    return {
      success: true,
      thumbnailUrl: uploadResult.cdnUrl || uploadResult.url,
      blurPlaceholder,
    };
  } catch (error) {
    console.error(`Thumbnail generation failed for content ${contentId}:`, error);
    throw error;
  }
}

/**
 * Create thumbnail generation worker
 */
export function createThumbnailWorker() {
  const worker = new Worker<ThumbnailJob>(
    'thumbnail-generation',
    async (job) => {
      if (job.name === 'generate') {
        return await generateThumbnail(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 5, // Process 5 thumbnails at a time
      limiter: {
        max: 20,
        duration: 60000, // Max 20 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Thumbnail generation completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Thumbnail generation failed: ${job?.id}`, err);
  });

  return worker;
}
