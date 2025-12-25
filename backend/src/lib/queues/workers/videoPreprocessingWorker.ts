/**
 * Video Preprocessing Worker
 * Processes video uploads in background using BullMQ
 * Optimized for Bun runtime
 */

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../../../config/env';
import { processUploadedVideo } from '../../video/preprocessing';

const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');

interface VideoProcessingJob {
  fileUrl: string;
  contentId: string;
}

const videoPreprocessingWorker = new Worker<VideoProcessingJob>(
  'video-processing',
  async (job: Job<VideoProcessingJob>) => {
    const { fileUrl, contentId } = job.data;

    console.log(`Processing video for content ${contentId}`);
    
    try {
      await processUploadedVideo(fileUrl, contentId);
      console.log(`Successfully processed video for content ${contentId}`);
    } catch (error) {
      console.error(`Failed to process video for content ${contentId}:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 2, // Process 2 videos at a time
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // per minute
    },
  }
);

videoPreprocessingWorker.on('completed', (job) => {
  console.log(`✅ Video processing completed for job ${job.id}`);
});

videoPreprocessingWorker.on('failed', (job, err) => {
  console.error(`❌ Video processing failed for job ${job?.id}:`, err);
});

videoPreprocessingWorker.on('error', (err) => {
  console.error('Video preprocessing worker error:', err);
});

export default videoPreprocessingWorker;
