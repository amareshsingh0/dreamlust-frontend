/**
 * Video Processing Worker
 * Handles video transcoding jobs
 */

import { Worker, Job } from 'bullmq';
import { queueVideoTranscoding } from '../queueManager';
import { videoStorage } from '../../storage/videoStorage';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';

export interface VideoTranscodeJob {
  contentId: string;
  videoUrl: string;
  qualities?: string[];
}

/**
 * Transcode video to multiple qualities
 * Note: Actual transcoding requires FFmpeg or a service like Mux/Cloudflare
 * This is a placeholder that uploads to video storage service
 */
async function transcodeVideo(job: Job<VideoTranscodeJob>) {
  const { contentId, videoUrl, qualities = ['720p', '1080p', '4K'] } = job.data;

  try {
    // Update content status to processing
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PENDING_REVIEW' },
    });

    // Upload to video storage service (Cloudflare Stream/Mux)
    // These services handle transcoding automatically
    const result = await videoStorage.uploadVideo(videoUrl, {
      title: `Content ${contentId}`,
    });

    // Update content with video URLs
    await prisma.content.update({
      where: { id: contentId },
      data: {
        mediaUrl: result.url,
        status: result.status === 'ready' ? 'PUBLISHED' : 'PENDING_REVIEW',
        duration: result.duration || undefined,
        thumbnail: result.thumbnailUrl || undefined,
      },
    });

    // If video is still processing, schedule a status check
    if (result.status === 'processing') {
      // You could add a delayed job to check status later
      setTimeout(async () => {
        const status = await videoStorage.getVideoStatus(result.videoId);
        if (status === 'ready') {
          await prisma.content.update({
            where: { id: contentId },
            data: { status: 'PUBLISHED' },
          });
        }
      }, 60000); // Check after 1 minute
    }

    return { success: true, videoId: result.videoId, status: result.status };
  } catch (error) {
    console.error(`Video transcoding failed for content ${contentId}:`, error);
    throw error;
  }
}

/**
 * Create video processing worker
 */
export function createVideoProcessingWorker() {
  const worker = new Worker<VideoTranscodeJob>(
    'video-processing',
    async (job) => {
      if (job.name === 'transcode') {
        return await transcodeVideo(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 2, // Process 2 videos at a time
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Video processing completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Video processing failed: ${job?.id}`, err);
  });

  return worker;
}
