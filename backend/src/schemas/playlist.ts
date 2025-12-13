import { z } from 'zod';

export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

export const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isPublic: z.boolean().optional(),
});

export const addToPlaylistSchema = z.object({
  contentId: z.string(),
  position: z.number().int().min(0).optional(),
});

export const reorderPlaylistSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    position: z.number().int().min(0),
  })),
});

export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;
export type AddToPlaylistInput = z.infer<typeof addToPlaylistSchema>;
export type ReorderPlaylistInput = z.infer<typeof reorderPlaylistSchema>;

