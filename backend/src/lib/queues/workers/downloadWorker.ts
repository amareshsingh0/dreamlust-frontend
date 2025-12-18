/**
 * Download Worker
 * Processes download jobs in the background
 */

import { Worker, Job } from 'bullmq';
import { env } from '../../../config/env';
import { prisma } from '../../prisma';
import axios from 'axios';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { emitDownloadProgress, emitDownloadCompleted, emitDownloadFailed } from '../../socket/emitDownloadEvents';

interface DownloadJobData {
  downloadId: string;
  userId: string;
  contentId: string;
  mediaUrl: string;
  quality?: 'auto' | '1080p' | '720p' | '480p' | '360p';
  fileSize?: bigint | number;
}

// Check if queues should be enabled
const isQueueEnabled = !!env.REDIS_URL;

let connection: any = undefined;
let defaultWorkerOptions: any = undefined;

if (isQueueEnabled && env.REDIS_URL) {
  try {
    connection = {
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port || '6379'),
      password: new URL(env.REDIS_URL).password || undefined,
    };

    defaultWorkerOptions = {
      connection,
      concurrency: 3, // Process 3 downloads concurrently
    };
  } catch (error) {
    console.warn('⚠️  Invalid REDIS_URL. Download worker will be disabled.');
  }
}

/**
 * Initialize S3/R2 client if configured
 */
function getStorageClient(): S3Client | null {
  const isR2 = !!env.R2_ACCOUNT_ID;
  const accessKeyId = env.S3_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.S3_BUCKET_NAME || env.R2_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  let endpoint = env.S3_ENDPOINT;
  if (isR2 && !endpoint && env.R2_ACCOUNT_ID) {
    endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }

  return new S3Client({
    region: env.S3_REGION || (isR2 ? 'auto' : 'us-east-1'),
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Download file to local storage
 */
async function downloadToLocal(
  url: string,
  filePath: string
): Promise<{ size: number; path: string }> {
  const response = await axios({
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    timeout: 300000, // 5 minutes timeout
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write file
  const buffer = Buffer.from(response.data);
  await writeFile(filePath, buffer);

  return { size: buffer.length, path: filePath };
}

/**
 * Upload file to S3/R2
 */
async function uploadToS3(
  client: S3Client,
  bucketName: string,
  key: string,
  filePath: string
): Promise<string> {
  const fileContent = await readFile(filePath);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileContent,
    ContentType: 'video/mp4', // Adjust based on file type
  });

  await client.send(command);

  // Get public URL or signed URL
  const publicUrl = env.S3_CDN_URL || env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/${key}`;
  }

  // Generate signed URL (valid for 7 days)
  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(client, getCommand, { expiresIn: 7 * 24 * 3600 });
}

/**
 * Process download job
 */
async function processDownload(job: Job<DownloadJobData>) {
  const { downloadId, userId, contentId, mediaUrl, quality, fileSize } = job.data;

  try {
    // Update status to downloading
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'downloading',
        progress: 0,
        updatedAt: new Date(),
      },
    });

    // Determine storage location
    const storageClient = getStorageClient();
    const useCloudStorage = !!storageClient;
    const bucketName = env.S3_BUCKET_NAME || env.R2_BUCKET_NAME || '';

    let finalPath: string;
    let fileSizeBytes: number;

    if (useCloudStorage) {
      // Download to temp location first
      const tempPath = join(env.STORAGE_PATH, 'temp', `${downloadId}.tmp`);
      const { size, path: downloadedPath } = await downloadToLocal(mediaUrl, tempPath);
      fileSizeBytes = size;

      // Upload to S3/R2
      const key = `downloads/${userId}/${contentId}/${downloadId}.mp4`;
      const cloudUrl = await uploadToS3(storageClient, bucketName, key, downloadedPath);

      // Delete temp file
      await unlink(downloadedPath);

      finalPath = cloudUrl;
    } else {
      // Store locally
      const localPath = join(
        env.STORAGE_PATH,
        userId,
        `${contentId}-${downloadId}.mp4`
      );
      const { size, path: downloadedPath } = await downloadToLocal(mediaUrl, localPath);
      fileSizeBytes = size;
      finalPath = downloadedPath;
    }

    // Update download record
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'completed',
        progress: 100,
        filePath: finalPath,
        fileSize: BigInt(fileSizeBytes),
        updatedAt: new Date(),
      },
    });

    // Emit completion event
    emitDownloadCompleted(userId, downloadId);

    // Update job progress
    await job.updateProgress(100);

    return { success: true, path: finalPath, size: fileSizeBytes };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update status to failed
    await prisma.download.update({
      where: { id: downloadId },
      data: {
        status: 'failed',
        error: errorMessage,
        updatedAt: new Date(),
      },
    });

    // Emit failure event
    emitDownloadFailed(userId, downloadId, errorMessage);

    throw error;
  }
}

/**
 * Create download worker
 */
export function createDownloadWorker(): Worker<DownloadJobData> | null {
  if (!isQueueEnabled || !defaultWorkerOptions) {
    console.warn('⚠️  Download worker not available (Redis required)');
    return null;
  }

  const worker = new Worker<DownloadJobData>(
    'downloads',
    async (job: Job<DownloadJobData>) => {
      console.log(`📥 Processing download job: ${job.id}`);
      
      // Report progress
      job.updateProgress(10);

      try {
        const result = await processDownload(job);
        console.log(`✅ Download completed: ${job.id}`);
        return result;
      } catch (error) {
        console.error(`❌ Download failed: ${job.id}`, error);
        throw error;
      }
    },
    defaultWorkerOptions
  );

  worker.on('completed', (job) => {
    console.log(`✅ Download job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Download job ${job?.id} failed:`, err);
  });

  worker.on('progress', (job, progress) => {
    // Update progress in database and emit event
    if (job?.data?.downloadId && job?.data?.userId) {
      const progressValue = Math.round(progress as number);
      
      // Update database
      prisma.download
        .update({
          where: { id: job.data.downloadId },
          data: { progress: progressValue },
        })
        .catch((err) => {
          console.error('Failed to update download progress:', err);
        });

      // Emit real-time progress event
      emitDownloadProgress(job.data.userId, job.data.downloadId, progressValue);
    }
  });

  console.log('✅ Download worker initialized');
  return worker;
}

