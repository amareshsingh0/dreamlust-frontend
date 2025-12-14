import { z } from 'zod';

/**
 * Privacy Settings Schema
 */
export const updatePrivacySchema = z.object({
  hideHistory: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
  allowPersonalization: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  allowMessages: z.enum(['everyone', 'following', 'none']).optional(),
  showWatchHistory: z.enum(['public', 'friends', 'private']).optional(),
  showPlaylists: z.enum(['public', 'friends', 'private']).optional(),
  showLikedContent: z.enum(['public', 'friends', 'private']).optional(),
});

/**
 * History Lock Schema
 */
export const setHistoryLockSchema = z.object({
  enabled: z.boolean(),
  pin: z.string().min(4).max(8).optional(), // PIN is optional when disabling
});

export const verifyHistoryLockSchema = z.object({
  pin: z.string().min(4).max(8),
});

/**
 * Account Deletion Schema
 */
export const requestAccountDeletionSchema = z.object({
  reason: z.string().max(1000).optional(),
  password: z.string().min(1), // Require password confirmation
});

/**
 * Data Export Schema
 */
export const requestDataExportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  includeContent: z.boolean().default(true),
  includeHistory: z.boolean().default(true),
  includePlaylists: z.boolean().default(true),
});

export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;
export type SetHistoryLockInput = z.infer<typeof setHistoryLockSchema>;
export type VerifyHistoryLockInput = z.infer<typeof verifyHistoryLockSchema>;
export type RequestAccountDeletionInput = z.infer<typeof requestAccountDeletionSchema>;
export type RequestDataExportInput = z.infer<typeof requestDataExportSchema>;

