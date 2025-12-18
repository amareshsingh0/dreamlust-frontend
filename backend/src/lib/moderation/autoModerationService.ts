/**
 * Enhanced Auto-Moderation Service with ML-like checks
 */

import { prisma } from '../prisma';

interface ModerationCheck {
  name: string;
  score: number; // 0-100
  passed: boolean;
  details?: string;
}

/**
 * Check title for spam patterns
 */
async function checkTitleForSpam(title: string): Promise<ModerationCheck> {
  const spamPatterns = [
    /(click here|buy now|limited time|act now)/i,
    /(!!!|\?\?\?|\$\$\$)/g,
    /(free|100%|guaranteed)/i,
  ];

  let score = 0;
  const matches: string[] = [];

  for (const pattern of spamPatterns) {
    if (pattern.test(title)) {
      score += 20;
      matches.push(pattern.toString());
    }
  }

  // Check for excessive capitalization
  const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
  if (capsRatio > 0.5 && title.length > 10) {
    score += 15;
    matches.push('excessive_caps');
  }

  // Check for excessive special characters
  const specialCharRatio = (title.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length / title.length;
  if (specialCharRatio > 0.2) {
    score += 15;
    matches.push('excessive_special_chars');
  }

  return {
    name: 'title_spam_check',
    score: Math.min(score, 100),
    passed: score < 30,
    details: matches.length > 0 ? `Patterns detected: ${matches.join(', ')}` : undefined,
  };
}

/**
 * Check description for banned words
 */
async function checkDescriptionForBannedWords(description: string): Promise<ModerationCheck> {
  // Basic banned words list (in production, use a comprehensive profanity filter)
  const bannedWords = [
    // Add your banned words here
  ];

  const lowerDescription = description.toLowerCase();
  const foundWords: string[] = [];

  for (const word of bannedWords) {
    if (lowerDescription.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }

  const score = foundWords.length * 25; // 25 points per banned word

  return {
    name: 'banned_words_check',
    score: Math.min(score, 100),
    passed: foundWords.length === 0,
    details: foundWords.length > 0 ? `Banned words: ${foundWords.join(', ')}` : undefined,
  };
}

/**
 * Scan thumbnail for inappropriate content using NSFW.js
 */
async function scanThumbnailForInappropriateContent(thumbnailUrl: string | null): Promise<ModerationCheck> {
  if (!thumbnailUrl) {
    return {
      name: 'thumbnail_check',
      score: 0,
      passed: true,
      details: 'No thumbnail provided',
    };
  }

  try {
    const { scanThumbnailForInappropriateContent: scanThumbnail } = await import('./nsfwScanner');
    const result = await scanThumbnail(thumbnailUrl);

    return {
      name: 'thumbnail_check',
      score: result.riskScore,
      passed: !result.flagged,
      details: result.details,
    };
  } catch (error) {
    console.error('Error scanning thumbnail:', error);
    // Return neutral score on error
    return {
      name: 'thumbnail_check',
      score: 0,
      passed: true,
      details: 'Thumbnail scan error (fallback to safe)',
    };
  }
}

/**
 * Check video for violations (placeholder - would use video analysis)
 */
async function checkVideoForViolations(videoUrl: string | null): Promise<ModerationCheck> {
  if (!videoUrl) {
    return {
      name: 'video_check',
      score: 0,
      passed: true,
      details: 'No video URL provided',
    };
  }

  // In production, this would:
  // - Extract frames from video
  // - Analyze frames with ML
  // - Check audio for inappropriate content
  // - Check for copyright violations

  return {
    name: 'video_check',
    score: 0,
    passed: true,
    details: 'Video analysis not implemented (would use ML service)',
  };
}

/**
 * Analyze creator history for risk patterns
 */
async function analyzeCreatorHistory(creatorId: string): Promise<ModerationCheck> {
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: {
      user: true,
      content: {
        where: {
          deleted_at: { not: null },
        },
        take: 10,
      },
      _count: {
        select: {
          content: true,
        },
      },
    },
  });

  if (!creator) {
    return {
      name: 'creator_history_check',
      score: 0,
      passed: true,
      details: 'Creator not found',
    };
  }

  let score = 0;
  const issues: string[] = [];

  // Check account age
  const accountAge = Date.now() - creator.user.created_at.getTime();
  const daysOld = accountAge / (1000 * 60 * 60 * 24);

  if (daysOld < 7) {
    score += 20;
    issues.push('new_account');
  }

  // Check for deleted content
  if (creator.content.length > 0) {
    score += creator.content.length * 10;
    issues.push(`${creator.content.length}_deleted_content`);
  }

  // Check content count vs account age
  const contentPerDay = creator._count.content / Math.max(daysOld, 1);
  if (contentPerDay > 5) {
    score += 15;
    issues.push('high_upload_rate');
  }

  // Check for previous reports
  const reportCount = await prisma.report.count({
    where: {
      content: {
        creatorId: creatorId,
      },
      status: { in: ['PENDING', 'UNDER_REVIEW'] },
    },
  });

  if (reportCount > 0) {
    score += reportCount * 5;
    issues.push(`${reportCount}_pending_reports`);
  }

  return {
    name: 'creator_history_check',
    score: Math.min(score, 100),
    passed: score < 50,
    details: issues.length > 0 ? `Issues: ${issues.join(', ')}` : undefined,
  };
}

/**
 * Auto-moderate content with ML-like checks
 */
export async function autoModerateContent(contentId: string): Promise<{
  riskScore: number;
  checks: ModerationCheck[];
  action: 'approved' | 'flagged' | 'rejected';
  reason?: string;
}> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!content) {
    throw new Error('Content not found');
  }

  // Run all checks in parallel
  const checks = await Promise.all([
    checkTitleForSpam(content.title),
    checkDescriptionForBannedWords(content.description || ''),
    scanThumbnailForInappropriateContent(content.thumbnailUrl),
    checkVideoForViolations(content.streamUrl),
    analyzeCreatorHistory(content.creatorId),
  ]);

  // Calculate risk score
  const riskScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;

  // Determine action
  let action: 'approved' | 'flagged' | 'rejected' = 'approved';
  let reason: string | undefined;

  if (riskScore > 80) {
    action = 'rejected';
    reason = 'High risk score detected';
  } else if (riskScore > 50) {
    action = 'flagged';
    reason = 'Moderate risk detected';
  }

  // Take action
  if (action === 'rejected') {
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'REJECTED',
        moderation_note: `Auto-rejected: ${reason}`,
      },
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        user_id: content.creator.user_id,
        type: 'CONTENT_REJECTED',
        title: 'Content Rejected',
        message: `Your content "${content.title}" was automatically rejected: ${reason}`,
      },
    });
  } else if (action === 'flagged') {
    // Create content flag
    await prisma.contentFlag.create({
      data: {
        content_id: contentId,
        flag_type: 'auto',
        reason: reason || 'Moderate risk detected',
        severity: riskScore > 70 ? 'high' : 'medium',
        is_active: true,
      },
    });
  } else {
    // Auto-approve
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'PUBLISHED',
      },
    });
  }

  return {
    riskScore,
    checks,
    action,
    reason,
  };
}

