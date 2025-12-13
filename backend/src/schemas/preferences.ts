import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  theme: z.enum(['dark', 'light', 'auto']).optional(),
  language: z.string().optional(),
  region: z.string().nullable().optional(),
  hideHistory: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
  defaultQuality: z.enum(['auto', '720p', '1080p', '4K']).optional(),
  autoplay: z.boolean().optional(),
  notifications: z.object({
    email: z.record(z.any()).optional(),
    push: z.record(z.any()).optional(),
    inApp: z.record(z.any()).optional(),
  }).optional(),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

