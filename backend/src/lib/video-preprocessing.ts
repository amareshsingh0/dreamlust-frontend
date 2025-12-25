import { PrismaClient } from '@prisma/client';
import ffmpeg from 'fluent-ffmpeg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import axios from 'axios';

const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
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
  timestamps: number[];
}

interface TranscodeOptions {
  formats: Array<{
    name: string;
    width: number;
    height: number;
    bitrate: string;
  }>;
  outputFormat: string;
}

export async function analyzeVideoMetadata(fileUrl: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(fileUrl, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      resolve({
        duration: metadata.format.duration || 0,
        resolution: `${videoStream.width}x${videoStream.height}`,
        fps: eval(videoStream.r_frame_rate || '0'),
        codec: videoStream.codec_name || 'unknown',
        fileSize: metadata.format.size || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        bitrate: metadata.format.bit_rate || 0,
      });
    });
  });
}

export async function generateThumbnails(
  fileUrl: string,
  options: ThumbnailOptions
): Promise<string[]> {
  const thumbnails: string[] = [];
  const tempDir = path.join(process.cwd(), 'temp', 'thumbnails');
  
  await fs.mkdir(tempDir, { recursive: true });

  const metadata = await analyzeVideoMetadata(fileUrl);
  const duration = metadata.duration;

  for (let i = 0; i < options.count; i++) {
    const timestamp = options.timestamps[i] * duration;
    const outputPath = path.join(tempDir, `thumb_${Date.now()}_${i}.jpg`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(fileUrl)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: tempDir,
          size: '1280x720',
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const fileBuffer = await fs.readFile(outputPath);
    const s3Key = `thumbnails/${Date.now()}_${i}.jpg`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || '',
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
      })
    );

    const thumbnailUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
    thumbnails.push(thumbnailUrl);

    await fs.unlink(outputPath);
  }

  return thumbnails;
}

export async function generatePreview(
  fileUrl: string,
  options: { duration: number }
): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', 'previews');
  await fs.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `preview_${Date.now()}.mp4`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(fileUrl)
      .setStartTime(0)
      .setDuration(options.duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size('1280x720')
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });

  const fileBuffer = await fs.readFile(outputPath);
  const s3Key = `previews/${Date.now()}.mp4`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || '',
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    })
  );

  const previewUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
  await fs.unlink(outputPath);

  return previewUrl;
}

export async function generateSpriteSheet(
  fileUrl: string,
  options: { interval: number; width: number; height: number }
): Promise<{ url: string; interval: number; width: number; height: number }> {
  const tempDir = path.join(process.cwd(), 'temp', 'sprites');
  await fs.mkdir(tempDir, { recursive: true });

  const metadata = await analyzeVideoMetadata(fileUrl);
  const duration = metadata.duration;
  const frameCount = Math.floor(duration / options.interval);

  const outputPath = path.join(tempDir, `sprite_${Date.now()}.jpg`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(fileUrl)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .screenshots({
        count: frameCount,
        folder: tempDir,
        filename: `frame_%i.jpg`,
        size: `${options.width}x${options.height}`,
      });
  });

  const fileBuffer = await fs.readFile(outputPath);
  const s3Key = `sprites/${Date.now()}.jpg`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || '',
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'image/jpeg',
    })
  );

  const spriteUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

  return {
    url: spriteUrl,
    interval: options.interval,
    width: options.width,
    height: options.height,
  };
}

export async function transcodeVideo(
  fileUrl: string,
  options: TranscodeOptions
): Promise<{ master: string; qualities: string[] }> {
  const tempDir = path.join(process.cwd(), 'temp', 'transcode');
  await fs.mkdir(tempDir, { recursive: true });

  const qualities: string[] = [];

  for (const format of options.formats) {
    const outputPath = path.join(tempDir, `${format.name}_${Date.now()}.mp4`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(fileUrl)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${format.width}x${format.height}`)
        .videoBitrate(format.bitrate)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const fileBuffer = await fs.readFile(outputPath);
    const s3Key = `videos/${format.name}/${Date.now()}.mp4`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || '',
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'video/mp4',
      })
    );

    const videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
    qualities.push(videoUrl);

    await fs.unlink(outputPath);
  }

  const masterPlaylistUrl = qualities[0];

  return {
    master: masterPlaylistUrl,
    qualities,
  };
}

export async function generateAutoSubtitles(fileUrl: string): Promise<string> {
  return 'Auto-generated subtitles (integration with speech-to-text service required)';
}

export async function analyzeVideoContent(fileUrl: string): Promise<{
  detectedObjects: string[];
  scenes: string[];
}> {
  return {
    detectedObjects: ['person', 'indoor', 'outdoor'],
    scenes: ['intro', 'main', 'outro'],
  };
}

export async function performQualityCheck(fileUrl: string): Promise<{
  issues: string[];
  severity: string;
}> {
  const metadata = await analyzeVideoMetadata(fileUrl);

  const issues: string[] = [];

  if (metadata.width < 1280) {
    issues.push('Low resolution detected');
  }

  if (metadata.bitrate < 1000000) {
    issues.push('Low bitrate detected');
  }

  const severity = issues.length > 0 ? 'medium' : 'low';

  return { issues, severity };
}

export async function processUploadedVideo(fileUrl: string, contentId: string): Promise<void> {
  const jobs: Promise<any>[] = [];

  jobs.push(
    analyzeVideoMetadata(fileUrl).then((metadata) => {
      return prisma.content.update({
        where: { id: contentId },
        data: {
          duration: metadata.duration,
          resolution: metadata.resolution,
          fileSize: BigInt(metadata.fileSize),
        },
      });
    })
  );

  jobs.push(
    generateThumbnails(fileUrl, {
      count: 4,
      timestamps: [0, 0.25, 0.5, 0.75],
    }).then((thumbnails) => {
      return prisma.content.update({
        where: { id: contentId },
        data: {
          thumbnail: thumbnails[0],
        },
      });
    })
  );

  jobs.push(
    generatePreview(fileUrl, { duration: 30 }).then((previewUrl) => {
      return prisma.content.update({
        where: { id: contentId },
        data: {
          mediaUrl: previewUrl,
        },
      });
    })
  );

  jobs.push(
    performQualityCheck(fileUrl).then(async (qualityReport) => {
      if (qualityReport.issues.length > 0) {
        await prisma.contentFlag.create({
          data: {
            contentId: contentId,
            flagType: 'auto',
            reason: 'Quality issues detected',
            severity: qualityReport.severity,
          },
        });
      }
    })
  );

  await Promise.all(jobs);

  await prisma.content.update({
    where: { id: contentId },
    data: {
      status: 'PUBLISHED',
    },
  });
}
