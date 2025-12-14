import { z } from 'zod';

export const createCommentSchema = z.object({
  contentId: z.string(),
  text: z.string().min(1).max(5000),
  parentId: z.string().optional().nullable(),
});

export const updateCommentSchema = z.object({
  text: z.string().min(1).max(5000),
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

