import { z } from 'zod';

// Enhanced validation with CUID validation for IDs
export const createCommentSchema = z.object({
  contentId: z.string().cuid().or(z.string().uuid()).or(z.string().min(1)), // Support CUID, UUID, or any string
  text: z.string().min(1).max(2000).trim(),
  parentId: z.string().cuid().or(z.string().uuid()).optional().nullable(),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1).max(2000).trim(),
});

export const commentLikeSchema = z.object({
  type: z.enum(['like', 'dislike']),
});

export const reportCommentSchema = z.object({
  reason: z.string().min(10).max(1000),
  type: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT_VIOLATION', 'OTHER']).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentLikeInput = z.infer<typeof commentLikeSchema>;
export type ReportCommentInput = z.infer<typeof reportCommentSchema>;

