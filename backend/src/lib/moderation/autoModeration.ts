/**
 * Auto-Moderation System
 * Phase 1: Basic content moderation checks
 */

import { prisma } from '../prisma';
import { scanThumbnail } from './imageClassification';

// Banned words list (in production, store in database)
const BANNED_WORDS: string[] = [
  // Add your banned words here
  // This is a basic implementation - consider using a more sophisticated profanity filter
];

/**
 * Check if text contains banned words
 */
export function containsBannedWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BANNED_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

/**
 * Check if new account is uploading too many videos
 * Flags accounts uploading >10 videos/day
 */
export async function checkUploadLimit(userId: string): Promise<{
  flagged: boolean;
  uploadCount: number;
  limit: number;
}> {
  const limit = 10; // Max uploads per day for new accounts
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  // Get user account age
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { created_at: true },
  });

  if (!user || !user.created_at) {
    return { flagged: false, uploadCount: 0, limit };
  }

  // Check if account is less than 7 days old (new account)
  const accountAge = Date.now() - user.created_at.getTime();
  const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000; // 7 days

  if (!isNewAccount) {
    return { flagged: false, uploadCount: 0, limit };
  }

  // Count uploads in last 24 hours
  const creator = await prisma.creator.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!creator) {
    return { flagged: false, uploadCount: 0, limit };
  }

  const uploadCount = await prisma.content.count({
    where: {
      creatorId: creator.id,
      createdAt: {
        gte: oneDayAgo,
      },
    },
  });

  return {
    flagged: uploadCount > limit,
    uploadCount,
    limit,
  };
}

/**
 * Check if content has high dislike ratio
 * Flags content with >50% dislikes in first hour
 */
export async function checkDislikeRatio(contentId: string): Promise<{
  flagged: boolean;
  dislikeRatio: number;
  threshold: number;
}> {
  const threshold = 0.5; // 50% dislike ratio
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  // Get content creation time
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { createdAt: true },
  });

  if (!content || !content.createdAt) {
    return { flagged: false, dislikeRatio: 0, threshold };
  }

  // Only check if content is less than 1 hour old
  const contentAge = Date.now() - content.createdAt.getTime();
  if (contentAge > 60 * 60 * 1000) {
    return { flagged: false, dislikeRatio: 0, threshold };
  }

  // Get comment likes/dislikes (using CommentLike model)
  // Note: This is a simplified check - adjust based on your actual like/dislike system
  // For now, return a placeholder
  // In production, implement actual dislike counting using CommentLike model
  return { flagged: false, dislikeRatio: 0, threshold };
}

/**
 * Scan content title and description for banned words
 */
export async function scanContentText(contentId: string): Promise<{
  flagged: boolean;
  violations: string[];
}> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      title: true,
      description: true,
    },
  });

  if (!content) {
    return { flagged: false, violations: [] };
  }

  const violations: string[] = [];
  const textToCheck = `${content.title} ${content.description || ''}`;

  if (containsBannedWords(textToCheck)) {
    violations.push('banned_words');
  }

  return {
    flagged: violations.length > 0,
    violations,
  };
}

/**
 * Auto-flag content based on multiple checks
 */
export async function autoFlagContent(contentId: string, creatorId: string): Promise<{
  flagged: boolean;
  flags: Array<{
    type: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}> {
  const flags: Array<{
    type: string;
    reason: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  // Check banned words
  const textCheck = await scanContentText(contentId);
  if (textCheck.flagged) {
    flags.push({
      type: 'auto',
      reason: 'banned_words',
      severity: 'medium',
    });
  }

  // Check upload limit
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { user_id: true },
  });

  if (creator) {
    const uploadCheck = await checkUploadLimit(creator.user_id);
    if (uploadCheck.flagged) {
      flags.push({
        type: 'auto',
        reason: 'upload_limit_exceeded',
        severity: 'high',
      });
    }
  }

  // Check dislike ratio
  const dislikeCheck = await checkDislikeRatio(contentId);
  if (dislikeCheck.flagged) {
    flags.push({
      type: 'auto',
      reason: 'high_dislike_ratio',
      severity: 'medium',
    });
  }

  // Check thumbnail/image classification (DISABLED - Not used)
  // Image classification service is not configured/used
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { thumbnail: true },
  });

  if (content?.thumbnail) {
    const imageCheck = await scanThumbnail(content.thumbnail);
    if (imageCheck.flagged) {
      // Determine severity based on confidence and categories
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (imageCheck.confidence >= 90) {
        severity = 'critical';
      } else if (imageCheck.confidence >= 75) {
        severity = 'high';
      } else if (imageCheck.confidence >= 50) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      flags.push({
        type: 'auto',
        reason: `inappropriate_image:${imageCheck.categories.join(',')}`,
        severity,
      });
    }
  }

  // Create flags in database
  if (flags.length > 0) {
    for (const flag of flags) {
      // Use raw SQL for composite unique constraint
      try {
        await prisma.$executeRaw`
          INSERT INTO content_flags (id, content_id, flag_type, reason, severity, is_active, created_at)
          VALUES (gen_random_uuid(), ${contentId}::uuid, ${flag.type}, ${flag.reason}, ${flag.severity}, true, NOW())
          ON CONFLICT (content_id, flag_type, reason)
          DO UPDATE SET severity = ${flag.severity}, is_active = true, resolved_at = NULL
        `;
      } catch (error) {
        console.error('Error creating content flag:', error);
        // Continue even if flag creation fails
      }
    }
  }

  return {
    flagged: flags.length > 0,
    flags,
  };
}

/**
 * Image classification using AWS Rekognition or Google Vision API
 * Re-exported from imageClassification module
 */
export { scanThumbnail } from './imageClassification';

