import { z } from 'zod';

/**
 * Report Schema
 */
export const createReportSchema = z.object({
  contentType: z.enum(['content', 'comment', 'creator']).default('content'),
  targetId: z.string().uuid().optional(),
  contentId: z.string().uuid().optional(),
  reportedUserId: z.string().uuid().optional(),
  type: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT_VIOLATION', 'FAKE_ACCOUNT', 'OTHER']),
  reason: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ACTION_TAKEN']).optional(),
  action: z.enum(['removed', 'warned', 'none', 'banned']).optional(),
  moderatorNotes: z.string().max(2000).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED', 'ACTION_TAKEN']),
  action: z.enum(['removed', 'warned', 'none', 'banned']).optional(),
  moderatorNotes: z.string().max(2000).optional(),
});

/**
 * Content Flag Schema
 */
export const createContentFlagSchema = z.object({
  contentId: z.string().uuid(),
  flagType: z.enum(['auto', 'manual']),
  reason: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export const updateContentFlagSchema = z.object({
  isActive: z.boolean().optional(),
  resolvedAt: z.date().optional(),
});

/**
 * Moderation Queue Query Schema
 */
export const moderationQueueSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ACTION_TAKEN']).optional(),
  contentType: z.enum(['content', 'comment', 'creator']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'severity', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type CreateContentFlagInput = z.infer<typeof createContentFlagSchema>;
export type UpdateContentFlagInput = z.infer<typeof updateContentFlagSchema>;
export type ModerationQueueQuery = z.infer<typeof moderationQueueSchema>;

