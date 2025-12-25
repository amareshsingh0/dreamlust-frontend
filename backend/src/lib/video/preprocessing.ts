/**
 * Video Preprocessing Service for Cloudflare R2
 * Handles video optimization, thumbnail generation, and metadata extraction
 * Node.js compatible version using child_process
 */

import { s3Storage } from '../storage/s3Storage';
import { prisma } from '../prisma';
import { Queue } from 'bullmq';
import { env } from '../../config/env';
import Redis from 'ioredis';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const redis = new Redis(env.REDIS_URL || 'redis://localhost:6379');

const videoProcessingQueue = new Queue('video-processing', {
  connection: redis,
});

interface VideoMetadata {
  duration: number;
  resolution: string;
  fps: number;
  codec: string;
  fileSize: number;
  width: number;
  height: number;
  bitrate: number;
}

interface ThumbnailOptions {
  count: number;
  timestamps: number[]; // Percentage of video (0-1)
  width?: number;
  height?: number;
}

interface PreviewOptions {
  duration: number; // seconds
  startTime?: number;
}

interface SpriteSheetOptions {
  interval: number; // seconds
  width: number;
  height: number;
  columns?: number;
}

/**
 * Execute FFprobe/FFmpeg command and return output
 */
function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Run FFmpeg command and wait for completion
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Extract video metadata using FFprobe
 */
export async function analyzeVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  try {
    const output = await runCommand('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoUrl
    ]);

    const data = JSON.parse(output);
    const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

    if (!videoStream) {
      throw new Error('No video stream found');
    }

    // Parse frame rate safely (e.g., "30/1" -> 30)
    const parseFps = (fps: string): number => {
      const parts = fps.split('/');
      if (parts.length === 2) {
        return parseInt(parts[0]) / parseInt(parts[1]);
      }
      return parseFloat(fps);
    };

    return {
      duration: parseFloat(data.format.duration),
      resolution: `${videoStream.width}x${videoStream.height}`,
      fps: parseFps(videoStream.r_frame_rate),
      codec: videoStream.codec_name,
      fileSize: parseInt(data.format.size),
      width: videoStream.width,
      height: videoStream.height,
      bitrate: parseInt(data.format.bit_rate || videoStream.bit_rate || 0),
    };
  } catch (error) {
    console.error('Error analyzing video metadata:', error);
    throw error;
  }
}

/**
 * Generate thumbnails at specific timestamps
 */
export async function generateThumbnails(
  videoUrl: string,
  options: ThumbnailOptions
): Promise<string[]> {
  const thumbnailUrls: string[] = [];

  try {
    // Get video duration first
    const metadata = await analyzeVideoMetadata(videoUrl);
    const duration = metadata.duration;

    for (let i = 0; i < options.count; i++) {
      const timestamp = options.timestamps[i] * duration;
      const outputPath = `/tmp/thumbnail-${Date.now()}-${i}.jpg`;

      // Generate thumbnail using FFmpeg
      await runFFmpeg([
        '-ss', timestamp.toString(),
        '-i', videoUrl,
        '-vframes', '1',
        '-vf', `scale=${options.width || 320}:${options.height || 180}`,
        '-y',
        outputPath
      ]);

      // Read file and upload to R2
      const buffer = await fs.readFile(outputPath);

      const result = await s3Storage.uploadImage(
        buffer,
        `thumbnail-${i}.jpg`,
        'thumbnails'
      );

      thumbnailUrls.push(result.cdnUrl || result.url);

      // Cleanup temp file
      await fs.unlink(outputPath).catch(() => {});
    }

    return thumbnailUrls;
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw error;
  }
}

/**
 * Generate video preview/trailer
 */
export async function generatePreview(
  videoUrl: string,
  options: PreviewOptions
): Promise<string> {
  try {
    const outputPath = `/tmp/preview-${Date.now()}.mp4`;
    const startTime = options.startTime || 0;

    // Create preview clip using FFmpeg
    await runFFmpeg([
      '-ss', startTime.toString(),
      '-i', videoUrl,
      '-t', options.duration.toString(),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      outputPath
    ]);

    // Upload to R2
    const buffer = await fs.readFile(outputPath);

    const result = await s3Storage.uploadVideo(
      buffer,
      'preview.mp4',
      'previews'
    );

    // Cleanup
    await fs.unlink(outputPath).catch(() => {});

    return result.cdnUrl || result.url;
  } catch (error) {
    console.error('Error generating preview:', error);
    throw error;
  }
}

