/**
 * Image Processing Utilities
 * For generating blur placeholders and optimizing images on upload
 */

import sharp from 'sharp';
import { prisma } from './prisma';

/**
 * Generate blur placeholder from image
 * Uses sharp to create a low-quality, downscaled version
 */
export async function generateBlurPlaceholder(
  imageBuffer: Buffer,
  width: number = 20,
  height: number = 20
): Promise<string> {
  try {
    // Resize to small dimensions and convert to base64
    const resized = await sharp(imageBuffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 20 })
      .toBuffer();

    const base64 = resized.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error generating blur placeholder:', error);
    // Return a simple gray placeholder
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#737373"/>
      </svg>`
    ).toString('base64')}`;
  }
}

/**
 * Generate multiple thumbnail sizes
 */
export async function generateThumbnails(
  imageBuffer: Buffer,
  sizes: Array<{ width: number; height: number; suffix: string }> = [
    { width: 320, height: 180, suffix: '_thumb' },
    { width: 640, height: 360, suffix: '_medium' },
    { width: 1280, height: 720, suffix: '_large' },
  ]
): Promise<Record<string, Buffer>> {
  const thumbnails: Record<string, Buffer> = {};

  for (const size of sizes) {
    try {
      const thumbnail = await sharp(imageBuffer)
        .resize(size.width, size.height, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      thumbnails[size.suffix] = thumbnail;
    } catch (error) {
      console.error(`Error generating thumbnail ${size.suffix}:`, error);
    }
  }

  return thumbnails;
}

/**
 * Process and store image with blur placeholder
 * Call this after image upload
 * Similar to plaiceholder - generates base64 blur placeholder
 */
export async function processContentThumbnail(
  contentId: string,
  imageUrl: string
): Promise<{ blurPlaceholder: string }> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Generate blur placeholder (similar to plaiceholder)
    const blurPlaceholder = await generateBlurPlaceholder(imageBuffer);

    // Store blur placeholder in database
    await prisma.content.update({
      where: { id: contentId },
      data: {
        thumbnailBlur: blurPlaceholder,
      },
    });

    return { blurPlaceholder };
  } catch (error) {
    console.error('Error processing thumbnail:', error);
    return { blurPlaceholder: '' };
  }
}

/**
 * Process thumbnail from buffer (for direct uploads)
 * Use this when you have the image buffer directly
 */
export async function processThumbnailFromBuffer(
  contentId: string,
  imageBuffer: Buffer
): Promise<{ blurPlaceholder: string }> {
  try {
    // Generate blur placeholder
    const blurPlaceholder = await generateBlurPlaceholder(imageBuffer);

    // Store blur placeholder in database
    await prisma.content.update({
      where: { id: contentId },
      data: {
        thumbnailBlur: blurPlaceholder,
      },
    });

    return { blurPlaceholder };
  } catch (error) {
    console.error('Error processing thumbnail from buffer:', error);
    return { blurPlaceholder: '' };
  }
}

/**
 * Generate video thumbnail from video file
 * Extracts frame at specified time (default: 0s)
 */
export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  time: number = 0
): Promise<Buffer> {
  try {
    // This requires ffmpeg or similar video processing library
    // For now, return a placeholder
    // In production, use ffmpeg or a video processing service
    
    // Example with ffmpeg (install: bun add fluent-ffmpeg)
    // const ffmpeg = require('fluent-ffmpeg');
    // return new Promise((resolve, reject) => {
    //   ffmpeg(videoBuffer)
    //     .screenshots({
    //       timestamps: [time],
    //       filename: 'thumbnail.jpg',
    //       folder: '/tmp',
    //     })
    //     .on('end', () => {
    //       const thumbnail = fs.readFileSync('/tmp/thumbnail.jpg');
    //       resolve(thumbnail);
    //     })
    //     .on('error', reject);
    // });

    // Placeholder: return a simple image
    return Buffer.from('');
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
    throw error;
  }
}

