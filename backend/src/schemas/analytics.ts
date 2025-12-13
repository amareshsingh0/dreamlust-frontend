import { z } from 'zod';

export const trackViewEventSchema = z.object({
  contentId: z.string(),
  watchDuration: z.number().int().min(0),
  completionRate: z.number().min(0).max(1),
  device: z.enum(['mobile', 'tablet', 'desktop']),
  region: z.string().optional(),
  sessionId: z.string().optional(), // Will be generated if not provided
});

export const trackInteractionSchema = z.object({
  contentId: z.string(),
  type: z.enum(['like', 'save', 'share', 'skip', 'comment', 'follow_creator']),
});

export type TrackViewEventInput = z.infer<typeof trackViewEventSchema>;
export type TrackInteractionInput = z.infer<typeof trackInteractionSchema>;