/**
 * Generate sprite sheet for hover previews
 */
export async function generateSpriteSheet(
  videoUrl: string,
  options: SpriteSheetOptions
): Promise<{ url: string; vttUrl: string; metadata: any }> {
  try {
    const metadata = await analyzeVideoMetadata(videoUrl);
    const duration = metadata.duration;
    const frameCount = Math.floor(duration / options.interval);
    const columns = options.columns || 10;
    const rows = Math.ceil(frameCount / columns);

    const outputPath = `/tmp/sprite-${Date.now()}.jpg`;
    const vttPath = `/tmp/sprite-${Date.now()}.vtt`;

    // Generate sprite sheet using FFmpeg
    await runFFmpeg([
      '-i', videoUrl,
      '-vf', `fps=1/${options.interval},scale=${options.width}:${options.height},tile=${columns}x${rows}`,
      '-y',
      outputPath
    ]);

    // Generate WebVTT file for sprite sheet
    let vttContent = 'WEBVTT\n\n';
    for (let i = 0; i < frameCount; i++) {
      const startTime = i * options.interval;
      const endTime = (i + 1) * options.interval;
      const x = (i % columns) * options.width;
      const y = Math.floor(i / columns) * options.height;

      vttContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
      vttContent += `sprite.jpg#xywh=${x},${y},${options.width},${options.height}\n\n`;
    }

    await fs.writeFile(vttPath, vttContent);

    // Upload sprite sheet to R2
    const spriteBuffer = await fs.readFile(outputPath);
    const spriteResult = await s3Storage.uploadImage(
      spriteBuffer,
      'sprite.jpg',
      'thumbnails' // Using thumbnails folder as sprites is not defined
    );

    // Upload VTT file to R2
    const vttBuffer = await fs.readFile(vttPath);
    const vttResult = await s3Storage.uploadFile(
      vttBuffer,
      'sprite.vtt',
      'thumbnails',
      { type: 'text/vtt' }
    );

    // Cleanup
    await fs.unlink(outputPath).catch(() => {});
    await fs.unlink(vttPath).catch(() => {});

    return {
      url: spriteResult.cdnUrl || spriteResult.url,
      vttUrl: vttResult.cdnUrl || vttResult.url,
      metadata: {
        columns,
        rows,
        frameCount,
        interval: options.interval,
        width: options.width,
        height: options.height,
      },
    };
  } catch (error) {
    console.error('Error generating sprite sheet:', error);
    throw error;
  }
}

/**
 * Transcode video for adaptive streaming (HLS)
 */
