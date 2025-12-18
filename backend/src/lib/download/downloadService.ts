/**
 * Download Service
 * Manages offline content downloads
 */

import { prisma } from '../prisma';
import { NotFoundError, ValidationError } from '../errors';
import { env } from '../../config/env';
import { resolveDirectUrl, getFileSize } from './qualityResolver';

export interface DownloadOptions {
  quality?: 'auto' | '1080p' | '720p' | '480p' | '360p';
  expiresInDays?: number;
}

/**
 * Create a download request
 */
export async function createDownload(
  userId: string,
  contentId: string,
  options: DownloadOptions = {}
): Promise<{ id: string; status: string }> {
  // Check if content exists and allows downloads
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      id: true,
      allowDownloads: true,
      mediaUrl: true,
      fileSize: true,
      status: true,
    },
  });

  if (!content) {
    throw new NotFoundError('Content not found');
  }

  if (!content.allowDownloads) {
    throw new ValidationError('This content does not allow downloads');
  }

  if (content.status !== 'PUBLISHED') {
    throw new ValidationError('Content is not available for download');
  }

  // Check if download already exists
  const existingDownload = await prisma.download.findUnique({
    where: {
      userId_contentId: {
        userId,
        contentId,
      },
    },
  });

  if (existingDownload && existingDownload.status === 'completed') {
    // Check if expired
    if (existingDownload.expiresAt < new Date()) {
      // Delete expired download
      await prisma.download.delete({
        where: { id: existingDownload.id },
      });
    } else {
      return { id: existingDownload.id, status: existingDownload.status };
    }
  }

  // Calculate expiration (default 30 days)
  const expiresInDays = options.expiresInDays || 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Create download record
  const download = await prisma.download.create({
    data: {
      userId,
      contentId,
      quality: options.quality || 'auto',
      fileSize: content.fileSize ? BigInt(content.fileSize.toString()) : null,
      expiresAt,
      status: 'pending',
      progress: 0,
    },
  });

  // Resolve direct URL based on quality
  let directUrl = content.mediaUrl;
  let resolvedFileSize = content.fileSize ? BigInt(content.fileSize.toString()) : null;

  try {
    // Resolve quality-specific URL if needed
    directUrl = await resolveDirectUrl(content.mediaUrl, options.quality || 'auto');
    
    // Get file size if not available
    if (!resolvedFileSize) {
      const size = await getFileSize(directUrl);
      if (size) {
        resolvedFileSize = BigInt(size);
        // Update download record with file size
        await prisma.download.update({
          where: { id: download.id },
          data: { fileSize: resolvedFileSize },
        });
      }
    }
  } catch (error) {
    console.warn('Failed to resolve quality URL, using original:', error);
    // Continue with original URL
  }

  // Queue download job
  try {
    const { queueDownload } = await import('../queues/queueManager');
    if (queueDownload) {
      await queueDownload({
        downloadId: download.id,
        userId,
        contentId,
        mediaUrl: directUrl, // Use resolved URL
        quality: options.quality,
        fileSize: resolvedFileSize ? Number(resolvedFileSize) : undefined,
      });
    }
  } catch (error) {
    console.error('Failed to queue download job:', error);
    // Continue anyway - worker will pick it up later or user can retry
  }

  return { id: download.id, status: download.status };
}

/**
 * Get user's downloads
 */
export async function getUserDownloads(
  userId: string,
  status?: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;
  const where: any = { userId };
  
  if (status) {
    where.status = status;
  }

  const [downloads, total] = await prisma.$transaction([
    prisma.download.findMany({
      where,
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            duration: true,
            creator: {
              select: {
                display_name: true,
                handle: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.download.count({ where }),
  ]);

  return {
    downloads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update download progress
 */
export async function updateDownloadProgress(
  downloadId: string,
  progress: number,
  status?: string
) {
  const updateData: any = {
    progress: Math.min(100, Math.max(0, progress)),
    updatedAt: new Date(),
  };

  if (status) {
    updateData.status = status;
  }

  if (status === 'completed' && progress === 100) {
    // Set file path (would be set by download worker)
    // updateData.filePath = `...`;
  }

  return prisma.download.update({
    where: { id: downloadId },
    data: updateData,
  });
}

/**
 * Cancel download
 */
export async function cancelDownload(downloadId: string, userId: string) {
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
  });

  if (!download) {
    throw new NotFoundError('Download not found');
  }

  if (download.userId !== userId) {
    throw new ValidationError('Unauthorized');
  }

  if (download.status === 'completed') {
    throw new ValidationError('Cannot cancel completed download');
  }

  return prisma.download.update({
    where: { id: downloadId },
    data: {
      status: 'cancelled',
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete download
 */
export async function deleteDownload(downloadId: string, userId: string) {
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
  });

  if (!download) {
    throw new NotFoundError('Download not found');
  }

  if (download.userId !== userId) {
    throw new ValidationError('Unauthorized');
  }

  // Delete file from storage (would be handled by cleanup job)
  // For now, just delete the record

  return prisma.download.delete({
    where: { id: downloadId },
  });
}

/**
 * Get download URL (for playing offline)
 */
export async function getDownloadUrl(downloadId: string, userId: string): Promise<string> {
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
    include: {
      content: {
        select: {
          mediaUrl: true,
        },
      },
    },
  });

  if (!download) {
    throw new NotFoundError('Download not found');
  }

  if (download.userId !== userId) {
    throw new ValidationError('Unauthorized');
  }

  if (download.status !== 'completed') {
    throw new ValidationError('Download not completed');
  }

  if (download.expiresAt < new Date()) {
    throw new ValidationError('Download has expired');
  }

  // Return file path or CDN URL
  // In production, this would return a signed URL or local file path
  return download.filePath || download.content.mediaUrl;
}

/**
 * Cleanup expired downloads (should run as a cron job)
 */
export async function cleanupExpiredDownloads() {
  const expired = await prisma.download.findMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      status: {
        not: 'expired',
      },
    },
  });

  // Mark as expired
  await prisma.download.updateMany({
    where: {
      id: {
        in: expired.map(d => d.id),
      },
    },
    data: {
      status: 'expired',
    },
  });

  // Delete files from storage (would be handled by storage service)
  // For now, just mark as expired

  return expired.length;
}