export async function transcodeVideo(
  videoUrl: string,
  formats: Array<{ name: string; width: number; height: number; bitrate: string }>
): Promise<{ master: string; qualities: any[] }> {
  try {
    const outputDir = `/tmp/hls-${Date.now()}`;
    await fs.mkdir(outputDir, { recursive: true });

    const qualities: any[] = [];

    // Generate HLS streams for each quality
    for (const format of formats) {
      const playlistName = `${format.name}.m3u8`;
      const segmentPattern = `${format.name}_%03d.ts`;

      await runFFmpeg([
        '-i', videoUrl,
        '-vf', `scale=${format.width}:${format.height}`,
        '-c:v', 'libx264',
        '-b:v', format.bitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-hls_time', '10',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', `${outputDir}/${segmentPattern}`,
        `${outputDir}/${playlistName}`
      ]);

      // Upload playlist and segments to R2
      const playlistBuffer = await fs.readFile(`${outputDir}/${playlistName}`);
      const playlistResult = await s3Storage.uploadFile(
        playlistBuffer,
        playlistName,
        'videos',
        { type: 'application/vnd.apple.mpegurl' }
      );

      qualities.push({
        name: format.name,
        width: format.width,
        height: format.height,
        bitrate: format.bitrate,
        url: playlistResult.cdnUrl || playlistResult.url,
      });
    }

    // Create master playlist
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      const bandwidth = parseInt(format.bitrate.replace(/[KM]/, '')) * (format.bitrate.includes('M') ? 1000000 : 1000);
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${format.width}x${format.height}\n`;
      masterContent += `${qualities[i].url}\n`;
    }

    const masterPath = `${outputDir}/master.m3u8`;
    await fs.writeFile(masterPath, masterContent);

    const masterBuffer = await fs.readFile(masterPath);
    const masterResult = await s3Storage.uploadFile(
      masterBuffer,
      'master.m3u8',
      'videos',
      { type: 'application/vnd.apple.mpegurl' }
    );

    // Cleanup output directory
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

    return {
      master: masterResult.cdnUrl || masterResult.url,
      qualities,
    };
  } catch (error) {
    console.error('Error transcoding video:', error);
    throw error;
  }
}

/**
 * Generate auto-subtitles using speech-to-text
 * Note: This is a placeholder - you'll need to integrate with a service like
 * OpenAI Whisper, Google Speech-to-Text, or AWS Transcribe
 */
export async function generateAutoSubtitles(videoUrl: string): Promise<string> {
  // Placeholder implementation
  console.log('Auto-subtitle generation not yet implemented');
  return '';
}

/**
 * Analyze video content for tags and categorization
 */
export async function analyzeVideoContent(videoUrl: string): Promise<any> {
  // Placeholder for AI-based content analysis
  return {
    detectedObjects: [],
    scenes: [],
    suggestedTags: [],
  };
}

/**
 * Perform quality check on video
 */
export async function performQualityCheck(videoUrl: string): Promise<any> {
  try {
    const metadata = await analyzeVideoMetadata(videoUrl);
    const issues: string[] = [];
    let severity = 'low';

    // Check resolution
    if (metadata.width < 1280 || metadata.height < 720) {
      issues.push('Low resolution (below 720p)');
      severity = 'medium';
    }

    // Check bitrate
    if (metadata.bitrate < 1000000) {
      issues.push('Low bitrate (below 1 Mbps)');
      severity = 'medium';
    }

    // Check duration
    if (metadata.duration < 1) {
      issues.push('Video too short (less than 1 second)');
      severity = 'high';
    }

    return {
      issues,
      severity,
      metadata,
    };
  } catch (error: any) {
    return {
      issues: ['Failed to analyze video'],
      severity: 'high',
      error: error.message,
    };
  }
}

/**
 * Main video preprocessing function
 */
export async function processUploadedVideo(fileUrl: string, contentId: string): Promise<void> {
  try {
    console.log(`Starting video preprocessing for content ${contentId}`);

    // Update status to processing
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PENDING_REVIEW' },
    });

    // 1. Extract metadata
    const metadata = await analyzeVideoMetadata(fileUrl);
    await prisma.content.update({
      where: { id: contentId },
      data: {
        duration: Math.floor(metadata.duration),
        resolution: metadata.resolution,
        fileSize: BigInt(metadata.fileSize),
      },
    });

    // 2. Generate thumbnails
    const thumbnails = await generateThumbnails(fileUrl, {
      count: 4,
      timestamps: [0.1, 0.3, 0.5, 0.7],
      width: 640,
      height: 360,
    });

    await prisma.content.update({
      where: { id: contentId },
      data: {
        thumbnail: thumbnails[0],
      },
    });

    // 3. Generate preview (first 30 seconds)
    if (metadata.duration > 30) {
      const previewUrl = await generatePreview(fileUrl, { duration: 30 });
      console.log(`Preview generated: ${previewUrl}`);
    }

    // 4. Generate sprite sheet
    const spriteData = await generateSpriteSheet(fileUrl, {
      interval: 10,
      width: 160,
      height: 90,
      columns: 10,
    });
    console.log(`Sprite sheet generated: ${spriteData.url}`);

    // 5. Quality check
    const qualityReport = await performQualityCheck(fileUrl);
    if (qualityReport.issues.length > 0) {
      await prisma.contentFlag.create({
        data: {
          contentId: contentId,
          flagType: 'quality',
          reason: qualityReport.issues.join(', '),
          severity: qualityReport.severity,
        },
      });
    }

    // Mark as processed
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'PUBLISHED',
      },
    });

    console.log(`Video preprocessing completed for content ${contentId}`);
  } catch (error) {
    console.error(`Error processing video ${contentId}:`, error);

    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'DRAFT' },
    });

    throw error;
  }
}

/**
 * Queue video processing job
 */
export async function queueVideoProcessing(fileUrl: string, contentId: string): Promise<void> {
  await videoProcessingQueue.add('process-video', {
    fileUrl,
    contentId,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}

// Helper function to format time for WebVTT
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
